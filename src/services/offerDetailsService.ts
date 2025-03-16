import { supabase } from "@/lib/supabase";
import { OfferDetail, OfferDetailFormData } from "@/types/offer-details";

// Fetch all offer details for a specific offer
export const fetchOfferDetails = async (offerId: string): Promise<OfferDetail[]> => {
  if (!offerId) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from("offer_details")
      .select(`
        *,
        category:service_categories(*),
        subcategory:service_subcategories(*),
        unit:units(*)
      `)
      .eq("offer_id", offerId)
      .order("date_created", { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Exception in fetchOfferDetails:", error);
    throw error;
  }
};

// Add a new offer detail
export const addOfferDetail = async (
  offerId: string,
  detailData: OfferDetailFormData,
  userId: string
): Promise<OfferDetail | null> => {
  if (!offerId) {
    console.error("No offerId provided to addOfferDetail");
    throw new Error("Offer ID is required");
  }
  
  try {
    // First check if the offer exists
    const { data: offerExists, error: offerCheckError } = await supabase
      .from("offers")
      .select("id")
      .eq("id", offerId)
      .single();
      
    if (offerCheckError) {
      console.error("Error checking if offer exists:", offerCheckError);
      throw new Error("Failed to verify offer existence");
    }
    
    if (!offerExists) {
      console.error("Offer does not exist:", offerId);
      throw new Error("Offer does not exist");
    }
    
    // Prepare the data to insert
    const detailToInsert = {
      offer_id: offerId,
      category_id: detailData.category_id,
      subcategory_id: detailData.subcategory_id || null,
      unit_id: detailData.unit_id || null,
      quantity: 1, // Always use 1 as the quantity
      price: detailData.price,
      notes: detailData.notes || "",
      user_create: userId,
    };
    
    // Add the detail with a fixed quantity of 1
    const { data, error } = await supabase
      .from("offer_details")
      .insert(detailToInsert)
      .select(`
        *,
        category:service_categories(*),
        subcategory:service_subcategories(*),
        unit:units(*)
      `)
      .single();

    if (error) {
      console.error("Error adding offer detail:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in addOfferDetail:", error);
    throw error;
  }
};

// Update an existing offer detail
export const updateOfferDetail = async (
  detailId: string,
  detailData: Partial<OfferDetailFormData>,
  userId: string
): Promise<OfferDetail> => {
  const { data, error } = await supabase
    .from("offer_details")
    .update({
      ...detailData,
      date_updated: new Date().toISOString(),
      user_updated: userId,
    })
    .eq("id", detailId)
    .select()
    .single();

  if (error) {
    console.error("Error updating offer detail:", error);
    throw error;
  }

  return data;
};

// Delete an offer detail
export const deleteOfferDetail = async (detailId: string): Promise<void> => {
  console.log("deleteOfferDetail called with ID:", detailId);
  
  if (!detailId) {
    console.error("No detailId provided to deleteOfferDetail");
    throw new Error("Detail ID is required");
  }
  
  try {
    console.log("Executing Supabase delete query for detail ID:", detailId);
    const result = await supabase
      .from("offer_details")
      .delete()
      .eq("id", detailId);

    console.log("Delete query completed, result:", result);
    
    if (result.error) {
      console.error("Error deleting offer detail:", result.error);
      throw result.error;
    }
    
    console.log("Successfully deleted offer detail with ID:", detailId);
  } catch (error) {
    console.error("Exception in deleteOfferDetail:", error);
    throw error;
  }
};

// Fetch all service categories
export const fetchServiceCategories = async () => {
  const { data, error } = await supabase
    .from("service_categories")
    .select("*")
    .order("category_name", { ascending: true });

  if (error) {
    console.error("Error fetching service categories:", error);
    throw error;
  }

  return data || [];
};

// Fetch subcategories for a specific category
export const fetchSubcategories = async (categoryId: string) => {
  const { data, error } = await supabase
    .from("service_subcategories")
    .select("*")
    .eq("category_id", categoryId)
    .order("subcategory_name", { ascending: true });

  if (error) {
    console.error("Error fetching subcategories:", error);
    throw error;
  }

  return data || [];
};

// Fetch all measurement units
export const fetchMeasurementUnits = async () => {
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching measurement units:", error);
    throw error;
  }

  return data || [];
}; 