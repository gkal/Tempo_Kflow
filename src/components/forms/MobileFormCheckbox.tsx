interface MobileFormCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

/**
 * Mobile-optimized form checkbox component
 * Features a larger touch area for better mobile interaction
 */
const MobileFormCheckbox = ({
  label,
  checked,
  onChange,
  error,
}: MobileFormCheckboxProps) => {
  // Generate checkbox id based on label for accessibility
  const checkboxId = label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <div className="relative flex items-start">
          {/* Hidden real checkbox for accessibility */}
          <div className="flex items-center h-5">
            <input
              id={checkboxId}
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              className="opacity-0 absolute h-8 w-8"
              aria-invalid={!!error}
              aria-describedby={error ? `${checkboxId}-error` : undefined}
            />
            
            {/* Custom styled checkbox with larger touch area */}
            <div 
              className={`flex items-center justify-center h-8 w-8 p-1.5 rounded-md cursor-pointer ${
                error ? 'bg-red-50' : 'bg-white'
              }`}
              onClick={() => onChange(!checked)}
            >
              <div 
                className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                  checked 
                    ? 'bg-blue-600 border-blue-600' 
                    : error
                      ? 'border-red-300' 
                      : 'border-gray-300'
                }`}
              >
                {checked && (
                  <svg 
                    className="h-3.5 w-3.5 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                )}
              </div>
            </div>
          </div>
          
          {/* Label with large touch area */}
          <div className="ml-3 text-sm">
            <label 
              htmlFor={checkboxId}
              className="font-medium text-gray-700 select-none cursor-pointer"
              onClick={() => onChange(!checked)}
            >
              {label}
            </label>
          </div>
        </div>
      </div>
      
      {error && (
        <p 
          id={`${checkboxId}-error`}
          className="ml-10 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default MobileFormCheckbox; 
