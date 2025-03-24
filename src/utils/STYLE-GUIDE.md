# K-Flow Style Utilities Guide

This guide covers the unified styling utilities available in the K-Flow application. These utilities help ensure consistent styling across the application and reduce duplicate code.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Tailwind Class Utilities](#tailwind-class-utilities)
3. [Status & Result Styling](#status--result-styling)
4. [Component-Specific Styling](#component-specific-styling)
5. [Migration Guide](#migration-guide)
6. [Best Practices](#best-practices)

## Getting Started

The style utilities are available through the `@/utils` import. You can import them individually or as a namespace:

```typescript
// Individual imports
import { cn, getStatusClass, formatStatus } from '@/utils';

// Namespace import
import { styles } from '@/utils';
```

## Tailwind Class Utilities

### The `cn()` Function

The `cn()` function is the primary utility for combining Tailwind classes with intelligent conflict resolution. It uses `clsx` to handle conditional classes and `tailwind-merge` to resolve conflicting utility classes.

```tsx
import { cn } from '@/utils';

// Basic usage
<div className={cn('p-4 text-center', isActive && 'bg-blue-500 text-white')}>
  Conditional styling
</div>

// Resolving conflicts
<div className={cn('p-2', isPadded && 'p-4')}>
  When isPadded is true, p-4 wins over p-2
</div>
```

### The `classNames()` Function

The `classNames()` function combines class names from an object with boolean values:

```tsx
import { styles } from '@/utils';

// Using classNames with an object
<div className={styles.classNames({
  'bg-gray-100': true,
  'text-red-500': hasError,
  'border-blue-500 border-2': isSelected,
})}>
  This div will always have a gray background,
  and conditionally have red text or blue border
</div>
```

## Status & Result Styling

The style utilities provide consistent styling for status and result indicators:

```tsx
import { cn, formatStatus, getStatusClass } from '@/utils';

// Displaying a status badge
<span className={cn('px-2 py-1 rounded-full text-sm', getStatusClass(status))}>
  {formatStatus(status)}
</span>
```

### Available Status Types

- `'pending'` - Blue styling, "Εκκρεμεί"
- `'processing'` - Purple styling, "Σε επεξεργασία"
- `'wait_for_our_answer'` - Yellow styling, "Αναμονή για απάντησή μας"
- `'completed'` - Green styling, "Ολοκληρώθηκε"
- `'canceled'` - Gray styling, "Ακυρώθηκε"
- `'rejected'` - Red styling, "Απορρίφθηκε"

### Available Result Types

- `'success'` - Green styling, "Επιτυχία"
- `'error'` - Red styling, "Σφάλμα"
- `'warning'` - Amber styling, "Προειδοποίηση"
- `'info'` - Blue styling, "Πληροφορία"
- `'neutral'` - Slate styling, "Ουδέτερο"

## Component-Specific Styling

### Close Buttons

```tsx
import { styles } from '@/utils';

// Creating close buttons with different sizes
<button className={styles.getCloseButtonClasses('md')}>
  <span className="sr-only">Close</span>
  <XIcon className="h-5 w-5" />
</button>
```

### Tooltips

```tsx
import { styles } from '@/utils';

// Creating a tooltip with positioning
<div className="relative">
  <button>Hover me</button>
  {isTooltipVisible && (
    <div className={styles.getTooltipPositionClass('top')}>
      Tooltip content
    </div>
  )}
</div>
```

### Skeleton Loading

```tsx
import { styles } from '@/utils';

// Creating skeleton loading UI
<div className="space-y-2">
  <div className={styles.getSkeletonClasses('h-4 w-3/4')} />
  <div className={styles.getSkeletonClasses('h-4 w-1/2')} />
</div>
```

### Form Inputs

```tsx
import { styles } from '@/utils';

// Normal input
<input 
  type="text" 
  className={styles.getInputClasses()} 
  placeholder="Regular input" 
/>

// Input with error
<input 
  type="text" 
  className={styles.getInputClasses(true)} 
  placeholder="Input with error" 
/>

// Disabled input
<input 
  type="text" 
  className={styles.getInputClasses(false, true)} 
  placeholder="Disabled input" 
  disabled 
/>
```

## Migration Guide

### Replacing Old Styling Approaches

If you're using any of these patterns in your components, please migrate to the new style utilities:

#### Before:

```tsx
// Old way with string concatenation
<div className={`p-4 ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`}>

// Old way with cn from a local utils file
import { cn } from '../../lib/utils';
<div className={cn('p-4', isActive ? 'bg-blue-500' : 'bg-gray-200')}>

// Old way with custom status classes
<span className={`px-2 py-1 rounded ${status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
  {status === 'completed' ? 'Ολοκληρώθηκε' : 'Εκκρεμεί'}
</span>
```

#### After:

```tsx
// New way with cn from @/utils
import { cn } from '@/utils';
<div className={cn('p-4', isActive ? 'bg-blue-500' : 'bg-gray-200')}>

// New way with status utilities
import { cn, formatStatus, getStatusClass } from '@/utils';
<span className={cn('px-2 py-1 rounded', getStatusClass(status))}>
  {formatStatus(status)}
</span>
```

## Best Practices

1. **Always use `cn()` for combining classes** - Don't use string concatenation or template literals for class names.

2. **Prefer named status values** - Use the predefined status types for consistent styling.

3. **Use the style namespace for related functions** - When using multiple style utilities, consider using the namespace import:

   ```typescript
   import { styles } from '@/utils';
   // Now you can use styles.cn, styles.getStatusClass, etc.
   ```

4. **Add proper accessibility attributes** - When using styling utilities for interactive elements, always include proper aria attributes and keyboard interactions.

5. **Keep component styles consistent** - Use the same styling approach across all components in a feature.

6. **Don't hardcode colors** - Use the style utilities for standardized colors rather than hardcoding hex values.

7. **Example component available** - Check out `src/components/examples/StyleUtilsExample.tsx` for comprehensive examples of all style utilities in action.

---

For more detailed information on all utilities, see the comprehensive [UTILS-GUIDE.md](./UTILS-GUIDE.md) document. 