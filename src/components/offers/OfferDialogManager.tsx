import React, { useEffect } from 'react';
import { useFormContext } from '../../lib/FormContext';

function OfferDialogManager({ /* props */ }) {
  const { registerForm } = useFormContext();
  
  useEffect(() => {
    registerForm('OfferDialogManager');
    return () => registerForm(null);
  }, [registerForm]);
  // ... rest of component
}

export default OfferDialogManager; 