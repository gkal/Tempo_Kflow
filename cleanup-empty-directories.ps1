# cleanup-empty-directories.ps1
# Script to remove empty directories after cleaning up unused files

# Create a backup directory for documentation
$backupDir = "empty-directories-removal-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "Created documentation directory: $backupDir" -ForegroundColor Green

# Function to check if a directory is empty
function Test-EmptyDirectory {
    param (
        [string]$DirectoryPath
    )
    
    return (Get-ChildItem -Path $DirectoryPath -Recurse -File).Count -eq 0
}

# Find all empty directories
$emptyDirs = Get-ChildItem -Path . -Directory -Recurse | 
             Where-Object { Test-EmptyDirectory -DirectoryPath $_.FullName } |
             Select-Object -ExpandProperty FullName

# Document the empty directories
if ($emptyDirs.Count -gt 0) {
    $emptyDirsFile = Join-Path -Path $backupDir -ChildPath "empty-directories.txt"
    $emptyDirs | Out-File -FilePath $emptyDirsFile
    Write-Host "Found $($emptyDirs.Count) empty directories. List saved to $emptyDirsFile" -ForegroundColor Yellow
    
    # Ask for confirmation before removing
    Write-Host "The following empty directories will be removed:" -ForegroundColor Yellow
    $emptyDirs | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    
    # Remove the empty directories
    foreach ($dir in $emptyDirs) {
        if (Test-Path $dir) {
            try {
                Remove-Item -Path $dir -Force -Recurse
                Write-Host "Removed empty directory: $dir" -ForegroundColor Green
            }
            catch {
                Write-Host "Error removing directory $dir`: $_" -ForegroundColor Red
            }
        }
    }
}
else {
    Write-Host "No empty directories found." -ForegroundColor Green
}

Write-Host "Empty directory cleanup completed!" -ForegroundColor Green 