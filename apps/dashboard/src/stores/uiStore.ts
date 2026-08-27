/**
 * uiStore — ephemeral UI state (NOT persisted).
 * Currently: editMode flag for in-place customization.
 */

import { create } from 'zustand';

interface UIState {
  editMode: boolean;
  /** Entity shown in the global detail (more-info) modal; null = closed. */
  detailEntityId: string | null;
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

  toggleEditMode() {
    set((s) => ({ editMode: !s.editMode }));
  },

  setEditMode(v: boolean) {
    set({ editMode: v });
  },

  openEntityDetail(entityId: string) {
    set({ detailEntityId: entityId });
  },

  closeEntityDetail() {
    set({ detailEntityId: null });
  },
}));
