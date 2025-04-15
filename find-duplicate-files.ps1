# find-duplicate-files.ps1
# Script to find duplicate files in the src directory

Write-Host "Searching for duplicate files in the src directory..." -ForegroundColor Cyan

# Create a results directory
$resultsDir = "duplicate-files-report-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null
Write-Host "Created results directory: $resultsDir" -ForegroundColor Green

# Function to check if two files have the same content
function Compare-FileContent {
    param (
        [string]$File1,
        [string]$File2
    )
    
    $content1 = Get-Content -Path $File1 -Raw
    $content2 = Get-Content -Path $File2 -Raw
    
    return $content1 -eq $content2
}

# Get all source code files
$files = Get-ChildItem -Path ./src -Recurse -File -Include "*.ts", "*.tsx", "*.js", "*.jsx", "*.css", "*.scss", "*.html"

# Group files by hash to find potential duplicates
$filesByHash = $files | Get-FileHash | Group-Object -Property Hash

# Filter to find only duplicates
$duplicateGroups = $filesByHash | Where-Object { $_.Count -gt 1 }

if ($duplicateGroups.Count -gt 0) {
    Write-Host "Found $($duplicateGroups.Count) groups of duplicate files" -ForegroundColor Yellow
    
    $duplicateReport = @()
    $duplicateCount = 0
    
    # Process each group of duplicates
    foreach ($group in $duplicateGroups) {
        $filesInGroup = $group.Group | Select-Object -ExpandProperty Path
        
        # Create a group entry for the report
        $groupInfo = [PSCustomObject]@{
            Hash = $group.Name
            Files = $filesInGroup -join "`n"
            FileCount = $filesInGroup.Count
        }
        
        $duplicateReport += $groupInfo
        $duplicateCount += $filesInGroup.Count - 1
        
        # Write details to console
        Write-Host "`nDuplicate Group (Hash: $($group.Name))" -ForegroundColor Magenta
        foreach ($file in $filesInGroup) {
            Write-Host "  $file" -ForegroundColor Yellow
        }
    }
    
    # Export the report to CSV
    $reportPath = Join-Path -Path $resultsDir -ChildPath "duplicate-files-report.csv"
    $duplicateReport | Export-Csv -Path $reportPath -NoTypeInformation
    
    # Create a summary text file
    $summaryPath = Join-Path -Path $resultsDir -ChildPath "duplicate-files-summary.txt"
    
    "Duplicate Files Report" | Out-File -FilePath $summaryPath
    "======================" | Out-File -FilePath $summaryPath -Append
    "Generated: $(Get-Date)" | Out-File -FilePath $summaryPath -Append
    "Total duplicate groups: $($duplicateGroups.Count)" | Out-File -FilePath $summaryPath -Append
    "Total duplicate files: $duplicateCount" | Out-File -FilePath $summaryPath -Append
    "" | Out-File -FilePath $summaryPath -Append
    
    foreach ($group in $duplicateGroups) {
        "Duplicate Group (Hash: $($group.Name))" | Out-File -FilePath $summaryPath -Append
        $group.Group | ForEach-Object {
            "  $($_.Path)" | Out-File -FilePath $summaryPath -Append
        }
        "" | Out-File -FilePath $summaryPath -Append
    }
    
    Write-Host "`nDuplicate files report generated at:" -ForegroundColor Green
    Write-Host "  CSV: $reportPath" -ForegroundColor Green
    Write-Host "  Summary: $summaryPath" -ForegroundColor Green
    Write-Host "`nTotal duplicate groups: $($duplicateGroups.Count)" -ForegroundColor Cyan
    Write-Host "Total duplicate files: $duplicateCount" -ForegroundColor Cyan
}
else {
    Write-Host "No duplicate files found in the src directory." -ForegroundColor Green
    "No duplicate files found in the src directory." | Out-File -FilePath (Join-Path -Path $resultsDir -ChildPath "no-duplicates.txt")
} 