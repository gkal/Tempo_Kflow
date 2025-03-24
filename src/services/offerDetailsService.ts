import { OfferDetail, OfferDetailFormData } from "@/types/offer-details";
import { 
  fetchRecords, 
  createRecord, 
  updateRecord, 
  softDeleteRecord, 
  deleteRecord, 
  fetchRecordById 
} from "@/services/api/supabaseService";
import { logError, logInfo, logDebug } from "@/utils";

/**
 * Fetch all offer details for a specific offer
 * 
 * @param offerId - The ID of the offer to fetch details for
 * @returns Promise with array of offer details
 * @usedIn src/components/offers/OfferDetailsTab.tsx, src/components/offers/OfferEditForm.tsx
 */
export const fetchOfferDetails = async (offerId: string): Promise<OfferDetail[]> => {
  if (!offerId) {
    return [];
  }
  
  try {
    const { data, error } = await fetchRecords<OfferDetail>("offer_details", {
      select: `
        *,
        category:service_categories(*),
        subcategory:service_subcategories(*),
        unit:units(*)
      `,
      filters: { offer_id: offerId },
      order: { column: "date_created", ascending: true }
    });

    if (error) {
      throw error;
    }

    // Handle both array and single item responses
    if (Array.isArray(data)) {
      return data;
    } else if (data) {
      return [data]; // Convert single item to array
    }
    return [];
  } catch (error) {
    logError("Exception in fetchOfferDetails:", error, "OfferDetailsService");
    throw error;
  }
};

/**
 * Add a new offer detail
 * 
 * @param offerId - The ID of the offer to add a detail to
 * @param detailData - The offer detail data
 * @param userId - The ID of the user creating the detail
 * @returns Promise with the created offer detail
 * @usedIn src/components/offers/OfferDetailForm.tsx
 */
