import type { StorageManager } from '../storage/StorageManager'

const cachedReduceMotion = new WeakMap<StorageManager, boolean>()
const listeners: Array<(reduce: boolean) => void> = []

export function prefersReducedMotion(storage: StorageManager): boolean {
  const cached = cachedReduceMotion.get(storage)
  if (cached !== undefined) return cached
  const setting = storage.getSettings().reduceMotion
  const reduce = setting === 'on' || (setting === 'auto' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  cachedReduceMotion.set(storage, reduce)
  return reduce
}

export function refreshReducedMotion(storage: StorageManager): void {
  cachedReduceMotion.delete(storage)
  const v = prefersReducedMotion(storage)
  for (const cb of listeners) cb(v)
}

export function subscribeReducedMotion(cb: (reduce: boolean) => void): () => void {
  listeners.push(cb)
  return () => {
    const i = listeners.indexOf(cb)
    if (i >= 0) listeners.splice(i, 1)
  }
}
