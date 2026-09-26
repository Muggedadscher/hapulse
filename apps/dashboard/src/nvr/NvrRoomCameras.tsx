/**
 * [fork] Room page section "Kameras": the Sentinel cameras an admin assigned to this HA area
 * (Settings via the NVR page → "Kameras den Räumen zuordnen"). Tiles come from the shared
 * package (snapshot every 5 s while visible, tap → timeline).
 */

import { WifiOff } from 'lucide-react';
import { CameraTiles } from '@sentinel-nvr/web/ui';
import { useT } from '../i18n/useT';
import { useNvrConfig } from './config';
import { useSentinelCameras } from './cameraSource';
import { NvrUi } from './ui';
import './nvr.css';

export function NvrRoomCameras({ cameraIds }: { cameraIds: string[] }) {
  const t = useT();
  const cfg = useNvrConfig();
  const sentinel = useSentinelCameras();
  if (!cfg || !sentinel) return null;
  if (sentinel.status === 'error') {
    return <p className="nvr-muted"><WifiOff size={14} strokeWidth={2} />{t('nvr.error.unreachable')}</p>;
  }
  const cameras = sentinel.cameras.filter((c) => cameraIds.includes(c.id));
  if (cameras.length === 0) return null;
  return (
    <div className="nvr-room-cams nvr-page">
      <NvrUi client={cfg.client}>
        <CameraTiles cameras={cameras} />
      </NvrUi>
    </div>
  );
}
