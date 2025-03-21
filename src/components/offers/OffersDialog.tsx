import { ContactDialog } from "@/components/contacts/ContactDialog"; 
import { useFormContext } from '../../lib/FormContext';
import { useEffect } from "react";

function OffersDialog({ /* props */ }) {
  const { registerForm } = useFormContext();
  
  useEffect(() => {
    registerForm('OffersDialog');
    return () => registerForm(null);
  }, [registerForm]);
  // ... rest of component
}

export default OffersDialog; 