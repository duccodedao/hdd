import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toSafeDate(val: any): Date {
  if (!val) return new Date();
  if (val && typeof val.toMillis === 'function') {
    return new Date(val.toMillis());
  }
  if (val && val.seconds !== undefined) {
    return new Date(val.seconds * 1000);
  }
  return new Date(val);
}

export function formatDate(date: any) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(toSafeDate(date));
}
