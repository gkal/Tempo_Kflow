import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDate } from "@/utils/formatUtils";

/**
 * @deprecated Import the cn function from '@/utils/styleUtils' instead.
 * 
 * This function combines multiple class names using clsx and tailwind-merge.
 * The functionality has been moved to the central styleUtils module for better organization.
 * 
 * @param inputs - Class names to combine
 * @returns Combined class name string
 * 
 * @example
 * // Use this instead:
 * import { cn } from '@/utils/styleUtils';
 * // or
 * import { cn } from '@/utils';
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export { formatDate };
