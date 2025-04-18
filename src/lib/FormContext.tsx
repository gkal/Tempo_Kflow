import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';

interface FormContextType {
  showFormInfo: boolean;
  currentForm: string | null;
  toggleFormInfo: () => void;
  registerForm: (formName: string | null) => void;
}

// Create the context
export const FormContext = createContext<FormContextType | undefined>(undefined);

export function FormProvider({ children }: { children: React.ReactNode }) {
  const [showFormInfo, setShowFormInfo] = useState(false);
  const [currentForm, setCurrentForm] = useState<string | null>(null);

  const toggleFormInfo = useCallback(() => {
    setShowFormInfo(prev => !prev);
  }, []);

  const registerForm = useCallback((formName: string | null) => {
    setCurrentForm(formName);
  }, []);

  const value = useMemo(() => ({
    showFormInfo,
    currentForm,
    toggleFormInfo,
    registerForm,
  }), [showFormInfo, currentForm, toggleFormInfo, registerForm]);

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
}

export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
}

export function useFormRegistration(formName: string, isOpen: boolean) {
  const { registerForm } = useFormContext();
  
  useEffect(() => {
    if (isOpen) {
      registerForm(formName);
      return () => registerForm(null);
    }
  }, [isOpen, formName, registerForm]);
} 
