# K-Flow UI Components

This directory contains all UI components used in the K-Flow application. These components are designed to be reusable, accessible, and consistent across the application.

## Component Documentation

Each group of related components has its own specialized documentation:

### Core Components
- [Forms](./README-FORMS.md) - Form components and validation utilities
- [Tabs](./README-APP-TABS.md) - Standardized tab system
- [Tooltips](./README-TOOLTIP.md) - Tooltip components and truncation utilities
- [Dialog/Modal system](./GlobalDialogProvider.tsx) - Global dialog management

### Component Structure

The UI components in this directory are organized into several categories:

1. **Foundation Components**: Basic UI elements that serve as building blocks
   - `button.tsx`, `input.tsx`, `select.tsx`, etc.
   - Based on Radix UI primitives with custom styling

2. **Composite Components**: Complex UI elements built from foundation components
   - `FormField.tsx`, `ValidatedInput.tsx`, etc.
   - Combines multiple foundation components with additional logic

3. **Layout Components**: Components for organizing other components
   - Tabs, cards, dialogs, etc.
   - Provides structure and navigation for content

4. **Utility Components**: Components that provide specific functionality
   - `LoadingSpinner.tsx`, `GlobalTooltip.tsx`, etc.
   - Enhances user experience with feedback and information

## Standards and Conventions

All UI components follow these standards:

### Naming Conventions
- **PascalCase**: All component names use PascalCase (e.g., `Button`, `FormField`)
- **Lower kebab-case**: All component filenames use lower kebab-case (e.g., `button.tsx`, `form-field.tsx`)
- **Descriptive Names**: Component names clearly describe their purpose

### File Structure
- Each component has its own file
- Related components are grouped in the same file when appropriate
- Complex component families have dedicated directories

### Code Conventions
- All components use TypeScript for type safety
- Props interfaces are defined for all components
- Components use function components with React hooks
- All components are properly documented with JSDoc comments

## Deprecated Components

The following components are deprecated and should not be used in new code:

1. **Tooltip Components**:
   - `tooltip.tsx` - Use `GlobalTooltip.tsx` instead
   - `truncated-text.tsx` - Use `TruncateWithTooltip` from `GlobalTooltip.tsx` instead

## Migration Guides

For components being migrated to newer versions:

1. **Tabs**: See [README-APP-TABS.md](./README-APP-TABS.md) for migration from older tab implementations to AppTabs.

2. **Tooltips**: See [README-TOOLTIP.md](./README-TOOLTIP.md) for migration from older tooltip implementations to GlobalTooltip.

## Utility Classes

The application uses several utility classes:

1. **TailwindCSS**: Primary styling utility
2. **class-variance-authority (cva)**: For component variants
3. **clsx/cn**: For conditional class names

Example:
```tsx
import { cn } from "@/utils/styleUtils";

<div className={cn(
  "base-class",
  variant === "primary" && "bg-blue-500",
  size === "large" && "text-lg"
)}>
  Content
</div>
```

## Accessibility

All components are designed with accessibility in mind:

- Proper ARIA attributes
- Keyboard navigation
- Screen reader support
- Focus management
- Sufficient color contrast

## Contributing

When adding new components or modifying existing ones:

1. Follow the naming and code conventions
2. Ensure accessibility requirements are met
3. Add appropriate documentation
4. Include examples of usage
5. Update the relevant README files 