interface FormErrorProps {
  errorMessage: string;
  onRetry?: () => void;
}

/**
 * Error component shown when form submission fails
 */
const FormError = ({ errorMessage, onRetry }: FormErrorProps) => {
  return (
    <div className="py-12 px-6 text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
        <svg
          className="h-10 w-10 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
        Προέκυψε ένα σφάλμα
      </h2>
      
      <p className="text-lg text-gray-600 mb-6">
        {errorMessage}
      </p>
      
      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <h3 className="font-medium text-red-800 mb-2">Τι μπορείτε να κάνετε</h3>
        <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
          <li>Ελέγξτε τη σύνδεσή σας στο διαδίκτυο</li>
          <li>Δοκιμάστε να υποβάλετε τη φόρμα ξανά</li>
          <li>Επικοινωνήστε μαζί μας αν το πρόβλημα παραμένει</li>
        </ul>
      </div>
      
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 justify-center">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Δοκιμάστε ξανά
          </button>
        )}
        
        <button
          type="button"
          onClick={() => window.location.href = "mailto:info@example.com"}
          className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Επικοινωνία με την υποστήριξη
        </button>
      </div>
    </div>
  );
};

export default FormError; 
