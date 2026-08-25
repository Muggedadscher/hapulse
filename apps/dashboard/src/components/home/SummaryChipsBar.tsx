/**
 * SummaryChipsBar — self-contained summary chips for the Home top row.
 *
 * Reads entities + customization, renders the clickable summary chips and owns
 * the chip detail modals. Used in two places: the desktop header cluster (left
 * of weather/bell/avatar) and the Home page on mobile.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { SummaryChips } from './SummaryChips';
import {
  PeopleModal,
  LightsModal,
  DoorsModal,
  AlarmModal,
  MediaModal,
  PoolModal,
} from './chipmodals';
import { useEntityMap, useCustomization } from '../../ha/hooks';
import { useSettingsStore } from '../../stores/settingsStore';

const ALL_CHIPS = ['people', 'lights', 'doors', 'alarm', 'media', 'pool'] as const; // [fork] pool chip
type ChipId = (typeof ALL_CHIPS)[number];

const CHIP_ORDER_KEY = '__home:chips';

interface SummaryChipsBarProps {
  className?: string | undefined;
  /** When true, shows all chips with drag-to-reorder and show/hide badges. */
  editMode?: boolean | undefined;
}

export function SummaryChipsBar({ className, editMode = false }: SummaryChipsBarProps) {
  const entities = useEntityMap();
  const customization = useCustomization();
  const { homeChips, entityOrder, hiddenEntities } = customization;

  // Pass only visible entities to chips so all counts exclude hidden entities.
  const visibleEntities = useMemo(() => {
    if (hiddenEntities.length === 0) return entities;
    const hidden = new Set(hiddenEntities);
    return Object.fromEntries(
      Object.entries(entities).filter(([id]) => !hidden.has(id))
    );
  }, [entities, hiddenEntities]);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);

  const [openModal, setOpenModal] = useState<ChipId | null>(null);
  const closeModal = useCallback(() => setOpenModal(null), []);
  const handleChipClick = useCallback((id: ChipId) => setOpenModal(id), []);

  // Semantics: empty OR all-5 selected = show all; subset = those chips.
  const enabledChips: string[] =
    homeChips.length === 0 || homeChips.length === ALL_CHIPS.length
      ? [...ALL_CHIPS]
      : homeChips;

  const handleToggleChip = useCallback(
    (chipId: string) => {
      // Work from the full list — a chip not in enabledChips means it's hidden.
      const current: string[] =
        homeChips.length === 0 || homeChips.length === ALL_CHIPS.length
          ? [...ALL_CHIPS]
          : homeChips;
      const next = current.includes(chipId)
        ? current.filter((id) => id !== chipId)
        : [...current, chipId];
      updateCustomization({ homeChips: next });
    },
    [homeChips, updateCustomization]
  );

  const handleReorder = useCallback(
    (ids: string[]) => {
      updateCustomization({
        entityOrder: { ...entityOrder, [CHIP_ORDER_KEY]: ids },
      });
    },
    [entityOrder, updateCustomization]
  );

  return (
    <div className={className}>
      <SummaryChips
        entities={visibleEntities}
        enabledChips={enabledChips}
        editMode={editMode}
        onChipClick={editMode ? undefined : handleChipClick}
        onToggleChip={editMode ? handleToggleChip : undefined}
        onReorder={editMode ? handleReorder : undefined}
        order={entityOrder[CHIP_ORDER_KEY]}
      />
      {!editMode && (
        <>
          <PeopleModal open={openModal === 'people'} onClose={closeModal} />
          <LightsModal open={openModal === 'lights'} onClose={closeModal} />
          <DoorsModal open={openModal === 'doors'} onClose={closeModal} />
          <AlarmModal open={openModal === 'alarm'} onClose={closeModal} />
          <MediaModal open={openModal === 'media'} onClose={closeModal} />
          <PoolModal open={openModal === 'pool'} onClose={closeModal} />
        </>
      )}
    </div>
  );
}
