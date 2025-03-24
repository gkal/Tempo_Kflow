# K-Flow Form Components

This document provides an overview of the form components, validation utilities, and best practices for form implementation in the K-Flow application.

## Form Components Overview

The application has several form-related components:

1. **Basic Input Components**
   - `Input.tsx` - Base input component
   - `Textarea.tsx` - Multi-line text input
   - `Select.tsx` - Dropdown selection
   - `Checkbox.tsx` - Boolean selection
   - `RadioGroup.tsx` - Option selection from a list

2. **Validated Components**
   - `ValidatedInput.tsx` - Input with validation
   - `ValidatedTextarea.tsx` - Textarea with validation
   - `ValidatedSelect.tsx` - Select with validation

3. **Form Layout Components**
   - `FormField.tsx` - Wrapper for form fields with consistent layout
   - `FormSection.tsx` - Groups related form fields
   - `FormActions.tsx` - Container for form action buttons

## Validation Utilities

The application uses several validation utilities:

### 1. `formValidation.ts`

Contains standardized validation messages and patterns:

```tsx
import { ValidationMessages, ValidationPatterns } from '@/utils/formValidation';

// Using validation messages
<p className="text-red-500">{ValidationMessages.required}</p>

// Using validation patterns
<input
  type="email"
  pattern={ValidationPatterns.email}
  title={ValidationMessages.email}
/>
```

#### ValidationMessages

Pre-defined validation messages in Greek for common validation scenarios:

- `required` - Field is required
- `email` - Invalid email format
- `phone` - Invalid phone number
- `afm` - Invalid AFM (Tax ID)
- `pattern` - Invalid format
- `minLength` / `maxLength` - Text length constraints

#### ValidationPatterns

Regular expression patterns for validating common field types:

- `email` - Email address validation
- `phone` - Greek phone number format
- `afm` - Greek tax ID format
- `number` - Numbers only
- `alphanumeric` - Letters and numbers only

### 2. `validationUtils.ts`

Contains pure validation functions for data validation outside of forms:

```tsx
import { validateEmail, validatePhone } from '@/utils/validationUtils';

// Check if an email is valid
const isEmailValid = validateEmail(email);

// Check if a phone number is valid
const isPhoneValid = validatePhone(phone);
```

### 3. Form Helper Utilities

Located in `formHelpers.ts`, these utilities help with React Hook Form:

```tsx
import { useFormWatch, setMultipleFields } from '@/utils/formHelpers';

// Watch a field with type safety
const email = useFormWatch(control, 'email', '');

// Set multiple fields at once
setMultipleFields(setValue, {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});
```

## Form Implementation Patterns

### 1. Basic Form with React Hook Form

```tsx
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function BasicForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const onSubmit = (data) => {
    console.log(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <div>
          <label htmlFor="name">Name</label>
          <Input id="name" {...register('name', { required: true })} />
          {errors.name && <p className="text-red-500">This field is required</p>}
        </div>
        
        <div>
          <label htmlFor="email">Email</label>
          <Input id="email" type="email" {...register('email', { required: true })} />
          {errors.email && <p className="text-red-500">This field is required</p>}
        </div>
        
        <Button type="submit">Submit</Button>
      </div>
    </form>
  );
}
```

### 2. Using Validated Components

```tsx
import { useForm } from 'react-hook-form';
import { ValidatedInput } from '@/components/ui/ValidatedInput';
import { Button } from '@/components/ui/button';

function ValidatedForm() {
  const { control, handleSubmit } = useForm();
  
  const onSubmit = (data) => {
    console.log(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <ValidatedInput
          name="email"
          label="Email"
          control={control}
          rules={{ 
            required: true,
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address"
            }
          }}
        />
        
        <ValidatedInput
          name="phone"
          label="Phone"
          control={control}
          rules={{ 
            required: true,
            pattern: {
              value: /^(\+?30)?[0-9]{10}$/,
              message: "Invalid phone number"
            }
          }}
        />
        
        <Button type="submit">Submit</Button>
      </div>
    </form>
  );
}
```

