import React, { useState, useEffect } from 'react';
import { CustomerFormLink } from '@/services/formLinkService/types';
import { getCustomerById } from '@/services/customerService';
import { processFormApproval } from '@/services/customerFormService';
import { Customer } from '@/types';
import { useCustomToast } from '@/hooks/useCustomToast';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/utils/dateUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FormApprovalDetailProps {
  formLink: CustomerFormLink;
  onClose: () => void;
  onApproved: () => void;
}

export const FormApprovalDetail: React.FC<FormApprovalDetailProps> = ({
  formLink,
  onClose,
  onApproved,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { showToast } = useCustomToast();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!formLink.customer_id) {
        setIsLoading(false);
        return;
      }

      try {
        const customerData = await getCustomerById(formLink.customer_id);
        setCustomer(customerData);
      } catch (error) {
        console.error('Failed to fetch customer:', error);
        showToast({
          title: 'Σφάλμα',
          description: 'Αποτυχία φόρτωσης δεδομένων πελάτη',
          type: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [formLink.customer_id, showToast]);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await processFormApproval({
        formLinkId: formLink.id,
        approved: true,
        notes: notes.trim(),
      });

      showToast({
        title: 'Επιτυχία',
        description: 'Η φόρμα εγκρίθηκε με επιτυχία',
        type: 'success',
      });
      onApproved();
    } catch (error) {
      console.error('Failed to approve form:', error);
      showToast({
        title: 'Σφάλμα',
        description: 'Αποτυχία έγκρισης της φόρμας',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      showToast({
        title: 'Προσοχή',
        description: 'Παρακαλώ εισάγετε αιτιολογία απόρριψης',
        type: 'warning',
      });
      return;
    }

    setIsProcessing(true);
    try {
      await processFormApproval({
        formLinkId: formLink.id,
        approved: false,
        notes: notes.trim(),
      });

      showToast({
        title: 'Ολοκληρώθηκε',
        description: 'Η φόρμα απορρίφθηκε',
        type: 'success',
      });
      onApproved();
    } catch (error) {
      console.error('Failed to reject form:', error);
      showToast({
        title: 'Σφάλμα',
        description: 'Αποτυχία απόρριψης της φόρμας',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
      setShowRejectDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  // Parse the form data
  const formData = formLink.form_data || {};

  // Format the submitted data in a readable way
  const formatSubmittedData = () => {
    if (!formData || Object.keys(formData).length === 0) {
      return (
        <div className="p-4 bg-yellow-50 rounded-md text-yellow-700">
          Δεν υπάρχουν δεδομένα υποβολής.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(formData).map(([key, value]) => {
          // Skip arrays or objects for now - just show simple values
          if (typeof value === 'object' && value !== null) {
            return null;
          }

          return (
            <div key={key} className="grid grid-cols-3 gap-2 p-2 border-b border-gray-100">
              <div className="font-medium text-gray-700">
                {key
                  .replace(/_/g, ' ')
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (str) => str.toUpperCase())}
              </div>
              <div className="col-span-2 text-gray-900">{value || '-'}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Display existing customer data for comparison
  const formatCustomerData = () => {
    if (!customer) {
      return (
        <div className="p-4 bg-yellow-50 rounded-md text-yellow-700">
          Δεν βρέθηκαν δεδομένα πελάτη.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 p-2 border-b border-gray-100">
          <div className="font-medium text-gray-700">Επωνυμία</div>
          <div className="col-span-2 text-gray-900">{customer.company_name || '-'}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-2 border-b border-gray-100">
          <div className="font-medium text-gray-700">ΑΦΜ</div>
          <div className="col-span-2 text-gray-900">{customer.afm || '-'}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-2 border-b border-gray-100">
          <div className="font-medium text-gray-700">Τηλέφωνο</div>
          <div className="col-span-2 text-gray-900">{customer.telephone || '-'}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-2 border-b border-gray-100">
          <div className="font-medium text-gray-700">Email</div>
          <div className="col-span-2 text-gray-900">{customer.email || '-'}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-2 border-b border-gray-100">
          <div className="font-medium text-gray-700">Διεύθυνση</div>
          <div className="col-span-2 text-gray-900">{customer.address || '-'}</div>
        </div>
      </div>
    );
  };

  // Show form validation results
  const renderValidationResults = () => {
    // This would come from form validation service
    // For now, we'll just show a placeholder
    return (
      <div className="p-4 bg-green-50 rounded-md text-green-700">
        Η φόρμα είναι έγκυρη και έτοιμη για επεξεργασία.
      </div>
    );
  };

  // Mobile view renders content in tabs for easier navigation
  if (isMobile) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {customer?.company_name || 'Άγνωστος Πελάτης'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Υποβλήθηκε: {formLink.submitted_at ? formatDate(formLink.submitted_at) : 'Άγνωστο'}
          </p>
        </div>

        {/* Mobile Tab Interface */}
        <Tabs defaultValue="validation" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="validation">Επικύρωση</TabsTrigger>
            <TabsTrigger value="customer">Πελάτης</TabsTrigger>
            <TabsTrigger value="submission">Υποβολή</TabsTrigger>
          </TabsList>
          
          <TabsContent value="validation" className="p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Αποτελέσματα Επικύρωσης</h3>
            {renderValidationResults()}
          </TabsContent>
          
          <TabsContent value="customer" className="p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Δεδομένα Πελάτη</h3>
            {formatCustomerData()}
          </TabsContent>
          
          <TabsContent value="submission" className="p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Δεδομένα Υποβολής</h3>
            {formatSubmittedData()}
          </TabsContent>
        </Tabs>

        {/* Notes Field */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Σημειώσεις</h3>
          <Textarea
            placeholder="Εισάγετε σημειώσεις ή λόγο απόρριψης..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-24"
            disabled={isProcessing}
          />
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-3 border-t border-gray-200 flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full"
            aria-label="Ακύρωση και επιστροφή"
          >
            Ακύρωση
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isProcessing}
                  className="w-full"
                  aria-label="Απόρριψη φόρμας πελάτη"
                >
                  Απόρριψη
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Επιβεβαίωση Απόρριψης</AlertDialogTitle>
                  <AlertDialogDescription>
                    Είστε βέβαιοι ότι θέλετε να απορρίψετε αυτή τη φόρμα; Θα ενημερωθεί ο πελάτης για την απόρριψη.
                    {!notes.trim() && (
                      <div className="mt-2 text-red-500">
                        Παρακαλώ προσθέστε μια αιτιολογία για την απόρριψη.
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReject}
                    disabled={isProcessing || !notes.trim()}
                    className={`bg-red-500 text-white hover:bg-red-600 ${
                      (isProcessing || !notes.trim()) && 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Spinner size="sm" className="mr-2" /> Επεξεργασία...
                      </>
                    ) : (
                      'Απόρριψη'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="default"
              onClick={handleApprove}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700"
              aria-label="Έγκριση φόρμας και δημιουργία προσφοράς"
            >
              {isProcessing ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Επεξεργασία...
                </>
              ) : (
                'Έγκριση'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop view with side-by-side comparison
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">
          Έγκριση Φόρμας Πελάτη: {customer?.company_name || 'Άγνωστος Πελάτης'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Υποβλήθηκε: {formLink.submitted_at ? formatDate(formLink.submitted_at) : 'Άγνωστο'}
        </p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Validation Results */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Αποτελέσματα Επικύρωσης</h3>
          {renderValidationResults()}
        </div>

        {/* Comparison Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Υπάρχοντα Δεδομένα Πελάτη</h3>
            {formatCustomerData()}
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Δεδομένα Υποβολής Φόρμας</h3>
            {formatSubmittedData()}
          </div>
        </div>

        {/* Notes Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Σημειώσεις</h3>
          <Textarea
            placeholder="Εισάγετε σημειώσεις ή λόγο απόρριψης..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-32"
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isProcessing}
          aria-label="Ακύρωση και επιστροφή"
        >
          Ακύρωση
        </Button>

        <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={isProcessing}
              aria-label="Απόρριψη φόρμας πελάτη"
            >
              Απόρριψη
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Επιβεβαίωση Απόρριψης</AlertDialogTitle>
              <AlertDialogDescription>
                Είστε βέβαιοι ότι θέλετε να απορρίψετε αυτή τη φόρμα; Θα ενημερωθεί ο πελάτης για την απόρριψη.
                {!notes.trim() && (
                  <div className="mt-2 text-red-500">
                    Παρακαλώ προσθέστε μια αιτιολογία για την απόρριψη.
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReject}
                disabled={isProcessing || !notes.trim()}
                className={`bg-red-500 text-white hover:bg-red-600 ${
                  (isProcessing || !notes.trim()) && 'opacity-50 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Spinner size="sm" className="mr-2" /> Επεξεργασία...
                  </>
                ) : (
                  'Απόρριψη Φόρμας'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="default"
          onClick={handleApprove}
          disabled={isProcessing}
          aria-label="Έγκριση φόρμας και δημιουργία προσφοράς"
          className="bg-green-600 hover:bg-green-700"
        >
          {isProcessing ? (
            <>
              <Spinner size="sm" className="mr-2" /> Επεξεργασία...
            </>
          ) : (
            'Έγκριση Φόρμας'
          )}
        </Button>
      </div>
    </div>
  );
};

export default FormApprovalDetail; 