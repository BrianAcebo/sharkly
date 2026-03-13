/** Stub for entity graph - domains API */
export async function getDomainById(_id: string): Promise<{ name?: string; [k: string]: unknown } | null> {
  return null;
}
export async function updateDomain(_id: string, _updates: unknown): Promise<void> {}
