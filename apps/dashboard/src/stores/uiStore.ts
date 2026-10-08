/**
 * uiStore — ephemeral UI state (NOT persisted).
 * Currently: editMode flag for in-place customization.
 */

import { create } from 'zustand';

interface UIState {
  editMode: boolean;
  /** Entity shown in the global detail (more-info) modal; null = closed. */
  detailEntityId: string | null;
  /** [fork] Glas: counts the requests for the detail, also for the entity it already shows (the inspector under a
   *  chip dialog then comes up, docs/glas/PLAN-ETAPPE-3.md K60). */
  detailSeq: number;
}

interface UIActions {
  toggleEditMode: () => void;
  setEditMode: (v: boolean) => void;
  openEntityDetail: (entityId: string) => void;
  closeEntityDetail: () => void;
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  editMode: false,
  detailEntityId: null,
  detailSeq: 0, // [fork]

  toggleEditMode() {
    set((s) => ({ editMode: !s.editMode }));
  },

  setEditMode(v: boolean) {
    set({ editMode: v });
  },

  openEntityDetail(entityId: string) {
    set((s) => ({ detailEntityId: entityId, detailSeq: s.detailSeq + 1 })); // [fork] detailSeq
  },

  closeEntityDetail() {
    set({ detailEntityId: null });
  },
}));
