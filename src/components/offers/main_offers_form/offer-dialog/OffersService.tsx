import { supabase } from '@/lib/supabaseClient';
import { OfferFormValues, DatabaseOffer } from './OfferDialogContext';
import { normalizeSourceValue } from './FormUtils';
import { ADMIN_USER_ID } from './OfferDialogContext';

/**
 * Save offer data and get the ID
 */
export const saveOfferAndGetId = async (
  formData: OfferFormValues, 
  offerId: string | undefined, 
  customerId: string,
  selectedContactId: string | null,
  userId: string | null,
  normalizeAmount: (amount: any) => string,
  setErrorMessage: (message: string) => void
): Promise<string | null> => {
  try {
    // Clear any previous errors
    setErrorMessage("");
    
    // If our_transport has a value but transport_type doesn't, copy the value
    if (formData.our_transport && !formData.transport_type) {
      formData.transport_type = formData.our_transport;
    }
    
    // And vice versa
    if (formData.transport_type && !formData.our_transport) {
      formData.our_transport = formData.transport_type;
    }
    
    const safeUserId = userId || ADMIN_USER_ID;
    const customerIdString = formData.customer_id || customerId;

    if (offerId && !offerId.startsWith('temp-')) {
      // If we have a real offer ID, update the existing offer
      const updateData = {
        customer_id: String(customerIdString),
        offer_result: formData.offer_result || "wait_for_our_answer",
        result: formData.result || null,
        our_comments: formData.our_comments || null,
        customer_comments: formData.customer_comments || null,
        requirements: formData.requirements || null,
        amount: normalizeAmount(formData.amount),
        source: normalizeSourceValue(formData.source),
        address: formData.address || null,
        tk: formData.postal_code || null,
        town: formData.town || null,
        hma: !!formData.hma,
        certificate: formData.certificate || null,
        updated_by: safeUserId,
        updated_at: new Date().toISOString(),
        contact_id: selectedContactId,
        created_at: formData.created_at || new Date().toISOString(),
        assigned_to: formData.assigned_to || null,
        waste_type: formData.waste_type || null,
        who_transport: formData.who_transport !== undefined ? formData.who_transport : true,
        loading: formData.loading || null,
        transport_type: formData.transport_type || null
      };

      const { data, error } = await supabase
        .from("offers")
        .update(updateData as any)
        .eq("id", offerId)
        .select()
        .single();

      if (error) {
        console.error("Error updating offer:", error);
        setErrorMessage("Σφάλμα κατά την ενημέρωση προσφοράς");
        return null;
      }

      return data.id;
    } else {
      // Create new offer
      const insertData = {
        customer_id: String(customerIdString),
        offer_result: formData.offer_result || "wait_for_our_answer",
        result: formData.result || null,
        our_comments: formData.our_comments || null,
        customer_comments: formData.customer_comments || null,
        requirements: formData.requirements || null,
        amount: normalizeAmount(formData.amount),
        source: normalizeSourceValue(formData.source),
        address: formData.address || null,
        tk: formData.postal_code || null,
        town: formData.town || null,
        hma: !!formData.hma,
        certificate: formData.certificate || null,
        created_by: safeUserId,
        updated_by: safeUserId,
        created_at: formData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contact_id: selectedContactId,
        assigned_to: formData.assigned_to || null,
        waste_type: formData.waste_type || null,
        who_transport: formData.who_transport !== undefined ? formData.who_transport : true,
        loading: formData.loading || null,
        transport_type: formData.transport_type || null
      };

      const { data: newOffer, error } = await supabase
        .from('offers')
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        console.error("Error creating offer:", error);
        setErrorMessage("Σφάλμα κατά την δημιουργία προσφοράς");
        return null;
      }

      return newOffer.id;
    }
  } catch (error) {
    console.error("Error in saveOfferAndGetId:", error);
    setErrorMessage("Σφάλμα κατά την αποθήκευση προσφοράς");
    return null;
  }
};

/**
 * Fetch users for assignment dropdown
 */
export const fetchUsers = async (
  setUsers: (users: any[]) => void,
  setUserMap: (map: Record<string, string>) => void,
  setUserOptions: (options: string[]) => void,
  setErrorMessage: (message: string) => void
) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, fullname")
      .eq("status", "active");

    if (error) throw error;
    
    // Create a map of user IDs to names
    const userIdToName: Record<string, string> = {};
    const userNameOptions: string[] = [];
    
    data?.forEach(user => {
      userIdToName[user.id] = user.fullname;
      userNameOptions.push(user.fullname);
    });
    
    setUserMap(userIdToName);
    setUserOptions(userNameOptions);
    setUsers(data || []);
  } catch (error) {
    console.error("Error fetching users:", error);
    setErrorMessage("Σφάλμα κατά την ανάκτηση χρηστών");
  }
};

