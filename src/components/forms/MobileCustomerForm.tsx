import { useState, useEffect } from 'react';
import { useCustomerForm } from './FormContext';
import { CustomerFormInfo, CustomerFormSubmission } from '@/services/customerFormService/types';
import { submitFormApi } from '@/services/formApiService';
import { Loader } from '@/components/ui/Loader';
import MobileFormField from './MobileFormField';
import MobileFormSelect from './MobileFormSelect';
import MobileFormDatePicker from './MobileFormDatePicker';
import MobileFormCheckbox from './MobileFormCheckbox';
import FormSuccess from './FormSuccess';
import FormError from './FormError';

// Props for the MobileCustomerForm component
interface MobileCustomerFormProps {
  token: string;
  customerInfo: CustomerFormInfo;
  customerRef?: string;  // Secure customer reference for external apps
  appId?: string;        // External application identifier
}

// Gesture handler for swipe navigation
const SWIPE_THRESHOLD = 50;

/**
 * Mobile-optimized customer form component
 * Uses a step-by-step wizard format with swipe navigation
 */
const MobileCustomerForm = ({ token, customerInfo, customerRef, appId }: MobileCustomerFormProps) => {
  const {
    formData,
    updateFormData,
    currentStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    formErrors,
    validateCurrentStep,
    isLoading,
    error,
    setError,
    setLoading,
    isSubmitted,
    setSubmitted
  } = useCustomerForm();
  
  // Touch tracking for swipe gestures
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // Handle touch events for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    
    // Detect left/right swipes that exceed the threshold
    if (distance > SWIPE_THRESHOLD) {
      // Swipe left (next)
      if (currentStep !== 'review' && 
          currentStep !== 'submitting' && 
          currentStep !== 'success' && 
          currentStep !== 'error') {
        goToNextStep();
      }
    } else if (distance < -SWIPE_THRESHOLD) {
      // Swipe right (previous)
      if (currentStep !== 'personal' && 
          currentStep !== 'submitting' && 
          currentStep !== 'success' && 
          currentStep !== 'error') {
        goToPreviousStep();
      }
    }
    
    // Reset touch tracking
    setTouchStart(null);
    setTouchEnd(null);
  };
  
  // Handle form field changes
  const handleChange = (field: string, value: any) => {
    updateFormData({ [field]: value });
  };
  
  // Get step completion percentage
  const getProgressPercentage = () => {
    switch (currentStep) {
      case 'personal': return 25;
      case 'contact': return 50;
      case 'preferences': return 75;
      case 'review': return 100;
      default: return 0;
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
      return;
    }
    
    setLoading(true);
    goToStep('submitting');
    
    try {
      const submission: CustomerFormSubmission = {
        customerData: {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          phone: formData.phone,
          address: formData.address
        },
        serviceRequirements: formData.serviceType || '',
        additionalNotes: formData.notes,
        preferredContactMethod: 'any',
        formMetadata: {
          submitTime: new Date().toISOString(),
          browserInfo: navigator.userAgent
        }
      };
      
      const response = await submitFormApi(token, submission);
      
      if (response.data?.success) {
        setSubmitted(true);
      } else {
        setSubmissionError(response.error?.message || 'Προέκυψε σφάλμα κατά την υποβολή της φόρμας');
        setError('Προέκυψε σφάλμα κατά την υποβολή της φόρμας');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmissionError('Προέκυψε απρόσμενο σφάλμα κατά την υποβολή της φόρμας');
      setError('Προέκυψε απρόσμενο σφάλμα κατά την υποβολή της φόρμας');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle retry after error
  const handleRetry = () => {
    goToStep('review');
    setError(null);
  };
  
  // Render form content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 'personal':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Προσωπικά Στοιχεία</h2>
            
            <MobileFormField
              label="Όνομα"
              type="text"
              value={formData.firstName || ''}
              onChange={(value) => handleChange('firstName', value)}
              error={formErrors.firstName}
              autoFocus
              required
            />
            
            <MobileFormField
              label="Επώνυμο"
              type="text"
              value={formData.lastName || ''}
              onChange={(value) => handleChange('lastName', value)}
              error={formErrors.lastName}
              required
            />
            
            <MobileFormField
              label="Εταιρία"
              type="text"
              value={formData.company || ''}
              onChange={(value) => handleChange('company', value)}
              optional
            />
          </div>
        );
        
      case 'contact':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Στοιχεία Επικοινωνίας</h2>
            
            <MobileFormField
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={(value) => handleChange('email', value)}
              error={formErrors.email}
              keyboardType="email-address"
              required
            />
            
            <MobileFormField
              label="Τηλέφωνο"
              type="tel"
              value={formData.phone || ''}
              onChange={(value) => handleChange('phone', value)}
              error={formErrors.phone}
              keyboardType="phone-pad"
              required
            />
            
            <MobileFormField
              label="Διεύθυνση"
              type="text"
              value={formData.address || ''}
              onChange={(value) => handleChange('address', value)}
              error={formErrors.address}
              required
            />
            
            <MobileFormField
              label="Πόλη"
              type="text"
              value={formData.city || ''}
              onChange={(value) => handleChange('city', value)}
              error={formErrors.city}
              required
            />
          </div>
        );
        
      case 'preferences':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Προτιμήσεις Υπηρεσίας</h2>
            
            <MobileFormSelect
              label="Τύπος Υπηρεσίας"
              value={formData.serviceType || ''}
              onChange={(value) => handleChange('serviceType', value)}
              error={formErrors.serviceType}
              options={[
                { value: '', label: 'Επιλέξτε τύπο υπηρεσίας' },
                { value: 'installation', label: 'Εγκατάσταση' },
                { value: 'repair', label: 'Επισκευή' },
                { value: 'maintenance', label: 'Συντήρηση' },
                { value: 'consultation', label: 'Συμβουλευτική' }
              ]}
              required
            />
            
            <MobileFormDatePicker
              label="Προτιμώμενη Ημερομηνία"
              value={formData.preferredDate || ''}
              onChange={(value) => handleChange('preferredDate', value)}
              error={formErrors.preferredDate}
              optional
            />
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Σημειώσεις <span className="text-gray-500 text-xs">(προαιρετικό)</span>
              </label>
              
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                rows={4}
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Προσθέστε επιπλέον πληροφορίες..."
              />
            </div>
          </div>
        );
        
      case 'review':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Επισκόπηση</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Προσωπικά Στοιχεία</h3>
                <p className="text-gray-800">
                  {formData.firstName} {formData.lastName}
                </p>
                {formData.company && (
                  <p className="text-gray-600 text-sm mt-1">
                    {formData.company}
                  </p>
                )}
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Στοιχεία Επικοινωνίας</h3>
                <p className="text-gray-800">{formData.email}</p>
                <p className="text-gray-800">{formData.phone}</p>
                <p className="text-gray-800">
                  {formData.address}, {formData.city}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Προτιμήσεις Υπηρεσίας</h3>
                <p className="text-gray-800">
                  {formData.serviceType === 'installation' && 'Εγκατάσταση'}
                  {formData.serviceType === 'repair' && 'Επισκευή'}
                  {formData.serviceType === 'maintenance' && 'Συντήρηση'}
                  {formData.serviceType === 'consultation' && 'Συμβουλευτική'}
                </p>
                
                {formData.preferredDate && (
                  <p className="text-gray-600 text-sm mt-1">
                    Προτιμώμενη Ημερομηνία: {formData.preferredDate}
                  </p>
                )}
                
                {formData.notes && (
                  <p className="text-gray-600 text-sm mt-2">
                    Σημειώσεις: {formData.notes}
                  </p>
                )}
              </div>
            </div>
            
            <MobileFormCheckbox
              label="Αποδέχομαι τους όρους και προϋποθέσεις"
              checked={!!formData.termsAccepted}
              onChange={(checked) => handleChange('termsAccepted', checked)}
              error={formErrors.termsAccepted}
            />
          </div>
        );
        
      case 'submitting':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader size={50} />
            <p className="mt-4 text-lg text-gray-700">Υποβολή φόρμας...</p>
            <p className="text-sm text-gray-500">Παρακαλώ περιμένετε, η φόρμα σας υποβάλλεται.</p>
          </div>
        );
        
      case 'success':
        return (
          <FormSuccess customerName={`${formData.firstName} ${formData.lastName}`} />
        );
        
      case 'error':
        return (
          <FormError 
            errorMessage={submissionError || error || 'Προέκυψε σφάλμα κατά την υποβολή της φόρμας'} 
            onRetry={handleRetry}
          />
        );
        
      default:
        return null;
    }
  };
  
  // Render navigation buttons
  const renderNavButtons = () => {
    // Don't show nav buttons on these steps
    if (['submitting', 'success', 'error'].includes(currentStep)) {
      return null;
    }
    
    return (
      <div className="flex justify-between mt-8">
        {currentStep !== 'personal' && (
          <button
            type="button"
            onClick={goToPreviousStep}
            className="flex items-center justify-center h-12 px-6 text-gray-700 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-2" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" 
                clipRule="evenodd" 
              />
            </svg>
            Προηγούμενο
          </button>
        )}
        
        {currentStep !== 'review' ? (
          <button
            type="button"
            onClick={goToNextStep}
            className={`flex items-center justify-center h-12 px-6 text-white bg-blue-600 rounded-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              currentStep === 'personal' ? 'ml-auto' : ''
            }`}
          >
            Επόμενο
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 ml-2" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            form="mobile-customer-form"
            className="flex items-center justify-center h-12 px-6 text-white bg-green-600 rounded-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ml-auto"
          >
            Υποβολή
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 ml-2" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        )}
      </div>
    );
  };
  
  // Render swipe hint on first step
  useEffect(() => {
    let hintTimeout: NodeJS.Timeout;
    
    if (currentStep === 'personal') {
      hintTimeout = setTimeout(() => {
        const swipeHint = document.getElementById('swipe-hint');
        if (swipeHint) {
          swipeHint.classList.remove('opacity-0');
          swipeHint.classList.add('opacity-100');
          
          setTimeout(() => {
            swipeHint.classList.remove('opacity-100');
            swipeHint.classList.add('opacity-0');
          }, 3000);
        }
      }, 1000);
    }
    
    return () => {
      clearTimeout(hintTimeout);
    };
  }, [currentStep]);
  
  return (
    <div 
      className="px-4 py-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe hint */}
      {currentStep === 'personal' && (
        <div 
          id="swipe-hint" 
          className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-80 text-white px-4 py-2 rounded-full text-sm transition-opacity duration-500 opacity-0 pointer-events-none"
        >
          Σύρετε αριστερά/δεξιά για πλοήγηση
        </div>
      )}
      
      {/* Progress bar (hidden during submitting/success/error) */}
      {!['submitting', 'success', 'error'].includes(currentStep) && (
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}  
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span className={currentStep === 'personal' ? 'font-medium text-blue-600' : ''}>
              1. Προσωπικά
            </span>
            <span className={currentStep === 'contact' ? 'font-medium text-blue-600' : ''}>
              2. Επικοινωνία
            </span>
            <span className={currentStep === 'preferences' ? 'font-medium text-blue-600' : ''}>
              3. Προτιμήσεις
            </span>
            <span className={currentStep === 'review' ? 'font-medium text-blue-600' : ''}>
              4. Επισκόπηση
            </span>
          </div>
        </div>
      )}
      
      {/* Form */}
      <form id="mobile-customer-form" onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          {renderStepContent()}
        </div>
        
        {renderNavButtons()}
      </form>
    </div>
  );
};

export default MobileCustomerForm; 
