# Utility Functions Directory

This directory contains utility functions used throughout the K-Flow application. All utilities are designed to be reusable, maintainable, and well-documented.

## Recent Cleanup Changes

- ✅ Removed unused example components
- ✅ Enhanced documentation for utility modules with usage examples
- ✅ Added file references to help locate where utilities are being used
- ✅ Documented relationship between related utility files
- ✅ Added migration plan for consolidated validation module

## Directory Structure and Module Relationships

### Core Utilities
- `index.ts` - Main entry point that exports all utilities
- `formatUtils.ts` - Date, number, and text formatting utilities
- `stringUtils.ts` - String manipulation utilities
- `textUtils.ts` - Text processing utilities

### Validation
- `validationUtils.ts` - Pure validation functions for data
- `formValidation.ts` - React-specific form validation hooks
- `validationModule.ts` - Consolidated validation utilities (migration in progress)

### UI and Styling
- `styleUtils.ts` - Common styling utilities used with Tailwind CSS

### Event Handling
- `eventUtils.ts` - Type-safe custom event system

### Logging and Error Handling
- `loggingUtils.ts` - Configurable logging system
- `errorUtils.ts` - Error handling utilities
- `suppressWarnings.ts` - Warning suppression utilities

### API Communication
- `apiUtils.ts` - API request utilities

## Best Practices for Utility Functions

1. Keep each utility function focused on a single responsibility
2. Use descriptive names for functions and parameters
3. Document each function with JSDoc comments including:
   - Purpose
   - Parameters and return values
   - Usage examples
   - Files where the utility is used
4. Write pure functions where possible
5. Add proper typings for all functions
6. Include error handling where appropriate

## Adding New Utility Functions

When adding new utility functions:

1. Determine if the function belongs in an existing utility file
2. If not, create a new file with a clear, descriptive name
3. Document the function thoroughly
4. Export the function from the appropriate file
5. Add the export to `index.ts` if it should be available globally

## Consolidation Strategy

To reduce code duplication and improve maintainability:

1. Identify similar functions across the codebase
2. Refactor them into a single, flexible utility function
3. Update all references to use the new utility
4. Document the utility to make it discoverable

## Usage

Import utilities in one of two ways:

```typescript
// Import specific utilities
import { formatDate, truncateText } from '@/utils';

// Or import as a namespace
import { utils } from '@/utils';
utils.format.formatDate('2023-01-01');
```

## Available Utilities

| Module | Description | Status |
|--------|-------------|--------|
| `formatUtils.ts` | Date, number, and text formatting utilities | ✅ Complete |
| `stringUtils.ts` | String manipulation and text processing | ✅ Complete |
| `formValidation.ts` | Form validation utilities and hooks | ✅ Complete |
| `validationUtils.ts` | General validation functions | ✅ Complete |
| `loggingUtils.ts` | Enhanced logging capabilities | ✅ Complete |
| `errorUtils.ts` | Standardized error handling | ✅ Complete |
| `apiUtils.ts` | API interaction helpers | ✅ Complete |
| `eventUtils.ts` | Custom event management | ✅ Complete |
| `suppressWarnings.ts` | Console warning management | ✅ Complete |

## Index

The `index.ts` file provides a unified access point for all utility functions and includes a setup function that initializes utilities that require initialization.

```typescript
// Import everything from a single point
import utils, { setupUtilities } from '../utils';

// Initialize all utilities
setupUtilities();

// Use utilities with namespace
utils.format.formatDate(new Date());
utils.validate.validateEmail('user@example.com');

// Or import specific functions
import { formatDate, validateEmail } from '../utils';
formatDate(new Date());
validateEmail('user@example.com');
```

## Validation Utilities

The `validationUtils.ts` module provides comprehensive data validation beyond form validation. These utilities ensure consistent validation logic across the application.

### Key Features

- Type-safe validation functions with consistent result format
- Support for common data types (email, URL, phone, etc.)
- Greek-specific validations (AFM, VAT, phone numbers)
- Composable validation with `validateMultiple`

### Usage Examples

**Basic Usage**:

```typescript
import { validateEmail, validatePhone } from '../utils';

// Email validation
const emailResult = validateEmail('user@example.com');
if (!emailResult.isValid) {
  console.error(emailResult.message); // Shows error message if invalid
}

// Phone validation
const phoneResult = validatePhone('6912345678', true); // requireMobilePrefix = true
```

**Multiple Validations**:

