export interface ServiceCategory {
  id: string;
  category_name: string;
  date_created: string;
  date_updated: string | null;
  user_create: string | null;
  user_updated: string | null;
}

export interface ServiceSubcategory {
  id: string;
  subcategory_name: string;
  category_id: string;
  date_created: string;
  date_updated: string | null;
  user_create: string | null;
  user_updated: string | null;
}

export interface MeasurementUnit {
  id: string;
  name: string;
  date_created?: string;
  date_updated?: string;
}

export interface OfferDetail {
  id: string;
  offer_id: string;
  category_id: string;
  subcategory_id?: string;
  unit_id?: string;
  unit_name?: string;  // Add unit_name field
  quantity: number;
  price: number;
  total: number;
  notes?: string;
  date_created: string;
  date_updated?: string;
  user_create?: string;
  user_updated?: string;
  
  // Joined fields
  category?: ServiceCategory;
  subcategory?: ServiceSubcategory;
  unit?: MeasurementUnit;
}

export interface OfferDetailFormData {
  category_id: string;
  subcategory_id?: string;
  unit_id?: string;
  quantity: number;
  price: number;
  notes?: string;
}