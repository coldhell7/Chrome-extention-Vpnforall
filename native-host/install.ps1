# VPN for All - Native Host Installer (Windows)
# PowerShell script to install native messaging host and Xray core

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     VPN for All - Native Host Setup    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

$installDir = "$env:LOCALAPPDATA\VPNForAll"
$xrayDir = "$installDir\xray-core"
$nativeHostDir = "$env:LOCALAPPDATA\Google\Chrome\User Data\NativeMessagingHosts"

# Create directories
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
New-Item -ItemType Directory -Force -Path $xrayDir | Out-Null
New-Item -ItemType Directory -Force -Path $nativeHostDir | Out-Null

Write-Host "Step 1: Installing native host binary..." -ForegroundColor Yellow

# Build Go native host
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (Get-Command "go" -ErrorAction SilentlyContinue) {
    Write-Host "Building native host from source..."
    go build -o "$installDir\vpnforall-host.exe" "$scriptPath"
    Write-Host "✓ Native host installed" -ForegroundColor Green
} else {
    Write-Host "Go is not installed. Please install Go from https://go.dev/doc/install" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Downloading Xray core..." -ForegroundColor Yellow

$xrayVersion = "25.12.8"
$xrayUrl = "https://github.com/XTLS/Xray-core/releases/download/v${xrayVersion}/Xray-windows-64.zip"
$xrayZip = "$env:TEMP\xray-$xrayVersion.zip"

if (-not (Test-Path "$xrayDir\xray.exe")) {
    Write-Host "Downloading Xray $xrayVersion..."
    
    try {
        Invoke-WebRequest -Uri $xrayUrl -OutFile $xrayZip
        Expand-Archive -Path $xrayZip -DestinationPath $xrayDir -Force
        Remove-Item $xrayZip -Force
        Write-Host "✓ Xray downloaded to $xrayDir" -ForegroundColor Green
    } catch {
        Write-Host "Failed to download Xray: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ Xray already installed" -ForegroundColor Green
}

Copy-Item "$xrayDir\xray.exe" "$installDir\xray.exe" -Force

Write-Host ""
Write-Host "Step 3: Registering native messaging host..." -ForegroundColor Yellow

$extId = Read-Host "Please enter your Chrome Extension ID (from chrome://extensions)"

if ([string]::IsNullOrEmpty($extId)) {
    Write-Host "Extension ID is required" -ForegroundColor Red
    exit 1
}

$hostManifest = @{
    name = "com.vpnforall.native"
    description = "VPN for All - Native Messaging Host for V2Ray/Xray Core"
    path = "$installDir\vpnforall-host.exe"
    type = "stdio"
    allowed_origins = @("chrome-extension://$extId/")
} | ConvertTo-Json

Set-Content -Path "$nativeHostDir\com.vpnforall.native.json" -Value $hostManifest

# Also register in registry for system-wide support
if ($isAdmin) {
    $regPath = "HKLM:\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.vpnforall.native"
    New-Item -Path $regPath -Force | Out-Null
    Set-ItemProperty -Path $regPath -Name "(Default)" -Value "$nativeHostDir\com.vpnforall.native.json"
}

$regPath2 = "HKCU:\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.vpnforall.native"
New-Item -Path $regPath2 -Force | Out-Null
Set-ItemProperty -Path $regPath2 -Name "(Default)" -Value "$nativeHostDir\com.vpnforall.native.json"

Write-Host "✓ Native messaging host registered" -ForegroundColor Green

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          Setup Complete! 🎉             ║" -ForegroundColor Cyan
Write-Host "╠════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Now reload the extension in Chrome    ║" -ForegroundColor Cyan
Write-Host "║  and click Connect!                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
