/** Initial TypeScript boundary for the application architecture.
 *
 * Keep this file deliberately small during the incremental migration. Domain
 * contracts should be introduced here only when they are stable enough to be
 * shared by application services and adapters.
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type EntityId = Brand<string, 'EntityId'>;
