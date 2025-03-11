/**
 * ⚠️ CRITICAL WARNING ⚠️
 *
 * This file contains the SINGLE SOURCE OF TRUTH for all SearchBar styling.
 * These values are used across the entire application for consistent search styling.
 *
 * 🚫 DO NOT MODIFY THESE VALUES unless explicitly instructed to do so!
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

export const searchBarStyles = deepFreeze({
  // Colors
  bg: "#354f52",
  text: "#cad2c5",
  placeholder: "#84a98c",
  border: "#52796f",
  iconColor: "#84a98c",

  select: {
    bg: "transparent",
    text: "#84a98c",
    border: "transparent",
    item: {
      text: "#84a98c",
      hoverBg: "#354f52",
      hoverText: "#cad2c5",
      showCheckmark: false,
    },
  },

  // Utility classes
  containerClasses: "relative w-96",
  inputClasses:
    "bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c] pl-8 pr-[200px]",
  iconClasses: "absolute left-2 top-2.5 h-4 w-4 text-[#84a98c]",
})

export type SearchBarStyles = typeof searchBarStyles;

export const getSearchBarStyle = <K extends keyof SearchBarStyles>(
  key: K,
): SearchBarStyles[K] => {
  return searchBarStyles[key];
};
