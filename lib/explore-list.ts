export function resolveBaseAgents<T>(
  initial: T[],
  fetched: T[] | undefined
): T[] {
  if (fetched && fetched.length > 0) return fetched;
  if (initial.length > 0) return initial;
  return fetched ?? [];
}