```typescript
import { validateMultiple, validateRequired, validateEmail, validateLength } from '../utils';

const validateUserInput = (value: string) => {
  return validateMultiple(value, [
    (v) => validateRequired(v),
    (v) => validateEmail(v),
    (v) => validateLength(v, 5, 100)
  ]);
};

const result = validateUserInput(''); 
// Returns first error: "Value is required"
```

**Greek Tax ID (AFM) Validation**:

```typescript
import { validateAfm } from '../utils';

const afmResult = validateAfm('123456789');
if (!afmResult.isValid) {
  console.error(afmResult.message); // Shows detailed error about AFM format
}
```

### Available Validators

| Validator | Description | Example Use Case |
|-----------|-------------|-----------------|
| `validateEmail` | Validates email format | User registration, contact forms |
| `validateUrl` | Validates URL format | Website input fields |
| `validateAfm` | Validates Greek Tax ID format | Customer registration |
| `validateVat` | Validates Greek VAT number | Invoice creation |
| `validatePhone` | Validates phone number format | Contact information |
| `validateDate` | Validates date format | Event scheduling |
| `validateRange` | Validates numeric range | Quantity inputs |
| `validatePositiveNumber` | Validates positive numbers | Price inputs |
| `validatePercentage` | Validates percentage values | Discount inputs |
| `validateAlphanumeric` | Validates alphanumeric text | Username validation |
| `validateRequired` | Validates non-empty values | Required fields |
| `validateLength` | Validates text length | Password policies |
| `validateMultiple` | Combines multiple validations | Complex form validation |

## Form Validation

The `formValidation.ts` module provides form-specific validation utilities, including:

- Custom validation message setup
- Standardized validation patterns
- Form field validation hooks

## Error Handling Utilities

The `errorUtils.ts` module provides a standardized approach to error handling throughout the application:

### Key Features

- Consistent error categorization with `ErrorType` enum
- Standardized error response format
- Supabase-specific error handling
- Form error handling
- User-friendly error messages
- Network error detection

### Usage Examples

**Basic Error Creation**:

```typescript
import { createError, ErrorType } from '@/utils/errorUtils';

// Create a validation error with detailed information
const error = createError(
  "Email format is invalid",
  ErrorType.VALIDATION,
  originalError,
  400,
  { field: "email" }
);
```

**Handling Supabase Errors**:

```typescript
import { handleSupabaseError } from '@/utils/errorUtils';

try {
  const { data, error } = await supabase.from('customers').select('*');
  
  if (error) {
    // Convert Supabase error to standardized format with user-friendly message
    const handledError = handleSupabaseError(error, 'fetching customers');
    showError(handledError.message);
    return;
  }
  
  // Process data...
} catch (err) {
  const handledError = handleSupabaseError(err, 'fetching customers');
  showError(handledError.message);
}
```

**User-Facing Error Messages**:

```typescript
import { getUserErrorMessage } from '@/utils/errorUtils';

try {
  // Some operation that might fail
} catch (error) {
  // Convert any error type to a user-friendly title and message
  const { title, message } = getUserErrorMessage(error, 'Operation Failed');
  
  // Show in UI
  showErrorDialog(title, message);
}
```

**Form Error Handling**:

```typescript
import { handleFormError } from '@/utils/errorUtils';

const handleSubmit = async (data) => {
  try {
    await saveCustomer(data);
    showSuccess("Customer saved successfully");
  } catch (error) {
    // Handle form-specific errors, including field validations
    const handledError = handleFormError(error, 'customer');
    
    // Show general error message
    setFormError(handledError.message);
    
    // Extract and set field-specific errors
    const fieldErrors = getFieldErrors(error);
    Object.entries(fieldErrors).forEach(([field, message]) => {
      setError(field, { message });
    });
  }
};
```

### Available Error Utilities

| Utility | Description | Example Use Case |
|---------|-------------|-----------------|
| `createError` | Creates standardized error objects | Base error creation |
| `handleSupabaseError` | Handles Supabase-specific errors | Database operations |
| `handleFormError` | Processes form submission errors | Form submissions |
| `getUserErrorMessage` | Creates user-friendly error messages | UI error displays |
| `isNetworkError` | Detects network connectivity issues | Offline handling |
| `getFieldErrors` | Extracts field-specific errors | Form validation |

## API Utilities

The `apiUtils.ts` module provides helpers for API interactions:

- Error handling
- Response formatting
- Request helpers

## Logging Utilities

The `loggingUtils.ts` module enhances console logging with:

- Log level control
- Formatted error logging
- Environment-aware logging

## Event Utilities

The `eventUtils.ts` module provides a custom event system:

- Type-safe event creation
- Event subscription management
- Cross-component communication 