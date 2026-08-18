$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

Write-Host "Voxora Windows Installer Builder" -ForegroundColor Cyan
Write-Host "Project: $Root"

function Require-Command($name, $help) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "Missing: $name" -ForegroundColor Red
    Write-Host $help -ForegroundColor Yellow
    exit 1
  }
}

Require-Command "node" "Install Node.js 22 LTS or newer."
Require-Command "npm" "npm is included with Node.js."
Require-Command "rustc" "Install Rust from rustup.rs using the default MSVC toolchain."
Require-Command "cargo" "Cargo is installed with Rust."

Write-Host "[1/5] Installing npm dependencies..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[2/5] Type checking..." -ForegroundColor Green
npm run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[3/5] Running tests..." -ForegroundColor Green
npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[4/5] Building frontend and packages..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[5/5] Building NSIS setup executable..." -ForegroundColor Green
npm run tauri:build -w @voxora/desktop -- --bundles nsis
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$Bundle = Join-Path $Root "apps\desktop\src-tauri\target\release\bundle\nsis"
Write-Host "" 
Write-Host "Done. Installer output:" -ForegroundColor Cyan
Write-Host $Bundle -ForegroundColor White
Get-ChildItem $Bundle -Filter "*.exe" | ForEach-Object { Write-Host $_.FullName -ForegroundColor Green }
