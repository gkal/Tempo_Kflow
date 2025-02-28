/**
 * ⚠️ CRITICAL WARNING ⚠️
 *
 * This file contains the SINGLE SOURCE OF TRUTH for all close button styling.
 * These values are used across the entire application for consistent close button styling.
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

export const closeButtonStyles = deepFreeze({
  // Colors
  bg: "#354f52",
  hoverBg: "#52796f/20",
  text: "#cad2c5",
  border: "#84a98c/50",
  borderWidth: "1px",

  // Sizes
  size: {
    sm: {
      height: "h-7",
      width: "w-7",
      iconSize: "h-4 w-4",
    },
    md: {
      height: "h-9",
      width: "w-9",
      iconSize: "h-5 w-5",
    },
    lg: {
      height: "h-10",
      width: "w-10",
      iconSize: "h-6 w-6",
    },
  },

  // Utility classes
  baseClasses:
    "p-0 rounded-full flex items-center justify-center transition-colors",
  defaultClasses:
    "h-9 w-9 p-0 rounded-full bg-[#354f52] text-[#cad2c5] hover:bg-[#52796f]/20 flex items-center justify-center border border-[#84a98c]/50",
}) as const;

export type CloseButtonStyles = typeof closeButtonStyles;

export const getCloseButtonStyle = <K extends keyof CloseButtonStyles>(
  key: K,
): CloseButtonStyles[K] => {
  return closeButtonStyles[key];
};

export const getCloseButtonClasses = (
  size: "sm" | "md" | "lg" = "md",
  withBorder: boolean = true,
): string => {
  const {
    baseClasses,
    size: sizes,
    bg,
    hoverBg,
    text,
    border,
  } = closeButtonStyles;
  const sizeClasses = sizes[size];

  return `${baseClasses} ${sizeClasses.height} ${sizeClasses.width} bg-[${bg}] text-[${text}] hover:bg-[${hoverBg}] ${
    withBorder ? `border border-[${border}]` : ""
  }`;
};
