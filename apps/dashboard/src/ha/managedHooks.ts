/**
 * [fork] UI hooks for the global admin management (ha/globalSettings.ts).
 */

import { useConnectionStore } from '../stores/connectionStore';
import { useGlobalSettingsStore } from '../stores/globalSettingsStore';
import { useSettingsStore } from '../stores/settingsStore';

/** An admin has activated the global management (known before connect, persisted). */
export function useIsManaged(): boolean {
  return useGlobalSettingsStore((s) => s.meta.managed);
}

/**
 * Shared settings are read-only here: managed and the current user is not a HA admin.
 * While the user is still unknown (before `auth/current_user`) a managed device counts as
 * locked — the safe default, like useCanEdit.
 */
export function useSettingsLocked(): boolean {
  const managed = useIsManaged();
  const isAdmin = useConnectionStore((s) => s.currentUser?.is_admin === true);
  return managed && !isAdmin;
}

/**
 * The effective "editing enabled" switch. Under global management only admins get it —
 * for everybody else it is off, so they never see the entities an admin has hidden.
 */
export function useEditingEnabled(): boolean {
  const editingEnabled = useSettingsStore((s) => s.customization.editingEnabled);
  const locked = useSettingsLocked();
  return editingEnabled && !locked;
}
