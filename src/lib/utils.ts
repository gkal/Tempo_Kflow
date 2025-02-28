import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to dd/mm/yyyy
export function formatDate(date: string | Date): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Format datetime to dd/mm/yyyy hh:mm:ss
export function formatDateTime(date: string | Date): string {
  if (!date) return "-";
  const d = new Date(date);
  return (
    d.toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  );
}