/**
 * Fetch customer data
 */
export const fetchCustomerData = async (
  customerId: string,
  setCustomerName: (name: string) => void,
  setCustomerPhone: (phone: string) => void,
  setErrorMessage: (message: string) => void
) => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (error) {
      console.error('Error fetching customer data:', error);
      setErrorMessage("Σφάλμα κατά την ανάκτηση δεδομένων πελάτη");
      return;
    }
    
    if (data) {
      // Set customer name and phone
      setCustomerName(data.company_name);
      setCustomerPhone(data.telephone || "");
    }
  } catch (error) {
    console.error('Error in fetchCustomerData:', error);
    setErrorMessage("Σφάλμα κατά την ανάκτηση δεδομένων πελάτη");
  }
};

/**
 * Fetch offer data
 */
export const fetchOffer = async (
  offerId: string,
  reset: (values: any) => void,
  setSelectedContactId: (id: string | null) => void,
  dateFormatUtils: any,
  sourceMappers: any,
  setErrorMessage: (message: string) => void,
  setLoading: (loading: boolean) => void
) => {
  setLoading(true);
  try {
    const { data: offer, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single() as { data: DatabaseOffer | null, error: any };

    if (error) {
      console.error('Error fetching offer:', error);
      setErrorMessage("Σφάλμα κατά την ανάκτηση προσφοράς");
      return;
    }

    if (offer) {
      // The transport_type field contains the actual text, 
      // so we can use it directly without any lookup
      const displayTransport = offer.transport_type || "";

      reset({
        customer_id: offer.customer_id,
        created_at: dateFormatUtils.formatCurrentDateTime(offer.created_at),
        source: sourceMappers.getLabel(offer.source),
        amount: offer.amount?.toString() || '',
        requirements: offer.requirements || '',
        customer_comments: offer.customer_comments || '',
        our_comments: offer.our_comments || '',
        offer_result: offer.offer_result || 'wait_for_our_answer',
        result: offer.result || '',
        assigned_to: offer.assigned_to || '',
        hma: offer.hma || false,
        certificate: offer.certificate || '',
        address: offer.address || '',
        postal_code: offer.tk || '',
        town: offer.town || '',
        status: offer.status || '',
        waste_type: offer.waste_type || '',
        who_transport: offer.who_transport !== undefined ? offer.who_transport : true,
        loading: offer.loading || '',
        our_transport: displayTransport || '',
        transport_type: displayTransport || ''
      });
      
      setSelectedContactId(offer.contact_id || null);
    }
  } catch (error) {
    console.error('Error in fetchOffer:', error);
    setErrorMessage("Σφάλμα κατά την ανάκτηση προσφοράς");
  } finally {
    setLoading(false);
  }
};

/**
 * Fetch contacts
 */
export const fetchContacts = async (
  customerId: string,
  setContacts: (contacts: any[]) => void,
  setContactMap: (map: Record<string, string>) => void,
  setContactDisplayMap: (map: Record<string, string>) => void,
  setContactOptions: (options: string[]) => void,
  setSelectedContactId: (id: string | null) => void,
  selectedContactId: string | null,
  setErrorMessage: (message: string) => void
) => {
  if (!customerId) return;
  
  try {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, full_name, position, created_at")
      .eq("customer_id", customerId)
      .eq("status", "active")
      .is("deleted_at", null);

    if (error) {
      console.error("Error fetching contacts:", error);
      setErrorMessage("Σφάλμα κατά την ανάκτηση επαφών");
      return;
    }
    
    // Create a map of contact IDs to names and display names
    const contactIdToName: Record<string, string> = {};
    const contactIdToDisplayName: Record<string, string> = {};
    const contactNameOptions: string[] = [];
    
    data?.forEach(contact => {
      // Store full name without position for the dropdown header
      contactIdToName[contact.id] = contact.full_name;
      
      // Store display name with position for the dropdown options
      const displayName = contact.position 
        ? `${contact.full_name} (${contact.position})` 
        : contact.full_name;
      
      contactIdToDisplayName[contact.id] = displayName;
      contactNameOptions.push(displayName);
    });
    
    setContactMap(contactIdToName);
    setContactDisplayMap(contactIdToDisplayName);
    setContactOptions(contactNameOptions);
    setContacts(data || []);
    
    // If we have contacts and no contact is selected, select the first one
    if (data && data.length > 0 && !selectedContactId) {
      setSelectedContactId(data[0].id);
    }
  } catch (error) {
    console.error("Error in fetchContacts:", error);
    setErrorMessage("Σφάλμα κατά την ανάκτηση επαφών");
  }
}; 