## Best Practices

1. **Use FormField for Consistent Layout**: Wrap form inputs in FormField to maintain consistent spacing, labels, and error handling.

2. **Standardize Validation Messages**: Use ValidationMessages from formValidation.ts for consistent error messages.

3. **Prefer ValidatedInput Components**: These components handle error display and validation state automatically.

4. **Group Related Fields**: Use FormSection to group related fields together visually.

5. **Handle Form State Properly**: 
   - Use React Hook Form's formState to show loading indicators
   - Disable submit buttons during submission
   - Show success/error messages after submission

6. **Implement Accessible Forms**:
   - Always use labels for form controls
   - Include proper aria attributes
   - Ensure keyboard navigation works correctly
   - Make error messages clear and accessible

7. **Validate on the Right Events**:
   - Validate on blur for most fields (after the user has left the field)
   - Validate on change for fields that need immediate feedback (like password strength)
   - Always validate on submit

## Form Submission

1. **Client-Side Validation**
   - Validate all input before submission
   - Display clear error messages for invalid fields

2. **Error Handling**
   - Display form-level errors at the top of the form
   - Display field-level errors beneath each field
   - Use toast notifications for submission errors

## Recommendations for Improvement

1. **Consolidate Validation Utilities**
   - Merge `formValidation.ts` and `validationUtils.ts` into a single module
   - Create a unified export interface for all validation functions
   - Standardize validation result format across all functions

2. **Enhance Form Components**
   - Add support for more input types (date, time, color, etc.)
   - Improve keyboard navigation in complex form components
   - Add better support for form arrays and nested objects

3. **Form Hooks Enhancement**
   - Improve type safety in `useFormValidation` hook
   - Add support for schema-based validation (Zod, Yup, etc.)
   - Create specialized hooks for common form patterns

4. **Documentation**
   - Create a component library showcase for form components
   - Document all validation functions with examples
   - Provide common form implementation patterns

## Example Form Implementation

```tsx
import { useState } from 'react';
import { 
  ValidatedInput, 
  ValidatedSelect,
  FormField,
  FormSection,
  FormActions
} from '@/components/ui';
import { validateMultiple, validateRequired, validateEmail } from '@/utils/validationUtils';
import { ValidationMessages } from '@/utils/formValidation';
import { Button } from '@/components/ui/button';

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const validateForm = () => {
    const validationErrors = {};
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'message'];
    requiredFields.forEach(field => {
      if (!formData[field]?.trim()) {
        validationErrors[field] = ValidationMessages.required;
      }
    });
    
    // Validate email format
    if (formData.email && !validateEmail(formData.email).valid) {
      validationErrors.email = ValidationMessages.email;
    }
    
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Submit the form
      console.log('Form submitted:', formData);
      // Reset the form
      setFormData({ name: '', email: '', subject: '', message: '' });
      setErrors({});
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Contact Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="name" label="Name" required error={errors.name}>
            <ValidatedInput
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </FormField>
          
          <FormField id="email" label="Email" required error={errors.email}>
            <ValidatedInput
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </FormField>
        </div>
        
        <FormField id="subject" label="Subject">
          <ValidatedSelect
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
          >
            <option value="">Select a subject...</option>
            <option value="general">General Inquiry</option>
            <option value="support">Support</option>
            <option value="feedback">Feedback</option>
          </ValidatedSelect>
        </FormField>
        
        <FormField id="message" label="Message" required error={errors.message}>
          <ValidatedTextarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            required
          />
        </FormField>
      </FormSection>
      
      <FormActions>
        <Button type="button" variant="outline" onClick={() => setFormData({ name: '', email: '', subject: '', message: '' })}>
          Clear
        </Button>
        <Button type="submit">Send Message</Button>
      </FormActions>
    </form>
  );
} 