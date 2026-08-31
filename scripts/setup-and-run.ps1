# Setup and run script for Windows
# - Installs prerequisites via winget when available
# - Installs node modules and runs `npm run dev:all`
# Run as: PowerShell -ExecutionPolicy Bypass -File .\scripts\setup-and-run.ps1

function Check-Command($cmd) {
  return (Get-Command $cmd -ErrorAction SilentlyContinue) -ne $null
}

Write-Host "=== Kimi Project Setup and Run ===" -ForegroundColor Cyan

# Ensure we're in repo root
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $repoRoot
Write-Host "Working directory: $(Get-Location)"

# Check for winget
if (-not (Check-Command winget)) {
  Write-Warning "winget not found. Automated installs will be skipped. Please install prerequisites manually if needed."
} else {
  Write-Host "winget found. Checking packages..."

  $needInstall = @()

  if (-not (Check-Command node)) { $needInstall += @{ id='OpenJS.NodeJS.LTS'; name='Node.js LTS' } }
  if (-not (Check-Command git)) { $needInstall += @{ id='Git.Git'; name='Git' } }
  if (-not (Check-Command python)) { $needInstall += @{ id='Python.Python.3'; name='Python 3' } }
  if (-not (Check-Command cl.exe)) { $needInstall += @{ id='Microsoft.VisualStudio.2022.BuildTools'; name='Visual Studio Build Tools (C++ build tools)' } }
  if (-not (Check-Command sqlite3)) { $needInstall += @{ id='SQLite.SQLite'; name='SQLite' } }

  if ($needInstall.Count -gt 0) {
    Write-Host "The following packages are missing and will be installed via winget:" -ForegroundColor Yellow
    $needInstall | ForEach-Object { Write-Host " - $($_.name) (id: $($_.id))" }

    foreach ($p in $needInstall) {
      Write-Host "Installing $($p.name)..." -ForegroundColor Green
      winget install --id $($p.id) --accept-package-agreements --accept-source-agreements
      if ($LASTEXITCODE -ne 0) {
        Write-Warning "Installation of $($p.name) returned code $LASTEXITCODE. You may need to install it manually."
      }
    }
  } else {
    Write-Host "All required packages are present." -ForegroundColor Green
  }
}

# Install VS Code extensions (optional) if `code` is available
if (Check-Command code) {
  Write-Host "Installing recommended VS Code extensions..."
  code --install-extension esbenp.prettier-vscode --force
  code --install-extension dbaeumer.vscode-eslint --force
} else {
  Write-Host "VS Code CLI 'code' not available; skip extensions." -ForegroundColor Yellow
}

# Install npm deps
if (-not (Check-Command npm)) {
  Write-Error "npm not found in PATH. Please restart your shell or install Node.js and re-run this script.";
  exit 1
}

Write-Host "Installing node dependencies (npm install)..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
  Write-Error "npm install failed with exit code $LASTEXITCODE"; exit $LASTEXITCODE
}

# Run the unified dev script (db:init + dev)
Write-Host "Starting project: npm run dev:all" -ForegroundColor Cyan
npm run dev:all

Write-Host "Script finished." -ForegroundColor Cyan
