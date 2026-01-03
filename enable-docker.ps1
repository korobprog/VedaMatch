# Script to enable Windows components required for Docker Desktop

Write-Host "Checking and enabling Windows components for Docker..." -ForegroundColor Cyan

# Enable Hyper-V (if available)
Write-Host "`nEnabling Hyper-V..." -ForegroundColor Yellow
try {
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All -NoRestart -ErrorAction SilentlyContinue
} catch {
    Write-Host "Hyper-V is not available or already enabled" -ForegroundColor Gray
}

# Enable Virtual Machine Platform
Write-Host "Enabling Virtual Machine Platform..." -ForegroundColor Yellow
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart

# Enable Windows Subsystem for Linux
Write-Host "Enabling WSL..." -ForegroundColor Yellow
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart

Write-Host "`nDone! Please restart your computer to apply changes." -ForegroundColor Green
Write-Host "After restart, install WSL2 if not already installed:" -ForegroundColor Yellow
Write-Host "  wsl --install" -ForegroundColor White
