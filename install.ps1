# AgentiCode installer for Windows PowerShell
# Usage: irm https://raw.githubusercontent.com/kyaky/agenticode/master/install.ps1 | iex

$ErrorActionPreference = "Stop"

$Repo = "kyaky/agenticode"
$Name = "agenticode"
$Arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
$Binary = "${Name}-windows-${Arch}.exe"
$InstallDir = if ($env:AGENTICODE_INSTALL_DIR) { $env:AGENTICODE_INSTALL_DIR } else { "$env:USERPROFILE\.agenticode\bin" }

# Create install directory
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# Download latest release
Write-Host "Downloading AgentiCode for Windows ${Arch}..."
$ReleaseUrl = "https://github.com/${Repo}/releases/latest/download/${Binary}"
$OutPath = Join-Path $InstallDir "${Name}.exe"

try {
    Invoke-WebRequest -Uri $ReleaseUrl -OutFile $OutPath -UseBasicParsing
} catch {
    Write-Host "Download failed. You may need to build from source:" -ForegroundColor Red
    Write-Host "  git clone https://github.com/${Repo}.git"
    Write-Host "  cd agenticode"
    Write-Host "  bun install && bun run scripts/build.ts"
    exit 1
}

# Add to PATH
$CurrentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($CurrentPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$InstallDir;$CurrentPath", "User")
    Write-Host "Added $InstallDir to user PATH"
}

Write-Host ""
Write-Host "AgentiCode installed to $OutPath" -ForegroundColor Green
Write-Host "Restart your terminal, then run: agenticode"
