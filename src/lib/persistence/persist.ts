/**
 * Ask the browser to keep our storage durable (not silently evicted under
 * pressure). This is best-effort: on iOS Safari `persist()` is not guaranteed,
 * which is exactly why the manual Export button is the real safety net.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Current durability status without requesting it. */
export async function isStoragePersisted(): Promise<boolean> {
  if (!navigator.storage?.persisted) return false;
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}
