param(
    [string]$EnvFile = ".env.development"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Sajjan Mart - Database Setup ===" -ForegroundColor Cyan

# 1. Find psql.exe (PATH first, then common install folders)
$psqlExe = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psqlExe) {
    for ($v = 18; $v -ge 10; $v--) {
        $candidate = "C:\Program Files\PostgreSQL\$v\bin\psql.exe"
        if (Test-Path $candidate) { $psqlExe = $candidate; break }
    }
}
if (-not $psqlExe) {
    Write-Host "psql (PostgreSQL command-line tool) was not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install PostgreSQL 16 with winget (run as admin or allow the UAC prompt):" -ForegroundColor Yellow
    Write-Host '  winget install --id PostgreSQL.PostgreSQL.16 -e --accept-source-agreements --accept-package-agreements'
    Write-Host ""
    Write-Host "The installer asks for the 'postgres' superuser password." -ForegroundColor Yellow
    Write-Host "Then re-run:  npm run db:setup" -ForegroundColor Yellow
    exit 1
}
Write-Host "Using psql: $psqlExe" -ForegroundColor Gray

# 2. Read DATABASE_URL from the env file
if (-not (Test-Path $EnvFile)) {
    Write-Host "Env file not found: $EnvFile" -ForegroundColor Red
    exit 1
}
$dbUrl = (Get-Content $EnvFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1) -replace '^DATABASE_URL=', ''
$dbUrl = $dbUrl.Trim().Trim('"').Trim("'")

if ($dbUrl -notmatch '^postgres(?:ql)?://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/([^?\s]+)') {
    Write-Host "Could not parse DATABASE_URL in $EnvFile" -ForegroundColor Red
    exit 1
}
$dbUser   = $matches[1]
$dbPass   = $matches[2]
$dbHost   = $matches[3]
$dbPort   = if ($matches[4]) { $matches[4] } else { "5432" }
$dbName   = $matches[5]
$env:PGPASSWORD = $dbPass

Write-Host "Target: $dbHost`:$dbPort / $dbName (user: $dbUser)" -ForegroundColor Gray

# 3. Make sure the database exists
& $psqlExe -U $dbUser -h $dbHost -p $dbPort -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName'" 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Cannot connect to PostgreSQL at $dbHost`:$dbPort with user '$dbUser'." -ForegroundColor Red
    Write-Host "Check that the service is running and that the password in $EnvFile is correct." -ForegroundColor Red
    exit 1
}
$exists = & $psqlExe -U $dbUser -h $dbHost -p $dbPort -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName'"
if ($exists -ne "1") {
    Write-Host "Creating database '$dbName'..." -ForegroundColor Yellow
    & $psqlExe -U $dbUser -h $dbHost -p $dbPort -c "CREATE DATABASE $dbName"
} else {
    Write-Host "Database '$dbName' already exists." -ForegroundColor Green
}

# 4. Enable pgcrypto (used by gen_random_uuid() defaults in the Prisma schema)
& $psqlExe -U $dbUser -h $dbHost -p $dbPort -d $dbName -c "CREATE EXTENSION IF NOT EXISTS pgcrypto"

# 5. Create tables and seed data
Write-Host ""
Write-Host "Creating tables (prisma db push)..." -ForegroundColor Cyan
npm run prisma:push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Seeding sample data..." -ForegroundColor Cyan
npm run seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== Setup complete! Run 'npm run dev' to start the project. ===" -ForegroundColor Green
