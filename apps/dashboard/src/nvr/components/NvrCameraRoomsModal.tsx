/**
 * [fork] Assign Sentinel cameras to Home Assistant rooms (areas). Room pages then show the
 * assigned cameras (nvr/NvrRoomCameras.tsx). Stored globally (`customization.nvrCameraRooms`),
 * so under the global admin management everybody sees the same assignment.
 */

import { useEffect, useState } from 'react';
import { ChevronDown, MapPin, Wand2 } from 'lucide-react';
import type { SentinelCamera } from '@sentinel-nvr/web/api';
import { Modal } from '../../components/ui/Modal';
import { useRooms } from '../../ha/hooks';
import { useSettingsStore } from '../../stores/settingsStore';
import { useT } from '../../i18n/useT';
import { suggestArea } from '../cameraSource';
import '../nvr.css';

export function NvrCameraRoomsModal({ open, onClose, cameras }: { open: boolean; onClose: () => void; cameras: SentinelCamera[] }) {
  const t = useT();
  const rooms = useRooms();
  const stored = useSettingsStore((s) => s.customization.nvrCameraRooms);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  const [draft, setDraft] = useState<Record<string, string | null>>(stored);

  useEffect(() => { if (open) setDraft(stored); }, [open, stored]);

  const suggest = () => {
    const next = { ...draft };
    for (const c of cameras) {
      if (next[c.id]) continue; // never override an explicit choice
      const s = suggestArea(c.name, rooms);
      if (s) next[c.id] = s;
    }
    setDraft(next);
  };

  const save = () => {
    // keep assignments of cameras that are currently not listed (offline plugin, removed later)
    updateCustomization({ nvrCameraRooms: { ...stored, ...draft } });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('cameraSource.rooms.title')}
      icon={<MapPin size={18} strokeWidth={1.75} />}
      footer={(
        <div className="nvr-setup__actions">
          <button type="button" className="btn btn--ghost" onClick={suggest} disabled={cameras.length === 0}>
            <Wand2 size={16} strokeWidth={1.75} />{t('cameraSource.rooms.suggest')}
          </button>
          <button type="button" className="btn btn--primary" onClick={save}>{t('cameraSource.rooms.save')}</button>
        </div>
      )}
    >
      <p className="nvr-setup__desc nvr-setup__desc--modal">{t('cameraSource.rooms.desc')}</p>
      {cameras.length === 0 ? (
        <p className="nvr-muted">{t('cameraSource.rooms.empty')}</p>
      ) : (
        <div className="nvr-camrooms">
          {cameras.map((c) => (
            <label key={c.id} className="nvr-camrooms__row">
              <span className="nvr-camrooms__name">{c.name}</span>
              <span className="nvr-select">
                <select
                  className="nvr-select__native"
                  value={draft[c.id] ?? ''}
                  onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value || null })}
                  aria-label={t('cameraSource.rooms.selectAria', { name: c.name })}
                >
                  <option value="">{t('cameraSource.rooms.none')}</option>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <ChevronDown size={14} strokeWidth={2} className="nvr-select__chevron" aria-hidden="true" />
              </span>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}
