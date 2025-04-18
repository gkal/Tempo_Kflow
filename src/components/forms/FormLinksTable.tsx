import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { supabase } from '@/lib/supabaseClient';
import { formatDateTime } from '@/utils/formatUtils';
import { VirtualTable } from '@/components/ui/virtual-table/VirtualTable';
import { Button } from '@/components/ui/button';
import { Copy, Trash2, Send, Eye, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ModernDeleteConfirmation } from '@/components/ui/modern-delete-confirmation';
import { GlobalTooltip } from '@/components/ui/GlobalTooltip';
import { createFormLinkForCustomerApi } from '@/services/formApiService';
import { useAuth } from '@/lib/AuthContext';
import { FormLinkStatus } from '@/services/formLinkService/types';
import { Loader } from "@/components/ui/Loader";

// Define the form link data type based on the database schema
export interface FormLink {
  id: string;
  token: string;
  customer_id: string;
  created_at: string;
  expires_at: string;
  status: FormLinkStatus;
  created_by: string;
  is_used?: boolean;
  submitted_at?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

interface FormLinksTableProps {
  customerId: string;
  customerEmail?: string;
}

export default function FormLinksTable({ customerId, customerEmail }: FormLinksTableProps) {
  const { user } = useAuth();
  const [formLinks, setFormLinks] = useState<FormLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkToDelete, setLinkToDelete] = useState<FormLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch form links when the component mounts
  useEffect(() => {
    fetchFormLinks();

    // Set up real-time subscription for form links
    const formLinksSubscription = supabase
      .channel('form-links-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_form_links',
          filter: `customer_id=eq.${customerId}`
        },
        () => {
          fetchFormLinks();
        }
      )
      .subscribe();

    return () => {
      formLinksSubscription.unsubscribe();
    };
  }, [customerId]);

  // Function to fetch form links
  const fetchFormLinks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Query to fetch form links, handling the case where the table may not exist
      let query = supabase
        .from('customer_form_links')
        .select(`
          id, 
          token, 
          customer_id, 
          created_at, 
          expires_at, 
          status, 
          created_by,
          is_used,
          submitted_at,
          customers:customers(
            name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      // Apply customer ID filter if provided
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      // Apply status filter if set
      if (statusFilter !== null && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        // Handle the case where the table doesn't exist
        if (queryError.code === '42P01') { // PostgreSQL error code for "relation does not exist"
          console.log('Table customer_form_links does not exist');
          setFormLinks([]);
          setIsLoading(false);
          return;
        }
        
        console.error('Error fetching form links:', queryError);
        setError(new Error(queryError.message));
        toast({ 
          title: "Error", 
          description: 'Failed to load form links',
          variant: "destructive" 
        });
      } else {
        // Transform the data to match FormLink interface
        const formattedLinks = (data || []).map((link) => {
          // Safely extract customer info from the nested join
          const customerData = link.customers as { name?: string; email?: string; phone?: string } | null;
          
          return {
            id: link.id,
            token: link.token,
            customer_id: link.customer_id,
            created_at: link.created_at,
            expires_at: link.expires_at,
            status: link.status as FormLinkStatus,
            created_by: link.created_by,
            is_used: link.is_used,
            submitted_at: link.submitted_at,
            // Extract customer info with safe fallbacks
            customer_name: customerData?.name || '',
            customer_email: customerData?.email || '',
            customer_phone: customerData?.phone || '',
          };
        }) as FormLink[];

        setFormLinks(formattedLinks);
      }
    } catch (err) {
      console.error('Unexpected error fetching form links:', err);
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      toast({ 
        title: "Error", 
        description: 'Failed to load form links',
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle soft delete
  const handleSoftDelete = async () => {
    if (!linkToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('customer_form_links')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_by: user?.id })
        .eq('id', linkToDelete.id);

      if (error) {
        console.error('Error deleting form link:', error);
        toast({
          title: 'Σφάλμα',
          description: 'Παρουσιάστηκε σφάλμα κατά τη διαγραφή του συνδέσμου.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Επιτυχία',
          description: 'Ο σύνδεσμος διαγράφηκε με επιτυχία.',
        });
        fetchFormLinks();
      }
    } catch (error) {
      console.error('Error in handleSoftDelete:', error);
    } finally {
      setIsDeleting(false);
      setLinkToDelete(null);
      setShowDeleteConfirmation(false);
    }
  };

  // Function to copy link to clipboard
  const handleCopyLink = (token: string) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/form/${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Αντιγραφή συνδέσμου',
      description: 'Ο σύνδεσμος αντιγράφηκε στο πρόχειρο.',
    });
  };

  // Function to create a new form link
  const handleCreateNewLink = async () => {
    setIsCreatingLink(true);
    try {
      const response = await createFormLinkForCustomerApi(
        customerId,
        72, // Default expiration hours
        false, // Don't send email automatically
        customerEmail,
        user?.id
      );

      if (response.status === 'success' && response.data) {
        toast({
          title: 'Επιτυχία',
          description: 'Δημιουργήθηκε νέος σύνδεσμος φόρμας.',
        });
        fetchFormLinks();
      } else {
        toast({
          title: 'Σφάλμα',
          description: response.error?.message || 'Σφάλμα κατά τη δημιουργία συνδέσμου.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating form link:', error);
      toast({
        title: 'Σφάλμα',
        description: 'Προέκυψε απρόσμενο σφάλμα κατά τη δημιουργία συνδέσμου.',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingLink(false);
    }
  };

  // Function to resend an existing form link
  const handleResendLink = (formLink: FormLink) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/form/${formLink.token}`;
    
    // Create Gmail compose URL
    const subject = encodeURIComponent('Σύνδεσμος φόρμας πελάτη');
    const body = encodeURIComponent(
      `Αγαπητέ πελάτη,\n\nΜπορείτε να βρείτε τη φόρμα σας στον παρακάτω σύνδεσμο:\n${url}\n\nΟ σύνδεσμος θα λήξει στις ${formatDateTime(formLink.expires_at)}.\n\nΕυχαριστούμε!`
    );
    
    let gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=${subject}&body=${body}`;
    
    if (customerEmail) {
      gmailUrl += `&to=${encodeURIComponent(customerEmail)}`;
    }
    
    window.open(gmailUrl, '_blank');
  };
  
  // Function to handle viewing form details
  const handleViewDetails = (formLink: FormLink) => {
    // In a real implementation, this would navigate to a details page or open a modal
    // For now, just log the action and show a toast
    console.log('View details for form link:', formLink);
    toast({
      title: 'Προβολή λεπτομερειών',
      description: 'Λειτουργία προβολής λεπτομερειών υπό κατασκευή.',
    });
  };

  // Format status for display
  const formatStatus = (status: string, isUsed: boolean = false, isExpired: boolean): string => {
    if (isExpired && status === 'pending') return 'Έληξε';
    if (status === 'pending' && !isUsed) return 'Εκκρεμεί';
    if (status === 'submitted') return 'Υποβλήθηκε';
    if (status === 'approved') return 'Εγκρίθηκε';
    if (status === 'rejected') return 'Απορρίφθηκε';
    return status;
  };

  // Get status class for styling
  const getStatusClass = (status: string, isUsed: boolean = false, isExpired: boolean): string => {
    if (isExpired && status === 'pending') return 'bg-gray-500/20 text-gray-400';
    switch (status) {
      case 'pending':
        return isUsed ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400';
      case 'submitted':
        return 'bg-blue-500/20 text-blue-400';
      case 'approved':
        return 'bg-green-500/20 text-green-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Get the row actions that should be enabled for each row
  const getAvailableActions = (formLink: FormLink) => {
    const now = new Date();
    const expirationDate = new Date(formLink.expires_at);
    const isExpired = expirationDate < now;
    
    return {
      canCopy: true, // Always allow copying
      canDelete: formLink.status === 'pending' || formLink.status === 'rejected', // Allow deletion for pending or rejected
      canResend: !isExpired && formLink.status === 'pending', // Allow resending only if not expired and pending
      canView: formLink.status === 'submitted' || formLink.status === 'approved' || formLink.status === 'rejected', // Allow viewing for submitted/approved/rejected
    };
  };

  // Define table columns
  const columns = useMemo<ColumnDef<FormLink>[]>(() => [
    {
      accessorKey: 'created_at',
      header: 'Ημερομηνία Δημιουργίας',
      cell: ({ row }) => formatDateTime(row.original.created_at),
      meta: {
        className: 'whitespace-nowrap',
      },
    },
    {
      accessorKey: 'expires_at',
      header: 'Ημερομηνία Λήξης',
      cell: ({ row }) => formatDateTime(row.original.expires_at),
      meta: {
        className: 'whitespace-nowrap',
      },
    },
    {
      accessorKey: 'status',
      header: 'Κατάσταση',
      cell: ({ row }) => {
        const now = new Date();
        const expirationDate = new Date(row.original.expires_at);
        const isExpired = expirationDate < now;
        
        return (
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            getStatusClass(row.original.status, row.original.is_used, isExpired)
          }`}>
            {formatStatus(row.original.status, row.original.is_used, isExpired)}
          </div>
        );
      },
    },
    {
      accessorKey: 'submitted_at',
      header: 'Ημερομηνία Υποβολής',
      cell: ({ row }) => row.original.submitted_at ? formatDateTime(row.original.submitted_at) : '—',
    },
    {
      accessorKey: 'actions',
      header: 'Ενέργειες',
      cell: ({ row }) => {
        const formLink = row.original;
        const actions = getAvailableActions(formLink);
        
        return (
          <div className="flex items-center space-x-2">
            {/* Copy link button */}
            {actions.canCopy && (
              <GlobalTooltip content="Αντιγραφή συνδέσμου">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopyLink(formLink.token)}
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4 text-blue-400" />
                </Button>
              </GlobalTooltip>
            )}
            
            {/* Delete button */}
            {actions.canDelete && (
              <GlobalTooltip content="Διαγραφή συνδέσμου">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setLinkToDelete(formLink);
                    setShowDeleteConfirmation(true);
                  }}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </GlobalTooltip>
            )}
            
            {/* Resend button */}
            {actions.canResend && (
              <GlobalTooltip content="Αποστολή ξανά">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleResendLink(formLink)}
                  className="h-8 w-8"
                >
                  <Send className="h-4 w-4 text-green-400" />
                </Button>
              </GlobalTooltip>
            )}
            
            {/* View details button */}
            {actions.canView && (
              <GlobalTooltip content="Προβολή λεπτομερειών">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewDetails(formLink)}
                  className="h-8 w-8"
                >
                  <Eye className="h-4 w-4 text-purple-400" />
                </Button>
              </GlobalTooltip>
            )}
          </div>
        );
      },
    },
  ], []);

  // Status filter options
  const statusFilterOptions = [
    { value: null, label: 'Όλες', icon: null },
    { value: 'pending', label: 'Εκκρεμείς', icon: <Clock className="h-4 w-4 mr-2" /> },
    { value: 'submitted', label: 'Υποβληθείσες', icon: <AlertCircle className="h-4 w-4 mr-2" /> },
    { value: 'approved', label: 'Εγκεκριμένες', icon: <CheckCircle className="h-4 w-4 mr-2" /> },
    { value: 'rejected', label: 'Απορριφθείσες', icon: <XCircle className="h-4 w-4 mr-2" /> },
  ];

  // Define custom placeholder content for empty state
  const renderEmptyState = () => {
    return (
      <div className="text-center p-8 text-[#cad2c5]">
        <p className="mb-2">Δεν υπάρχουν σύνδεσμοι φόρμας για αυτόν τον πελάτη.</p>
        <p className="text-sm text-[#84a98c]">
          Δημιουργήστε έναν νέο σύνδεσμο φόρμας χρησιμοποιώντας το κουμπί "Νέος Σύνδεσμος".
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with filters and actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-[#cad2c5]">Σύνδεσμοι Φόρμας</h3>
          
          {/* Status filter buttons */}
          <div className="flex flex-wrap items-center gap-1">
            {statusFilterOptions.map((option) => (
              <Button
                key={option.label}
                variant={statusFilter === option.value ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setStatusFilter(option.value)}
              >
                {option.icon}
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Create new link button */}
        <Button
          size="sm"
          className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
          onClick={handleCreateNewLink}
          disabled={isCreatingLink}
        >
          {isCreatingLink ? (
            <>
              <Loader size={16} className="mr-2" />
              Δημιουργία...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Νέος Σύνδεσμος
            </>
          )}
        </Button>
      </div>
      
      {/* Form links table */}
      <div className="h-[300px]">
        <VirtualTable
          data={formLinks}
          columns={columns}
          isLoading={isLoading}
          enableVirtualization={true}
        />
        {formLinks.length === 0 && !isLoading && renderEmptyState()}
      </div>
      
      {/* Delete confirmation dialog */}
      <ModernDeleteConfirmation
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleSoftDelete}
        title="Διαγραφή Συνδέσμου Φόρμας"
        description="Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτόν τον σύνδεσμο φόρμας; Η ενέργεια αυτή δεν μπορεί να αναιρεθεί."
        confirmLabel="Διαγραφή"
        cancelLabel="Ακύρωση"
        isDeleting={isDeleting}
      />
    </div>
  );
} 
