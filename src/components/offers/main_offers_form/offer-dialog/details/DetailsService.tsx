import { 
  ServiceCategory, 
  ServiceSubcategory, 
  MeasurementUnit,
  OfferDetail 
} from '@/types/offer-details';
import { 
  fetchRecords, 
  softDeleteRecord, 
  createRecord, 
  updateRecord 
} from '@/services/api/supabaseService';

// Type for raw database response
export type RawSubcategory = {
  id: string;
  subcategory_name: string;
  category_id: string;
  created_at: string;
};

/**
 * Fetch offer details
 */
export const fetchOfferDetails = async (offerId: string): Promise<OfferDetail[]> => {
  try {
    const { data, error } = await fetchRecords<OfferDetail>("offer_details", {
      select: `
        *,
        category:service_categories(*),
        subcategory:service_subcategories(*),
        unit:units(*)
      `,
      filters: { offer_id: offerId, is_deleted: false },
      order: { column: "date_created", ascending: true }
    });

    if (error) throw error;
    return Array.isArray(data) ? data : data ? [data] : [];
  } catch (error) {
    console.error('Error fetching offer details:', error);
    throw error;
  }
};

/**
 * Delete offer detail
 */
export const deleteOfferDetail = async (detailId: string): Promise<void> => {
  try {
    const { error } = await softDeleteRecord("offer_details", detailId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting offer detail:', error);
    throw error;
  }
};

/**
 * Add offer detail
 */
export const addOfferDetail = async (
  offerId: string, 
  detailData: {
    offer_id: string;
    category_id: string;
    subcategory_id: string;
    unit_id: string;
    price: number;
    quantity: number;
    total?: number;
    notes?: string;
  },
  userId: string
): Promise<OfferDetail> => {
  try {
    const { total, ...dataWithoutTotal } = detailData;
    
    const newDetailData = {
      ...dataWithoutTotal,
      user_create: userId,
      user_updated: userId,
      date_updated: new Date().toISOString()
    };

    const { data, error } = await createRecord<OfferDetail>("offer_details", newDetailData);

    if (error) throw error;
    
    // Fetch the complete record with relations
    const fullDetailData = await fetchOfferDetails(offerId);
    const newDetail = fullDetailData.find(d => d.id === data.id);
    
    return newDetail || data;
  } catch (error) {
    console.error('Error adding offer detail:', error);
    throw error;
  }
};

/**
 * Update offer detail
 */
export const updateOfferDetail = async (
  detailId: string,
  updateData: {
    unit_id?: string;
    price?: number;
    quantity?: number;
    total?: number;
    notes?: string;
  },
  userId: string
): Promise<OfferDetail> => {
  try {
    // Remove the total field from the update data
    const { total, ...dataWithoutTotal } = updateData;
    
    const dataToUpdate = {
      ...dataWithoutTotal,
      user_updated: userId,
      date_updated: new Date().toISOString()
    };

    const { data, error } = await updateRecord<OfferDetail>(
      "offer_details",
      detailId,
      dataToUpdate
    );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating offer detail:', error);
    throw error;
  }
};

/**
 * Fetch service categories
 */
export const fetchServiceCategories = async (): Promise<ServiceCategory[]> => {
  try {
    const { data, error } = await fetchRecords<ServiceCategory>("service_categories", {
      order: { column: "category_name", ascending: true }
    });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching service categories:', error);
    throw error;
  }
};

/**
 * Fetch service subcategories
 */
export const fetchSubcategories = async (categoryId: string): Promise<ServiceSubcategory[]> => {
  try {
    const { data, error } = await fetchRecords<ServiceSubcategory>("service_subcategories", {
      filters: { category_id: categoryId },
      order: { column: "subcategory_name", ascending: true },
      includeSoftDeleted: true
    });

    if (error) throw error;
    
    // Map to expected format if needed
    const subcategories = Array.isArray(data) ? data : [];
    
    return subcategories;
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    throw error;
  }
};

/**
 * Fetch measurement units
 */
export const fetchMeasurementUnits = async (): Promise<MeasurementUnit[]> => {
  try {
    const { data, error } = await fetchRecords<MeasurementUnit>("units", {
      order: { column: "name", ascending: true }
    });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching measurement units:', error);
    throw error;
  }
};

/**
 * Preload categories and units in parallel
 */
export const preloadCategoriesAndUnits = async ({
  setCategories,
  setUnits,
  setError
}: {
  setCategories: React.Dispatch<React.SetStateAction<ServiceCategory[]>>;
  setUnits: React.Dispatch<React.SetStateAction<MeasurementUnit[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setSubcategories?: React.Dispatch<React.SetStateAction<ServiceSubcategory[]>>;
}): Promise<void> => {
  try {
    // Fetch both in parallel for better performance
    const [categoriesResponse, unitsResponse] = await Promise.all([
      fetchServiceCategories(),
      fetchMeasurementUnits()
    ]);
    
    setCategories(categoriesResponse);
    setUnits(unitsResponse);
  } catch (error) {
    console.error('Error preloading categories and units:', error);
    setError('Σφάλμα φόρτωσης κατηγοριών και μονάδων');
    throw error;
  }
}; 
