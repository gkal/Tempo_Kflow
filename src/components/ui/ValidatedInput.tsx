import React, { useState, useEffect, ComponentPropsWithoutRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from './textarea';
import { cn } from '@/utils/styleUtils';
import { ValidationMessages, ValidationPatterns } from '@/utils/formValidation';

// Import Select component interface directly
interface SelectHTMLProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

// Create a Select component since we don't have a Select UI component
const Select = React.forwardRef<HTMLSelectElement, SelectHTMLProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={cn(
          "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Select.displayName = "Select";

interface CommonProps {
  id: string;
  name: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  showError?: boolean;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
  tooltip?: string;
}

interface InputProps extends CommonProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date';
  value: string | number;
  min?: number;
  max?: number;
  step?: number;
}

interface TextareaProps extends CommonProps {
  value: string;
  rows?: number;
}

interface SelectProps extends CommonProps {
  value: string;
  children: React.ReactNode;
}

interface ValidationResult {
  isValid: boolean;
  errorMessage: string;
}

type InputType = 'input' | 'textarea' | 'select';

/**
 * A validated form input component that supports text, textarea and select inputs
 * with built-in validation and error messaging
 */
export function ValidatedInput({
  id,
  name,
  label,
  type = 'text',
  value,
  required = false,
  disabled = false,
  className = '',
  error,
  showError,
  placeholder,
  onChange,
  onBlur,
  pattern,
  minLength,
  maxLength,
  autoComplete = 'off',
  tooltip,
  ...props
}: InputProps) {
  const [touched, setTouched] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({ isValid: true, errorMessage: '' });
  const inputType: InputType = 'input';

  // Validate on change and blur
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    if (touched) validateInput(e.target.value.toString());
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    onBlur?.(e);
    validateInput(e.target.value.toString());
  };

  // Validate the input based on its props
  const validateInput = (inputValue: string) => {
    let isValid = true;
    let errorMessage = '';

    // Required validation
    if (required && !inputValue.trim()) {
      isValid = false;
      errorMessage = ValidationMessages.required;
    } 
    // Pattern validation
    else if (pattern && inputValue && !new RegExp(pattern).test(inputValue)) {
      isValid = false;
      
      // Use specific error messages for common patterns
      if (pattern === ValidationPatterns.email.toString()) {
        errorMessage = ValidationMessages.email;
      } else if (pattern === ValidationPatterns.phone.toString()) {
        errorMessage = ValidationMessages.phone;
      } else if (pattern === ValidationPatterns.afm.toString()) {
        errorMessage = ValidationMessages.afm;
      } else {
        errorMessage = ValidationMessages.pattern;
      }
    }
    // Min length validation
    else if (minLength && inputValue.length < minLength) {
      isValid = false;
      errorMessage = ValidationMessages.minLength(minLength);
    }
    // Max length validation
    else if (maxLength && inputValue.length > maxLength) {
      isValid = false;
      errorMessage = ValidationMessages.maxLength(maxLength);
    }
    // Type validation
    else if (type === 'email' && inputValue && !ValidationPatterns.email.test(inputValue)) {
      isValid = false;
      errorMessage = ValidationMessages.email;
    }

    setValidationResult({ isValid, errorMessage });
  };

  // Display either provided error or validation error
  const displayError = error || (touched && !validationResult.isValid ? validationResult.errorMessage : '');
  const showErrorMessage = showError || (touched && !validationResult.isValid);

  return (
    <div className="form-field-container">
      {label && (
        <label 
          htmlFor={id} 
          className={cn(
            "block text-sm font-medium mb-1",
            required ? "after:content-['*'] after:text-red-500 after:ml-0.5" : ""
          )}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={type}
          value={value}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "w-full transition-all",
            showErrorMessage ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "",
            className
          )}
          onChange={handleChange}
          onBlur={handleBlur}
          pattern={pattern}
          minLength={minLength}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-invalid={showErrorMessage}
          aria-describedby={showErrorMessage ? `${id}-error` : undefined}
          {...props}
        />
        
        {tooltip && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <span className="cursor-help text-gray-400 hover:text-gray-600" title={tooltip}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </span>
          </div>
        )}
      </div>
      
      {showErrorMessage && displayError && (
        <p 
          id={`${id}-error`} 
          className="mt-1 text-xs text-red-500"
          role="alert"
        >
          {displayError}
        </p>
      )}
    </div>
  );
}

/**
 * A validated textarea component with built-in validation and error messaging
 */
