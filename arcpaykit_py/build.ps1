# Build script for arcpaykit Python package (PowerShell)

Write-Host "Building arcpaykit Python package..." -ForegroundColor Cyan

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
Get-ChildItem -Filter "*.egg-info" -Recurse | Remove-Item -Recurse -Force

# Build the package
Write-Host "Building package..." -ForegroundColor Yellow
python -m build

Write-Host "`n✓ Build complete!" -ForegroundColor Green
Write-Host "Distribution files created in dist/ directory:" -ForegroundColor Cyan
Get-ChildItem dist/ | Format-Table Name, Length

Write-Host "`nTo install locally: pip install dist/arcpaykit-*.whl" -ForegroundColor Yellow
Write-Host "To test: python test_arcpaykit.py" -ForegroundColor Yellow

