import { useState, useEffect } from 'react';
import { CustomerFormInfo } from '@/services/customerFormService/types';
import CustomerForm from './CustomerForm';
import MobileCustomerForm from './MobileCustomerForm';
import { CustomerFormProvider } from './FormContext';

interface DeviceAwareFormProps {
  token: string;
  customerInfo: CustomerFormInfo;
  customerRef?: string;  // Secure customer reference for external apps
  appId?: string;        // External application identifier
}

/**
 * Device-aware form component that renders the appropriate form based on device type
 * Uses a mobile-first approach with touch-optimized components for small screens
 */
const DeviceAwareForm = ({ token, customerInfo, customerRef, appId }: DeviceAwareFormProps) => {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check device type on mount and window resize
  useEffect(() => {
    const checkDeviceType = () => {
      // Consider mobile if screen width is less than 768px
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkDeviceType();
    
    // Add resize listener
    window.addEventListener('resize', checkDeviceType);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', checkDeviceType);
    };
  }, []);
  
  // For a better user experience, don't change the form type after initial render
  // based on orientation changes alone - this prevents jarring changes mid-form
  const renderForm = () => {
    const formProps = { 
      token, 
      customerInfo,
      customerRef,
      appId
    };
    
    return isMobile ? (
      <MobileCustomerForm {...formProps} />
    ) : (
      <CustomerForm {...formProps} />
    );
  };
  
  return (
    <CustomerFormProvider 
      initialCustomerInfo={customerInfo} 
      initialToken={token}
      externalReference={customerRef}
      externalAppId={appId}
    >
      {renderForm()}
    </CustomerFormProvider>
  );
};

export default DeviceAwareForm; 
