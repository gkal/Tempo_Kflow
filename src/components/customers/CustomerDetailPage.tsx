import { useState, useEffect } from "react";
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
} from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import ContactDialog from "../contacts/ContactDialog";
import CustomerForm from "./CustomerForm";
import { ContactList } from "@/components/contacts/ContactList";
import { ContactCard } from "@/components/contacts/ContactCard";
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
import OffersDialog from "./OffersDialog";

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
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
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

  // Set primary contact for a customer
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

      // Refresh data
      await fetchCustomerData();
      await fetchContacts();
    } catch (error) {
      console.error("Error setting primary contact:", error);
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
      console.error("Error fetching recent offers:", error);
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
    setSelectedOffer(offerId);
    setShowOfferDialog(true);
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
              variant="outline"
              size="default"
              onClick={() => setShowCustomerForm(true)}
              className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] px-4 py-2 text-base"
            >
              <Edit className="h-5 w-5 mr-2" />
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
            <Card className="bg-[#354f52] border-[#52796f] mb-6">
              <CardContent className="p-6">
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
                <ContactList
                  contacts={contacts}
                  primaryContactId={customer?.primary_contact_id}
                  onContactClick={(contact) => {
                    setSelectedContact(contact);
                    setShowContactDialog(true);
                  }}
                  onAddContact={() => {
                    setSelectedContact(null);
                    setShowContactDialog(true);
                  }}
                  onDeleteContact={(contact) => {
                    setContactToDelete(contact);
                    setShowDeleteDialog(true);
                  }}
                />
              </CardContent>
            </Card>

            <Card className="bg-[#354f52] border-[#52796f]">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 text-[#a8c5b5]">
                  Στοιχεία Επικοινωνίας
                </h2>

                <div className="space-y-4">
                  <div>
                    <div className="text-[#84a98c] text-sm mb-1">Τηλέφωνο</div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-[#84a98c]" />
                      <span>{customer.telephone || "—"}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[#84a98c] text-sm mb-1">Fax</div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-[#84a98c]" />
                      <span>{customer.fax_number || "—"}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[#84a98c] text-sm mb-1">Email</div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-[#84a98c]" />
                      <span>{customer.email || "—"}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[#84a98c] text-sm mb-1">
                      Ιστοσελίδα
                    </div>
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-[#84a98c]" />
                      <span>{customer.webpage || "—"}</span>
                    </div>
                  </div>

                  <Separator className="my-4 bg-[#52796f]/50" />

                  <div>
                    <div className="text-[#84a98c] text-sm mb-1">Διεύθυνση</div>
                    <div>
                      <p>{customer.address || "—"}</p>
                      <p>
                        {customer.postal_code} {customer.town}
                      </p>
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
                    value="activities"
                    className="data-[state=active]:bg-[#354f52] data-[state=active]:text-[#cad2c5] data-[state=active]:border-b-0 text-[#84a98c] rounded-t-lg px-6 py-2 transition-all"
                  >
                    Δραστηριότητες
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
                <Card className="bg-[#354f52] border-[#52796f] mb-6 rounded-t-none" style={{ marginBottom: "150px" }}>
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold mb-4 text-[#a8c5b5]">
                      Σημειώσεις
                    </h2>
                    <p className="text-[#cad2c5] mb-4">
                      {customer.notes || "Δεν υπάρχουν σημειώσεις."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-[#354f52] border-[#52796f]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-[#a8c5b5]">
                        Πρόσφατες Προσφορές
                      </h2>
                      <Button
                        onClick={() => setShowOffersTable(true)}
                        className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] text-xs h-8"
                      >
                        Προβολή όλων
                      </Button>
                    </div>

                    {loadingOffers ? (
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84a98c]"></div>
                      </div>
                    ) : recentOffers.length === 0 ? (
                      <div className="flex items-center justify-center h-[300px] text-[#84a98c]">
                        Δεν υπάρχουν προσφορές για αυτόν τον πελάτη.
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        <div className="space-y-4">
                          {recentOffers.map((offer) => (
                            <div
                              key={offer.id}
                              className="flex flex-col p-4 bg-[#2f3e46] rounded-lg cursor-pointer hover:bg-[#2f3e46]/80 transition-colors"
                              onClick={() => handleEditOffer(offer.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="font-medium text-[#cad2c5] max-w-[70%]">
                                  {truncateText(offer.requirements || "Χωρίς απαιτήσεις", 50)}
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

              <TabsContent value="activities" className="mt-0 border-t-0 -mt-[1px]">
                <Card className="bg-[#354f52] border-[#52796f] rounded-t-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-[#a8c5b5]">
                        Όλες οι Δραστηριότητες
                      </h2>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#52796f] text-[#cad2c5] hover:bg-[#52796f]/20"
                      >
                        <span className="h-4 w-4 mr-2">+</span>
                        Νέα Δραστηριότητα
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start p-3 bg-[#2f3e46] rounded-lg"
                        >
                          <div className="flex-shrink-0 mr-3 mt-1">
                            {activity.type === "task" ? (
                              <CheckCircle2 className="h-5 w-5 text-[#84a98c]" />
                            ) : (
                              <Clock className="h-5 w-5 text-[#84a98c]" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{activity.title}</div>
                            <div className="text-sm text-[#84a98c]">
                              Ανατέθηκε σε: {activity.assignedTo}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${activity.status === "active" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}
                            >
                              {activity.status === "active"
                                ? "Εκκρεμεί"
                                : "Ολοκληρώθηκε"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="mt-0 border-t-0 -mt-[1px]">
                <Card className="bg-[#354f52] border-[#52796f] rounded-t-none">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold mb-4 text-[#a8c5b5]">
                      Στοιχεία Πελάτη
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-[#354f52] rounded-lg p-6 shadow-md h-full">
                        <h2 className="text-xl font-bold text-[#cad2c5] mb-4 flex items-center">
                          <User className="mr-2 h-5 w-5" />
                          ΣΤΟΙΧΕΙΑ ΠΕΛΑΤΗ
                        </h2>
                        
                        <div className="space-y-4">
                          <div>
                            <div className="text-[#84a98c] text-sm mb-1">
                              Επωνυμία
                            </div>
                            <div className="font-medium">
                              {customer.company_name}
                            </div>
                          </div>

                          <div>
                            <div className="text-[#84a98c] text-sm mb-1">
                              Τύπος Πελάτη
                            </div>
                            <div className="font-medium">
                              {customer.customer_type || "Εταιρεία"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[#84a98c] text-sm mb-1">ΑΦΜ</div>
                            <div className="font-medium">{customer.afm || "—"}</div>
                          </div>

                          <div>
                            <div className="text-[#84a98c] text-sm mb-1">ΔΟΥ</div>
                            <div className="font-medium">{customer.doy || "—"}</div>
                          </div>

                          <div>
                            <div className="text-[#84a98c] text-sm mb-1">
                              Διεύθυνση
                            </div>
                            <div className="font-medium">
                              {customer.address || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[#84a98c] text-sm mb-1">Τ.Κ.</div>
                            <div className="font-medium">
                              {customer.postal_code || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[#84a98c] text-sm mb-1">Πόλη</div>
                            <div className="font-medium">
                              {customer.town || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[#84a98c] text-sm mb-1">
                              Τηλέφωνο
                            </div>
                            <div className="font-medium">
                              {customer.telephone || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[#84a98c] text-sm mb-1">Email</div>
                            <div className="font-medium">
                              {customer.email || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[#84a98c] text-sm mb-1">
                              Ιστοσελίδα
                            </div>
                            <div className="font-medium">
                              {customer.webpage || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[#84a98c] text-sm mb-1">Fax</div>
                            <div className="font-medium">
                              {customer.fax_number || "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-[#354f52] rounded-lg p-6 shadow-md">
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-xl font-bold text-[#cad2c5] flex items-center">
                            <Phone className="mr-2 h-5 w-5" />
                            ΕΠΑΦΕΣ ΕΤΑΙΡΕΙΑΣ
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
                        
                        <ContactList
                          contacts={contacts}
                          primaryContactId={customer?.primary_contact_id}
                          onContactClick={(contact) => {
                            setSelectedContact(contact);
                            setShowContactDialog(true);
                          }}
                          onAddContact={() => {
                            setSelectedContact(null);
                            setShowContactDialog(true);
                          }}
                          onDeleteContact={(contact) => {
                            setContactToDelete(contact);
                            setShowDeleteDialog(true);
                          }}
                        />
                      </div>
                    </div>

                    <Separator className="my-6 bg-[#52796f]/50" />

                    <h2 className="text-lg font-semibold mb-4 text-[#a8c5b5]">
                      Ιστορικό
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-[#84a98c] text-sm mb-1">
                          Δημιουργήθηκε από
                        </div>
                        <div className="font-medium">
                          {customer.created_by?.fullname || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[#84a98c] text-sm mb-1">
                          Ημερομηνία δημιουργίας
                        </div>
                        <div className="font-medium">
                          {formatDateTime(customer.created_at)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[#84a98c] text-sm mb-1">
                          Τελευταία τροποποίηση από
                        </div>
                        <div className="font-medium">
                          {customer.modified_by?.fullname || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[#84a98c] text-sm mb-1">
                          Ημερομηνία τροποποίησης
                        </div>
                        <div className="font-medium">
                          {formatDateTime(customer.updated_at)}
                        </div>
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
        onClose={() => {
          setShowContactDialog(false);
          setSelectedContact(null);
          // Refresh contacts when dialog closes
          fetchContacts();
        }}
        contact={selectedContact}
        customerId={id}
        customerName={customer?.company_name}
        isPrimary={selectedContact?.id === customer?.primary_contact_id}
        onSetPrimary={setPrimaryContact}
        onSave={fetchContacts}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent 
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
          aria-describedby="delete-contact-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">
              Διαγραφή Επαφής
            </AlertDialogTitle>
            <AlertDialogDescription id="delete-contact-description" className="text-[#a8c5b5]">
              Είστε βέβαιοι ότι θέλετε να διαγράψετε την επαφή{" "}
              <span className="font-medium text-[#cad2c5]">
                {contactToDelete?.full_name}
              </span>
              ; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#52796f]/20">
              Ακύρωση
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Διαγραφή..." : "Διαγραφή"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Offers Dialog */}
      {showOfferDialog && (
        <OffersDialog
          open={showOfferDialog}
          onOpenChange={(open) => {
            setShowOfferDialog(open);
            if (!open) {
              setSelectedOffer(null);
              fetchRecentOffers(); // Refresh offers when dialog closes
            }
          }}
          customerId={id || ""}
          offerId={selectedOffer || undefined}
          onSave={() => {
            fetchRecentOffers();
          }}
        />
      )}
      
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
    </div>
  );
}
