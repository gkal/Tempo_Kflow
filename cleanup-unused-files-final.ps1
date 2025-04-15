# Script to remove unused files from the codebase

# Create a backup directory to store the removed files
$backupDir = "unused-files-final-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "Created backup directory: $backupDir" -ForegroundColor Green

# Function to safely move a file to the backup directory
function Backup-File {
    param (
        [string]$FilePath
    )
    
    $fileName = Split-Path $FilePath -Leaf
    $dirName = Split-Path (Split-Path $FilePath -Parent) -Leaf
    $backupPath = "$backupDir\$dirName"
    
    if (-not (Test-Path $backupPath)) {
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    }
    
    if (Test-Path $FilePath) {
        try {
            Copy-Item -Path $FilePath -Destination "$backupPath\$fileName" -Force
            Remove-Item -Path $FilePath -Force
            Write-Host "Removed and backed up: $FilePath" -ForegroundColor Yellow
        }
        catch {
            Write-Host "Error processing $FilePath`: $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "File not found: $FilePath" -ForegroundColor Red
    }
}

# List of files with unusual/invalid names to remove
$unusualFiles = @(
    "'",
    "c.primary_contact_id)",
    "customer.id)",
    "npm",
    "pos.name))",
    "starter@0.0.0",
    "temp.txt",
    "{"
)

# Remove the unusual files
foreach ($file in $unusualFiles) {
    $filePath = Join-Path -Path (Get-Location) -ChildPath $file
    if (Test-Path $filePath) {
        try {
            Remove-Item -Path $filePath -Force
            Write-Host "Removed: $file" -ForegroundColor Yellow
        }
        catch {
            Write-Host "Error removing $file`: $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "File not found: $file" -ForegroundColor Red
    }
}

# Unused external form integration files
$unusedFormFiles = @(
    "src\unused-external-form-integration\submit.ts",
    "src\unused-external-form-integration\validate.ts",
    "src\unused-external-form-integration\formLinkService-extended.ts",
    "src\unused-external-form-integration\formLinkService-types-extended.ts"
)

# Back up and remove the unused form files
foreach ($file in $unusedFormFiles) {
    Backup-File -FilePath $file
}

Write-Host "Cleanup completed successfully!" -ForegroundColor Green
Write-Host "Backup directory: $backupDir" -ForegroundColor Green 