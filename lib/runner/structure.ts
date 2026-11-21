import type { StructureCheckValue } from "../lessons/schema";

// Self-contained so the trusted matcher can be embedded in the lesson Worker.
export function matchesStructure(
  actual: unknown,
  expected: StructureCheckValue,
): boolean {
  const ownData = (value: object, key: PropertyKey) => {
    const field = Object.getOwnPropertyDescriptor(value, key);
    return field?.enumerable && Object.hasOwn(field, "value")
      ? field
      : undefined;
  };
  const matchesEntry = (
    value: unknown,
    fixture: Exclude<StructureCheckValue, unknown[]>,
  ): boolean => {
    if (fixture === null || typeof fixture !== "object")
      return value === fixture;
    if (value === null || typeof value !== "object" || Array.isArray(value))
      return false;
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const keys = Object.keys(fixture);
    if (Reflect.ownKeys(value).length !== keys.length) return false;
    return keys.every((key) => {
      const field = ownData(value, key);
      return field !== undefined && field.value === fixture[key];
    });
  };

  if (!Array.isArray(expected)) return matchesEntry(actual, expected);
  if (!Array.isArray(actual)) return false;
  const length = Object.getOwnPropertyDescriptor(actual, "length");
  if (length?.value !== expected.length) return false;
  if (Reflect.ownKeys(actual).length !== expected.length + 1) return false;
  return expected.every((entry, index) => {
    const field = ownData(actual, index);
    return field !== undefined && matchesEntry(field.value, entry);
  });
}
