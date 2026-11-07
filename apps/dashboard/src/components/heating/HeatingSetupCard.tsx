/**
 * [fork] "Heizplan einrichten" in a room's "Klima", for admins, while the room has a thermostat but no plan
 * (useHeatingSetupRoom). "Einrichten" opens the window (HeatingSetupSheet); "Nicht einrichten" puts the label
 * "Ohne Heizplan" on the room's thermostats, the card then stays small with "Doch einrichten". After a setup the room
 * has its plan and the plan card takes this place; the window stays until it has closed.
 */

import { useState } from 'react';
import { CalendarClock, CalendarOff } from 'lucide-react';
import type { HeatingSetupRoom } from '@hapulse/core';
import { Card } from '../ui/Card';
import { useT } from '../../i18n/useT';
import { setHeatingSetupSkipped } from '../../ha/heatingSetup';
import { useHeatingSetupRoom } from './useHeatingSetup';
import { HeatingSetupSheet } from './HeatingSetupSheet';
import './heating.css';

interface HeatingSetupCardProps {
  areaId: string;
  roomEntityIds: readonly string[];
}

export function HeatingSetupCard({ areaId, roomEntityIds }: HeatingSetupCardProps) {
  const t = useT();
  const found = useHeatingSetupRoom(areaId);
  // the window keeps its room while it closes, also when the room has its plan meanwhile
  const [sheet, setSheet] = useState<{ key: number; open: boolean; room: HeatingSetupRoom } | null>(null);
  const [busy, setBusy] = useState(false);

  const skip = async (on: boolean) => {
    if (!found || busy) return;
    setBusy(true);
    try {
      await setHeatingSetupSkipped(found.thermostats, on);
    } catch (err) {
      console.warn('[HAPulse] heating setup: label failed:', err);
    } finally {
      setBusy(false);
    }
  };

  const openSheet = () => {
    if (found) setSheet((s) => ({ key: (s?.key ?? 0) + 1, open: true, room: found }));
  };

  const sheetEl = sheet && (
    <HeatingSetupSheet key={sheet.key} open={sheet.open} room={sheet.room} roomEntityIds={roomEntityIds} onClose={() => setSheet((s) => (s ? { ...s, open: false } : s))} />
  );

  if (!found) return sheetEl ?? null;

  if (found.skipped) {
    return (
      <Card className="heating-card heating-setup-card heating-setup-card--skipped">
        <div className="heating-card__head">
          <div className="icon-chip heating-card__chip" aria-hidden="true">
            <CalendarOff size={20} strokeWidth={1.75} />
          </div>
          <div className="heating-card__titles">
            <div className="heating-card__name">{t('heatingSetup.skippedTitle')}</div>
            <div className="heating-card__status">{t('heatingSetup.skippedText')}</div>
          </div>
        </div>
        <div className="heating-setup-card__actions">
          <button type="button" className="btn btn--secondary heating-setup-card__unskip" disabled={busy} onClick={() => void skip(false)}>
            {t('heatingSetup.unskip')}
          </button>
        </div>
        {sheetEl}
      </Card>
    );
  }

  return (
    <Card className="heating-card heating-setup-card">
      <div className="heating-card__head">
        <div className="icon-chip heating-card__chip" aria-hidden="true">
          <CalendarClock size={20} strokeWidth={1.75} />
        </div>
        <div className="heating-card__titles">
          <div className="heating-card__name">{t('heatingSetup.title')}</div>
          <div className="heating-card__status">{t('heatingSetup.cardText')}</div>
        </div>
      </div>
      <div className="heating-setup-card__actions">
        <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void skip(true)}>
          {t('heatingSetup.skip')}
        </button>
        <button type="button" className="btn btn--primary" disabled={busy} onClick={openSheet} aria-haspopup="dialog">
          {t('heatingSetup.action')}
        </button>
      </div>
      {sheetEl}
    </Card>
  );
}
