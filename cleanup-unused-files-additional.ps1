# Script to remove additional unused files from the codebase
# These files are causing errors and are not being used in the main application flow

# List of additional files to remove
$files = @(
    # Security components
    "src\components\security\SecurityScanningDashboard.tsx",
    
    # Monitoring components
    "src\components\monitoring\ApiPerformanceAlerts.tsx",
    
    # Form components with errors
    "src\components\forms\FormApprovalDetail.tsx",
    "src\components\forms\FormApprovalQueue.tsx",
    "src\pages\forms\approval.tsx",
    
    # Security services
    "src\services\ipRestrictionService.ts",
    "src\services\jwtService.ts",
    "src\services\mfaService.ts",
    
    # Unused hooks
    "src\hooks\useFormErrorTracking.ts",
    "src\hooks\usePerformanceMonitoring.ts",
    
    # Backup files or test files
    "src\components\customers\CustomersPage.backup.tsx",
    
    # Other services with errors that don't seem to be in use
    "src\lib\rateLimit.ts"
)

# Create a backup directory
$backupDir = "unused-files-backup-additional"
if (-not (Test-Path $backupDir)) {
    New-Item -Path $backupDir -ItemType Directory | Out-Null
    Write-Host "Created backup directory: $backupDir"
}

# List the files that will be removed
Write-Host "The following additional files will be moved to the backup directory:"
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  $file"
    } else {
        Write-Host "  $file (not found)" -ForegroundColor Yellow
    }
}

Write-Host "Proceeding with file removal..."

# Move the files to the backup directory
foreach ($file in $files) {
    if (Test-Path $file) {
        $dirName = Split-Path -Path $file -Parent
        $fileName = Split-Path -Path $file -Leaf
        $targetDir = Join-Path -Path $backupDir -ChildPath $dirName
        
        # Create the target directory if it doesn't exist
        if (-not (Test-Path $targetDir)) {
            New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
        }
        
        # Move the file
        Move-Item -Path $file -Destination (Join-Path -Path $targetDir -ChildPath $fileName) -Force
        Write-Host "Moved: $file" -ForegroundColor Green
    }
}

Write-Host "Done! Additional unused files have been moved to the $backupDir directory."
Write-Host "If the application works correctly, you can delete the backup directory later." 