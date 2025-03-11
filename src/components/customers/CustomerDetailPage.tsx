import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  Users,
  FileText,
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Building,
  CheckCircle2,
  Clock,
  Edit,
  User,
  Plus,
  Trash2,
} from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { ContactDialog } from "@/components/contacts/ContactDialog";
import CustomerForm from "./CustomerForm";
import { ContactList } from "@/components/contacts/ContactList";
import { toast } from "@/components/ui/use-toast";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import OffersTable from "./OffersTable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { openNewOfferDialog, openEditOfferDialog } from './OfferDialogManager';
import { CustomerDialog } from "./CustomerDialog";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [formValid, setFormValid] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showOffersTable, setShowOffersTable] = useState(false);
  const [recentOffers, setRecentOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [activities, setActivities] = useState([
    {
      id: 1,
      type: "task",
      title: "Επικοινωνία για προσφορά",
      dueDate: new Date().toISOString(),
      status: "active",
      assignedTo: "Lisa Crosbie",
    },
    {
      id: 2,
      type: "task",
      title: "Αποστολή συμβολαίου",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      status: "active",
      assignedTo: "Lisa Crosbie",
    },
  ]);
  const [contactsKey, setContactsKey] = useState(0);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (id) {
      fetchCustomerData();
      fetchContacts();
      fetchRecentOffers();
    }
  }, [id]);

  // Add custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #2f3e46;
        border-radius: 4px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #52796f;
        border-radius: 4px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #84a98c;
      }
      
      /* Equal heights for all sections */
      .contact-info-section, .recent-offers-section {
        height: 400px !important;
        min-height: 400px !important;
        max-height: 400px !important;
      }
      
      /* Custom height for contacts section */
      .contacts-section {
        height: 235px !important;
        min-height: 235px !important;
        max-height: 235px !important;
      }
      
      /* Custom height for notes section */
      .notes-section {
        height: 200px !important;
        min-height: 200px !important;
        max-height: 200px !important;
      }
      
      /* Ensure content scrolls properly in fixed height containers */
      .section-content {
        overflow-y: auto;
        height: calc(100% - 50px); /* Subtract header height */
      }
      
      /* Add this specific override for the contacts container */
      #contacts-container::-webkit-scrollbar {
        width: 8px;
      }
      
      #contacts-container::-webkit-scrollbar-track {
        background: #2f3e46;
        border-radius: 4px;
      }
      
      #contacts-container::-webkit-scrollbar-thumb {
        background: #52796f;
        border-radius: 4px;
      }
      
      #contacts-container::-webkit-scrollbar-thumb:hover {
        background: #84a98c;
      }
      
      /* Disable scrollbars for all parent elements of the contacts container */
      .contacts-section, .contacts-section > div, .contacts-section > div > div {
        overflow: visible !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select(
          `*, created_by:users!created_by(fullname), modified_by:users!modified_by(fullname)`,
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error("Error fetching customer:", error);
    } finally {
      setLoading(false);
    }
  };

  // Modify the setPrimaryContact function to only refresh the contacts section
  const setPrimaryContact = async (contactId: string) => {
    if (!id) return;

    try {
      // Update customer with primary contact
      const { error } = await supabase
        .from("customers")
        .update({
          primary_contact_id: contactId,
          modified_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Update the customer object locally without a full refresh
      setCustomer(prev => ({
        ...prev,
        primary_contact_id: contactId
      }));
      
      // Increment the key to force only this component to re-render
      setContactsKey(prev => prev + 1);
      
      // Show success toast
      toast({
        title: "Επιτυχία",
        description: "Η κύρια επαφή ενημερώθηκε με επιτυχία.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error setting primary contact:", error);
      toast({
        title: "Σφάλμα",
        description: "Προέκυψε σφάλμα κατά την ενημέρωση της κύριας επαφής.",
        variant: "destructive",
      });
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("customer_id", id)
        .eq("status", "active");

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  // Generate initials for avatar
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`;
    }
    return name[0] || "?";
  };

  // Generate avatar color based on name
  const generateAvatarColor = (name) => {
    if (!name) return "hsl(200, 70%, 50%)";
    const hash = name.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      setIsDeleting(true);
      
      // Check if user is admin or super user
      const isAdminOrSuperUser = user?.role?.toLowerCase() === 'admin' || 
                                user?.role === 'Super User' ||
                                user?.role?.toLowerCase() === 'super user';
      
      if (isAdminOrSuperUser) {
        // For admin/super users: Perform actual deletion
        // First delete all contacts associated with this customer
        const { error: contactsError } = await supabase
          .from('contacts')
          .delete()
          .eq('customer_id', id);
        
        if (contactsError) throw contactsError;
        
        // Then delete the customer record
        const { error: customerError } = await supabase
          .from('customers')
          .delete()
          .eq('id', id);
        
        if (customerError) throw customerError;
        
        toast({
          title: "Επιτυχής διαγραφή",
          description: "Ο πελάτης και όλες οι επαφές του διαγράφηκαν οριστικά.",
          variant: "default",
        });
      } else {
        // For regular users: Just mark as inactive
        const { error } = await supabase
          .from('customers')
          .update({ 
            status: 'inactive',
            modified_by: user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        
        if (error) throw error;
        
        toast({
          title: "Επιτυχής απενεργοποίηση",
          description: "Ο πελάτης έχει απενεργοποιηθεί.",
          variant: "default",
        });
      }
      
      // Redirect to customers list
      navigate('/customers');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Σφάλμα",
        description: "Υπήρξε πρόβλημα κατά τη διαγραφή του πελάτη.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;
    
    setIsDeleting(true);
    try {
      // Check if this is the primary contact
      if (contactToDelete.id === customer?.primary_contact_id) {
        // Update customer to remove primary contact reference
        const { error: customerError } = await supabase
          .from("customers")
          .update({ primary_contact_id: null })
          .eq("id", id);
          
        if (customerError) throw customerError;
      }
      
      // Delete the contact (or mark as inactive)
      const { error } = await supabase
        .from("contacts")
        .update({ status: "inactive" })
        .eq("id", contactToDelete.id);
        
      if (error) throw error;
      
      // Refresh contacts list
      await fetchContacts();
      
      // Show success message
      toast({
        title: "Επιτυχία",
        description: "Η επαφή διαγράφηκε με επιτυχία.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast({
        title: "Σφάλμα",
        description: "Προέκυψε σφάλμα κατά τη διαγραφή της επαφής.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setContactToDelete(null);
    }
  };

  // Function to fetch recent offers for this customer
  const fetchRecentOffers = async () => {
    if (!id) return;
    
    try {
      setLoadingOffers(true);
      
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          assigned_user:users!assigned_to(fullname),
          created_user:users!created_by(fullname),
          contact:contacts(full_name, position)
        `)
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentOffers(data || []);
    } catch (error) {
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η φόρτωση των προσφορών.",
        variant: "destructive",
      });
    } finally {
      setLoadingOffers(false);
    }
  };
  
  // Function to handle editing an offer
  const handleEditOffer = (offerId: string) => {
    openEditOfferDialog(id, offerId, () => {
      fetchRecentOffers();
    });
  };
  
  // Function to format offer status
  const formatStatus = (status: string): string => {
    switch (status) {
      case "wait_for_our_answer":
        return "Αναμονή για απάντησή μας";
      case "wait_for_customer_answer":
        return "Αναμονή για απάντηση πελάτη";
      case "ready":
        return "Ολοκληρώθηκε";
      default:
        return status || "—";
    }
  };

  // Function to format offer result
  const formatResult = (result: string): string => {
    switch (result) {
      case "success":
        return "Επιτυχία";
      case "failed":
        return "Αποτυχία";
      case "cancel":
        return "Ακύρωση";
      case "pending":
        return "Σε εξέλιξη";
      case "waiting":
        return "Αναμονή";
      default:
        return result || "—";
    }
  };

  // Function to get status class
  const getStatusClass = (status: string): string => {
    switch (status) {
      case "wait_for_our_answer":
        return "bg-yellow-500/20 text-yellow-400";
      case "wait_for_customer_answer":
        return "bg-blue-500/20 text-blue-400";
      case "ready":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  // Function to get result class
  const getResultClass = (result: string): string => {
    switch (result) {
      case "success":
        return "bg-green-500/20 text-green-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      case "cancel":
        return "bg-yellow-500/20 text-yellow-400";
      case "pending":
        return "bg-blue-500/20 text-blue-400";
      case "waiting":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  // Function to format source
  const formatSource = (source: string): string => {
    switch (source) {
      case "Email":
        return "Email";
      case "Phone":
        return "Τηλέφωνο";
      case "Site":
        return "Ιστοσελίδα";
      case "Physical":
        return "Φυσική Παρουσία";
      case "In Person":
        return "Φυσική Παρουσία";
      default:
        return source || "—";
    }
  };

  // Function to truncate text with ellipsis and add indicator
  const truncateText = (text: string, maxLength: number): React.ReactNode => {
    if (!text) return "—";
    if (text.length <= maxLength) return text;
    
    return (
      <div className="flex items-center">
        <span className="truncate max-w-[300px] inline-block">
          {text.substring(0, maxLength)}
        </span>
        <span className="text-blue-400 ml-1 flex-shrink-0" title="Περισσότερο κείμενο">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2f3e46]">
        <div className="flex items-center justify-center space-x-2">
          <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce" />
          <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.2s]" />
          <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.4s]" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center text-[#cad2c5]">
        <h2 className="text-xl">Ο πελάτης δεν βρέθηκε</h2>
        <Button
          onClick={() => navigate("/customers")}
          className="mt-4 bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Επιστροφή
        </Button>
      </div>
    );
  }

  // If showing the form, render it instead of the customer details
  if (showCustomerForm) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 p-4 bg-[#354f52] border-b border-[#52796f]">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-[#a8c5b5]">
              Επεξεργασία {customer.company_name}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => {
                // Trigger the save action in the form
                document.getElementById('save-customer-form')?.click();
              }}
              disabled={!formValid}
              className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
            >
              <Save className="h-4 w-4 mr-2" />
              Αποθήκευση
            </Button>
            <CloseButton size="md" onClick={() => {
              fetchCustomerData();
              fetchContacts();
              setShowCustomerForm(false);
            }} />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <CustomerForm
            customerId={id}
            onSave={() => {
              fetchCustomerData();
              fetchContacts();
              setShowCustomerForm(false);
            }}
            onCancel={() => {
              fetchCustomerData();
              fetchContacts();
              setShowCustomerForm(false);
            }}
            onValidityChange={setFormValid}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Customer Header - Fixed Position with border */}
      <div className="sticky top-0 z-10 bg-[#2f3e46] p-4 rounded-t-lg border border-[#52796f] shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 border-2 border-[#52796f]">
              <AvatarFallback
                style={{
                  backgroundColor: generateAvatarColor(
                    customer?.company_name || "",
                  ),
                }}
                className="text-white text-xl font-bold"
              >
                {getInitials(customer?.company_name || "")}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h1 className="text-2xl font-bold text-[#cad2c5]">
                {customer?.company_name || "Φόρτωση..."}
              </h1>
              <div className="flex items-center mt-1">
                <span className="text-[#84a98c] text-sm">
                  {customer?.customer_type || "Εταιρεία"}
                </span>
                {customer?.afm && (
                  <span className="text-[#84a98c] text-sm ml-4">
                    ΑΦΜ: {customer.afm}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowCustomerDialog(true)}
              className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
            >
              <Edit className="h-4 w-4 mr-2" />
              Επεξεργασία
            </Button>
            <CloseButton 
              size="md" 
              onClick={() => navigate('/customers')} 
            />
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column */}
          <div className="w-full lg:w-1/3">
            {/* Rebuilt contacts section with updated star icon and tooltips */}
            <div key={contactsKey} className="bg-[#354f52] rounded-lg border border-[#52796f] mb-6 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-[#a8c5b5]">
                  Επαφές
                </h2>
                <button
                  type="button"
                  className="h-7 w-7 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-[#2f3e46] border border-yellow-600 rounded-full flex items-center justify-center"
                  onClick={() => {
                    setSelectedContact(null);
                    setShowContactDialog(true);
                  }}
                  title="Προσθήκη Επαφής"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {/* Simple fixed height container with single scrollbar */}
              <div style={{ height: "120px", overflowY: "auto" }} className="custom-scrollbar rounded-md border border-[#52796f] bg-[#2f3e46] p-2">
                {contacts.length === 0 ? (
                  <div className="text-center py-4 text-[#84a98c]">
                    Δεν υπάρχουν επαφές για αυτόν τον πελάτη
                  </div>
                ) : (
                  <>
                    {/* First render the primary contact if it exists */}
                    {contacts
                      .filter(contact => contact.id === customer?.primary_contact_id)
                      .map(contact => (
                    <div 
                      key={contact.id}
                          className="flex items-center p-2 bg-[#2f3e46]/50 rounded-md cursor-pointer mb-1 group"
                        >
                          <div className="flex-shrink-0 mr-3">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm bg-yellow-500"
                      onClick={() => {
                        setSelectedContact(contact);
                        setShowContactDialog(true);
                      }}
                        >
                          {contact.full_name ? contact.full_name.charAt(0).toUpperCase() : '?'}
                        </div>
                      </div>
                          <div 
                            className="flex-1 min-w-0"
                            onClick={() => {
                              setSelectedContact(contact);
                              setShowContactDialog(true);
                            }}
                          >
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-[#cad2c5] truncate">
                            {contact.full_name}
                          </p>
                            <span className="ml-2 text-xs text-yellow-400">
                              ✓ Κύρια
                            </span>
                        </div>
                        {contact.position && (
                          <p className="text-xs text-[#84a98c] truncate">
                            {contact.position}
                          </p>
                        )}
                        <div className="flex items-center text-xs text-[#84a98c]">
                          {contact.phone && (
                            <span className="flex items-center mr-2 truncate">
                              <Phone className="h-3 w-3 mr-1" />
                              {contact.phone}
                            </span>
                          )}
                          {contact.email && (
                            <span className="flex items-center truncate">
                              <Mail className="h-3 w-3 mr-1" />
                              {contact.email}
                            </span>
                )}
              </div>
            </div>

                          {/* Delete button for primary contact */}
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                          <button
                            type="button"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-[#2f3e46] rounded-full flex items-center justify-center"
                            onClick={() => {
                            setContactToDelete(contact);
                            setShowDeleteDialog(true);
                          }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f]">
                                  <p>Διαγραφή επαφής</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      ))}
                      
                    {/* Then render all other contacts */}
                    {contacts
                      .filter(contact => contact.id !== customer?.primary_contact_id)
                      .map(contact => (
                        <div 
                          key={contact.id}
                          className="flex items-center p-2 hover:bg-[#2f3e46] rounded-md cursor-pointer mb-1 group"
                        >
                          <div className="flex-shrink-0 mr-3">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm bg-blue-500"
                              onClick={() => {
                                setSelectedContact(contact);
                                setShowContactDialog(true);
                              }}
                            >
                              {contact.full_name ? contact.full_name.charAt(0).toUpperCase() : '?'}
                            </div>
                          </div>
                          <div 
                            className="flex-1 min-w-0"
                            onClick={() => {
                              setSelectedContact(contact);
                              setShowContactDialog(true);
                            }}
                          >
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-[#cad2c5] truncate">
                                {contact.full_name}
                              </p>
                            </div>
                            {contact.position && (
                              <p className="text-xs text-[#84a98c] truncate">
                                {contact.position}
                              </p>
                            )}
                            <div className="flex items-center text-xs text-[#84a98c]">
                              {contact.phone && (
                                <span className="flex items-center mr-2 truncate">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {contact.phone}
                                </span>
                              )}
                              {contact.email && (
                                <span className="flex items-center truncate">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {contact.email}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Set as primary contact button */}
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="h-6 w-6 p-0 text-[#84a98c] hover:text-[#cad2c5] hover:bg-[#2f3e46] rounded-full flex items-center justify-center"
                                    onClick={() => setPrimaryContact(contact.id)}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f]">
                                  <p>Ορισμός ως κύρια επαφή</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {/* Delete contact button */}
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-[#2f3e46] rounded-full flex items-center justify-center"
                                    onClick={() => {
                                      setContactToDelete(contact);
                                      setShowDeleteDialog(true);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f]">
                                  <p>Διαγραφή επαφής</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </div>

            <Card className="bg-[#354f52] border-[#52796f] contact-info-section">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 text-[#a8c5b5]">
                  Στοιχεία Επικοινωνίας
                </h2>

                <div className="section-content custom-scrollbar">
                  <div className="space-y-4">
                    <div>
                      <div className="text-[#84a98c] text-sm mb-1">Τηλέφωνο</div>
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-[#84a98c]" />
                        <span>{customer.telephone || "—"}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[#84a98c] text-sm mb-1">Fax</div>
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-[#84a98c]" />
                        <span>{customer.fax_number || "—"}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[#84a98c] text-sm mb-1">Email</div>
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-2 text-[#84a98c]" />
                        <span>{customer.email || "—"}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[#84a98c] text-sm mb-1">
                        Ιστοσελίδα
                      </div>
                      <div className="flex items-center text-sm">
                        <Globe className="h-4 w-4 mr-2 text-[#84a98c]" />
                        <span>{customer.webpage || "—"}</span>
                      </div>
                    </div>

                    <Separator className="my-4 bg-[#52796f]/50" />

                    <div>
                      <div className="text-[#84a98c] text-sm mb-1">Διεύθυνση</div>
                      <div className="text-sm">
                        <p>{customer.address || "—"}</p>
                        <p>
                          {customer.postal_code} {customer.town}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-2/3">
            <Tabs defaultValue="summary" className="w-full">
              <div className="relative">
                <TabsList className="bg-[#2f3e46] border border-[#52796f] border-b-0 rounded-t-lg w-full justify-start z-10 p-1 gap-1">
                  <TabsTrigger
                    value="summary"
                    className="data-[state=active]:bg-[#354f52] data-[state=active]:text-[#cad2c5] data-[state=active]:border-b-0 text-[#84a98c] rounded-t-lg px-6 py-2 transition-all"
                  >
                    Σύνοψη
                  </TabsTrigger>
                  <TabsTrigger
                    value="details"
                    className="data-[state=active]:bg-[#354f52] data-[state=active]:text-[#cad2c5] data-[state=active]:border-b-0 text-[#84a98c] rounded-t-lg px-6 py-2 transition-all"
                  >
                    Λεπτομέρειες
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="summary" className="mt-0 border-t-0 -mt-[1px]">
                <Card className="bg-[#354f52] border-[#52796f] mb-4 rounded-t-none notes-section">
                  <CardContent className="p-4">
                    <h2 className="text-lg font-semibold mb-2 text-[#a8c5b5]">
                      Σημειώσεις
                    </h2>
                    <div className="section-content custom-scrollbar">
                      <p className="text-[#cad2c5] text-sm">
                        {customer.notes || "Δεν υπάρχουν σημειώσεις."}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#354f52] border-[#52796f] recent-offers-section">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-[#a8c5b5]">
                        Πρόσφατες Προσφορές
                      </h2>
                    </div>

                    {loadingOffers ? (
                      <div className="flex items-center justify-center h-[220px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84a98c]"></div>
                      </div>
                    ) : recentOffers.length === 0 ? (
                      <div className="flex items-center justify-center h-[220px] text-[#84a98c]">
                        Δεν υπάρχουν προσφορές για αυτόν τον πελάτη.
                      </div>
                    ) : (
                      <div style={{ height: "280px", overflowY: "auto" }} className="custom-scrollbar">
                        <div className="space-y-4">
                          {recentOffers.map((offer) => (
                            <div
                              key={offer.id}
                              className="flex flex-col p-4 bg-[#2f3e46] rounded-lg cursor-pointer hover:bg-[#2f3e46]/80 transition-colors"
                              onClick={() => handleEditOffer(offer.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="font-medium text-[#cad2c5] max-w-[70%]">
                                  {truncateText(offer.amount ? offer.amount : "- -", 50)}
                                </div>
                                <div className="flex-shrink-0 ml-2 flex space-x-2">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs ${getStatusClass(offer.offer_result)}`}
                                  >
                                    {formatStatus(offer.offer_result)}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs ${getResultClass(offer.result)}`}
                                  >
                                    {formatResult(offer.result)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-2 text-sm text-[#84a98c]">
                                <div>
                                  {offer.assigned_user?.fullname 
                                    ? `Ανατέθηκε: ${offer.assigned_user.fullname}` 
                                    : "Μη ανατεθειμένη"}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span>
                                    {formatSource(offer.source)}
                                  </span>
                                  <span>
                                    {formatDateTime(offer.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="mt-0 border-t-0 -mt-[1px]">
                <Card className="bg-[#354f52] border-[#52796f] rounded-t-none">
                  <CardContent className="p-6">
                    {/* Customer Information Section */}
                    <div className="w-full bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden mb-6">
                      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
                        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                          ΣΤΟΙΧΕΙΑ ΠΕΛΑΤΗ
                        </h2>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Basic Information */}
                          <div>
                            <div className="space-y-3">
                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">
                                  Επωνυμία
                                </div>
                                <div className="text-sm font-normal">
                                  {customer.company_name || "—"}
                                </div>
                              </div>

                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">
                                  Τύπος Πελάτη
                                </div>
                                <div className="text-sm font-normal">
                                  {customer.customer_type || "Εταιρεία"}
                                </div>
                              </div>

                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">ΑΦΜ</div>
                                <div className="text-sm font-normal">{customer.afm || "—"}</div>
                              </div>

                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">ΔΟΥ</div>
                                <div className="text-sm font-normal">{customer.doy || "—"}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Contact Information */}
                          <div>
                            <div className="space-y-3">
                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">
                                  Τηλέφωνο
                                </div>
                                <div className="text-sm font-normal">
                                  {customer.telephone || "—"}
                                </div>
                              </div>

                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">Email</div>
                                <div className="text-sm font-normal">
                                  {customer.email || "—"}
                                </div>
                              </div>

                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">
                                  Ιστοσελίδα
                                </div>
                                <div className="text-sm font-normal">
                                  {customer.webpage || "—"}
                                </div>
                              </div>

                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">Fax</div>
                                <div className="text-sm font-normal">
                                  {customer.fax_number || "—"}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Address Information */}
                          <div>
                            <div className="space-y-3">
                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">
                                  Διεύθυνση
                                </div>
                                <div className="text-sm font-normal">
                                  {customer.address || "—"}
                                </div>
                              </div>

                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">Τ.Κ.</div>
                                <div className="text-sm font-normal">
                                  {customer.postal_code || "—"}
                                </div>
                              </div>

                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">Πόλη</div>
                                <div className="text-sm font-normal">
                                  {customer.town || "—"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional fields */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                          {Object.entries(customer).map(([key, value]) => {
                            // Skip fields that are already displayed or belong to other categories
                            if (['id', 'company_name', 'customer_type', 'afm', 'doy', 
                                 'address', 'postal_code', 'town', 
                                 'telephone', 'email', 'webpage', 'fax_number',
                                 'notes', 'status', 'created_at', 'updated_at', 
                                 'created_by', 'modified_by', 'primary_contact_id'].includes(key)) {
                              return null;
                            }
                            
                            // Skip object values and null/undefined values
                            if (typeof value === 'object' || value === null || value === undefined) {
                              return null;
                            }
                            
                            // Skip history-related fields
                            if (key.includes('date') || key.includes('time') || key.includes('by') || 
                                key.includes('history') || key.includes('log')) {
                              return null;
                            }
                            
                            // Display any other fields that might exist
                            return (
                              <div key={key}>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">
                                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                                </div>
                                <div className="text-sm font-normal">{value.toString() || "—"}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* History Section */}
                    <div className="w-full bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
                      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f] flex justify-between items-center">
                        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                          ΙΣΤΟΡΙΚΟ
                        </h2>
                        <div className="flex items-center">
                          <span className="text-xs text-[#84a98c] mr-2 font-bold">Κατάσταση:</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            customer.status === 'active' 
                              ? 'bg-green-900/30 text-green-300' 
                              : 'bg-red-900/30 text-red-300'
                          }`}>
                            {customer.status === 'active' ? 'Ενεργός' : 'Ανενεργός'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Creation Information Section */}
                          <div className="bg-[#354f52]/30 p-3 rounded-md">
                            <h3 className="text-xs font-semibold text-[#a8c5b5] mb-3 uppercase">Δημιουργία</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">
                                  Δημιουργήθηκε από
                                </div>
                                <div className="text-sm font-normal">
                                  {customer.created_by?.fullname || "—"}
                                </div>
                              </div>

                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">
                                  Ημερομηνία δημιουργίας
                                </div>
                                <div className="text-sm font-normal">
                                  {formatDateTime(customer.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Modification Information Section */}
                          <div className="bg-[#354f52]/30 p-3 rounded-md">
                            <h3 className="text-xs font-semibold text-[#a8c5b5] mb-3 uppercase">Τροποποίηση</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">
                                  Τελευταία τροποποίηση από
                                </div>
                                <div className="text-sm font-normal">
                                  {customer.modified_by?.fullname || "—"}
                                </div>
                              </div>

                              <div>
                                <div className="text-[#84a98c] text-xs mb-1 font-bold">
                                  Ημερομηνία τροποποίησης
                                </div>
                                <div className="text-sm font-normal">
                                  {formatDateTime(customer.updated_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional history fields */}
                        {Object.entries(customer).some(([key, value]) => 
                          !['id', 'company_name', 'customer_type', 'afm', 'doy', 
                            'address', 'postal_code', 'town', 
                            'telephone', 'email', 'webpage', 'fax_number',
                            'notes', 'status', 'created_at', 'updated_at', 
                            'created_by', 'modified_by', 'primary_contact_id'].includes(key) &&
                          (key.includes('date') || key.includes('time') || key.includes('by') || 
                           key.includes('history') || key.includes('log')) &&
                          typeof value !== 'object' && value !== null && value !== undefined
                        ) && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <h3 className="text-xs font-semibold text-[#a8c5b5] col-span-full mt-2 mb-1">
                              Επιπλέον Πληροφορίες
                            </h3>
                            {Object.entries(customer).map(([key, value]) => {
                              // Only include fields that might be related to history but aren't already displayed
                              if (['id', 'company_name', 'customer_type', 'afm', 'doy', 
                                   'address', 'postal_code', 'town', 
                                   'telephone', 'email', 'webpage', 'fax_number',
                                   'notes', 'status', 'created_at', 'updated_at', 
                                   'created_by', 'modified_by', 'primary_contact_id'].includes(key)) {
                                return null;
                              }
                              
                              // Include fields that might be related to history (containing 'date', 'time', etc.)
                              if (key.includes('date') || key.includes('time') || key.includes('by') || 
                                  key.includes('history') || key.includes('log')) {
                                // Skip object values and null/undefined values
                                if (typeof value === 'object' || value === null || value === undefined) {
                                  return null;
                                }
                                
                                return (
                                  <div key={key}>
                                    <div className="text-[#84a98c] text-xs mb-1 font-bold">
                                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                                    </div>
                                    <div className="text-sm font-normal">
                                      {key.includes('date') || key.includes('time') 
                                        ? formatDateTime(value.toString()) 
                                        : value.toString() || "—"}
                                    </div>
                                  </div>
                                );
                              }
                              
                              return null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Contact Dialog */}
      <ContactDialog
        open={showContactDialog}
        onOpenChange={(open) => setShowContactDialog(open)}
        contactId={selectedContact?.id}
        customerId={customer.id}
        refreshData={async () => {
          await fetchContacts();
          return Promise.resolve();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent aria-describedby="delete-customer-description" className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription id="delete-customer-description">
              Are you sure you want to delete this customer? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#52796f]/20">
              Ακύρωση
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Διαγραφή..." : "Διαγραφή"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Offers Table */}
      {showOffersTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-6xl h-[90vh] bg-[#2f3e46] rounded-lg border border-[#52796f] shadow-xl flex flex-col">
            <div className="p-4 border-b border-[#52796f] flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#cad2c5]">
                Προσφορές - {customer?.company_name}
              </h2>
              <CloseButton 
                size="md" 
                onClick={() => {
                  setShowOffersTable(false);
                  fetchRecentOffers(); // Refresh offers when table closes
                }} 
              />
            </div>
            <div className="flex-1 overflow-auto">
              <OffersTable 
                customerId={id || ""} 
                onClose={() => {
                  setShowOffersTable(false);
                  fetchRecentOffers(); // Refresh offers when table closes
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Customer Dialog for editing */}
      <CustomerDialog
        open={showCustomerDialog}
        onOpenChange={(open) => setShowCustomerDialog(open)}
        customer={{ id: customer.id }}
        refreshData={fetchCustomerData}
      />
    </div>
  );
}
