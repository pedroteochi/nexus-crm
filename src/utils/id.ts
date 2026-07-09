/**
 * Monotonic, collision-safe id generator.
 *
 * A bare `Date.now()` collides when many records are created inside a tight
 * synchronous loop (the seed builder does exactly this), so we append a
 * process-lifetime counter to guarantee uniqueness.
 */
let counter = 0;

export const generateId = (): string => `${Date.now().toString(36)}-${(counter++).toString(36)}`;
