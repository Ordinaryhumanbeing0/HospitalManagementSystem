import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ensures Prisma Decimal, Date, and nested non-plain objects are serialized to plain JSON
 * so they can be safely returned from Server Actions to React Client Components.
 */
export function toPlainObject<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    })
  );
}
