# Tooltip System Documentation

This document describes the consolidated tooltip system in the application. The system provides multiple tooltip components to handle different use cases.

## Key Features

- **Consistent Styling**: All tooltips have the same appearance and behavior
- **Always Visible**: Tooltips are always displayed above other elements with a high z-index
- **Positioning**: Tooltips are positioned relative to the trigger element (top, right, bottom, left)
- **Customizable Width**: The width of tooltips can be customized
- **Multi-line Support**: Tooltips can display multi-line text and rich content
- **Accessibility**: Fully accessible with keyboard navigation and screen reader support

## Components Overview

All tooltip components are now consolidated in `GlobalTooltip.tsx` for better maintainability and consistency.

### GlobalTooltip

The `GlobalTooltip` component is a custom lightweight tooltip implementation that does not rely on any third-party libraries. It's ideal for most tooltip needs throughout the application.

```tsx
import { GlobalTooltip } from "@/components/ui/GlobalTooltip";

// Basic usage
<GlobalTooltip content="More information">
  <Button>Info</Button>
</GlobalTooltip>

// With custom position
<GlobalTooltip content="Click to expand" position="right">
  <ExpandIcon />
</GlobalTooltip>

// With custom width
<GlobalTooltip content="This is a longer tooltip that might need a specific width" maxWidth={400}>
  <QuestionIcon />
</GlobalTooltip>
```

### TruncateWithTooltip

The `TruncateWithTooltip` component is specifically designed for displaying tooltips on truncated text. It automatically shows the full text in a tooltip when the text is truncated.

```tsx
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";

// Basic usage - will truncate text longer than 40 characters and show a tooltip
<TruncateWithTooltip text="This is a very long text that will be truncated" />

// With custom length
<TruncateWithTooltip text="This will be truncated after 20 characters" maxLength={20} />

// Multi-line truncation
<TruncateWithTooltip 
  text="This text will be displayed in multiple lines but truncated after a certain number of lines"
  multiLine={true}
  maxLines={2}
/>
```

### RadixTooltip

The `RadixTooltip` component is a wrapper around the Radix UI tooltip component, providing a consistent styling with the rest of the tooltip system.

```tsx
import { RadixTooltip } from "@/components/ui/GlobalTooltip";

<RadixTooltip content="This is using Radix UI tooltip under the hood">
  <Button>Hover me</Button>
</RadixTooltip>
```

## Deprecated Components

The following components are now deprecated and should be avoided in new code:

- `tooltip.tsx` - Replaced by GlobalTooltip.tsx
- `truncated-text.tsx` - Replaced by TruncateWithTooltip in GlobalTooltip.tsx

## Migration Guide

### From tooltip.tsx

```tsx
// Old
import { Tooltip } from "@/components/ui/tooltip";

<Tooltip content="Info">
  <Button>Hover</Button>
</Tooltip>

// New
import { GlobalTooltip } from "@/components/ui/GlobalTooltip";

<GlobalTooltip content="Info">
  <Button>Hover</Button>
</GlobalTooltip>
```

### From truncated-text.tsx

```tsx
// Old
import { TruncatedText } from "@/components/ui/truncated-text";

<TruncatedText text="Long text to truncate" maxLength={20} />

// New
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";

<TruncateWithTooltip text="Long text to truncate" maxLength={20} />
```

## Best Practices

1. **Use GlobalTooltip for most cases**: Unless you specifically need Radix UI tooltip features, use the GlobalTooltip component.
2. **Keep tooltip content concise**: Tooltips should provide additional information without overwhelming the user.
3. **Use TruncateWithTooltip for text truncation**: When displaying long text that might be truncated, wrap it in TruncateWithTooltip.
4. **Consider position carefully**: Choose the tooltip position that won't obscure other important elements.
5. **Use appropriate maxWidth**: Set a reasonable maxWidth to ensure tooltips don't become too wide.

## Technical Details

### GlobalTooltip

The `GlobalTooltip` component uses CSS for positioning and visibility. It applies a class based on the specified position.

### TruncateWithTooltip

For multi-line truncation, the component uses CSS `-webkit-line-clamp` for supported browsers and falls back to single-line truncation for others.

### RadixTooltip

This component uses Radix UI's tooltip primitives, which provide:
- Proper focus management
- Keyboard navigation
- Position management
- Portal rendering (tooltips are rendered outside their parent DOM hierarchy)
- Animation support

## Migration Guide

### From truncated-text.tsx

Replace:
```tsx
import { TruncatedText } from "@/components/ui/truncated-text";

<TruncatedText 
  text="Long text" 
  maxLength={20} 
  tooltipPosition="top"
  tooltipMaxWidth={300}
/>
```

With:
```tsx
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";

<TruncateWithTooltip 
  text="Long text" 
  maxLength={20} 
  position="top"
  maxWidth={300}
/>
```

### From tooltip.tsx

Replace:
```tsx
import { SimpleTooltip } from "@/components/ui/tooltip";

<SimpleTooltip content="Info">
  <InfoIcon />
</SimpleTooltip>
```

With:
```tsx
import { RadixTooltip } from "@/components/ui/GlobalTooltip";

<RadixTooltip content="Info">
  <InfoIcon />
</RadixTooltip>
``` 