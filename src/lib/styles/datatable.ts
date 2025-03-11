/**
 * ⚠️ CRITICAL WARNING ⚠️
 *
 * This file contains the SINGLE SOURCE OF TRUTH for all DataTableBase styling.
 * These values are used across the entire application for consistent table styling.
 *
 * 🚫 DO NOT MODIFY THESE VALUES unless explicitly instructed to do so!
 * 🚫 DO NOT USE THESE VALUES outside of DataTableBase-related components!
 *
 * Changing these values will affect ALL instances of DataTableBase in the application.
 * Any modifications should be thoroughly tested across all table instances.
 */

/**
 * Deep freeze an object to make it and its nested properties immutable
 */
function deepFreeze<T extends object>(obj: T): Readonly<T> {
  Object.keys(obj).forEach((prop) => {
    if (
      typeof (obj as any)[prop] === "object" &&
      (obj as any)[prop] !== null &&
      !Object.isFrozen((obj as any)[prop])
    ) {
      deepFreeze((obj as any)[prop]);
    }
  });
  return Object.freeze(obj);
}

/**
 * DataTable styles configuration
 * ⚠️ IMMUTABLE: These values cannot be modified after initialization
 */
export const dataTableStyles = deepFreeze({
  // Background Colors
  bgPrimary: "#354f52",
  bgHover: "#354f52/50",
  bgSelected: "#52796f",

  // Text Colors
  textPrimary: "#cad2c5",
  textSecondary: "#84a98c",
  textMuted: "#84a98c",

  // Border Colors
  borderColor: "#52796f",

  // Component-specific styles
  header: {
    text: "#84a98c",
    bg: "transparent",
  },

  row: {
    hoverBg: "#354f52/50",
    selectedBg: "#52796f",
    text: "#cad2c5",
  },

  search: {
    bg: "#354f52",
    text: "#cad2c5",
    placeholder: "#84a98c",
    border: "#52796f",
  },

  select: {
    bg: "transparent",
    text: "#84a98c",
    border: "transparent",
    item: {
      text: "#84a98c",
      hoverBg: "#354f52",
      hoverText: "#cad2c5",
      showCheckmark: true,
    },
  },

  pagination: {
    text: "#84a98c",
    activeText: "#cad2c5",
    activeBg: "#52796f",
  },

  // Utility classes
  containerClasses:
    "bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden",
  headerClasses: "text-[#84a98c]",
  rowClasses: "hover:bg-[#354f52/50] transition-colors",
  searchClasses:
    "bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]",
  selectClasses:
    "border-0 bg-transparent text-[#84a98c] rounded-l-none focus:ring-0 hover:bg-transparent",
});

/**
 * Type definition for the datatable styles to ensure type safety
 */
export type DataTableStyles = typeof dataTableStyles;

/**
 * Helper function to get a specific style value
 * This ensures type safety when accessing style values
 */
export const getDataTableStyle = <
  K extends keyof DataTableStyles,
  SK extends keyof DataTableStyles[K],
>(
  key: K,
  subKey?: SK,
): SK extends undefined ? DataTableStyles[K] : DataTableStyles[K][SK] => {
  if (subKey) {
    return dataTableStyles[key][subKey as any] as any;
  }
  return dataTableStyles[key] as any;
};
