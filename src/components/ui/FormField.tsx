import React from 'react';
import { cn } from '@/utils/styleUtils';

interface FormFieldProps {
  id: string;
  label?: string;
  required?: boolean;
  error?: string;
  showError?: boolean;
  helpText?: string;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
  tooltip?: string;
  inline?: boolean;
}

/**
 * A reusable form field wrapper component that provides consistent layout, 
 * labels, and error handling for form inputs.
 * 
 * This component wraps any form input element (input, select, textarea) with
 * standardized layout and accessibility features.
 */
export function FormField({
  id,
  label,
  required = false,
  error,
  showError = false,
  helpText,
  className = '',
  labelClassName = '',
  children,
  tooltip,
  inline = false
}: FormFieldProps) {
  return (
    <div 
      className={cn(
        "form-field-container mb-4", 
        inline ? "flex items-center" : "", 
        className
      )}
    >
      {label && (
        <label 
          htmlFor={id} 
          className={cn(
            "block text-sm font-medium mb-1",
            inline ? "mr-3 mb-0 w-1/4" : "",
            required ? "after:content-['*'] after:text-red-500 after:ml-0.5" : "",
            labelClassName
          )}
        >
          {label}
        </label>
      )}
      
      <div className={cn("relative", inline ? "flex-1" : "")}>
        {children}
        
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
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
              <span className="sr-only">Help: {tooltip}</span>
            </span>
          </div>
        )}
      </div>
      
      {showError && error && (
        <p 
          id={`${id}-error`} 
          className="mt-1 text-xs text-red-500"
          role="alert"
        >
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p 
          id={`${id}-description`}
          className="mt-1 text-xs text-gray-500"
        >
          {helpText}
        </p>
      )}
    </div>
  );
}

/**
 * A form field that handles checkbox or radio inputs with better layout
 */
export function FormCheckField({
  id,
  label,
  required = false,
  error,
  showError = false,
  helpText,
  className = '',
  labelClassName = '',
  children,
  disabled = false
}: Omit<FormFieldProps, 'tooltip' | 'inline'> & { disabled?: boolean }) {
  return (
    <div className={cn("form-check-field mb-3", className)}>
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-2">
          {children}
        </div>
        
        {label && (
          <label 
            htmlFor={id} 
            className={cn(
              "text-sm select-none",
              disabled ? "text-gray-400" : "text-gray-700",
              labelClassName
            )}
          >
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
      </div>
      
      {showError && error && (
        <p 
          id={`${id}-error`} 
          className="mt-1 text-xs text-red-500"
          role="alert"
        >
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p 
          id={`${id}-description`}
          className="mt-1 text-xs text-gray-500 ml-6"
        >
          {helpText}
        </p>
      )}
    </div>
  );
}

/**
 * A form section with title and description for grouping related form fields
 */
export function FormSection({
  title,
  description,
  children,
  className = ''
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("form-section mb-6", className)}>
      {title && (
        <h3 className="text-lg font-medium mb-2">{title}</h3>
      )}
      
      {description && (
        <p className="text-sm text-gray-500 mb-4">{description}</p>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

/**
 * A form actions container for submit/cancel buttons with consistent layout
 */
export function FormActions({
  children,
  className = '',
  align = 'right'
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <div 
      className={cn(
        "form-actions mt-6 flex gap-3", 
        align === 'left' ? 'justify-start' : 
        align === 'center' ? 'justify-center' : 'justify-end',
        className
      )}
    >
      {children}
    </div>
  );
} 