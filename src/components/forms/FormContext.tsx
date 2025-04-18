import React, { createContext, useState, useContext, ReactNode } from 'react';
import { CustomerFormInfo, CustomerFormSubmission } from '@/services/customerFormService/types';

// Form step types
export type FormStep = 'personal' | 'contact' | 'preferences' | 'review' | 'submitting' | 'success' | 'error';

// Form context state
interface CustomerFormContextState {
  // Form data
  customerInfo: CustomerFormInfo | null;
  formData: Partial<CustomerFormSubmission>;
  formToken: string | null;
  
  // Form state
  currentStep: FormStep;
  isLoading: boolean;
  error: string | null;
  isSubmitted: boolean;
  
  // Form validation
  formErrors: Record<string, string>;
  isValid: boolean;
}

// Form context actions
interface CustomerFormContextActions {
  // Navigation
  goToStep: (step: FormStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  
  // Data management
  updateFormData: (data: Partial<CustomerFormSubmission>) => void;
  setCustomerInfo: (info: CustomerFormInfo) => void;
  setFormToken: (token: string) => void;
  
  // Form status
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSubmitted: (isSubmitted: boolean) => void;
  
  // Form validation
  validateCurrentStep: () => boolean;
  setFormErrors: (errors: Record<string, string>) => void;
  clearFormErrors: () => void;
}

// Combined context type
export type CustomerFormContextType = CustomerFormContextState & CustomerFormContextActions;

// Create the context
export const CustomerFormContext = createContext<CustomerFormContextType | undefined>(undefined);

// Provider props
interface CustomerFormProviderProps {
  children: ReactNode;
  initialCustomerInfo?: CustomerFormInfo;
  initialToken?: string;
}

/**
 * Provider component for the customer form context
 */
export function CustomerFormProvider({ 
  children, 
  initialCustomerInfo = null,
  initialToken = null 
}: CustomerFormProviderProps) {
  // State
  const [customerInfo, setCustomerInfoState] = useState<CustomerFormInfo | null>(initialCustomerInfo);
  const [formData, setFormData] = useState<Partial<CustomerFormSubmission>>({});
  const [formToken, setFormTokenState] = useState<string | null>(initialToken);
  
  const [currentStep, setCurrentStep] = useState<FormStep>('personal');
  const [isLoading, setLoadingState] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [isSubmitted, setSubmittedState] = useState(false);
  
  const [formErrors, setFormErrorsState] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);
  
  // Actions
  
  // Navigation actions
  const goToStep = (step: FormStep) => {
    setCurrentStep(step);
  };
  
  const goToNextStep = () => {
    if (validateCurrentStep()) {
      switch (currentStep) {
        case 'personal':
          setCurrentStep('contact');
          break;
        case 'contact':
          setCurrentStep('preferences');
          break;
        case 'preferences':
          setCurrentStep('review');
          break;
        case 'review':
          setCurrentStep('submitting');
          break;
        default:
          break;
      }
    }
  };
  
  const goToPreviousStep = () => {
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
  
  // Data management actions
  const updateFormData = (data: Partial<CustomerFormSubmission>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };
  
  const setCustomerInfo = (info: CustomerFormInfo) => {
    setCustomerInfoState(info);
  };
  
  const setFormToken = (token: string) => {
    setFormTokenState(token);
  };
  
  // Form status actions
  const setLoading = (loading: boolean) => {
    setLoadingState(loading);
  };
  
  const setError = (errorMessage: string | null) => {
    setErrorState(errorMessage);
    
    if (errorMessage) {
      setCurrentStep('error');
    }
  };
  
  const setSubmitted = (submitted: boolean) => {
    setSubmittedState(submitted);
    
    if (submitted) {
      setCurrentStep('success');
    }
  };
  
  // Form validation actions
  const validateCurrentStep = () => {
    // Basic validation logic - would be more complex in a real app
    // and would work with react-hook-form or another validation library
    let isStepValid = true;
    const errors: Record<string, string> = {};
    
    switch (currentStep) {
      case 'personal':
        if (!formData.firstName || formData.firstName.length < 2) {
          errors.firstName = 'Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες';
          isStepValid = false;
        }
        
        if (!formData.lastName || formData.lastName.length < 2) {
          errors.lastName = 'Το επώνυμο πρέπει να έχει τουλάχιστον 2 χαρακτήρες';
          isStepValid = false;
        }
        break;
        
      case 'contact':
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errors.email = 'Παρακαλώ εισάγετε ένα έγκυρο email';
          isStepValid = false;
        }
        
        if (!formData.phone || formData.phone.length < 10) {
          errors.phone = 'Το τηλέφωνο πρέπει να έχει τουλάχιστον 10 ψηφία';
          isStepValid = false;
        }
        
        if (!formData.address || formData.address.length < 5) {
          errors.address = 'Η διεύθυνση πρέπει να έχει τουλάχιστον 5 χαρακτήρες';
          isStepValid = false;
        }
        
        if (!formData.city || formData.city.length < 2) {
          errors.city = 'Η πόλη πρέπει να έχει τουλάχιστον 2 χαρακτήρες';
          isStepValid = false;
        }
        break;
        
      case 'preferences':
        if (!formData.serviceType) {
          errors.serviceType = 'Παρακαλώ επιλέξτε τύπο υπηρεσίας';
          isStepValid = false;
        }
        break;
        
      case 'review':
        if (!formData.termsAccepted) {
          errors.termsAccepted = 'Πρέπει να αποδεχτείτε τους όρους για να συνεχίσετε';
          isStepValid = false;
        }
        break;
        
      default:
        break;
    }
    
    setFormErrorsState(errors);
    setIsValid(isStepValid);
    
    return isStepValid;
  };
  
  const setFormErrors = (errors: Record<string, string>) => {
    setFormErrorsState(errors);
    setIsValid(Object.keys(errors).length === 0);
  };
  
  const clearFormErrors = () => {
    setFormErrorsState({});
    setIsValid(true);
  };
  
  // Context value
  const contextValue: CustomerFormContextType = {
    // State
    customerInfo,
    formData,
    formToken,
    currentStep,
    isLoading,
    error,
    isSubmitted,
    formErrors,
    isValid,
    
    // Actions
    goToStep,
    goToNextStep,
    goToPreviousStep,
    updateFormData,
    setCustomerInfo,
    setFormToken,
    setLoading,
    setError,
    setSubmitted,
    validateCurrentStep,
    setFormErrors,
    clearFormErrors,
  };
  
  return (
    <CustomerFormContext.Provider value={contextValue}>
      {children}
    </CustomerFormContext.Provider>
  );
}

/**
 * Hook to use the customer form context
 */
export function useCustomerForm() {
  const context = useContext(CustomerFormContext);
  
  if (!context) {
    throw new Error('useCustomerForm must be used within a CustomerFormProvider');
  }
  
  return context;
} 
