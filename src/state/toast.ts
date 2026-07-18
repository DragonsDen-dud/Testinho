import { useSyncExternalStore } from 'react'

export interface ToastState {
  message: string
  onUndo: () => void
}

let state: ToastState | null = null
let timer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

/**
 * Article 50 — a single global toast, not a stacking queue: a second
 * delete while one is already showing simply replaces it (its own 5s timer
 * restarts), matching "after any delete action" as a one-at-a-time prompt
 * rather than a growing list.
 */
export function showUndoToast(message: string, onUndo: () => void) {
  if (timer) clearTimeout(timer)
  state = { message, onUndo }
  emit()
  timer = setTimeout(() => {
    state = null
    timer = null
    emit()
  }, 5000)
}

/** Letting the toast expire is equivalent to leaving the item in Trash —
 * dismissing early (e.g. after tapping Undo) needs no extra deletion step. */
export function dismissToast() {
  if (timer) clearTimeout(timer)
  timer = null
  state = null
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): ToastState | null {
  return state
}

export function useToast(): ToastState | null {
  return useSyncExternalStore(subscribe, getSnapshot)
}
