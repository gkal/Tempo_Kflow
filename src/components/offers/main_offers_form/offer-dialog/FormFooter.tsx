import React from 'react';
import { Button } from '@/components/ui/button';

interface FormFooterProps {
  isSubmitting: boolean;
  submitError: string | null;
  saveSuccess: boolean;
  onClose: () => void;
}

const FormFooter: React.FC<FormFooterProps> = ({
  isSubmitting,
  submitError,
  saveSuccess,
  onClose
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#2f3e46] border-t border-[#52796f] p-4 flex justify-end pr-24">
      {submitError && (
        <div className="text-red-400 mr-4">{submitError}</div>
      )}
      {saveSuccess && (
        <div className="text-green-400 mr-4">Η προσφορά αποθηκεύτηκε επιτυχώς!</div>
      )}
      <Button 
        type="submit"
        disabled={isSubmitting || saveSuccess}
        className="bg-[#52796f] hover:bg-[#354f52] text-[#cad2c5] mr-2"
      >
        {isSubmitting ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Αποθήκευση...
          </span>
        ) : 'Αποθήκευση'}
      </Button>
      <Button
        type="button" 
        variant="outline"
        onClick={onClose}
        className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]"
      >
        {saveSuccess ? 'Κλείσιμο' : 'Ακύρωση'}
      </Button>
    </div>
  );
};

export default FormFooter; 
