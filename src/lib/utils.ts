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

export function safeJsonStringify(obj: any, space?: number | string): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object') {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
      
      // Handle Firestore DocumentReference (has path & firestore properties)
      if (value.path && typeof value.path === 'string' && value.firestore) {
        return { _ref: value.path };
      }
      
      // Handle Firestore Timestamp
      if (typeof value.toDate === 'function') {
        return value.toDate().toISOString();
      }
    }
    return value;
  }, space);
}

