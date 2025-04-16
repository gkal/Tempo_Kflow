# Reusable Delete Confirmation Dialog

This PR introduces a reusable delete confirmation dialog component and hook that can be used consistently across the application.

## Changes

### New Components and Utilities

1. **DeleteConfirmationDialog Component** (`src/components/ui/DeleteConfirmationDialog.tsx`)
   - A standalone component that can be used directly in React components
   - Handles all states of the delete operation (idle, deleting, success, error)
   - Provides customizable title, description, buttons, and messages
   - Auto-closes on success with a configurable delay

2. **useDeleteConfirmation Hook** (`src/utils/ui/useDeleteConfirmation.tsx`)
   - A React hook for more advanced use cases and state management
   - Encapsulates all the dialog state logic in a single hook
   - Returns both the dialog component and utility functions (open, close, etc.)

3. **Documentation and Examples**
   - Added documentation in `src/components/ui/README.md` with usage examples
   - Created an example component in `src/components/customers/DeleteOfferExample.tsx`

### Implementation in Existing Code

The new components have been implemented in:

1. **CustomersPage.tsx**
   - Replaced both delete confirmation dialogs (offer and customer) with the new reusable component
   - Removed redundant state variables and simplified the delete confirmation logic
   - Added proper error handling and success callbacks

## Benefits

1. **Consistency**: All delete confirmations now follow the same pattern and share the same visual style
2. **Reduced Boilerplate**: Less code needed to implement delete confirmations across the codebase
3. **Improved User Experience**: Consistent feedback for delete operations (loading state, success messages, error handling)
4. **Better Maintainability**: Changes to delete confirmation behavior can be made in one place
5. **Type Safety**: Fully typed with TypeScript for better developer experience

## Usage Examples

### Component-based Approach:

```tsx
<DeleteConfirmationDialog
  open={showDeleteDialog}
  onOpenChange={setShowDeleteDialog}
  onDelete={handleDelete}
  onSuccess={() => {
    // Handle successful deletion
  }}
  title="Delete Item"
  description="Are you sure you want to delete this item?"
/>
```

### Hook-based Approach:

```tsx
const { 
  open: openDeleteDialog,
  DeleteConfirmationDialog
} = useDeleteConfirmation({
  onDelete: async () => {
    // Delete logic here
  },
  onSuccess: () => {
    // Success callback
  }
});

// In your component:
<Button onClick={openDeleteDialog}>Delete</Button>
<DeleteConfirmationDialog />
```

## Testing

The new components have been tested with:
- Delete offer confirmation in the Customers page
- Delete customer confirmation in the Customers page
- Various error conditions and success scenarios

All dialogs now show proper loading states, success messages, and handle errors consistently. 