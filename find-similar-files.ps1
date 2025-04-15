# find-similar-files.ps1
# Script to find files with similar content in the src directory

Write-Host "Searching for similar files in the src directory..." -ForegroundColor Cyan

# Create a results directory
$resultsDir = "similar-files-report-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null
Write-Host "Created results directory: $resultsDir" -ForegroundColor Green

# Function to compare two files line by line and return similarity percentage
function Get-FileSimilarity {
    param (
        [string]$File1,
        [string]$File2
    )
    
    $lines1 = Get-Content -Path $File1
    $lines2 = Get-Content -Path $File2
    
    if ($lines1.Count -eq 0 -or $lines2.Count -eq 0) {
        return 0
    }
    
    $matchingLines = 0
    
    foreach ($line1 in $lines1) {
        $line1Trimmed = $line1.Trim()
        
        if ($line1Trimmed -eq "" -or $line1Trimmed.StartsWith("//") -or $line1Trimmed.StartsWith("/*") -or $line1Trimmed.StartsWith("*")) {
            continue  # Skip empty lines and comments
        }
        
        foreach ($line2 in $lines2) {
            $line2Trimmed = $line2.Trim()
            
            if ($line2Trimmed -eq "" -or $line2Trimmed.StartsWith("//") -or $line2Trimmed.StartsWith("/*") -or $line2Trimmed.StartsWith("*")) {
                continue  # Skip empty lines and comments
            }
            
            if ($line1Trimmed -eq $line2Trimmed) {
                $matchingLines++
                break  # Found a match, move to the next line1
            }
        }
    }
    
    $totalLines = $lines1.Count + $lines2.Count
    $nonEmptyLines1 = $lines1 | Where-Object { $_.Trim() -ne "" -and -not $_.Trim().StartsWith("//") -and -not $_.Trim().StartsWith("/*") -and -not $_.Trim().StartsWith("*") } | Measure-Object | Select-Object -ExpandProperty Count
    $nonEmptyLines2 = $lines2 | Where-Object { $_.Trim() -ne "" -and -not $_.Trim().StartsWith("//") -and -not $_.Trim().StartsWith("/*") -and -not $_.Trim().StartsWith("*") } | Measure-Object | Select-Object -ExpandProperty Count
    
    $nonEmptyTotal = $nonEmptyLines1 + $nonEmptyLines2
    
    if ($nonEmptyTotal -eq 0) {
        return 0
    }
    
    return [math]::Round(($matchingLines / $nonEmptyTotal) * 100, 2)
}

# Get TypeScript and JavaScript files only
$files = Get-ChildItem -Path ./src -Recurse -File -Include "*.ts", "*.tsx", "*.js", "*.jsx" -Exclude "*.d.ts"

Write-Host "Found $($files.Count) source files to analyze" -ForegroundColor Cyan

# Similarity threshold (%)
$similarityThreshold = 70

# Create an array to store similar file pairs
$similarFilePairs = @()

$totalComparisons = ($files.Count * ($files.Count - 1)) / 2
$currentComparison = 0
$similarCount = 0

# Compare each file with every other file
for ($i = 0; $i -lt $files.Count; $i++) {
    for ($j = $i + 1; $j -lt $files.Count; $j++) {
        $currentComparison++
        
        # Calculate progress percentage
        $progressPercentage = [math]::Round(($currentComparison / $totalComparisons) * 100, 1)
        
        # Display progress every 100 comparisons
        if ($currentComparison % 100 -eq 0 -or $currentComparison -eq $totalComparisons) {
            Write-Progress -Activity "Comparing files" -Status "$progressPercentage% Complete" -PercentComplete $progressPercentage
        }
        
        # Skip comparing files in the same directory with the same base name but different extensions
        $baseNameI = [System.IO.Path]::GetFileNameWithoutExtension($files[$i].Name)
        $baseNameJ = [System.IO.Path]::GetFileNameWithoutExtension($files[$j].Name)
        $dirI = $files[$i].DirectoryName
        $dirJ = $files[$j].DirectoryName
        
        if ($dirI -eq $dirJ -and $baseNameI -eq $baseNameJ) {
            continue
        }
        
        # Get file similarity
        $similarity = Get-FileSimilarity -File1 $files[$i].FullName -File2 $files[$j].FullName
        
        # If similarity exceeds threshold, add to the similar files list
        if ($similarity -ge $similarityThreshold) {
            $similarCount++
            $similarFilePairs += [PSCustomObject]@{
                File1 = $files[$i].FullName
                File2 = $files[$j].FullName
                SimilarityPercentage = $similarity
            }
            
            Write-Host "Similar files found:" -ForegroundColor Yellow
            Write-Host "  $($files[$i].FullName)" -ForegroundColor Cyan
            Write-Host "  $($files[$j].FullName)" -ForegroundColor Cyan
            Write-Host "  Similarity: $similarity%" -ForegroundColor Magenta
            Write-Host ""
        }
    }
}

Write-Progress -Activity "Comparing files" -Completed

# Export the results
if ($similarFilePairs.Count -gt 0) {
    # Sort by similarity (descending)
    $sortedPairs = $similarFilePairs | Sort-Object -Property SimilarityPercentage -Descending
    
    # Export to CSV
    $csvPath = Join-Path -Path $resultsDir -ChildPath "similar-files-report.csv"
    $sortedPairs | Export-Csv -Path $csvPath -NoTypeInformation
    
    # Create a summary text file
    $summaryPath = Join-Path -Path $resultsDir -ChildPath "similar-files-summary.txt"
    
    "Similar Files Report" | Out-File -FilePath $summaryPath
    "====================" | Out-File -FilePath $summaryPath -Append
    "Generated: $(Get-Date)" | Out-File -FilePath $summaryPath -Append
    "Similarity Threshold: $similarityThreshold%" | Out-File -FilePath $summaryPath -Append
    "Total Files Analyzed: $($files.Count)" | Out-File -FilePath $summaryPath -Append
    "Total Similar File Pairs: $($sortedPairs.Count)" | Out-File -FilePath $summaryPath -Append
    "" | Out-File -FilePath $summaryPath -Append
    
    $sortedPairs | ForEach-Object {
        "Similar Files: $($_.SimilarityPercentage)% similar" | Out-File -FilePath $summaryPath -Append
        "  $($_.File1)" | Out-File -FilePath $summaryPath -Append
        "  $($_.File2)" | Out-File -FilePath $summaryPath -Append
        "" | Out-File -FilePath $summaryPath -Append
    }
    
    Write-Host "`nSimilar files report generated at:" -ForegroundColor Green
    Write-Host "  CSV: $csvPath" -ForegroundColor Green
    Write-Host "  Summary: $summaryPath" -ForegroundColor Green
    Write-Host "`nTotal similar file pairs found: $($sortedPairs.Count)" -ForegroundColor Yellow
}
else {
    Write-Host "No similar files found that exceed the $similarityThreshold% similarity threshold." -ForegroundColor Green
    "No similar files found that exceed the $similarityThreshold% similarity threshold." | Out-File -FilePath (Join-Path -Path $resultsDir -ChildPath "no-similar-files.txt")
} 