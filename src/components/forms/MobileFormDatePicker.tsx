import { useState, useEffect, useRef } from 'react';

interface MobileFormDatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  min?: string;
  max?: string;
  required?: boolean;
  optional?: boolean;
}

/**
 * Mobile-optimized form date picker component
 * Uses the native date input for the best mobile experience
 */
const MobileFormDatePicker = ({
  label,
  value,
  onChange,
  error,
  min,
  max,
  required = false,
  optional = true,
}: MobileFormDatePickerProps) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Generate input id based on label for accessibility
  const inputId = label.toLowerCase().replace(/\s+/g, '-');
  
  // Format display date (user-friendly format)
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };
  
  // Handle focus on the whole component to show native picker on mobile
  const handleComponentClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      // For iOS, we need to open the date picker
      if (focused) {
        inputRef.current.click();
      }
    }
  };
  
  // Add a visual overlay to make the entire component clickable on mobile
  useEffect(() => {
    const input = inputRef.current;
    
    const handleFocus = () => setFocused(true);
    const handleBlur = () => setFocused(false);
    
    if (input) {
      input.addEventListener('focus', handleFocus);
      input.addEventListener('blur', handleBlur);
    }
    
    return () => {
      if (input) {
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('blur', handleBlur);
      }
    };
  }, []);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
          {optional && <span className="ml-1 text-gray-500 text-xs">(προαιρετικό)</span>}
        </label>
      </div>
      
      <div 
        className={`relative w-full h-12 border ${
          error ? 'border-red-300 bg-red-50' : focused ? 'border-blue-500' : 'border-gray-300'
        } rounded-lg shadow-sm transition-colors duration-200 overflow-hidden`}
        onClick={handleComponentClick}
      >
        {/* Visual part (what user sees) */}
        <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value ? formatDisplayDate(value) : 'Επιλέξτε ημερομηνία...'}
          </span>
        </div>
        
        {/* Calendar icon */}
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
          <svg 
            className="w-5 h-5 text-gray-400" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        
        {/* Actual input (invisible but functional) */}
        <input
          ref={inputRef}
          id={inputId}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
      </div>
      
      {error && (
        <p 
          id={`${inputId}-error`}
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default MobileFormDatePicker; 