export function ValidatedTextarea({
  id,
  name,
  label,
  value,
  required = false,
  disabled = false,
  className = '',
  error,
  showError,
  placeholder,
  onChange,
  onBlur,
  rows = 3,
  minLength,
  maxLength,
  autoComplete = 'off',
  tooltip,
  ...props
}: TextareaProps) {
  const [touched, setTouched] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({ isValid: true, errorMessage: '' });

  // Validate on change and blur
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e);
    if (touched) validateInput(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setTouched(true);
    onBlur?.(e);
    validateInput(e.target.value);
  };

  // Validate the textarea based on its props
  const validateInput = (inputValue: string) => {
    let isValid = true;
    let errorMessage = '';

    // Required validation
    if (required && !inputValue.trim()) {
      isValid = false;
      errorMessage = ValidationMessages.required;
    } 
    // Min length validation
    else if (minLength && inputValue.length < minLength) {
      isValid = false;
      errorMessage = ValidationMessages.minLength(minLength);
    }
    // Max length validation
    else if (maxLength && inputValue.length > maxLength) {
      isValid = false;
      errorMessage = ValidationMessages.maxLength(maxLength);
    }

    setValidationResult({ isValid, errorMessage });
  };

  // Display either provided error or validation error
  const displayError = error || (touched && !validationResult.isValid ? validationResult.errorMessage : '');
  const showErrorMessage = showError || (touched && !validationResult.isValid);

  return (
    <div className="form-field-container">
      {label && (
        <label 
          htmlFor={id} 
          className={cn(
            "block text-sm font-medium mb-1",
            required ? "after:content-['*'] after:text-red-500 after:ml-0.5" : ""
          )}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        <Textarea
          id={id}
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            "w-full transition-all",
            showErrorMessage ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "",
            className
          )}
          onChange={handleChange}
          onBlur={handleBlur}
          minLength={minLength}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-invalid={showErrorMessage}
          aria-describedby={showErrorMessage ? `${id}-error` : undefined}
          {...props}
        />
        
        {tooltip && (
          <div className="absolute right-2 top-4">
            <span className="cursor-help text-gray-400 hover:text-gray-600" title={tooltip}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </span>
          </div>
        )}
      </div>
      
      {showErrorMessage && displayError && (
        <p 
          id={`${id}-error`} 
          className="mt-1 text-xs text-red-500"
          role="alert"
        >
          {displayError}
        </p>
      )}
    </div>
  );
}

/**
 * A validated select component with built-in validation and error messaging
 */
export function ValidatedSelect({
  id,
  name,
  label,
  value,
  required = false,
  disabled = false,
  className = '',
  error,
  showError,
  placeholder,
  onChange,
  onBlur,
  children,
  tooltip,
  ...props
}: SelectProps) {
  const [touched, setTouched] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({ isValid: true, errorMessage: '' });

  // Validate on change and blur
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e);
    if (touched) validateInput(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setTouched(true);
    onBlur?.(e);
    validateInput(e.target.value);
  };

  // Validate the select based on its props
  const validateInput = (inputValue: string) => {
    let isValid = true;
    let errorMessage = '';

    // Required validation
    if (required && (!inputValue || inputValue === '')) {
      isValid = false;
      errorMessage = ValidationMessages.requiredSelect;
    }

    setValidationResult({ isValid, errorMessage });
  };

  // Display either provided error or validation error
  const displayError = error || (touched && !validationResult.isValid ? validationResult.errorMessage : '');
  const showErrorMessage = showError || (touched && !validationResult.isValid);

  return (
    <div className="form-field-container">
      {label && (
        <label 
          htmlFor={id} 
          className={cn(
            "block text-sm font-medium mb-1",
            required ? "after:content-['*'] after:text-red-500 after:ml-0.5" : ""
          )}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        <Select
          id={id}
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          className={cn(
            "w-full transition-all",
            showErrorMessage ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "",
            className
          )}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={showErrorMessage}
          aria-describedby={showErrorMessage ? `${id}-error` : undefined}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </Select>
        
        {tooltip && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <span className="cursor-help text-gray-400 hover:text-gray-600" title={tooltip}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </span>
          </div>
        )}
      </div>
      
      {showErrorMessage && displayError && (
        <p 
          id={`${id}-error`} 
          className="mt-1 text-xs text-red-500"
          role="alert"
        >
          {displayError}
        </p>
      )}
    </div>
  );
} 
