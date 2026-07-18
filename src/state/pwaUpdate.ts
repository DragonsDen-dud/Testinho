import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

let needRefresh = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

// Runs once at module load (imported once from main.tsx). registerType:
// 'prompt' in vite.config.ts means nothing else registers the service
// worker — this is the only registration, and onNeedRefresh only ever
// fires when an already-active service worker detects a genuinely newer
// one, never on a first install (there's nothing yet to compare against).
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    needRefresh = true
    emit()
  },
  onRegisterError(error) {
    console.error('Service worker registration failed', error)
  },
})

/** Activates the waiting service worker and reloads — the explicit,
 * in-app alternative to the fully-close-and-reopen workaround. */
export function applyPwaUpdate() {
  updateSW(true)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): boolean {
  return needRefresh
}

export function useNeedsPwaRefresh(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
