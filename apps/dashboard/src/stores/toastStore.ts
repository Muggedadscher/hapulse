/**
 * [fork] Short-lived notices (failed service calls). Holds translation keys, the
 * Toaster renders them in the current language. At most 3 at a time; an identical
 * notice that is already visible is not stacked again (a slider can fail many
 * times per second).
 */

import { create } from 'zustand';
import type { TKey } from '../i18n/useT';

export interface Toast {
  id: number;
  key: TKey;
  vars?: Record<string, string | number>;
}

interface ToastState {
  toasts: Toast[];
  push: (key: TKey, vars?: Record<string, string | number>) => void;
  dismiss: (id: number) => void;
}

const VISIBLE_MS = 6000;
const MAX = 3;
let seq = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (key, vars) => {
    const same = JSON.stringify([key, vars ?? null]);
    if (get().toasts.some((t) => JSON.stringify([t.key, t.vars ?? null]) === same)) return;
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, key, ...(vars ? { vars } : {}) }].slice(-MAX) }));
    setTimeout(() => get().dismiss(id), VISIBLE_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
