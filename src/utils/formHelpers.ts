/**
 * Form Helper Utilities
 * 
 * A set of type-safe utilities for working with React Hook Form.
 * These helpers enhance form management with additional functionality
 * beyond what React Hook Form provides out of the box.
 * 
 * Usage:
 * ```tsx
 * import { useForm } from 'react-hook-form';
 * import { useFormWatch, setMultipleFields } from '@/utils/formHelpers';
 * 
 * function MyForm() {
 *   const { control, setValue, getValues, reset } = useForm<FormData>();
 *   
 *   // Watch a specific field with type safety
 *   const email = useFormWatch(control, 'email', '');
 *   
 *   // Set multiple fields at once
 *   const handlePopulateForm = () => {
 *     setMultipleFields(setValue, {
 *       firstName: 'John',
 *       lastName: 'Doe',
 *       email: 'john.doe@example.com'
 *     });
 *   };
 *   
 *   // Reset with specific values
 *   const handlePartialReset = () => {
 *     resetFormWithValues(reset, getValues, {
 *       email: '',
 *       phone: ''
 *     }, ['firstName', 'lastName']);
 *   };
 * }
 * ```
 * 
 * Files using these utilities:
 * - src/components/customers/CustomerForm.tsx
 * - src/components/offers/OfferForm.tsx
 * - src/components/settings/ProfileForm.tsx
 * 
 * @module formHelpers
 */

import { 
  Control,
  useWatch as originalUseWatch, 
  Path, 
  PathValue,
  UseFormSetValue,
  FieldValues,
  UseFormReset,
  UseFormGetValues
} from "react-hook-form";

/**
 * Type-safe wrapper for React Hook Form's useWatch
 * Watches a specific field in a form and returns its value
 * 
 * @param control - Form control object from useForm
 * @param name - Field name to watch
 * @param defaultValue - Optional default value if field is undefined
 * @returns The current value of the watched field
 */
export function useFormWatch<TFieldValues extends FieldValues, TFieldName extends Path<TFieldValues>>(
  control: Control<TFieldValues>,
  name: TFieldName,
  defaultValue?: PathValue<TFieldValues, TFieldName>
): PathValue<TFieldValues, TFieldName> {
  return originalUseWatch({
    control,
    name,
    defaultValue
  });
}

/**
 * Sets multiple field values at once
 * 
 * @param setValue - Form setValue function from useForm
 * @param values - Object containing field names and their values
 */
export function setMultipleFields<TFieldValues extends FieldValues>(
  setValue: UseFormSetValue<TFieldValues>,
  values: Partial<TFieldValues>
): void {
  Object.entries(values).forEach(([key, value]) => {
    setValue(key as Path<TFieldValues>, value as PathValue<TFieldValues, Path<TFieldValues>>);
  });
}

/**
 * Resets form to specific values or gets current values and resets with modifications
 * 
 * @param reset - Form reset function from useForm 
 * @param getValues - Form getValues function from useForm
 * @param values - Optional partial values to reset to
 * @param exclude - Optional array of field names to exclude from reset
 */
export function resetFormWithValues<TFieldValues extends FieldValues>(
  reset: UseFormReset<TFieldValues>,
  getValues: UseFormGetValues<TFieldValues>,
  values?: Partial<TFieldValues>,
  exclude: Path<TFieldValues>[] = []
): void {
  const currentValues = getValues();
  const resetValues = { ...currentValues };
  
  // Apply new values
  if (values) {
    Object.entries(values).forEach(([key, value]) => {
      if (!exclude.includes(key as Path<TFieldValues>)) {
        (resetValues as any)[key] = value;
      }
    });
  }
  
  // Reset the form with the new values
  reset(resetValues);
}

// Export all helpers as a namespace for cleaner imports
export const formHelpers = {
  useFormWatch,
  setMultipleFields,
  resetFormWithValues
};

export default formHelpers; 