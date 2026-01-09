# PowerShell script to update PostgreSQL password in .env file
Write-Host "`n🔧 PostgreSQL Password Update Script`n" -ForegroundColor Cyan

$envPath = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env file not found at: $envPath" -ForegroundColor Red
    exit 1
}

Write-Host "Current DATABASE_URL configuration:" -ForegroundColor Yellow
$currentLine = Get-Content $envPath | Where-Object { $_ -match "DATABASE_URL=" }
if ($currentLine) {
    Write-Host $currentLine -ForegroundColor Gray
} else {
    Write-Host "  DATABASE_URL not found in .env" -ForegroundColor Red
}

Write-Host "`nPlease enter your PostgreSQL connection details:`n" -ForegroundColor Yellow

$host = Read-Host "Database Host [localhost]"
if ([string]::IsNullOrWhiteSpace($host)) { $host = "localhost" }

$port = Read-Host "Database Port [5432]"
if ([string]::IsNullOrWhiteSpace($port)) { $port = "5432" }

$database = Read-Host "Database Name [10x_dashboard]"
if ([string]::IsNullOrWhiteSpace($database)) { $database = "10x_dashboard" }

$user = Read-Host "Database User [postgres]"
if ([string]::IsNullOrWhiteSpace($user)) { $user = "postgres" }

$password = Read-Host "Database Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

# URL encode password
$passwordEncoded = [System.Uri]::EscapeDataString($passwordPlain)

$databaseUrl = "postgresql://$user`:$passwordEncoded@$host`:$port/$database"

Write-Host "`n📝 Updating .env file...`n" -ForegroundColor Cyan

# Read current .env content
$envContent = Get-Content $envPath -Raw

# Replace or add DATABASE_URL
if ($envContent -match "DATABASE_URL=") {
    $envContent = $envContent -replace "DATABASE_URL=.*", "DATABASE_URL=`"$databaseUrl`""
} else {
    $envContent += "`nDATABASE_URL=`"$databaseUrl`"`n"
}

# Also add individual variables
$envVars = @(
    "DB_HOST=$host",
    "DB_PORT=$port",
    "DB_NAME=$database",
    "DB_USER=$user",
    "DB_PASSWORD=$passwordPlain"
)

foreach ($var in $envVars) {
    $varName = $var.Split('=')[0]
    if ($envContent -match "$varName=") {
        $envContent = $envContent -replace "$varName=.*", $var
    } else {
        $envContent += "$var`n"
    }
}

# Write back to file
Set-Content -Path $envPath -Value $envContent -NoNewline

Write-Host "✅ .env file updated successfully!`n" -ForegroundColor Green

Write-Host "Testing connection..." -ForegroundColor Yellow
Write-Host "(Run 'node test-db-connection.js' to verify)`n" -ForegroundColor Gray

