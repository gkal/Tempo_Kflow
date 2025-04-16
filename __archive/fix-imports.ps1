# Script to fix potential import problems after removing unused files

# Create a log directory
$logDir = "import-fixes-log"
if (-not (Test-Path $logDir)) {
    New-Item -Path $logDir -ItemType Directory | Out-Null
    Write-Host "Created log directory: $logDir"
}

# Files that might need fixing
$filesToCheck = @(
    # Services that might import removed files
    "src\services\offerCreationService.ts",
    "src\services\formApiService.ts",
    
    # Main app component
    "src\App.tsx",
    
    # Components with potential import issues
    "src\components\home.tsx",
    "src\components\forms\CustomerForm.tsx",
    "src\components\forms\MobileCustomerForm.tsx",
    "src\components\forms\FormLinksTable.tsx",
    
    # Layout files
    "src\components\layout\Layout.tsx"
)

Write-Host "Checking files for potential import issues:"
foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        Write-Host "  Checking $file"
        
        # Create a backup of the file
        $backupFile = Join-Path -Path $logDir -ChildPath (Split-Path -Path $file -Leaf)
        Copy-Item -Path $file -Destination $backupFile -Force
        
        # Read the file content
        $content = Get-Content -Path $file -Raw
        
        # Check for imports to removed files
        $modifiedContent = $content
        
        # Replace imports for removed monitoring components
        $modifiedContent = $modifiedContent -replace "import .*ApiPerformanceAlerts.*from .*;\r?\n", ""
        
        # Replace imports for removed security components
        $modifiedContent = $modifiedContent -replace "import .*SecurityScanningDashboard.*from .*;\r?\n", ""
        
        # Replace imports for removed hooks
        $modifiedContent = $modifiedContent -replace "import .*useFormErrorTracking.*from .*;\r?\n", ""
        $modifiedContent = $modifiedContent -replace "import .*usePerformanceMonitoring.*from .*;\r?\n", ""
        
        # Check if content was modified
        if ($modifiedContent -ne $content) {
            # Save the modified content
            Set-Content -Path $file -Value $modifiedContent
            Write-Host "    - Fixed imports in $file" -ForegroundColor Green
        } else {
            Write-Host "    - No issues found" -ForegroundColor Gray
        }
    } else {
        Write-Host "  $file not found" -ForegroundColor Yellow
    }
}

Write-Host "Done checking files for import issues. Backups saved to $logDir" 