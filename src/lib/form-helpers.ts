import { Control, useWatch as originalUseWatch, Path, PathValue } from "react-hook-form";

// Type-safe wrapper for useWatch
export function useFormWatch<T>(
  control: Control<T>,
  name: Path<T>,
  defaultValue?: any
): any {
  return originalUseWatch({
    control,
    name,
    defaultValue
  });
} 