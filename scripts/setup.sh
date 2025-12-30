#!/bin/bash

# Setup script for the e-commerce demo project

echo "🚀 Setting up E-commerce Demo Project..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please update it if needed."
else
    echo "✅ .env file already exists."
fi

# Check if Docker is running
if command -v docker &> /dev/null; then
    echo "🐳 Starting Docker containers (PostgreSQL and Redis)..."
    docker-compose up -d
    
    echo "⏳ Waiting for services to be ready..."
    sleep 5
else
    echo "⚠️  Docker not found. Please ensure PostgreSQL and Redis are running manually."
fi

# Initialize database
echo "🗄️  Initializing database..."
node scripts/init-db.js

# Seed database
echo "🌱 Seeding database with test data..."
node scripts/seed.js

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npm install' to install dependencies"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:3000"

