# CustomerForm Refactoring Plan

## Current State
- CustomerForm.tsx is 1284 lines long (well over the 500-line target)
- The component handles customer creation, editing, validation, and duplicate detection
- It includes contact management functionality
- Contains multiple utility functions and complex logic

## Refactoring Approach

### 1. Extract Types and Interfaces
- Move all interfaces (CustomerFormProps, CustomerFormSubmissionData, Customer) to a separate file
- Create a types directory for customer-related types

### 2. Extract Utility Functions
- Move validation-related functions to a dedicated file
- Extract customer-related utility functions to a separate file
- Create formatting utilities for fields like phone numbers

### 3. Create Specialized Components
- **ContactManagement**: Extract all contact-related functionality
- **DuplicateDetection**: Extract duplicate checking functionality
- **CustomerFormFields**: Extract form field rendering logic
- **CustomerFormActions**: Extract action buttons and related handlers

### 4. State Management Refinement
- Create a CustomerFormProvider for centralized state management
- Split form state into logical groups
- Move API-related functions to a service layer

### 5. Reorganize Main Component Structure
- Main component should only handle orchestration logic
- Coordinate between the extracted components
- Keep UI rendering clean and minimal

## Files to Create

1. **Types:**
   - `src/components/customers/types/customerTypes.ts`

2. **Utils:**
   - `src/components/customers/utils/customerFormUtils.ts`
   - `src/components/customers/utils/customerValidation.ts`

3. **Components:**
   - `src/components/customers/CustomerFormProvider.tsx`
   - `src/components/customers/CustomerFormFields.tsx`
   - `src/components/customers/CustomerContactManagement.tsx`
   - `src/components/customers/CustomerDuplicateDetection.tsx`
   - `src/components/customers/CustomerFormActions.tsx`

4. **Services:**
   - `src/components/customers/services/customerFormService.ts`

## Implementation Steps

1. Create type definitions first
2. Extract utility functions next
3. Create the new component files
4. Refactor the main CustomerForm.tsx file to use the extracted components
5. Test each component individually and then the integrated system
6. Ensure all functionality works as before

## Testing Plan

- Verify customer creation works correctly
- Test form validation functionality
- Ensure duplicate detection works as expected
- Test contact management features
- Verify all state updates function properly 