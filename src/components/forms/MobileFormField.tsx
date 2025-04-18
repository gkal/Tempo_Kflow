interface MobileFormFieldProps {
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'password';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  autoFocus?: boolean;
  keyboardType?: 'text' | 'email-address' | 'phone-pad' | 'numeric' | 'url';
}

/**
 * Mobile-optimized form field component
 * Provides a consistent UI for all input fields with touch-friendly styling
 */
const MobileFormField = ({
  label,
  type,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  optional = false,
  autoFocus = false,
  keyboardType = 'text',
}: MobileFormFieldProps) => {
  // Generate input id based on label for accessibility
  const inputId = label.toLowerCase().replace(/\s+/g, '-');
  
  // Map keyboard type to input type
  const getInputType = () => {
    switch (keyboardType) {
      case 'email-address':
        return 'email';
      case 'phone-pad':
        return 'tel';
      case 'numeric':
        return 'number';
      case 'url':
        return 'url';
      default:
        return type;
    }
  };
  
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
      
      <input
        id={inputId}
        type={getInputType()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full h-12 px-4 py-2 border ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        } rounded-lg shadow-sm text-base focus:outline-none focus:ring-2 ${
          error ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'
        } transition-colors duration-200`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      
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

export default MobileFormField; 
