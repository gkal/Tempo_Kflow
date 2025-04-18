interface SelectOption {
  value: string;
  label: string;
}

interface MobileFormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  required?: boolean;
  optional?: boolean;
}

/**
 * Mobile-optimized form select component
 * Provides a consistent UI for select inputs with touch-friendly styling
 */
const MobileFormSelect = ({
  label,
  value,
  onChange,
  options,
  error,
  required = false,
  optional = false,
}: MobileFormSelectProps) => {
  // Generate select id based on label for accessibility
  const selectId = label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
          {optional && <span className="ml-1 text-gray-500 text-xs">(προαιρετικό)</span>}
        </label>
      </div>
      
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-12 pl-4 pr-10 py-2 border appearance-none ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          } rounded-lg shadow-sm text-base focus:outline-none focus:ring-2 ${
            error ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'
          } transition-colors duration-200`}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg 
            className="w-5 h-5 text-gray-400" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
      </div>
      
      {error && (
        <p 
          id={`${selectId}-error`}
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default MobileFormSelect; 
