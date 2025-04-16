# Script to remove final set of unused files from the codebase
# Focusing on examples and test files

# List of additional files to remove
$files = @(
    # Examples directory
    "src\examples\SimpleLiveDataView.tsx",
    
    # Test components
    "src\components\test\TestTable.tsx",
    "src\components\test\TanStackTable.tsx"
)

# Create a backup directory
$backupDir = "unused-files-final-extras"
if (-not (Test-Path $backupDir)) {
    New-Item -Path $backupDir -ItemType Directory | Out-Null
    Write-Host "Created backup directory: $backupDir"
}

# List the files that will be removed
Write-Host "The following files will be moved to the backup directory:"
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

# Check for empty directories after moving files
$dirsToCheck = @(
    "src\examples",
    "src\components\test"
)

foreach ($dir in $dirsToCheck) {
    if (Test-Path $dir) {
        $items = Get-ChildItem -Path $dir
        
        if ($items.Count -eq 0) {
            Write-Host "Directory is now empty: $dir" -ForegroundColor Yellow
            
            # Create empty directory in backup
            $targetDir = Join-Path -Path $backupDir -ChildPath $dir
            if (-not (Test-Path $targetDir)) {
                New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
            }
            
            # Remove empty directory
            Remove-Item -Path $dir -Force
            Write-Host "Removed empty directory: $dir" -ForegroundColor Green
        } else {
            Write-Host "Directory still contains files: $dir" -ForegroundColor Gray
            foreach ($item in $items) {
                Write-Host "  - $($item.Name)" -ForegroundColor Gray
            }
        }
    }
}

Write-Host "Done! Final set of example and test files have been moved to the $backupDir directory."
Write-Host "If the application works correctly, you can delete all backup directories." 