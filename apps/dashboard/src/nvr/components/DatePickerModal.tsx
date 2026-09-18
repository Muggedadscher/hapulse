/**
 * [fork] Date + time picker in HAPulse's Modal primitive; the grid/footer come
 * from the shared package (useDatePicker).
 */
import React from 'react';
import { Calendar } from 'lucide-react';
import { useDatePicker } from '@sentinel-nvr/web/ui';
import { Modal } from '../../components/ui/Modal';
import { useT } from '../../i18n/useT';

export function DatePickerModal({ open, dayStart, timeTs, oldestAllowed, onGo, onClose }: {
  open: boolean; dayStart: number; timeTs: number; oldestAllowed: number;
  onGo: (dayStart: number, time: string | null) => void; onClose: () => void;
}) {
  const t = useT();
  const { grid, footer } = useDatePicker({ dayStart, timeTs, oldestAllowed, onGo });
  return (
    <Modal open={open} onClose={onClose} title={t('nvr.date.title')} icon={<Calendar size={18} strokeWidth={1.75} />} footer={footer}>
      {grid}
    </Modal>
  );
}
