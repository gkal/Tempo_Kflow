import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateFormLinkApi } from '@/services/formApiService';
import { CustomerFormInfo } from '@/services/customerFormService/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import DeviceAwareForm from '@/components/forms/DeviceAwareForm';

// Status types for form validation
type FormPageStatus = 'loading' | 'valid' | 'expired' | 'error';

interface FormErrorState {
  message: string;
  code?: string;
}

/**
 * Token-based form page component
 * Validates the token and displays the appropriate form content
 */
const FormPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<FormPageStatus>('loading');
  const [customerInfo, setCustomerInfo] = useState<CustomerFormInfo | null>(null);
  const [error, setError] = useState<FormErrorState | null>(null);

  useEffect(() => {
    // Validate token when component mounts
    const validateToken = async () => {
      if (!token) {
        setStatus('error');
        setError({ message: 'Ο σύνδεσμος φόρμας δεν είναι έγκυρος', code: 'invalid_token' });
        return;
      }

      try {
        const response = await validateFormLinkApi(token);

        if (response.data?.isValid) {
          setStatus('valid');
          setCustomerInfo(response.data.customer);
        } else {
          if (response.error?.code === 'form_link_expired') {
            setStatus('expired');
          } else {
            setStatus('error');
          }
          setError({ 
            message: response.error?.message || 'Προέκυψε ένα σφάλμα κατά την επικύρωση του συνδέσμου', 
            code: response.error?.code 
          });
        }
      } catch (err) {
        setStatus('error');
        setError({ message: 'Προέκυψε ένα απρόσμενο σφάλμα' });
        console.error('Form token validation error:', err);
      }
    };

    validateToken();
  }, [token]);

  // Render different content based on form status
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <LoadingSpinner size={50} />
            <p className="mt-4 text-gray-600">Φόρτωση φόρμας...</p>
          </div>
        );

      case 'valid':
        return customerInfo ? (
          <DeviceAwareForm token={token!} customerInfo={customerInfo} />
        ) : (
          <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="text-xl font-semibold text-yellow-800">Δεν βρέθηκαν πληροφορίες πελάτη</h2>
            <p className="mt-2 text-yellow-700">
              Παρακαλώ επικοινωνήστε με την εταιρία μας για βοήθεια.
            </p>
          </div>
        );

      case 'expired':
        return (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-xl font-semibold text-red-800">Ο σύνδεσμος έχει λήξει</h2>
            <p className="mt-2 text-red-700">
              Ο σύνδεσμος που προσπαθείτε να χρησιμοποιήσετε έχει λήξει. 
              Παρακαλώ επικοινωνήστε με την εταιρία μας για να λάβετε έναν νέο σύνδεσμο.
            </p>
            <button
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              onClick={() => window.location.href = "mailto:info@example.com"}
            >
              Επικοινωνία
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-xl font-semibold text-red-800">Σφάλμα στη φόρμα</h2>
            <p className="mt-2 text-red-700">
              {error?.message || 'Προέκυψε ένα σφάλμα κατά την επικύρωση του συνδέσμου φόρμας.'}
            </p>
            <button
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              onClick={() => window.location.href = "mailto:info@example.com"}
            >
              Επικοινωνία
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="Company Logo" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {status === 'valid' ? 'Φόρμα Πελάτη' : 'Έλεγχος Φόρμας'}
          </h1>
          {status === 'valid' && customerInfo && (
            <p className="mt-2 text-gray-600">
              Καλωσορίσατε {customerInfo.name}
            </p>
          )}
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FormPage; 