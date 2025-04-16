# Script to remove unused files from the codebase
# These files are causing errors and are not used anywhere in the application

# Monitoring-related files
$files = @(
    # Admin components
    "src\components\admin\DatabasePerformanceDashboard.tsx",
    "src\components\admin\QueryOptimizationCard.tsx",
    
    # Analytics components
    "src\components\analytics\CustomerSegmentAnalytics.tsx",
    "src\components\analytics\FormAnalyticsDashboard.tsx",
    "src\components\analytics\FormErrorAnalytics.tsx",
    
    # Audit components
    "src\components\audit\AuditTrailDashboard.tsx",
    "src\components\audit\AuditTrailDetail.tsx",
    "src\components\audit\AuditTrailFilters.tsx",
    "src\components\audit\AuditTrailsList.tsx",
    "src\components\audit\AuditTrailStats.tsx",
    "src\components\audit\AuditTrailTimeline.tsx",
    
    # GDPR components
    "src\components\gdpr\CookieBanner.tsx",
    "src\components\gdpr\GDPRDemoSection.tsx",

    # Monitoring components
    "src\components\monitoring\ApiEndpointDetails.tsx",
    "src\components\monitoring\ApiPerformanceDashboard.tsx",
    "src\components\monitoring\ComponentMetrics.tsx",
    "src\components\monitoring\DatabasePerformanceDashboard.tsx",
    "src\components\monitoring\FormPerformanceMetrics.tsx",
    "src\components\monitoring\FrontendPerformanceDashboard.tsx",
    "src\components\monitoring\NetworkRequestMetrics.tsx",
    "src\components\monitoring\PageLoadMetrics.tsx",
    
    # Admin layout components that use the monitoring pages
    "src\components\layout\AdminLayout.tsx",
    
    # Security scanning services
    "src\services\security\scanning\codeSecurityService.ts",
    "src\services\security\scanning\dependencySecurityService.ts",
    "src\services\security\scanning\patchManagementService.ts",
    "src\services\security\scanning\vulnerabilityScanningService.ts",
    "src\services\securityScanningService.ts",
    
    # Monitoring services
    "src\services\monitoring\apiPerformanceMiddleware.ts",
    "src\services\monitoring\apiPerformanceService.ts",
    "src\services\monitoring\databasePerformanceService.ts",
    "src\services\monitoring\frontendPerformanceService.ts",
    "src\services\monitoring\index.ts",
    
    # Analytics services
    "src\services\analytics\formAnalyticsService.ts",
    "src\services\formErrorTrackingService.ts",
    "src\services\formTrackingService.ts",
    "src\services\gdprComplianceService.ts",
    
    # Pages
    "src\pages\admin\analytics\form-analytics.tsx",
    "src\pages\admin\monitoring\database-performance.tsx",
    "src\pages\analytics\forms.tsx",
    "src\pages\api\analytics\form-submission.ts",
    "src\pages\api\form-error-alert.ts",
    "src\pages\api\monitoring\performance.ts",
    "src\pages\api\track-form-abandonment.ts",
    "src\pages\audit.tsx",
    "src\pages\gdpr\admin.tsx",
    "src\pages\gdpr\data-request.tsx",
    "src\pages\gdpr\demo.tsx",
    "src\pages\gdpr\privacy-policy.tsx",
    "src\pages\monitoring\api-performance.tsx",
    "src\pages\monitoring\frontend-performance.tsx",
    "src\pages\security\scanning.tsx"
)

# Create a backup directory
$backupDir = "unused-files-backup"
if (-not (Test-Path $backupDir)) {
    New-Item -Path $backupDir -ItemType Directory | Out-Null
    Write-Host "Created backup directory: $backupDir"
}

# Auto-proceed with 'y' to avoid interactive prompt
$confirmation = 'y'

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

Write-Host "Done! Files have been moved to the $backupDir directory."
Write-Host "If the application works correctly, you can delete the backup directory later." 