# Script to remove unused service files from the codebase
# These service files appear to have either no imports or only circular references

# List of services to remove
$files = @(
    # Not imported anywhere in the active codebase
    "src\services\customerOfferService.ts",
    
    # Only imported in removed files
    "src\services\sessionService.ts"
)

# Create a backup directory
$backupDir = "unused-services-backup"
if (-not (Test-Path $backupDir)) {
    New-Item -Path $backupDir -ItemType Directory | Out-Null
    Write-Host "Created backup directory: $backupDir"
}

# List the files that will be removed
Write-Host "The following service files will be moved to the backup directory:"
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

Write-Host "Done! Unused service files have been moved to the $backupDir directory."
Write-Host "If the application works correctly, you can delete the backup directory." 