export const addOfferDetail = async (
  offerId: string,
  detailData: OfferDetailFormData,
  userId: string
): Promise<OfferDetail | null> => {
  if (!offerId) {
    logError("No offerId provided to addOfferDetail", null, "OfferDetailsService");
    throw new Error("Offer ID is required");
  }
  
  try {
    // First check if the offer exists
    const { data: offerExists, error: offerCheckError } = await fetchRecordById("offers", offerId);
      
    if (offerCheckError) {
      logError("Error checking if offer exists:", offerCheckError, "OfferDetailsService");
      throw new Error("Failed to verify offer existence");
    }
    
    if (!offerExists) {
      logError("Offer does not exist:", offerId, "OfferDetailsService");
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
    const { data, error } = await createRecord<OfferDetail>("offer_details", detailToInsert);

    if (error) {
      logError("Error adding offer detail:", error, "OfferDetailsService");
      throw error;
    }

    // If we need the relations, fetch the complete record
    if (data) {
      const { data: detailWithRelations, error: fetchError } = await fetchRecordById<OfferDetail>(
        "offer_details", 
        data.id,
        `
          *,
          category:service_categories(*),
          subcategory:service_subcategories(*),
          unit:units(*)
        `
      );
      
      if (fetchError) {
        logError("Error fetching complete offer detail:", fetchError, "OfferDetailsService");
      }
      
      return detailWithRelations || data;
    }

    return data;
  } catch (error) {
    logError("Error in addOfferDetail:", error, "OfferDetailsService");
    throw error;
  }
};

/**
 * Update an existing offer detail
 * 
 * @param detailId - The ID of the detail to update
 * @param detailData - The partial offer detail data
 * @param userId - The ID of the user updating the detail
 * @returns Promise with the updated offer detail
 * @usedIn src/components/offers/OfferDetailForm.tsx
 */
export const updateOfferDetail = async (
  detailId: string,
  detailData: Partial<OfferDetailFormData>,
  userId: string
): Promise<OfferDetail> => {
  try {
    const updateData = {
      ...detailData,
      date_updated: new Date().toISOString(),
      user_updated: userId,
    };

    const { data, error } = await updateRecord<OfferDetail>(
      "offer_details",
      detailId,
      updateData
    );

    if (error) {
      logError("Error updating offer detail:", error, "OfferDetailsService");
      throw error;
    }

    return data;
  } catch (error) {
    logError("Error in updateOfferDetail:", error, "OfferDetailsService");
    throw error;
  }
};

/**
 * Delete an offer detail
 * 
 * @param detailId - The ID of the detail to delete
 * @returns Promise that resolves when the detail is deleted
 * @usedIn src/components/offers/OfferDetailsTab.tsx
 */
export const deleteOfferDetail = async (detailId: string): Promise<void> => {
  logDebug(`[OfferDetailsService] deleteOfferDetail called with ID: ${detailId}`);
  
  if (!detailId) {
    logError("No detailId provided to deleteOfferDetail", null, "OfferDetailsService");
    throw new Error("Detail ID is required");
  }
  
  try {
    logDebug(`[OfferDetailsService] Attempting soft delete for detail ID: ${detailId}`);
    // Try soft delete first
    const { error: softDeleteError } = await softDeleteRecord("offer_details", detailId);
    
    if (softDeleteError) {
      logDebug(`[OfferDetailsService] Soft delete failed, falling back to regular delete: ${JSON.stringify(softDeleteError)}`);
      
      // If soft delete is not available or fails, fallback to regular delete
      const { error } = await deleteRecord("offer_details", detailId);
      
      if (error) {
        logError("Error deleting offer detail:", error, "OfferDetailsService");
        throw error;
      }
    }
    
    logInfo(`[OfferDetailsService] Successfully deleted offer detail with ID: ${detailId}`);
  } catch (error) {
    logError("Exception in deleteOfferDetail:", error, "OfferDetailsService");
    throw error;
  }
};

/**
 * Fetch all service categories
 * 
 * @returns Promise with array of service categories
 * @usedIn src/components/offers/OfferDetailForm.tsx, src/components/admin/ServiceTypeManager.tsx
 */
export const fetchServiceCategories = async () => {
  try {
    const { data, error } = await fetchRecords("service_categories", {
      order: { column: "category_name", ascending: true }
    });

    if (error) {
      logError("Error fetching service categories:", error, "OfferDetailsService");
      throw error;
    }

    return data || [];
  } catch (error) {
    logError("Exception in fetchServiceCategories:", error, "OfferDetailsService");
    throw error;
  }
};

/**
 * Fetch subcategories for a specific category
 * 
 * @param categoryId - The ID of the category to fetch subcategories for
 * @returns Promise with array of subcategories
 * @usedIn src/components/offers/OfferDetailForm.tsx, src/components/admin/ServiceTypeManager.tsx
 */
export const fetchSubcategories = async (categoryId: string) => {
  try {
    const { data, error } = await fetchRecords("service_subcategories", {
      filters: { category_id: categoryId },
      order: { column: "subcategory_name", ascending: true }
    });

    if (error) {
      logError("Error fetching subcategories:", error, "OfferDetailsService");
      throw error;
    }

    return data || [];
  } catch (error) {
    logError("Exception in fetchSubcategories:", error, "OfferDetailsService");
    throw error;
  }
};

/**
 * Fetch all measurement units
 * 
 * @returns Promise with array of measurement units
 * @usedIn src/components/offers/OfferDetailForm.tsx
 */
export const fetchMeasurementUnits = async () => {
  try {
    const { data, error } = await fetchRecords("units", {
      order: { column: "name", ascending: true }
    });

    if (error) {
      logError("Error fetching measurement units:", error, "OfferDetailsService");
      throw error;
    }

    return data || [];
  } catch (error) {
    logError("Exception in fetchMeasurementUnits:", error, "OfferDetailsService");
    throw error;
  }
}; 