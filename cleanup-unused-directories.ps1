# Script to clean up empty directories after file removal

# Create a backup directory for empty directory structure documentation
$backupDir = "empty-directories-removed"
if (-not (Test-Path $backupDir)) {
    New-Item -Path $backupDir -ItemType Directory | Out-Null
    Write-Host "Created backup directory: $backupDir"
}

# List of directories to check for emptiness
$dirsToCheck = @(
    "src\components\gdpr",
    "src\components\security",
    "src\services\security\scanning",
    "src\services\security",
    "src\pages\gdpr",
    "src\pages\security"
)

# Check each directory recursively
foreach ($dir in $dirsToCheck) {
    if (Test-Path $dir) {
        # Check if the directory is empty or only contains empty directories
        $isEmpty = $true
        $items = Get-ChildItem -Path $dir -Recurse -Force
        
        foreach ($item in $items) {
            if ($item.PSIsContainer -eq $false) {
                # It's a file, so the directory is not empty
                $isEmpty = $false
                break
            }
        }
        
        if ($isEmpty) {
            Write-Host "Directory is empty or contains only empty subdirectories: $dir" -ForegroundColor Yellow
            
            # Create a placeholder file in the backup directory to document the structure
            $targetDir = Join-Path -Path $backupDir -ChildPath $dir
            if (-not (Test-Path $targetDir)) {
                New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
            }
            
            # Create a placeholder file to document the removed directory
            $placeholderFile = Join-Path -Path $targetDir -ChildPath "directory_was_empty.txt"
            Set-Content -Path $placeholderFile -Value "This directory was empty and was removed during cleanup on $(Get-Date)."
            
            # Remove the empty directory
            Remove-Item -Path $dir -Recurse -Force
            Write-Host "Removed empty directory: $dir" -ForegroundColor Green
        } else {
            Write-Host "Directory contains files: $dir" -ForegroundColor Gray
        }
    } else {
        Write-Host "Directory does not exist: $dir" -ForegroundColor Gray
    }
}

Write-Host "Done! Empty directories have been removed and documented in $backupDir."
Write-Host "If the application works correctly, you can delete the backup directories." 