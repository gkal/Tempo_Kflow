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
} from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import ContactDialog from "../contacts/ContactDialog";
import CustomerForm from "./CustomerForm";
import { ContactList } from "@/components/contacts/ContactList";
import { ContactCard } from "@/components/contacts/ContactCard";
import { toast } from "@/components/ui/use-toast";
import { CustomDropdown } from "@/components/ui/custom-dropdown";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [formValid, setFormValid] = useState(true);
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
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomerData();
      fetchContacts();
    }
  }, [id]);

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
      const isAdminOrSuperUser = user?.role === 'admin' || 
                                user?.role === 'moderator';
      
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
            <CloseButton size="md" onClick={() => setShowCustomerForm(false)} />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <CustomerForm
            customerId={id}
            onSave={() => {
              fetchCustomerData();
              setShowCustomerForm(false);
            }}
            onCancel={() => {
              setShowCustomerForm(false);
            }}
            onValidityChange={setFormValid}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#2f3e46] text-[#cad2c5]">
      <div className="flex flex-col">
        {/* Customer Header - Fixed Position */}
        <div className="sticky top-0 z-10 bg-[#2f3e46]">
          <div className="flex justify-between items-center mb-6 bg-[#354f52] p-6 rounded-lg border border-[#52796f]">
            <div className="flex items-center">
              <div className="flex-shrink-0 mr-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback
                    style={{
                      backgroundColor: generateAvatarColor(
                        customer.company_name,
                      ),
                    }}
                    className="text-[#2f3e46] text-xl font-bold"
                  >
                    {getInitials(customer.company_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#cad2c5]">
                  {customer.company_name}
                </h1>
                <div className="flex items-center text-[#84a98c] mt-1">
                  <Building className="h-4 w-4 mr-1" />
                  <span>{customer.customer_type || "Εταιρεία"}</span>
                  <span className="mx-2">•</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${customer.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                  >
                    Last activity: --------
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowCustomerForm(true)}
                className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
              >
                <Edit className="h-4 w-4 mr-2" />
                Επεξεργασία
              </Button>
              <CloseButton size="md" onClick={() => navigate("/customers")} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column */}
          <div className="w-full lg:w-1/3">
            <Card className="bg-[#354f52] border-[#52796f] mb-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 text-[#a8c5b5]">
                  Επαφές
                </h2>
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
              <TabsList className="bg-[#2f3e46] border-b border-[#52796f] w-full justify-start mb-6">
                <TabsTrigger
                  value="summary"
                  className="data-[state=active]:bg-[#354f52] data-[state=active]:text-[#cad2c5] text-[#84a98c]"
                >
                  Σύνοψη
                </TabsTrigger>
                <TabsTrigger
                  value="activities"
                  className="data-[state=active]:bg-[#354f52] data-[state=active]:text-[#cad2c5] text-[#84a98c]"
                >
                  Δραστηριότητες
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="data-[state=active]:bg-[#354f52] data-[state=active]:text-[#cad2c5] text-[#84a98c]"
                >
                  Λεπτομέρειες
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-0">
                <Card className="bg-[#354f52] border-[#52796f] mb-6">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold mb-4 text-[#a8c5b5]">
                      Σημειώσεις
                    </h2>
                    <p className="text-[#cad2c5]">
                      {customer.notes || "Δεν υπάρχουν σημειώσεις."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-[#354f52] border-[#52796f]">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold mb-4 text-[#a8c5b5]">
                      Πρόσφατες Δραστηριότητες
                    </h2>

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

              <TabsContent value="activities" className="mt-0">
                <Card className="bg-[#354f52] border-[#52796f]">
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

              <TabsContent value="details" className="mt-0">
                <Card className="bg-[#354f52] border-[#52796f]">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold mb-4 text-[#a8c5b5]">
                      Στοιχεία Πελάτη
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        }}
        contact={selectedContact}
        customerId={id}
        isPrimary={selectedContact?.id === customer?.primary_contact_id}
        onSetPrimary={setPrimaryContact}
        onSave={fetchContacts}
      />
    </div>
  );
}
