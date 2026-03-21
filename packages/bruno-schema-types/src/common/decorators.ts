/**
 * Represents a decorator attached to a field value.
 * Decorators provide metadata that affects how values are input/displayed in the UI.
 *
 * Example: @choices("active", "inactive", "pending")
 * Would be represented as: { type: "choices", args: ["active", "inactive", "pending"] }
 */
export interface Decorator {
  type: string;
  args: unknown[];
}
