/**
 * Hooks Index
 * 
 * This file exports all hooks from the hooks directory for easier imports.
 * Instead of importing individual hooks, you can import them from '@/hooks'.
 * 
 * Example:
 * ```tsx
 * import { useDialogHelpers, useDialogCleanup } from '@/hooks';
 * 
 * function MyComponent() {
 *   const { showConfirm, showAlert } = useDialogHelpers();
 *   useDialogCleanup();
 *   
 *   // ...
 * }
 * ```
 */

// Dialog Hooks
export * from './useDialogHelpers';
export * from './useDialogCleanup';

// Add other hooks as they are created
// export * from './useOtherHook'; 