# Global Tooltip System

This document describes the global tooltip system implemented in the application. The system provides a consistent way to display tooltips throughout the application.

## Key Features

- **Consistent Styling**: All tooltips have the same appearance and behavior
- **Always Visible**: Tooltips are always displayed above other elements with a high z-index
- **Positioning**: Tooltips are positioned above the trigger element by default
- **Customizable Width**: The width of tooltips can be customized
- **Multi-line Support**: Tooltips can display multi-line text

## Components

### GlobalTooltip

The `GlobalTooltip` component is the core component of the tooltip system. It provides a standardized way to display tooltips.

```tsx
import { GlobalTooltip } from "@/components/ui/GlobalTooltip";

// Basic usage
<GlobalTooltip content="This is a tooltip">
  <span>Hover me</span>
</GlobalTooltip>

// With custom width
<GlobalTooltip content="This is a tooltip" maxWidth={500}>
  <span>Hover me</span>
</GlobalTooltip>

// With custom position (though "top" is recommended for consistency)
<GlobalTooltip content="This is a tooltip" position="right">
  <span>Hover me</span>
</GlobalTooltip>

// With custom class
<GlobalTooltip content="This is a tooltip" className="custom-tooltip">
  <span>Hover me</span>
</GlobalTooltip>
```

#### Props

- `content`: The content to display in the tooltip. Can be a string or a React node.
- `children`: The element that triggers the tooltip.
- `maxWidth`: Maximum width for the tooltip in pixels. Default is 800.
- `position`: The position of the tooltip. Can be "top" or "right". Default is "top".
- `className`: Additional CSS classes for the tooltip content.

### TruncateWithTooltip

The `TruncateWithTooltip` component is a helper component that truncates text and shows a tooltip with the full text when hovered.

```tsx
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";

// Basic usage
<TruncateWithTooltip text="This is a long text that will be truncated" maxLength={20} />

// With custom width
<TruncateWithTooltip text="This is a long text that will be truncated" maxLength={20} maxWidth={500} />

// With custom position (though "top" is recommended for consistency)
<TruncateWithTooltip text="This is a long text that will be truncated" maxLength={20} position="right" />

// With custom class
<TruncateWithTooltip text="This is a long text that will be truncated" maxLength={20} className="custom-text" />

// With multi-line support
<TruncateWithTooltip text="This is a long text that will be truncated" maxLength={20} multiLine={true} maxLines={2} />
```

#### Props

- `text`: The text to truncate.
- `maxLength`: Maximum length before truncation. Default is 40.
- `maxWidth`: Maximum width for the tooltip in pixels. Default is 800.
- `position`: The position of the tooltip. Can be "top" or "right". Default is "top".
- `className`: Additional CSS classes for the text.
- `multiLine`: Whether to allow multiple lines of text. Default is false.
- `maxLines`: Maximum number of lines to display when multiLine is true. Default is 2.

### TruncatedText

The `TruncatedText` component is a wrapper around the `GlobalTooltip` component that provides backward compatibility with the old tooltip system.

```tsx
import { TruncatedText } from "@/components/ui/truncated-text";

// Basic usage
<TruncatedText text="This is a long text that will be truncated" maxLength={20} />

// With custom width
<TruncatedText text="This is a long text that will be truncated" maxLength={20} tooltipMaxWidth={500} />

// With custom position (though "top" is recommended for consistency)
<TruncatedText text="This is a long text that will be truncated" maxLength={20} tooltipPosition="right" />

// With custom class
<TruncatedText text="This is a long text that will be truncated" maxLength={20} className="custom-text" />

// With multi-line support
<TruncatedText text="This is a long text that will be truncated" maxLength={20} multiLine={true} maxLines={2} />
```

#### Props

- `text`: The text to truncate.
- `maxLength`: Maximum length before truncation. Default is 40.
- `tooltipMaxWidth`: Maximum width for the tooltip in pixels. Default is 800.
- `tooltipPosition`: The position of the tooltip. Can be "top" or "right". Default is "top".
- `className`: Additional CSS classes for the text.
- `multiLine`: Whether to allow multiple lines of text. Default is false.
- `maxLines`: Maximum number of lines to display when multiLine is true. Default is 2.

## CSS

The tooltip system uses CSS classes defined in `src/styles/tooltip.css`. The main classes are:

- `.tooltip-wrapper`: The container for the tooltip.
- `.tooltip-content`: The tooltip content.
- `.tooltip-top`: Positions the tooltip above the trigger element.
- `.tooltip-right`: Positions the tooltip to the right of the trigger element.
- `.ellipsis-blue`: Styles the ellipsis that indicates truncated text.

## Best Practices

1. Always use the `GlobalTooltip` component for tooltips.
2. Use the `TruncateWithTooltip` component for truncated text with tooltips.
3. Always set the `position` prop to "top" for consistency.
4. Set the `maxWidth` prop to 800 for consistent tooltip width.
5. Use the `multiLine` prop for long text that should be displayed on multiple lines.

## Implementation Example

Here's an example of how to implement the tooltip system in a component:

```tsx
import { GlobalTooltip, TruncateWithTooltip } from "@/components/ui/GlobalTooltip";

function MyComponent() {
  const longText = "This is a very long text that needs to be truncated and displayed with a tooltip.";
  
  return (
    <div>
      <h1>My Component</h1>
      
      {/* Simple tooltip */}
      <GlobalTooltip content="This is a tooltip">
        <button>Hover me</button>
      </GlobalTooltip>
      
      {/* Truncated text with tooltip */}
      <TruncateWithTooltip text={longText} maxLength={20} />
      
      {/* Multi-line truncated text with tooltip */}
      <TruncateWithTooltip text={longText} maxLength={20} multiLine={true} maxLines={2} />
    </div>
  );
} 