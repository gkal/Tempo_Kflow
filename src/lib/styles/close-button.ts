/**
 * ⚠️ CRITICAL WARNING ⚠️
 *
 * This file contains the SINGLE SOURCE OF TRUTH for all close button styling.
 * These values are used across the entire application for consistent close button styling.
 *
 * 🚫 DO NOT MODIFY THESE VALUES unless explicitly instructed to do so!
 */
import { deepFreeze } from './utils';

export const closeButtonStyles = deepFreeze({
  // Colors
  bg: "#2f3e46",
  hoverBg: "#354f52",
  text: "#cad2c5",
  border: "#52796f",
  borderWidth: "1px",

  // Sizes
  size: {
    sm: {
      height: "h-8",
      width: "w-8",
      iconSize: "h-5 w-5",
    },
    md: {
      height: "h-10",
      width: "w-10",
      iconSize: "h-6 w-6",
    },
    lg: {
      height: "h-12",
      width: "w-12",
      iconSize: "h-7 w-7",
    },
  },

  // Utility classes
  baseClasses:
    "p-0 rounded-full flex items-center justify-center transition-colors",
  defaultClasses:
    "h-9 w-9 p-0 rounded-full bg-[#354f52] text-[#cad2c5] hover:bg-[#52796f]/20 flex items-center justify-center border border-[#84a98c]/50",
});

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
