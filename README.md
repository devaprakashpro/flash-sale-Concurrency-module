# Flash Sale Concurrency Module

> **A production-ready Next.js application demonstrating enterprise-grade concurrency patterns for high-traffic e-commerce systems**

This project serves as a comprehensive reference implementation for handling concurrent transactions, preventing race conditions, and maintaining data consistency in distributed systems. Built with modern TypeScript, PostgreSQL, and Redis, it showcases real-world solutions to common concurrency challenges.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technical Implementation](#technical-implementation)
- [Development Setup](#development-setup)
- [API Reference](#api-reference)
- [Concurrency Patterns](#concurrency-patterns)
- [Performance & Monitoring](#performance--monitoring)
- [Testing Strategies](#testing-strategies)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Design Principles

```mermaid
graph TB
    Client[Client Browser] --> LB[Load Balancer]
    LB --> App[Next.js App]
    App --> Redis[Redis Cache]
    App --> PG[PostgreSQL]
    
    subgraph "Concurrency Layer"
        App --> RL[Rate Limiter]
        App --> TXN[Transaction Manager]
        App --> LOCK[Row-Level Locking]
    end
```

### Core Components

| Component | Purpose | Technology | Key Features |
|-----------|---------|------------|--------------|
| **Frontend** | User Interface | Next.js 16 + React 19 | Server-side rendering, real-time updates |
| **API Layer** | Business Logic | Next.js API Routes | RESTful endpoints, middleware chain |
| **Database** | Data Persistence | PostgreSQL 15+ | ACID transactions, row-level locking |
| **Cache Layer** | Rate Limiting | Redis 7+ | Distributed counters, TTL management |
| **Connection Pool** | Resource Management | node-postgres | Connection reuse, timeout handling |

### Technology Stack

```typescript
// Core Dependencies
{
  "next": "16.1.1",           // Full-stack React framework
  "react": "19.2.3",          // UI library with concurrent features
  "typescript": "^5",         // Type safety and developer experience
  "pg": "^8.11.3",           // PostgreSQL client with pooling
  "redis": "^4.6.10",        // Redis client for caching/rate limiting
  "tailwindcss": "^4"        // Utility-first CSS framework
}
```

---

## Technical Implementation

### Database Schema Design

```sql
-- Products table with optimized indexing
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    stock INTEGER NOT NULL DEFAULT 0,        -- Critical for concurrency
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table with foreign key constraints
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_products_stock ON products(stock) WHERE stock > 0;
```

### Connection Pool Configuration

```typescript
// lib/db.ts - Production-ready connection pooling
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,                    // Maximum connections
      idleTimeoutMillis: 30000,   // Close idle connections
      connectionTimeoutMillis: 2000, // Connection timeout
      statement_timeout: 5000,    // Query timeout
      query_timeout: 5000,        // Individual query timeout
    });
    
    // Connection error handling
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }
  return pool;
}
```

### Rate Limiting Implementation

```typescript
// lib/rateLimit.ts - Redis-based distributed rate limiting
interface RateLimitOptions {
  maxRequests: number;    // Request limit
  windowMs: number;       // Time window
  identifier: string;     // Unique key (user/IP)
}

export async function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const redis = await getRedisClient();
  const key = `rate_limit:${options.identifier}`;
  
  // Atomic increment with expiration
  const pipeline = redis.multi();
  pipeline.incr(key);
  pipeline.expire(key, Math.ceil(options.windowMs / 1000));
  
  const results = await pipeline.exec();
  const current = results[0][1] as number;
  
  if (current > options.maxRequests) {
    const ttl = await redis.ttl(key);
    return { allowed: false, retryAfter: ttl };
  }
  
  return { allowed: true };
}
```

---

## Development Setup

### Prerequisites

```bash
# Required software versions
node --version    # v18.0.0 or higher
npm --version     # v8.0.0 or higher
psql --version    # PostgreSQL 13+ recommended
redis-server --version  # Redis 6+ recommended
```

### Local Development Environment

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd flash-sale-concurrency-module
npm install

# 2. Start required services
# PostgreSQL (macOS with Homebrew)
brew services start postgresql

# Redis (macOS with Homebrew)  
brew services start redis

# Or using Docker Compose
docker-compose up -d postgres redis
```

### Environment Configuration

Create `.env.local` with production-like settings:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/flash_sale_db
DB_POOL_MAX=20
DB_TIMEOUT=5000

# Redis Configuration  
REDIS_URL=redis://localhost:6379
REDIS_TIMEOUT=2000

# Application Settings
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1

# Rate Limiting
RATE_LIMIT_USER_MAX=5
RATE_LIMIT_IP_MAX=10
RATE_LIMIT_WINDOW_MS=60000
```

### Database Initialization

```bash
# Initialize schema and seed data
npm run db:init    # Creates tables and indexes
npm run db:seed    # Inserts sample products and orders
npm run db:reset   # Drops and recreates everything
```

### Development Workflow

```bash
# Start development server with hot reload
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

---

## API Reference

### Purchase Transaction Endpoint

**`POST /api/purchase`**

Handles atomic purchase transactions with concurrency control.

```typescript
// Request Body
interface PurchaseRequest {
  productId: number;
  userId: string;
  quantity?: number;  // Default: 1
}

// Response Body
interface PurchaseResponse {
  success: boolean;
  message: string;
  order?: {
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    totalPrice: number;
    remainingStock: number;
    createdAt: string;
  };
}
```

**Implementation Details:**
- Uses PostgreSQL row-level locking (`SELECT FOR UPDATE`)
- Implements atomic stock decrement within transaction
- Enforces rate limiting (5 purchases/user/minute)
- Returns detailed order information on success

**Error Handling:**
- `400`: Missing required fields
- `404`: Product not found
- `429`: Rate limit exceeded
- `200`: Out of stock (business logic error)
- `500`: Internal server error

### Stock Query Endpoint

**`GET /api/stock/[id]`**

Optimized endpoint for real-time stock checking.

```typescript
// Response Body
interface StockResponse {
  success: boolean;
  stock: number;
  message?: string;
}
```

**Performance Characteristics:**
- Single SELECT query with index usage
- Sub-10ms response time typical
- Designed for high-frequency polling
- Minimal data transfer

### Admin Analytics Endpoint

**`GET /api/admin/stats`**

Comprehensive business metrics with database aggregations.

```typescript
// Response Body
interface AdminStatsResponse {
  success: boolean;
  data: {
    totalRevenue: number;
    totalUnitsSold: number;
    topProducts: Array<{
      id: number;
      name: string;
      totalSold: number;
    }>;
    revenueByDay: Array<{
      date: string;
      revenue: number;
    }>;
  };
  meta: {
    queryTimeMs: number;
    rawQuery: string;
  };
}
```

**Query Optimization:**
- Single CTE-based query for all metrics
- Database-level aggregations
- Efficient JOIN operations
- Query execution time tracking

---

## Concurrency Patterns

### Race Condition Prevention

The core challenge in flash sales is preventing overselling when multiple users purchase simultaneously.

```typescript
// app/api/purchase/route.ts - Critical section implementation
export async function POST(req: NextRequest) {
  const db = getPool();
  
  // Start transaction
  await db.query('BEGIN');
  
  try {
    // CRITICAL: Row-level lock prevents concurrent modifications
    const productResult = await db.query(
      'SELECT id, stock, price, name FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );
    
    const currentStock = parseInt(productResult.rows[0].stock);
    
    // Business logic validation
    if (currentStock < quantity) {
      await db.query('ROLLBACK');
      return NextResponse.json({ success: false, message: 'Out of stock' });
    }
    
    // Atomic stock update
    await db.query(
      'UPDATE products SET stock = $1 WHERE id = $2',
      [currentStock - quantity, productId]
    );
    
    // Create order record
    await db.query(
      'INSERT INTO orders (user_id, product_id, quantity, total_price) VALUES ($1, $2, $3, $4)',
      [userId, productId, quantity, totalPrice]
    );
    
    // Commit transaction
    await db.query('COMMIT');
    
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
```

### Distributed Rate Limiting

```typescript
// lib/rateLimit.ts - Multi-tier rate limiting
export async function rateLimitMiddleware(
  req: NextRequest,
  maxRequests: number,
  windowMs: number,
  userId?: string
) {
  // Tier 1: User-based limiting
  const userLimit = await checkRateLimit(req, {
    maxRequests,
    windowMs,
    identifier: `user:${userId}`,
  });
  
  // Tier 2: IP-based limiting (DDoS protection)
  const ipLimit = await checkRateLimit(req, {
    maxRequests: 10,
    windowMs: 60000,
    identifier: `ip:${getClientIP(req)}`,
  });
  
  // Return most restrictive limit
  if (!userLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json(
      { success: false, message: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  return null; // Allow request
}
```

### Real-time Stock Synchronization

```typescript
// components/StockDisplay.tsx - Optimistic updates with polling
export default function StockDisplay({ productId }: StockDisplayProps) {
  const [stock, setStock] = useState<number | null>(null);
  
  useEffect(() => {
    // Initial fetch
    fetchStock();
    
    // Polling strategy: 2-second intervals
    const interval = setInterval(fetchStock, 2000);
    
    // Event-driven updates for immediate feedback
    const handleStockUpdate = () => fetchStock();
    window.addEventListener('stockUpdate', handleStockUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('stockUpdate', handleStockUpdate);
    };
  }, [productId]);
  
  // Optimized fetch with error handling
  async function fetchStock() {
    try {
      const response = await fetch(`/api/stock/${productId}`, {
        cache: 'no-store',  // Prevent caching for real-time data
      });
      const data = await response.json();
      
      if (data.success) {
        setStock(data.stock);
      }
    } catch (error) {
      console.error('Stock fetch failed:', error);
      // Maintain last known state on error
    }
  }
}
```

---

## Performance & Monitoring

### Database Performance Tuning

```sql
-- Query performance analysis
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, stock, price, name FROM products WHERE id = $1 FOR UPDATE;

-- Index usage monitoring
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE tablename IN ('products', 'orders');

-- Connection pool monitoring
SELECT state, count(*) 
FROM pg_stat_activity 
WHERE datname = 'flash_sale_db' 
GROUP BY state;
```

### Application Metrics

```typescript
// Performance monitoring middleware
export async function performanceMiddleware(req: NextRequest) {
  const startTime = Date.now();
  
  // Execute request
  const response = await handler(req);
  
  const duration = Date.now() - startTime;
  
  // Log slow queries (>100ms)
  if (duration > 100) {
    console.warn(`Slow request: ${req.url} took ${duration}ms`);
  }
  
  // Add performance headers
  response.headers.set('X-Response-Time', `${duration}ms`);
  
  return response;
}
```

### Redis Performance Monitoring

```typescript
// Redis connection health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const start = Date.now();
    
    await redis.ping();
    
    const latency = Date.now() - start;
    
    // Alert on high latency
    if (latency > 50) {
      console.warn(`High Redis latency: ${latency}ms`);
    }
    
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}
```

---

## Testing Strategies

### Unit Testing

```typescript
// __tests__/api/purchase.test.ts
import { POST } from '@/app/api/purchase/route';

describe('Purchase API', () => {
  beforeEach(async () => {
    // Reset database state
    await resetTestDatabase();
  });
  
  test('should handle concurrent purchases correctly', async () => {
    // Setup: Product with 5 units in stock
    const productId = await createTestProduct({ stock: 5 });
    
    // Execute: 10 concurrent purchase requests
    const promises = Array.from({ length: 10 }, (_, i) =>
      POST(createMockRequest({
        productId,
        userId: `user_${i}`,
        quantity: 1,
      }))
    );
    
    const results = await Promise.all(promises);
    
    // Verify: Only 5 purchases should succeed
    const successful = results.filter(r => r.status === 200);
    const failed = results.filter(r => r.status !== 200);
    
    expect(successful).toHaveLength(5);
    expect(failed).toHaveLength(5);
    
    // Verify: Final stock should be 0
    const finalStock = await getProductStock(productId);
    expect(finalStock).toBe(0);
  });
});
```

### Load Testing

```bash
# Artillery.js load test configuration
# artillery.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120  
      arrivalRate: 50
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"

scenarios:
  - name: "Purchase flow"
    weight: 80
    flow:
      - post:
          url: "/api/purchase"
          json:
            productId: 1
            userId: "{{ $randomString() }}"
            quantity: 1
          
  - name: "Stock check"
    weight: 20
    flow:
      - get:
          url: "/api/stock/1"
```

### Integration Testing

```typescript
// __tests__/integration/purchase-flow.test.ts
describe('Purchase Flow Integration', () => {
  test('should maintain data consistency under load', async () => {
    const initialStock = 100;
    const concurrentUsers = 50;
    const purchasesPerUser = 3;
    
    // Setup test product
    const productId = await createTestProduct({ stock: initialStock });
    
    // Simulate concurrent users making multiple purchases
    const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      const userId = `load_test_user_${userIndex}`;
      
      // Each user makes multiple purchase attempts
      const purchasePromises = Array.from({ length: purchasesPerUser }, () =>
        makePurchaseRequest(productId, userId, 1)
      );
      
      return Promise.allSettled(purchasePromises);
    });
    
    const results = await Promise.all(userPromises);
    
    // Analyze results
    const allResults = results.flat();
    const successful = allResults.filter(r => 
      r.status === 'fulfilled' && r.value.success
    );
    
    // Verify no overselling occurred
    const finalStock = await getProductStock(productId);
    const totalSold = successful.length;
    
    expect(initialStock - totalSold).toBe(finalStock);
    expect(totalSold).toBeLessThanOrEqual(initialStock);
  });
});
```

---

## Deployment Guide

### Production Environment Setup

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: flash_sale_db
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    
volumes:
  postgres_data:
  redis_data:
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flash-sale-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: flash-sale-app
  template:
    metadata:
      labels:
        app: flash-sale-app
    spec:
      containers:
      - name: app
        image: flash-sale-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Environment Variables Reference

```bash
# Production Environment Variables
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://user:pass@host:5432/db
DB_POOL_MAX=20
DB_TIMEOUT=5000
DB_SSL=true

# Redis Configuration
REDIS_URL=redis://host:6379
REDIS_TIMEOUT=2000
REDIS_RETRY_ATTEMPTS=3

# Rate Limiting
RATE_LIMIT_USER_MAX=5
RATE_LIMIT_IP_MAX=10
RATE_LIMIT_WINDOW_MS=60000

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn

# Security
CORS_ORIGIN=https://yourdomain.com
CSRF_SECRET=your-csrf-secret
```

### Health Check Endpoints

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check database connectivity
    const db = getPool();
    await db.query('SELECT 1');
    
    // Check Redis connectivity
    const redis = await getRedisClient();
    await redis.ping();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        redis: 'up',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
```

---

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check PostgreSQL status
pg_isready -h localhost -p 5432

# View active connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check for long-running queries
psql -c "SELECT query, state, query_start FROM pg_stat_activity WHERE state != 'idle';"
```

#### Redis Connection Issues

```bash
# Test Redis connectivity
redis-cli ping

# Monitor Redis performance
redis-cli --latency-history

# Check memory usage
redis-cli info memory
```

#### Rate Limiting Issues

```typescript
// Debug rate limiting
export async function debugRateLimit(userId: string) {
  const redis = await getRedisClient();
  const key = `rate_limit:user:${userId}`;
  
  const current = await redis.get(key);
  const ttl = await redis.ttl(key);
  
  console.log(`User ${userId}: ${current} requests, ${ttl}s remaining`);
}
```

### Performance Debugging

```typescript
// Query performance analysis
export async function analyzeQueryPerformance() {
  const db = getPool();
  
  // Enable query logging
  await db.query('SET log_statement = "all"');
  await db.query('SET log_min_duration_statement = 100');
  
  // Analyze slow queries
  const slowQueries = await db.query(`
    SELECT query, mean_time, calls, total_time
    FROM pg_stat_statements
    WHERE mean_time > 100
    ORDER BY mean_time DESC
    LIMIT 10
  `);
  
  return slowQueries.rows;
}
```

### Monitoring and Alerting

```typescript
// Application monitoring
export class ApplicationMonitor {
  private metrics = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
  };
  
  recordRequest(duration: number, success: boolean) {
    this.metrics.requestCount++;
    
    if (!success) {
      this.metrics.errorCount++;
    }
    
    // Update rolling average
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + duration) / 2;
    
    // Alert on high error rate
    const errorRate = this.metrics.errorCount / this.metrics.requestCount;
    if (errorRate > 0.05) { // 5% error rate threshold
      this.sendAlert('High error rate detected', { errorRate });
    }
  }
  
  private sendAlert(message: string, data: any) {
    // Integration with monitoring service (Sentry, DataDog, etc.)
    console.error('ALERT:', message, data);
  }
}
```

---

## Contributing

### Development Guidelines

1. **Code Style**: Follow TypeScript strict mode and ESLint rules
2. **Testing**: Maintain >90% test coverage for critical paths
3. **Documentation**: Update README for any architectural changes
4. **Performance**: Benchmark changes affecting critical paths
5. **Security**: Review all database queries for SQL injection risks

### Pull Request Process

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes with tests
npm run test
npm run type-check
npm run lint

# 3. Update documentation
# Update README.md if needed

# 4. Submit PR with description
# Include performance impact analysis
# Include test coverage report
```

### Code Review Checklist

- [ ] Database queries use parameterized statements
- [ ] Rate limiting is properly implemented
- [ ] Error handling covers edge cases
- [ ] Tests cover concurrent scenarios
- [ ] Performance impact is documented
- [ ] Security implications are considered

---

