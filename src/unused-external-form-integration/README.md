# Unused External Form Integration

This folder contains files that were created for a potential cross-project form integration but were not integrated into the main application.

## Files in this folder:

1. `validate.ts` - API endpoint for validating form links from external applications
2. `submit.ts` - API endpoint for submitting form data from external applications 
3. `formLinkService-extended.ts` - Enhanced version of the FormLinkService with cross-project functionality
4. `formLinkService-types-extended.ts` - Enhanced types for cross-project form integration

## Functionality

These files implement a secure cross-project form integration system that would allow:

1. Generating form links tagged with external project IDs
2. External projects to validate form links via API
3. External projects to submit form data via API
4. Secure API key validation to ensure only authorized projects can access forms

This implementation was not integrated into the main application and is kept here for reference. 