import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CustomerFormInfo, CustomerFormSubmission } from '@/services/customerFormService/types';
import { submitFormApi } from '@/services/formApiService';
import { Loader } from '@/components/ui/Loader';
import FormSuccess from './FormSuccess';
import FormError from './FormError';

// Props for the CustomerForm component
interface CustomerFormProps {
  token: string;
  customerInfo: CustomerFormInfo;
}

// Form steps
type FormStep = 'personal' | 'contact' | 'preferences' | 'review' | 'submitting' | 'success' | 'error';

// Form validation schema using Zod
const formSchema = z.object({
  // Personal information
  firstName: z.string().min(2, 'Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες'),
  lastName: z.string().min(2, 'Το επώνυμο πρέπει να έχει τουλάχιστον 2 χαρακτήρες'),
  company: z.string().optional(),
  
  // Contact information
  email: z.string().email('Παρακαλώ εισάγετε ένα έγκυρο email'),
  phone: z.string().min(10, 'Το τηλέφωνο πρέπει να έχει τουλάχιστον 10 ψηφία'),
  address: z.string().min(5, 'Η διεύθυνση πρέπει να έχει τουλάχιστον 5 χαρακτήρες'),
  city: z.string().min(2, 'Η πόλη πρέπει να έχει τουλάχιστον 2 χαρακτήρες'),
  
  // Service preferences
  serviceType: z.string().min(1, 'Παρακαλώ επιλέξτε τύπο υπηρεσίας'),
  preferredDate: z.string().optional(),
  notes: z.string().optional(),
  
  // Terms and consent
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'Πρέπει να αποδεχτείτε τους όρους για να συνεχίσετε',
  }),
});

// Type for the form data
type FormData = z.infer<typeof formSchema>;

/**
 * Mobile-optimized customer form component
 * Handles the form submission and validation
 */
