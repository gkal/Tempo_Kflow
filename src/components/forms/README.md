# Form Components Documentation

This directory contains reusable form components used throughout the application.

## SendFormLinkButton

The `SendFormLinkButton` component creates and manages form links for customers, providing a seamless way to send forms to customers via Gmail or direct link copying.

### Usage

```tsx
import SendFormLinkButton from "@/components/forms/SendFormLinkButton";

// Basic usage
<SendFormLinkButton customerId="customer-uuid" />

// With custom email recipient and expiration
<SendFormLinkButton 
  customerId="customer-uuid"
  emailRecipient="customer@example.com"
  expirationHours={48}
/>

// With success callback
<SendFormLinkButton 
  customerId="customer-uuid"
  onSuccess={(formLinkData) => {
    console.log("Form link created:", formLinkData);
    // Do something with the form link data
  }}
/>

// Custom styling
<SendFormLinkButton 
  customerId="customer-uuid"
  size="lg"
  variant="secondary"
  className="my-custom-class"
/>

// Icon-only version (no text)
<SendFormLinkButton 
  customerId="customer-uuid"
  withLabel={false}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `customerId` | `string` | (Required) | ID of the customer to create a form link for |
| `className` | `string` | `undefined` | Additional CSS classes to apply to the button |
| `onSuccess` | `(formLinkData: { token: string; url: string; gmailUrl: string; expiresAt: string }) => void` | `undefined` | Callback function when form link is successfully created |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Button size |
| `variant` | `"default" \| "outline" \| "secondary" \| "ghost"` | `"default"` | Button variant |
| `withLabel` | `boolean` | `true` | Whether to show the button text label |
| `emailRecipient` | `string` | `undefined` | Specific email recipient (overrides customer email) |
| `expirationHours` | `number` | `72` | Number of hours until the form link expires |

### States

The component handles several states automatically:

1. **Initial State**: Shows button with "Send Form" label
2. **Loading State**: Shows loading spinner while API call is in progress
3. **Success State**: Shows "Open Gmail" and "Copy Link" buttons after successful creation
4. **Error State**: Shows error message with retry button if creation fails

### Example

```tsx
<div className="p-4 border rounded-md">
  <h3 className="text-lg mb-3">Customer Form</h3>
  <p className="mb-4">Send a form link to the customer to collect information.</p>
  
  <SendFormLinkButton 
    customerId="123e4567-e89b-12d3-a456-426614174000"
    emailRecipient="customer@example.com"
    onSuccess={(data) => console.log("Form link created:", data)}
  />
</div>
```

## CustomerFormLinkButton

A simplified version of the `SendFormLinkButton` designed specifically for the customer detail page. It displays an icon-only button with tooltip and shows toast notifications on success.

### Usage

```tsx
import CustomerFormLinkButton from "@/components/forms/CustomerFormLinkButton";

<CustomerFormLinkButton 
  customerId="customer-uuid"
  customerEmail="customer@example.com"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `customerId` | `string` | (Required) | ID of the customer to create a form link for |
| `customerEmail` | `string` | `undefined` | Customer email address |

The component automatically shows toast notifications with action buttons when a form link is created.

## Integration with Customer Detail Page

To integrate the form link button in the customer detail page:

```tsx
import CustomerFormLinkButton from "@/components/forms/CustomerFormLinkButton";

// In your customer detail page component
function CustomerActionButtons({ customer }) {
  return (
    <div className="flex items-center space-x-2">
      <Button onClick={handleEdit}>
        <Edit className="h-4 w-4 mr-2" />
        Edit
      </Button>
      
      <CustomerFormLinkButton 
        customerId={customer.id}
        customerEmail={customer.email}
      />
      
      {/* Other action buttons */}
    </div>
  );
}
``` 