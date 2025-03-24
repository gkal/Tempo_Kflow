/**
 * Style utility functions
 * Shared across all style definition files
 */

/**
 * Makes an object and all its nested properties immutable
 * @param obj Object to freeze
 * @returns Readonly version of the object
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
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
 * Generic function to get a style value from a style object
 * @param styles Style object
 * @param key Primary key to access
 * @param subKey Optional secondary key if accessing nested property
 * @returns The requested style value with proper type
 */
export function getStyleValue<
  T extends object,
  K extends keyof T,
  SK extends keyof T[K] = never
>(
  styles: T,
  key: K,
  subKey?: SK
): SK extends never ? T[K] : T[K][SK] {
  if (subKey !== undefined) {
    return styles[key][subKey as keyof T[K]] as any;
  }
  return styles[key] as any;
}

/**
 * Converts a style object to CSS classes string
 * @param classObj Object with class names as keys and boolean values
 * @returns String with all true class names concatenated
 */
export function classNames(classObj: Record<string, boolean>): string {
  return Object.entries(classObj)
    .filter(([_, value]) => value)
    .map(([key]) => key)
    .join(' ');
} 