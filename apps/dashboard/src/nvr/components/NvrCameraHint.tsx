/** [fork] Shown instead of Home Assistant's camera picture while Sentinel is the camera source. */
import { useNavigate } from 'react-router';
import { Cctv, ChevronRight } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { NVR_ROOT } from '../paths';
import '../nvr.css';

export function NvrCameraHint({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className="nvr-camhint">
      <Cctv size={18} strokeWidth={1.75} aria-hidden="true" />
      <span className="nvr-camhint__text">{t('cameraSource.detail.hint')}</span>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => { onNavigate?.(); navigate(NVR_ROOT); }}
      >
        {t('cameraSource.detail.open')}
        <ChevronRight size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
