# PowerShell setup script for Windows

Write-Host "🚀 Setting up E-commerce Demo Project..." -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env file created. Please update it if needed." -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists." -ForegroundColor Green
}

# Check if Docker is available
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "🐳 Starting Docker containers (PostgreSQL and Redis)..." -ForegroundColor Cyan
    
    # Try newer docker compose syntax first, fallback to docker-compose
    $composeCmd = if (Get-Command "docker" -ErrorAction SilentlyContinue) {
        # Check if docker compose works
        $test = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            "docker compose"
        } else {
            "docker-compose"
        }
    } else {
        "docker-compose"
    }
    
    & $composeCmd.Split(' ') up -d
    
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
} else {
    Write-Host "⚠️  Docker not found. Please ensure PostgreSQL and Redis are running manually." -ForegroundColor Yellow
}

# Initialize database
Write-Host "🗄️  Initializing database..." -ForegroundColor Cyan
node scripts/init-db.js

# Seed database
Write-Host "🌱 Seeding database with test data..." -ForegroundColor Cyan
node scripts/seed.js

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run 'npm install' to install dependencies"
Write-Host "2. Run 'npm run dev' to start the development server"
Write-Host "3. Visit http://localhost:3000"

