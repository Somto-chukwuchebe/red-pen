// Asks the browser not to clear Red Pen's data when space runs low.
// Installed apps (Home Screen / Dock) are usually granted this automatically.

export type PersistState = 'persistent' | 'best-effort' | 'unsupported';

export async function requestPersistentStorage(): Promise<PersistState> {
  if (!navigator.storage?.persist) return 'unsupported';
  try {
    if (await navigator.storage.persisted()) return 'persistent';
    return (await navigator.storage.persist()) ? 'persistent' : 'best-effort';
  } catch {
    return 'unsupported';
  }
}

export async function storageState(): Promise<{ state: PersistState; usage?: number; quota?: number }> {
  if (!navigator.storage?.persisted) return { state: 'unsupported' };
  const persisted = await navigator.storage.persisted().catch(() => false);
  const est = await navigator.storage.estimate?.().catch(() => undefined);
  return { state: persisted ? 'persistent' : 'best-effort', usage: est?.usage, quota: est?.quota };
}
