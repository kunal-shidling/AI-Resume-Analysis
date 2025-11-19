/**
 * Formats a number of bytes into a human-readable string.
 * @param bytes - The size in bytes.
 * @returns A string representing the size in KB, MB, or GB.
 */

import type { ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";


export function cn(...inputs: ClassValue[]){
  return twMerge(clsx(inputs))
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

export const generateUUID = () => crypto.randomUUID();
