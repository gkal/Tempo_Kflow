# K-Flow Utilities Guide

This guide provides comprehensive documentation for all utility modules in the K-Flow application. It includes usage examples, integration patterns, and file references for each utility.

## Table of Contents

1. [Overview](#overview)
2. [Import Patterns](#import-patterns)
3. [Core Utilities](#core-utilities)
   - [Format Utilities](#format-utilities)
   - [String Utilities](#string-utilities)
4. [Validation Utilities](#validation-utilities)
   - [Form Validation](#form-validation)
   - [Data Validation](#data-validation)
5. [Style Utilities](#style-utilities)
   - [Tailwind Class Utilities](#tailwind-class-utilities)
   - [Status & Result Styling](#status--result-styling)
   - [Component-Specific Styling](#component-specific-styling)
6. [Error & Logging Utilities](#error--logging-utilities)
   - [Error Handling](#error-handling)
   - [Logging](#logging)
   - [Warning Suppression](#warning-suppression)
7. [API & Event Utilities](#api--event-utilities)
   - [API Utilities](#api-utilities)
   - [Event Utilities](#event-utilities)
8. [Consolidation Guide](#consolidation-guide)
9. [Files Using Utilities](#files-using-utilities)

## Overview

The K-Flow application uses a set of utility modules to ensure consistent patterns, reduce code duplication, and make the codebase more maintainable. All utilities are accessible through a central entry point (`src/utils/index.ts`), which provides both individual function exports and a namespaced object.

## Import Patterns

There are two main ways to import utilities:

### 1. Importing Specific Functions

```typescript
import { formatDate, validateEmail } from '@/utils';

// Usage
const formattedDate = formatDate(new Date());
const emailResult = validateEmail('user@example.com');
```

### 2. Importing the Namespace

```typescript
import utils from '@/utils';

// Usage
const formattedDate = utils.format.formatDate(new Date());
const emailResult = utils.validate.validateEmail('user@example.com');
```

### 3. Initializing Utilities

```typescript
import { setupUtilities } from '@/utils';

// Initialize all utilities with default settings
setupUtilities();

// Or with custom configuration
setupUtilities({
  logging: { level: 'warn' },
  suppressWarnings: false
});
```

## Core Utilities

### Format Utilities

`formatUtils.ts` provides functions for formatting dates, numbers, and other values consistently throughout the application.

#### Key Functions

| Function | Description | Usage |
|----------|-------------|-------|
| `formatDate` | Formats a date as DD/MM/YYYY | `formatDate(new Date())` |
| `formatDateTime` | Formats a date and time as DD/MM/YYYY HH:MM:SS | `formatDateTime(new Date())` |
| `formatDateISO` | Formats a date as YYYY-MM-DD | `formatDateISO(new Date())` |
| `formatCurrency` | Formats a number as currency | `formatCurrency(1000)` → "1.000,00 €" |
| `formatNumber` | Formats a number with separators | `formatNumber(1000)` → "1,000" |
| `formatPhoneNumber` | Formats a phone number | `formatPhoneNumber('6912345678')` → "691 234 5678" |
| `safeFormatDateTime` | Safe date formatting with additional checks | `safeFormatDateTime("2023-06-05T14:30:00")` |
| `extractDateParts` | Extracts year, month, day from a date | `extractDateParts("2023-06-05")` |

#### Files Using Format Utilities

- `src/components/admin/RecoveryPage.tsx`
- `src/components/admin/ServiceTypesPage.tsx`
- `src/components/offers/OfferHistory.tsx`
- `src/components/offers/OffersPage.tsx`
- `src/components/customers/CustomersPage.tsx`
- `src/components/customers/CustomerDetailPage.tsx`
- `src/components/ui/data-table-base.tsx`

### String Utilities

`stringUtils.ts` provides functions for manipulating strings, such as truncation, capitalization, and other text operations.

#### Key Functions

| Function | Description | Usage |
|----------|-------------|-------|
| `truncate` | Truncates text to a specified length | `truncate('Long text', 10)` → "Long te..." |
| `capitalize` | Capitalizes the first letter of each word | `capitalize('hello world')` → "Hello World" |
| `slugify` | Converts a string to a URL-friendly slug | `slugify('Hello World')` → "hello-world" |
| `removeAccents` | Removes accents from Greek text | `removeAccents('Ελληνικά')` → "Ελληνικα" |
| `getInitials` | Gets initials from a name | `getInitials('John Doe')` → "JD" |
| `generateRandomString` | Generates a random string | `generateRandomString(8)` → "a1b2c3d4" |

#### Files Using String Utilities

- `src/components/customers/CustomerCard.tsx`
- `src/components/ui/TruncatedText.tsx`
- `src/components/ui/Avatar.tsx`
- `src/components/ui/GlobalTooltip.tsx`

## Validation Utilities

### Form Validation

`formValidation.ts` provides utilities specifically for form validation, including validation messages, patterns, and hooks.

#### Key Features

- **ValidationMessages**: Predefined validation messages in Greek
- **ValidationPatterns**: Regular expression patterns for common validations
- **ValidationRule Interface**: Type-safe validation rule definition
- **useFormValidation Hook**: React hook for form validation

#### Example Usage

```typescript
import { useFormValidation, ValidationMessages, ValidationPatterns } from '@/utils';

function MyForm() {
  const { 
    values, 
    errors, 
    handleChange, 
    validateForm 
  } = useFormValidation({
    name: '',
    email: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Form is valid, submit data
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={values.name}
        onChange={handleChange}
        required
      />
      {errors.name && <p>{errors.name.errorMessage}</p>}
      
      <input
        name="email"
        value={values.email}
        onChange={handleChange}
        pattern={ValidationPatterns.email.toString()}
      />
      {errors.email && <p>{errors.email.errorMessage}</p>}
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

#### Files Using Form Validation

- `src/components/ui/ValidatedInput.tsx`
- `src/components/ui/ValidatedTextarea.tsx`
- `src/components/ui/ValidatedSelect.tsx`
- `src/components/customers/CustomerForm.tsx`
- `src/components/offers/OfferForm.tsx`

### Data Validation

`validationUtils.ts` provides standalone validation functions for data validation outside of forms.

#### Key Functions

| Function | Description | Usage |
|----------|-------------|-------|
| `validateEmail` | Validates email format | `validateEmail('user@example.com')` |
| `validateUrl` | Validates URL format | `validateUrl('example.com')` |
| `validatePhone` | Validates phone number format | `validatePhone('6912345678')` |
| `validateAfm` | Validates Greek Tax ID (ΑΦΜ) | `validateAfm('123456789')` |
| `validateVat` | Validates Greek VAT number | `validateVat('EL123456789')` |
| `validateRequired` | Validates non-empty values | `validateRequired('value')` |
| `validateLength` | Validates text length | `validateLength('password', 8, 20)` |
| `validateMultiple` | Combines multiple validations | `validateMultiple(value, [validator1, validator2])` |

#### Files Using Data Validation

- `src/components/customers/CustomerForm.tsx`
- `src/components/settings/UserManagementDialog.tsx`
- `src/components/offers/OfferForm.tsx`
- `src/components/contacts/ContactDialog.tsx`

## Style Utilities

`styleUtils.ts` provides a unified set of utilities for styling components consistently across the application. It consolidates duplicate styling functions that were previously scattered throughout the codebase.

### Tailwind Class Utilities

These utilities help manage Tailwind CSS classes in a consistent way.

#### Key Functions

| Function | Description | Usage |
|----------|-------------|-------|
| `cn` | Combines class names with intelligent conflict resolution | `cn('text-red-500', isActive && 'text-blue-600')` |
| `classNames` | Combines class names from an object with boolean values | `classNames({ 'text-red-500': true, 'bg-blue-500': isActive })` |
| `deepFreeze` | Makes a style object immutable | `deepFreeze(styleObject)` |
| `getStyleValue` | Gets a value from a style object with proper typing | `getStyleValue(styles, 'colors', 'primary')` |

#### Example Usage

```typescript
import { cn, classNames } from '@/utils';

// Using cn for conditional classes
<button className={cn(
  'px-4 py-2 rounded', 
  isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
)}>
  Click me
</button>

// Using classNames for object-based conditional classes
<div className={classNames({
  'p-4': true,
  'bg-red-500': hasError,
  'bg-green-500': isSuccess
})}>
  Status indicator
</div>
```

### Status & Result Styling

These utilities provide consistent formatting and styling for status and result values used throughout the application.

#### Key Functions

| Function | Description | Usage |
|----------|-------------|-------|
| `formatStatus` | Formats a status code to a user-friendly string | `formatStatus('wait_for_our_answer')` → "Αναμονή για απάντησή μας" |
| `formatResult` | Formats a result code to a user-friendly string | `formatResult('success')` → "Επιτυχία" |
| `getStatusClass` | Gets Tailwind classes for styling a status | `getStatusClass('wait_for_our_answer')` → "bg-yellow-500/20 text-yellow-400" |
| `getResultClass` | Gets Tailwind classes for styling a result | `getResultClass('success')` → "bg-green-500/20 text-green-400" |

#### Example Usage

```typescript
import { cn, styles } from '@/utils';

// Displaying a status badge
<span className={cn('px-2 py-1 rounded-full text-xs', styles.getStatusClass(status))}>
  {styles.formatStatus(status)}
</span>

// Using with conditional rendering
{orderResult === 'success' && (
  <div className={styles.getResultClass('success')}>
    {styles.formatResult('success')}
  </div>
)}
```

### Component-Specific Styling

These utilities provide consistent styling for specific component types across the application.

#### Key Functions

| Function | Description | Usage |
|----------|-------------|-------|
| `getCloseButtonClasses` | Gets classes for close buttons | `getCloseButtonClasses('md')` |
| `getTooltipPositionClass` | Gets classes for tooltip positioning | `getTooltipPositionClass('top')` |

#### Example Usage

```typescript
import { styles } from '@/utils';

// Using close button styling
<button className={styles.getCloseButtonClasses('sm', false)}>
  <span className="sr-only">Close</span>
  <XIcon className="h-4 w-4" />
</button>

// Using tooltip position styling
<div className={styles.getTooltipPositionClass('bottom')}>
  Tooltip content
</div>
```

#### Files Using Style Utilities

- `src/components/ui/skeleton.tsx`
- `src/components/contacts/ContactCard.tsx`
- `src/components/customers/CustomerDetailPage.tsx`
- `src/components/ui/GlobalTooltip.tsx`
- `app/components/DataTableDetails.tsx`

## Error & Logging Utilities

### Error Handling

`errorUtils.ts` provides standardized error handling throughout the application.

#### Key Functions

| Function | Description | Usage |
|----------|-------------|-------|
| `createError` | Creates a standardized error object | `createError('Error message', ErrorType.VALIDATION)` |
| `handleSupabaseError` | Processes Supabase errors | `handleSupabaseError(error, 'fetching customers')` |
| `handleFormError` | Handles form submission errors | `handleFormError(error, 'customer')` |
| `getUserErrorMessage` | Gets user-friendly error message | `getUserErrorMessage(error, 'Operation Failed')` |
| `isNetworkError` | Detects network connectivity issues | `isNetworkError(error)` |
| `getFieldErrors` | Extracts field-specific errors | `getFieldErrors(error)` |

#### Files Using Error Utilities

- `src/components/customers/CustomerForm.tsx`
- `src/components/offers/OffersPage.tsx`
- `src/components/admin/RecoveryPage.tsx`
- `src/services/apiClient.ts`

### Logging

`loggingUtils.ts` provides enhanced logging capabilities with log levels and prefixed loggers.

#### Key Functions

| Function | Description | Usage |
|----------|-------------|-------|
| `configureLogging` | Configures global logging settings | `configureLogging({ level: LogLevel.INFO })` |
| `createLogger` | Creates a logger instance | `const logger = createLogger()` |
| `createPrefixedLogger` | Creates a prefixed logger | `const logger = createPrefixedLogger('Component')` |
| `logDebug`, `logInfo`, etc. | Log at specific levels | `logDebug('Debug message', data)` |

#### Files Using Logging Utilities

- `src/components/offers/OffersPage.tsx`
- `src/components/tasks/createTask.ts`
- `src/components/admin/RecoveryPage.tsx`
- `src/components/customers/CustomerForm.tsx`

### Warning Suppression

`suppressWarnings.ts` provides utilities to suppress known console warnings that are not actionable.

#### Key Functions

| Function | Description | Usage |
|----------|-------------|-------|
| `setupWarningSuppressions` | Sets up warning suppressions | `setupWarningSuppressions()` |
| `suppressConsoleForPatterns` | Suppresses specific patterns | `suppressConsoleForPatterns(['Pattern to suppress'])` |

## API & Event Utilities

### API Utilities

`apiUtils.ts` provides utilities for API interactions, including request formatting, response handling, and error processing.

#### Key Functions

| Function | Description | Usage |
|----------|-------------|-------|
| `createApiRequest` | Creates a standardized API request | `createApiRequest('/endpoint', { method: 'GET' })` |
| `handleApiResponse` | Processes API responses | `handleApiResponse(response)` |
| `formatApiError` | Formats API errors | `formatApiError(error)` |
| `retryRequest` | Retries failed requests | `retryRequest(requestFn, 3)` |

#### Files Using API Utilities

- `src/services/apiClient.ts`
- `src/components/customers/CustomerForm.tsx`
- `src/hooks/useApiData.ts`

### Event Utilities

`eventUtils.ts` provides a custom event system for cross-component communication.

#### Key Functions

| Function | Description | Usage |
|----------|-------------|-------|
| `dispatchEvent` | Dispatches a custom event | `dispatchEvent(AppEventType.CUSTOMER_UPDATED, data)` |
| `addEventListener` | Listens for custom events | `addEventListener(AppEventType.CUSTOMER_UPDATED, callback)` |
| `removeEventListener` | Removes event listener | `removeEventListener(subscription)` |
| `onceEvent` | Listens for event once | `onceEvent(AppEventType.CUSTOMER_UPDATED, callback)` |

#### Files Using Event Utilities

- `src/components/customers/CustomerDetailPage.tsx`
- `src/components/offers/OffersPage.tsx`
- `src/context/AppContext.tsx`

## Consolidation Guide

The following utilities have been consolidated to reduce duplication and ensure consistency:

### 1. Form and Data Validation

`formValidation.ts` and `validationUtils.ts` have been consolidated into `validationModule.ts`:

- All validation patterns are now in a single location
- A unified interface for validation results is established
- Consistent error messages are ensured across all validations
- Form-specific hooks are kept separate but use the same core validation

### 2. Style Utilities

Style utilities have been consolidated into `styleUtils.ts`:

- Unified the multiple implementations of `cn()` and `classNames()` functions
- Extracted status and result styling into dedicated functions
- Created component-specific style utilities for consistent styling
- Added comprehensive documentation and examples
- Created a namespaced export for cleaner imports

### 3. Date Formatting

While we've already consolidated some date formatting functions, additional functions exist in:
- Components that define their own local format functions
- Utility files outside the utils directory

These should be moved to `formatUtils.ts`.

## Files Using Utilities

Below is a list of files that heavily use our utility functions:

### Components

- `src/components/customers/CustomerForm.tsx`: Uses validation, error handling, and formatting utilities
- `src/components/offers/OffersPage.tsx`: Uses logging, error handling, and event utilities
- `src/components/admin/RecoveryPage.tsx`: Uses logging and error handling
- `src/components/ui/data-table-base.tsx`: Uses date formatting utilities
- `src/components/customers/CustomerDetailPage.tsx`: Uses formatting and event utilities

### Services

- `src/services/apiClient.ts`: Uses API utilities and error handling
- `src/services/customerService.ts`: Uses API and validation utilities
- `src/services/offerService.ts`: Uses API and error handling utilities

### Hooks

- `src/hooks/useApiData.ts`: Uses API utilities
- `src/hooks/usePhoneFormat.ts`: Uses format utilities
- `src/hooks/useFormValidation.ts`: Uses form validation utilities

## Using Utilities Effectively

### Best Practices

1. **Prefer the Utils Module**: Always import from `@/utils` rather than directly from utility files
2. **Use Namespaced Imports**: For related utilities, use the namespace import: `import utils from '@/utils'`
3. **Initialize Early**: Call `setupUtilities()` at application startup
4. **Consistent Error Handling**: Always use `errorUtils` for error handling
5. **Structured Logging**: Use `loggingUtils` instead of console.log
6. **Validation**: Use the appropriate validation utilities for your context (form vs. data) 