const CustomerForm = ({ token, customerInfo }: CustomerFormProps) => {
  const [currentStep, setCurrentStep] = useState<FormStep>('personal');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<CustomerFormSubmission | null>(null);
  
  // Initialize customer name parts
  const nameParts = customerInfo.name ? customerInfo.name.split(' ') : ['', ''];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Initialize form with customer info
  const { register, handleSubmit, formState: { errors, isValid }, getValues, trigger } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: firstName,
      lastName: lastName,
      company: '',
      email: customerInfo.email || '',
      phone: customerInfo.phone || '',
      address: customerInfo.address || '',
      city: '',
      serviceType: '',
      preferredDate: '',
      notes: '',
      termsAccepted: false,
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    setCurrentStep('submitting');
    
    try {
      // Format data for submission
      const formSubmission: CustomerFormSubmission = {
        customerData: {
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
          phone: data.phone,
          address: data.address
        },
        serviceRequirements: data.serviceType,
        additionalNotes: data.notes,
        preferredContactMethod: 'any',
        formMetadata: {
          submitTime: new Date().toISOString(),
          browserInfo: navigator.userAgent
        }
      };
      
      const response = await submitFormApi(token, formSubmission);
      
      if (response.data?.success) {
        setSubmittedData(formSubmission);
        setCurrentStep('success');
      } else {
        setSubmissionError(response.error?.message || 'Προέκυψε σφάλμα κατά την υποβολή της φόρμας');
        setCurrentStep('error');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmissionError('Προέκυψε απρόσμενο σφάλμα κατά την υποβολή της φόρμας');
      setCurrentStep('error');
    }
  };

  // Move to the next step
  const handleNextStep = async () => {
    let isStepValid = false;
    
    // Validate current step fields
    switch (currentStep) {
      case 'personal':
        isStepValid = await trigger(['firstName', 'lastName', 'company']);
        if (isStepValid) setCurrentStep('contact');
        break;
      case 'contact':
        isStepValid = await trigger(['email', 'phone', 'address', 'city']);
        if (isStepValid) setCurrentStep('preferences');
        break;
      case 'preferences':
        isStepValid = await trigger(['serviceType', 'preferredDate', 'notes']);
        if (isStepValid) setCurrentStep('review');
        break;
      case 'review':
        // Final submit happens via the form submit handler
        break;
      default:
        break;
    }
  };

  // Move to the previous step
  const handlePrevStep = () => {
    switch (currentStep) {
      case 'contact':
        setCurrentStep('personal');
        break;
      case 'preferences':
        setCurrentStep('contact');
        break;
      case 'review':
        setCurrentStep('preferences');
        break;
      default:
        break;
    }
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

  // Render form content based on current step
  const renderFormStep = () => {
    switch (currentStep) {
      case 'personal':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Προσωπικά Στοιχεία</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Όνομα
              </label>
              <input
                type="text"
                {...register('firstName')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Επώνυμο
              </label>
              <input
                type="text"
                {...register('lastName')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Εταιρία (προαιρετικό)
              </label>
              <input
                type="text"
                {...register('company')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-600">{errors.company.message}</p>
              )}
            </div>
          </div>
        );
        
      case 'contact':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Στοιχεία Επικοινωνίας</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Τηλέφωνο
              </label>
              <input
                type="tel"
                {...register('phone')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Διεύθυνση
              </label>
              <input
                type="text"
                {...register('address')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Πόλη
              </label>
              <input
                type="text"
                {...register('city')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
              )}
            </div>
          </div>
        );
        
      case 'preferences':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Προτιμήσεις Υπηρεσίας</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Τύπος Υπηρεσίας
              </label>
              <select
                {...register('serviceType')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Επιλέξτε τύπο υπηρεσίας</option>
                <option value="installation">Εγκατάσταση</option>
                <option value="repair">Επισκευή</option>
                <option value="maintenance">Συντήρηση</option>
                <option value="consultation">Συμβουλευτική</option>
              </select>
              {errors.serviceType && (
                <p className="mt-1 text-sm text-red-600">{errors.serviceType.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Προτιμώμενη Ημερομηνία (προαιρετικό)
              </label>
              <input
                type="date"
                {...register('preferredDate')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.preferredDate && (
                <p className="mt-1 text-sm text-red-600">{errors.preferredDate.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Σημειώσεις (προαιρετικό)
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
              )}
            </div>
          </div>
        );
        
      case 'review':
        const formValues = getValues();
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Επισκόπηση Στοιχείων</h3>
            
            <div className="bg-gray-50 p-4 rounded-md space-y-4">
              <div>
                <h4 className="font-medium text-sm text-gray-700">Προσωπικά Στοιχεία</h4>
                <p>Όνομα: {formValues.firstName} {formValues.lastName}</p>
                {formValues.company && <p>Εταιρία: {formValues.company}</p>}
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-gray-700">Στοιχεία Επικοινωνίας</h4>
                <p>Email: {formValues.email}</p>
                <p>Τηλέφωνο: {formValues.phone}</p>
                <p>Διεύθυνση: {formValues.address}, {formValues.city}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-gray-700">Προτιμήσεις Υπηρεσίας</h4>
                <p>Τύπος: {formValues.serviceType}</p>
                {formValues.preferredDate && <p>Προτιμώμενη Ημερομηνία: {formValues.preferredDate}</p>}
                {formValues.notes && <p>Σημειώσεις: {formValues.notes}</p>}
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    {...register('termsAccepted')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="termsAccepted" className="text-sm text-gray-700">
                    Αποδέχομαι τους όρους και προϋποθέσεις
                  </label>
                  {errors.termsAccepted && (
                    <p className="mt-1 text-sm text-red-600">{errors.termsAccepted.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'submitting':
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
            <div className="flex flex-col items-center mb-8">
              <Loader className="h-16 w-16 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Υποβολή Φόρμας</h2>
              <p className="text-gray-600">Παρακαλώ περιμένετε όσο υποβάλλουμε τη φόρμα σας...</p>
            </div>
          </div>
        );
        
      case 'success':
        return (
          <div className="py-6 px-4">
            <FormSuccess customerName={`${firstName} ${lastName}`} />
          </div>
        );
        
      case 'error':
        return (
          <FormError 
            errorMessage={submissionError || 'Προέκυψε σφάλμα κατά την υποβολή της φόρμας'} 
            onRetry={() => setCurrentStep('review')} 
          />
        );
        
      default:
        return null;
    }
  };

  // Render navigation buttons based on current step
  const renderNavButtons = () => {
    if (['submitting', 'success', 'error'].includes(currentStep)) {
      return null;
    }

    return (
      <div className="flex justify-between mt-8">
        {currentStep !== 'personal' && (
          <button
            type="button"
            onClick={handlePrevStep}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Προηγούμενο
          </button>
        )}
        
        {currentStep !== 'review' ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="ml-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Επόμενο
          </button>
        ) : (
          <button
            type="submit"
            form="customer-form"
            className="ml-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Υποβολή
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Progress bar */}
      {!['submitting', 'success', 'error'].includes(currentStep) && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}  
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span className={currentStep === 'personal' ? 'font-medium text-blue-600' : ''}>
              Προσωπικά
            </span>
            <span className={currentStep === 'contact' ? 'font-medium text-blue-600' : ''}>
              Επικοινωνία
            </span>
            <span className={currentStep === 'preferences' ? 'font-medium text-blue-600' : ''}>
              Προτιμήσεις
            </span>
            <span className={currentStep === 'review' ? 'font-medium text-blue-600' : ''}>
              Επισκόπηση
            </span>
          </div>
        </div>
      )}
      
      {/* Form */}
      <form id="customer-form" onSubmit={handleSubmit(onSubmit)}>
        {renderFormStep()}
      </form>
      
      {/* Navigation */}
      {renderNavButtons()}
    </div>
  );
};

export default CustomerForm; 
