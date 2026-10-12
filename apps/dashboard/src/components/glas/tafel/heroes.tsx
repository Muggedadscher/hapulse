/**
 * [fork] The pages' heads, chosen by style: Glas renders its tafel (plan docs/glas/PLAN-TAFELN.md),
 * Klassisch the upstream hero unchanged. The pages import these under the upstream names, so their bodies stay as
 * upstream wrote them. The choice sits in its own component: switching the style at run time swaps the subtree
 * instead of changing a component's hooks.
 */

import React from 'react';
import { useIsGlas } from '../../../app/glas/useUiStyle';
import { DevicesHeroCard as DevicesHeroClassic } from '../../devices/DevicesHeroCard';
import { SystemHeroCard as SystemHeroClassic } from '../../system/SystemHeroCard';
import { SecurityHeroCard as SecurityHeroClassic } from '../../security/SecurityHeroCard';
import { EnergyHeroCard as EnergyHeroClassic } from '../../energy/EnergyCards';
import { AutomationHeroCard as AutomationHeroClassic } from '../../automation/AutomationHeroCard';
import { SceneHeroCard as SceneHeroClassic } from '../../scenes/SceneHeroCard';
import { DevicesTafel } from './DevicesTafel';
import { SystemTafel } from './SystemTafel';
import { SecurityTafel } from './SecurityTafel';
import { EnergyTafel } from './EnergyTafel';
import { AutomationsTafel } from './AutomationsTafel';
import { ScenesTafel } from './ScenesTafel';

export function DevicesHeroCard(props: React.ComponentProps<typeof DevicesHeroClassic>) {
  return useIsGlas() ? <DevicesTafel {...props} /> : <DevicesHeroClassic {...props} />;
}

export function SystemHeroCard(props: React.ComponentProps<typeof SystemHeroClassic>) {
  return useIsGlas() ? <SystemTafel {...props} /> : <SystemHeroClassic {...props} />;
}

export function SecurityHeroCard(props: React.ComponentProps<typeof SecurityHeroClassic>) {
  return useIsGlas() ? <SecurityTafel {...props} /> : <SecurityHeroClassic {...props} />;
}

export function EnergyHeroCard(props: React.ComponentProps<typeof EnergyHeroClassic>) {
  return useIsGlas() ? <EnergyTafel {...props} /> : <EnergyHeroClassic {...props} />;
}

export function AutomationHeroCard(props: React.ComponentProps<typeof AutomationHeroClassic>) {
  return useIsGlas() ? <AutomationsTafel {...props} /> : <AutomationHeroClassic {...props} />;
}

export function SceneHeroCard(props: React.ComponentProps<typeof SceneHeroClassic>) {
  return useIsGlas() ? <ScenesTafel {...props} /> : <SceneHeroClassic {...props} />;
}
