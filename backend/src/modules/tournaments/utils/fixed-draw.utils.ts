/** FNV-1a 32-bit seeds. Kept as they are in the reference algorithm: do not change them. */
export const FNV_OFFSET_BASIS = 2166136261;
export const FNV_PRIME = 16777619;

/**
 * Frozen draw: a deterministic unsigned 32-bit hash of `key` (FNV-1a), used as a neutral
 * tie-break. The same key always gives the same value, so nothing has to be stored.
 */
export function fixedDraw(key: string): number {
    let hash = FNV_OFFSET_BASIS;
    for (let index = 0; index < key.length; index++) {
        hash ^= key.charCodeAt(index);
        hash = Math.imul(hash, FNV_PRIME) >>> 0;
    }
    return hash >>> 0;
}
