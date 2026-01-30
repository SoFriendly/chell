# Build script for Windows
# Usage: .\scripts\build-windows.ps1 [major|minor|patch]
# If bump type provided, version will be incremented before build

param(
    [string]$BumpType
)

$ErrorActionPreference = "Stop"

# Load environment variables from .env.local if it exists
if (Test-Path .env.local) {
    Get-Content .env.local | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

# Bump version if argument provided
if ($BumpType) {
    # Get current version
    $configContent = Get-Content "src-tauri\tauri.conf.json" -Raw
    if ($configContent -match '"version":\s*"(\d+)\.(\d+)\.(\d+)"') {
        $major = [int]$matches[1]
        $minor = [int]$matches[2]
        $patch = [int]$matches[3]
        $currentVersion = "$major.$minor.$patch"

        switch ($BumpType) {
            "major" { $major++; $minor = 0; $patch = 0 }
            "minor" { $minor++; $patch = 0 }
            "patch" { $patch++ }
            default { Write-Error "Invalid bump type. Use: major, minor, or patch"; exit 1 }
        }

        $newVersion = "$major.$minor.$patch"
        Write-Host "Bumping version: $currentVersion -> $newVersion"

        # Update tauri.conf.json
        $configContent = $configContent -replace '"version":\s*"[^"]+"', "`"version`": `"$newVersion`""
        Set-Content "src-tauri\tauri.conf.json" $configContent -NoNewline

        # Update Cargo.toml
        $cargoContent = Get-Content "src-tauri\Cargo.toml" -Raw
        $cargoContent = $cargoContent -replace 'version\s*=\s*"[^"]+"', "version = `"$newVersion`""
        Set-Content "src-tauri\Cargo.toml" $cargoContent -NoNewline

        # Update package.json if exists
        if (Test-Path "package.json") {
            $pkgContent = Get-Content "package.json" -Raw
            $pkgContent = $pkgContent -replace '"version":\s*"[^"]+"', "`"version`": `"$newVersion`""
            Set-Content "package.json" $pkgContent -NoNewline
        }
    }
}

# Check for signing key
if (-not $env:TAURI_SIGNING_PRIVATE_KEY) {
    Write-Warning "TAURI_SIGNING_PRIVATE_KEY not set - updates won't be signed"
}

Write-Host "Building Chell for Windows..."

# Build the app
pnpm tauri build

Write-Host ""
Write-Host "Build complete!"
Write-Host "Artifacts are in: src-tauri\target\release\bundle\"

# List the built artifacts
Write-Host ""
Write-Host "Built files:"
Get-ChildItem -Path "src-tauri\target\release\bundle\msi" -ErrorAction SilentlyContinue
Get-ChildItem -Path "src-tauri\target\release\bundle\nsis" -ErrorAction SilentlyContinue
