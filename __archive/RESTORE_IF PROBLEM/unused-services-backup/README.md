# Unused Services Backup

This directory contains service files that were removed from the codebase because they didn't appear to be used in the active application.

## Services Removed

1. **customerOfferService.ts**
   - This service wasn't imported anywhere in the active codebase
   - It appears to be a service for handling customer offers, but its functionality may have been migrated to other services

2. **sessionService.ts**
   - This service was only imported in files that were previously removed (audit components)
   - It appears to handle session management and user permissions, but those functions might be handled elsewhere now

## Careful Analysis

Before removing these services, we carefully analyzed the codebase to determine which service files were actually being used:

1. **Services that are used and kept:**
   - customerFormService - Used by multiple components and other services
   - formApiService - Used by form components for API calls
   - formLinkService - Used by customer form service and other services
   - offerCreationService - Referenced by customerFormService
   - offerFormService - Referenced by emailService

2. **Services that were removed:**
   - customerOfferService - No active imports found
   - sessionService - Only imported in already removed files

## Restoration

If you find that any of these services are actually needed, they can be restored from this backup directory. They maintain their original directory structure for easy restoration. 