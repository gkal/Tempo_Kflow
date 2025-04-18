import React, { useState, useEffect } from 'react';
import { DialogWrapper } from '@/components/ui/DialogWrapper';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, User, Calendar, Clock, Archive, Phone, FileText, CheckCircle, AlertTriangle, Info, FilesIcon } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";
import DocumentViewer from '@/components/documents/DocumentViewer';
import { Loader } from "@/components/ui/Loader";

interface CustomerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
  matchScore?: number;
}

interface CustomerDetail {
  id: string;
  company_name: string;
  telephone: string;
  afm: string;
  doy?: string;
  email?: string;
  address?: string;
  town?: string;
  postal_code?: string;
  customer_type?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  deleted?: boolean;
  deleted_at?: string;
  status?: string;
  // User display names
  created_by_name?: string;
  modified_by_name?: string;
  deleted_by_name?: string;
  // Counts
  offers_count?: number;
  contacts_count?: number;
}

export function CustomerDetailDialog({
  open,
  onOpenChange,
  customerId,
  matchScore
}: CustomerDetailDialogProps) {
  const [customerData, setCustomerData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!customerId || !open) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // 1. Fetch basic customer details - no user joins to avoid foreign key errors
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();
          
        if (customerError) throw customerError;
        
        if (!customerData) {
          throw new Error('Customer not found');
        }
        
        // 2. Get offers count in a separate query
        const { count: offersCount, error: offersError } = await supabase
          .from('offers')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .is('deleted_at', null);
          
        // 3. Get contacts count in a separate query
        const { count: contactsCount, error: contactsError } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .is('deleted_at', null);
        
        // Set data with additional counts
        const processedData: CustomerDetail = {
          ...customerData,
          created_by_name: 'Άγνωστος', // Default values since we can't join
          modified_by_name: 'Άγνωστος',
          deleted_by_name: 'Άγνωστος',
          offers_count: offersCount || 0,
          contacts_count: contactsCount || 0
        };
        
        setCustomerData(processedData);
      } catch (err) {
        console.error('Error fetching customer details:', err);
        setError('Δεν ήταν δυνατή η ανάκτηση των στοιχείων πελάτη.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomerDetails();
  }, [customerId, open]);
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Μη διαθέσιμο';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: el });
    } catch (e) {
      return 'Μη έγκυρη ημερομηνία';
    }
  };

  const getStatusLabel = (status?: string) => {
    if (!status) return 'Μη ορισμένη';
    
    switch(status.toLowerCase()) {
      case 'active':
        return 'Ενεργός';
      case 'inactive':
        return 'Ανενεργός';
      case 'pending':
        return 'Σε εκκρεμότητα';
      default:
        return status;
    }
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    
    switch(status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="Στοιχεία Πελάτη"
      className="max-w-4xl bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
      contentProps={{
        className: "max-w-4xl bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
      }}
    >
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <Loader size={32} />
        </div>
      ) : error ? (
        <div className="text-red-400 p-4">{error}</div>
      ) : customerData ? (
        <div className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
          {/* Header with match score, status, offers and contacts counts */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-[#a8c5b5]">
                {customerData.company_name}
              </div>
              {matchScore && (
                <div className={`px-2 py-1 rounded-full text-sm font-medium ${
                  matchScore >= 90 
                    ? 'bg-red-200 text-red-800 dark:bg-red-700/50 dark:text-red-200' 
                    : matchScore >= 80 
                      ? 'bg-amber-200 text-amber-800 dark:bg-amber-700/50 dark:text-amber-200'
                      : 'bg-blue-200 text-blue-800 dark:bg-blue-700/50 dark:text-blue-200'
                }`}>
                  Ομοιότητα: {matchScore}%
                </div>
              )}
            </div>
            
            {/* Status, Offers and Contacts badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <div className="flex items-center px-2 py-1 rounded bg-[#354f52] text-[#cad2c5] text-xs">
                {getStatusIcon(customerData.status)}
                <span className="ml-1">Κατάσταση: {getStatusLabel(customerData.status)}</span>
              </div>
              
              <div className="flex items-center px-2 py-1 rounded bg-[#354f52] text-[#cad2c5] text-xs">
                <FileText className="h-4 w-4 text-[#84a98c]" />
                <span className="ml-1">Προσφορές: {customerData.offers_count}</span>
              </div>
              
              <div className="flex items-center px-2 py-1 rounded bg-[#354f52] text-[#cad2c5] text-xs">
                <Phone className="h-4 w-4 text-[#84a98c]" />
                <span className="ml-1">Επαφές: {customerData.contacts_count}</span>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <AppTabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <AppTabsList className="mb-4">
              <AppTabsTrigger value="info" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Πληροφορίες
              </AppTabsTrigger>
              <AppTabsTrigger value="documents" className="flex items-center gap-2">
                <FilesIcon className="h-4 w-4" />
                Έγγραφα
              </AppTabsTrigger>
            </AppTabsList>
            
            <AppTabsContent value="info" className="mt-0">
              {/* Main information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left column - Basic Info */}
                <div className="bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
                  <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
                    <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                      ΣΤΟΙΧΕΙΑ ΠΕΛΑΤΗ
                    </h2>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex flex-col">
                      <span className="text-[#84a98c] text-xs">Επωνυμία</span>
                      <span className="text-[#cad2c5] font-medium">
                        {customerData.company_name}
                        {customerData.deleted && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-200">
                            <Archive className="mr-1 h-3 w-3" />
                            Διαγραμμένος
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-[#84a98c] text-xs">Τηλέφωνο</span>
                      <span className="text-[#cad2c5]">{customerData.telephone}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-[#84a98c] text-xs">ΑΦΜ</span>
                      <span className="text-[#cad2c5]">{customerData.afm}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-[#84a98c] text-xs">Δ.Ο.Υ.</span>
                      <span className="text-[#cad2c5]">{customerData.doy || 'Μη διαθέσιμο'}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-[#84a98c] text-xs">Email</span>
                      <span className="text-[#cad2c5]">{customerData.email || 'Μη διαθέσιμο'}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-[#84a98c] text-xs">Τύπος Πελάτη</span>
                      <span className="text-[#cad2c5]">{customerData.customer_type || 'Δεν έχει οριστεί'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Right column - Address */}
                <div className="bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
                  <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
                    <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                      ΣΤΟΙΧΕΙΑ ΔΙΕΥΘΥΝΣΕΩΣ
                    </h2>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex flex-col">
                      <span className="text-[#84a98c] text-xs">Διεύθυνση</span>
                      <span className="text-[#cad2c5]">{customerData.address || 'Μη διαθέσιμο'}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-[#84a98c] text-xs">Πόλη</span>
                      <span className="text-[#cad2c5]">{customerData.town || 'Μη διαθέσιμο'}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-[#84a98c] text-xs">Τ.Κ.</span>
                      <span className="text-[#cad2c5]">{customerData.postal_code || 'Μη διαθέσιμο'}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-[#84a98c] text-xs">Σημειώσεις</span>
                      <span className="text-[#cad2c5] text-sm line-clamp-3">{customerData.notes || 'Δεν υπάρχουν σημειώσεις'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Audit Information */}
              <div className="mt-4 bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
                <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
                  <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                    ΣΤΟΙΧΕΙΑ ΕΝΕΡΓΕΙΩΝ
                  </h2>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start space-x-2">
                    <div className="mt-0.5">
                      <Calendar className="h-4 w-4 text-[#84a98c]" />
                    </div>
                    <div>
                      <span className="text-[#84a98c] text-xs block">Δημιουργήθηκε</span>
                      <span className="text-[#cad2c5] text-sm block">{formatDate(customerData.created_at)}</span>
                      <div className="flex items-center mt-1">
                        <User className="h-3 w-3 text-[#84a98c] mr-1" />
                        <span className="text-[#cad2c5] text-xs">{customerData.created_by_name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <div className="mt-0.5">
                      <Clock className="h-4 w-4 text-[#84a98c]" />
                    </div>
                    <div>
                      <span className="text-[#84a98c] text-xs block">Τελευταία Τροποποίηση</span>
                      <span className="text-[#cad2c5] text-sm block">{formatDate(customerData.updated_at)}</span>
                      <div className="flex items-center mt-1">
                        <User className="h-3 w-3 text-[#84a98c] mr-1" />
                        <span className="text-[#cad2c5] text-xs">{customerData.modified_by_name}</span>
                      </div>
                    </div>
                  </div>
                  
                  {customerData.deleted && (
                    <div className="flex items-start space-x-2">
                      <div className="mt-0.5">
                        <Archive className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <span className="text-red-400 text-xs block">Διαγράφηκε</span>
                        <span className="text-[#cad2c5] text-sm block">{formatDate(customerData.deleted_at)}</span>
                        <div className="flex items-center mt-1">
                          <User className="h-3 w-3 text-red-400 mr-1" />
                          <span className="text-[#cad2c5] text-xs">{customerData.deleted_by_name}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AppTabsContent>
            
            <AppTabsContent value="documents" className="mt-0">
              {/* Documents Tab Content */}
              {customerId && (
                <DocumentViewer 
                  customerId={customerId} 
                  customerName={customerData.company_name} 
                />
              )}
            </AppTabsContent>
          </AppTabs>
          
          {/* ID Information */}
          <div className="mt-4 pt-2 border-t border-[#52796f] text-center">
            <span className="text-[#84a98c] text-xs">ID: {customerData.id}</span>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-[#84a98c]">
          Δεν έχει επιλεγεί πελάτης ή τα στοιχεία δεν είναι διαθέσιμα.
        </div>
      )}
    </DialogWrapper>
  );
}

export default CustomerDetailDialog; 
