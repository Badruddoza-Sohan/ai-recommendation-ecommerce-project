param(
  [string]$MySqlPass
)

if (-not $MySqlPass) {
  $MySqlPass = Read-Host "Enter MySQL root password to use for DATABASE_URL"
}

$secret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

$envContent = "DATABASE_URL=mysql://root:$MySqlPass@localhost:3306/ecommerce_db`nAPP_SECRET=$secret`nNODE_ENV=development"

if (Test-Path .env) {
  Write-Host ".env already exists — skipping creation"
} else {
  Set-Content -Path .env -Value $envContent -Encoding UTF8
  Write-Host ".env created"
}

Write-Host "Installing dependencies (npm ci)..."
npm ci

Write-Host "Running DB init (seed) and starting dev server..."
npm run dev:all
