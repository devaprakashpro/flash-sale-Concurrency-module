import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getPool();

    // All aggregations performed at database level for efficiency
    // This query uses PostgreSQL's aggregation functions and GROUP BY
    
    // 1. Total revenue (sum of all completed orders)
    // 2. Total units sold
    // 3. Top 3 selling products by quantity
    // 4. Revenue by day for the last 7 days
    
    // Single query approach - more efficient than multiple queries
    const statsQuery = `
      WITH daily_revenue AS (
        SELECT 
          DATE(created_at) as date,
          SUM(total_price) as revenue
        FROM orders
        WHERE status = 'completed'
          AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      ),
      top_products AS (
        SELECT 
          p.id,
          p.name,
          SUM(o.quantity) as total_sold
        FROM orders o
        JOIN products p ON o.product_id = p.id
        WHERE o.status = 'completed'
        GROUP BY p.id, p.name
        ORDER BY total_sold DESC
        LIMIT 3
      ),
      overall_stats AS (
        SELECT 
          SUM(total_price) as total_revenue,
          SUM(quantity) as total_units_sold
        FROM orders
        WHERE status = 'completed'
      )
      SELECT 
        (SELECT total_revenue FROM overall_stats) as total_revenue,
        (SELECT total_units_sold FROM overall_stats) as total_units_sold,
        (SELECT json_agg(json_build_object('id', id, 'name', name, 'totalSold', total_sold)) FROM top_products) as top_products,
        (SELECT json_agg(json_build_object('date', date, 'revenue', revenue)) FROM daily_revenue) as revenue_by_day
    `;

    const startTime = Date.now();
    const result = await db.query(statsQuery);
    const queryTime = Date.now() - startTime;

    const stats = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue: parseFloat(stats.total_revenue || '0'),
        totalUnitsSold: parseInt(stats.total_units_sold || '0'),
        topProducts: stats.top_products || [],
        revenueByDay: stats.revenue_by_day || [],
      },
      meta: {
        queryTimeMs: queryTime,
        rawQuery: statsQuery,
      },
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}


