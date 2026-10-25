/**
 * Smoke test for @hapulse/core.
 * Run: node packages/core/scripts/smoke.mjs
 *
 * Verifies:
 *  - buildRooms produces ≥6 rooms with expected IDs
 *  - roomSummary produces sensible values for each room
 *  - DEMO_ENTITIES and DEMO_REGISTRIES are well-formed
 *  - domainOf, isToggleable, formatEntityState, domainIcon work correctly
 *  - createDemoTicker fires callbacks
 *  - applyDemoService mutates state correctly
 *  - THEMES has all 4 identities with matching light/dark token key sets
 *  - resolveThemeMode / accentOverride pure theme math
 *  - buildHAAuthorizeUrl / exchangeHAAuthCode / connectWithAuthData (mobile OAuth)
 *  - HAConnection.suspend is exported
 *  - resolveEntityAreaId() device-area fallback precedence
 *  - en/sv dictionary parity (keys, placeholders, .one/.other pairing)
 *  - System Monitor metrics resolve on a non-English HA (localized entity_ids)
 */

import {
  buildRooms,
  roomSummary,
  resolveEntityAreaId,
  buildDeviceAreaMap,
  DEMO_ENTITIES,
  DEMO_REGISTRIES,
  domainOf,
  isToggleable,
  formatEntityState,
  domainIcon,
  isFavoriteRelevant,
  createDemoTicker,
  applyDemoService,
  HAAuthError,
  HAConnectionError,
  startHASignIn,
  resumeHASession,
  roomIconName,
  roomKind,
  ROOM_KINDS,
  roomStatusIconName,
  CANONICAL_ROOM_ICONS,
  mdiIconExportName,
  THEMES,
  THEME_NAMES,
  THEME_LABELS,
  resolveThemeMode,
  accentOverride,
  buildHAAuthorizeUrl,
  exchangeHAAuthCode,
  connectWithAuthData,
  HAConnection,
  translate,
  resolveLanguage,
  LOCALES,
  lookupEntityState,
  humanizeState,
  pickAlarmPanel,
  sortAlarmPanels,
  parseHistoryStates,
  parseLogbookEntries,
  isNumericHistory,
  generateDemoHistory,
  demoLogbookFromHistory,
  findMusicAssistant,
  parseMALibraryPage,
  parseMASearchResults,
  parseMAQueue,
  parseMAQueuesArtwork,
  demoQueueSnapshot,
  demoLibraryPage,
  MA_MEDIA_TYPES,
  DEMO_MA_LIBRARY,
  RELEASES,
  CURRENT_VERSION,
  CHANGE_KINDS,
  releasesSince,
  compareVersions,
  indexSystemMonitor,
  pickSystemMetrics,
  parseScheduleAttributes,
  buildScheduleTimeslots,
  normalizeWindows,
  weekdaysToScheduler,
  parseWeekdays,
  minutesToHHMM,
  hhmmToMinutes,
  scheduleOnMinutes,
  windowsToDaySlots,
  daySlotsToWindows,
  normalizeDaySlots,
  tidyDaySlots,
  dailyRuntimeBars,
  poolDayStarts,
  POOL_MANUAL_PRESETS_MIN,
  clampManualMinutes,
  minutesToDurationString,
  formatManualDuration,
  formatNumber,
  detectWasteBins,
  parseWasteSensor,
  wasteTypeName,
  parseWasteDate,
  // [fork] garage doors
  isGarageDoor,
  garageStatus,
  garageIsOpen,
  garageSupports,
  garageCanStop,
  garageCanAct,
  garageTargets,
  garageNeedsDialog,
  garageSummary,
  garageMdiIcon,
  // [fork] Glas
  GLAS_COLORS,
  GLAS_STRENGTHS,
  GLAS_SPRINGS,
  GLAS_SURFACE_TINT,
  GLAS_SHADOWS,
  compositeOver,
  contrastRatio,
  glassOver,
  sheetOver,
  windowGround,
  resolveMix,
  glasAccent,
  focusPair,
  glasThemeTokens,
  classicTokenVar,
  glasColorVar,
  glasCssVars,
  glasContrastPairs,
  // [fork] Etappe 4: hints, locks, active scenes, Glas energy chart, card sizes
  collectHints,
  lockSummary,
  lockTone,
  activeSceneIds,
  sceneMembers,
  glasEnergyWindow,
  glasEnergyBars,
  energyAxis,
  energyAverage,
  hiddenTicks,
  barPercent,
  glasEnergyCompare,
  trimStatistics,
  energyChange,
  sizePresetOf,
  sizeOfPreset,
  tallKey,
  withTall,
  roomGlances,
  lightPercent,
  climateTone,
  // [fork] Etappe 5: the summary chips' counts
  chipCounts,
  // [fork] the fork's spelling of upstream texts
  withCase,
  // [fork] energy page after draft v5
  allocateEnergy,
  energyPageWindow,
  energyPageCompare,
  energyOriginBars,
  sharePercents,
  energyShares,
  energyPowerIds,
  powerWatts,
  energyPowerNow,
  energyNowSentence,
  batteryStatus,
  energyBatteryIds,
  combinedSoc,
  combinedSocSeries,
  demoBatterySoc,
  computeEnergyDashboard,
  energyStatisticIds,
  // [fork] heating plan
  HEATING_PLAN_LABEL,
  HEATING_PLAN_SAVE_AUTOMATION,
  findHeatingPlans,
  normalizeHeatingTime,
  parseHeatingWeek,
  validHeatingBlocks,
  heatingWeekMatches,
  heatingSaveDays,
  heatingDayGroups,
  heatingDayGroupKind,
  heatingWeekday,
  heatingPlanStatus,
  emptyHeatingWeek,
  DEMO_HEATING,
  demoHeatingWeek,
  heatingWindowSensors,
  heatingThermostatDeviates,
  HEATING_FOLLOW_GRACE_MS,
  tickDemoHeating,
  heatingTimeOf,
  heatingEdgeRange,
  moveHeatingEdge,
  heatingRingMinutes,
  addHeatingBlock,
  removeHeatingBlock,
  heatingBlockMinutes,
  heatingFieldMinutes,
  heatingFieldValue,
  heatingWeekWith,
  heatingChangedDays,
  HEATING_MAX_BLOCKS,
  // [fork] heating plan: set up with one button
  HEATING_BLUEPRINT_PATH,
  HEATING_SKIP_LABEL,
  heatingRoomSlug,
  heatingSetupAutomationId,
  heatingCanHeat,
  heatingCanCool,
  findHeatingSetupRooms,
  heatingRelatedIds,
  heatingCoveredThermostats,
  heatingSetupContacts,
  heatingSnapTemp,
  heatingSetupTemps,
  heatingSetupIds,
  heatingSuffixedEntityId,
  heatingAutomationConfig,
  heatingPriorStates,
  demoHeatingSetup,
  DEMO_SETUP_ATTRIBUTE,
} from '../dist/index.js';
import { readFileSync } from 'node:fs';
import EN_DICT from '../locales/en.json' with { type: 'json' };
import DE_DICT from '../locales/de.json' with { type: 'json' };
import ES_DICT from '../locales/es.json' with { type: 'json' };
import FR_DICT from '../locales/fr.json' with { type: 'json' };
import IT_DICT from '../locales/it.json' with { type: 'json' };
import PT_DICT from '../locales/pt.json' with { type: 'json' };
import SV_DICT from '../locales/sv.json' with { type: 'json' };

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function assertEqual(actual, expected, label) {
  assert(actual === expected, `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ---------------------------------------------------------------------------
// buildRooms
// ---------------------------------------------------------------------------

console.log('\n── buildRooms ──');

const rooms = buildRooms(DEMO_REGISTRIES, DEMO_ENTITIES);

assert(rooms.length >= 6, `at least 6 rooms (got ${rooms.length})`);

const roomIds = rooms.map(r => r.id);
for (const expected of ['living_room', 'kitchen', 'bedroom', 'office', 'bathroom', 'hallway']) {
  assert(roomIds.includes(expected), `room "${expected}" exists`);
}

// Rooms are alphabetically sorted
const names = rooms.map(r => r.name);
const sorted = [...names].sort((a, b) => a.localeCompare(b));
assert(JSON.stringify(names) === JSON.stringify(sorted), 'rooms are sorted alphabetically');

// Living room should have lights
const lr = rooms.find(r => r.id === 'living_room');
assert(lr !== undefined, 'living_room room found');
assert(Array.isArray(lr.domains['light']) && lr.domains['light'].length > 0, 'living_room has lights in domains');
assert(lr.entityIds.length > 0, 'living_room has entityIds');

// ---------------------------------------------------------------------------
// resolveEntityAreaId — device-area fallback precedence
// ---------------------------------------------------------------------------

console.log('\n── resolveEntityAreaId ──');

const deviceAreaMap = buildDeviceAreaMap([
  { id: 'dev_with_area', area_id: 'kitchen', name: 'Hue Kitchen Room' },
  { id: 'dev_no_area', area_id: null, name: 'Zone device' },
]);

// Entity's own area_id wins, even if its device has a different one
assertEqual(
  resolveEntityAreaId({ area_id: 'living_room', device_id: 'dev_with_area' }, deviceAreaMap),
  'living_room',
  "entity's own area_id takes priority over its device's",
);

// No entity area_id → falls back to the device's area_id (the common case:
// a scene entity with no area of its own, hanging off a Hue "Room" device)
assertEqual(
  resolveEntityAreaId({ area_id: null, device_id: 'dev_with_area' }, deviceAreaMap),
  'kitchen',
  'falls back to device area_id when entity has none',
);

// Neither the entity nor its device has an area — by design for a "Zone"
// device spanning multiple rooms. Must not silently default to some room.
assertEqual(
  resolveEntityAreaId({ area_id: null, device_id: 'dev_no_area' }, deviceAreaMap),
  null,
  'null when neither entity nor device has an area (e.g. a multi-room Zone device)',
);

// No device_id at all (e.g. a helper entity) and no area_id → null, not a crash
assertEqual(
  resolveEntityAreaId({ area_id: null, device_id: null }, deviceAreaMap),
  null,
  'null when entity has neither an area_id nor a device_id',
);

// Unknown device_id (not in the map) → null rather than throwing
assertEqual(
  resolveEntityAreaId({ area_id: null, device_id: 'dev_unknown' }, deviceAreaMap),
  null,
  'null when device_id is not found in the device map',
);

// ---------------------------------------------------------------------------
// roomSummary
// ---------------------------------------------------------------------------

console.log('\n── roomSummary ──');

for (const room of rooms) {
  const summary = roomSummary(room, DEMO_ENTITIES);
  assert(typeof summary.lightsOn === 'number', `${room.name}: lightsOn is number`);
  assert(typeof summary.lightsTotal === 'number', `${room.name}: lightsTotal is number`);
  assert(typeof summary.mediaPlaying === 'boolean', `${room.name}: mediaPlaying is boolean`);
  assert(typeof summary.anyMotion === 'boolean', `${room.name}: anyMotion is boolean`);
  assert(summary.lightsOn <= summary.lightsTotal, `${room.name}: lightsOn <= lightsTotal`);
}

// Living room: should have temperature, lights on, motion
const lrSummary = roomSummary(lr, DEMO_ENTITIES);
assert(typeof lrSummary.temperature === 'number', 'living room has temperature');
assert(lrSummary.lightsOn > 0, 'living room has lights on');
assert(lrSummary.anyMotion === true, 'living room motion detected');

// Living room TV is playing
assert(lrSummary.mediaPlaying === true, 'living room media playing');

// Kitchen: lights on (ceiling on), media not playing
const kitchen = rooms.find(r => r.id === 'kitchen');
const kitchenSummary = roomSummary(kitchen, DEMO_ENTITIES);
assert(kitchenSummary.lightsOn > 0, 'kitchen has lights on');

// ---------------------------------------------------------------------------
// domain helpers
// ---------------------------------------------------------------------------

console.log('\n── domain helpers ──');

assertEqual(domainOf('light.living_room_ceiling'), 'light', 'domainOf light');
assertEqual(domainOf('sensor.temperature'), 'sensor', 'domainOf sensor');
assertEqual(domainOf('media_player.tv'), 'media_player', 'domainOf media_player');
assertEqual(domainOf('noDotsHere'), 'noDotsHere', 'domainOf no dot');

assert(isToggleable('light'), 'light is toggleable');
assert(isToggleable('switch'), 'switch is toggleable');
assert(isToggleable('fan'), 'fan is toggleable');
assert(isToggleable('input_boolean'), 'input_boolean is toggleable');
assert(!isToggleable('sensor'), 'sensor is NOT toggleable');
assert(!isToggleable('climate'), 'climate is NOT toggleable');

const tvEntity = DEMO_ENTITIES['media_player.living_room_tv'];
assertEqual(formatEntityState(tvEntity), 'playing', 'formatEntityState playing');

const tempEntity = DEMO_ENTITIES['sensor.living_room_temperature'];
const formatted = formatEntityState(tempEntity);
assert(formatted.includes('°C'), `formatEntityState includes unit (got "${formatted}")`);

const unavailEntity = { ...tempEntity, state: 'unavailable' };
assertEqual(formatEntityState(unavailEntity), 'unavailable', 'formatEntityState unavailable');

const lightEntity = DEMO_ENTITIES['light.living_room_ceiling'];
assertEqual(domainIcon(lightEntity), 'lightbulb', 'domainIcon light → lightbulb');

const doorEntity = DEMO_ENTITIES['binary_sensor.front_door'];
assertEqual(domainIcon(doorEntity), 'door-open', 'domainIcon door binary_sensor → door-open');

const thermometerEntity = DEMO_ENTITIES['sensor.living_room_temperature'];
assertEqual(domainIcon(thermometerEntity), 'thermometer', 'domainIcon temperature sensor → thermometer');

// ---------------------------------------------------------------------------
// isFavoriteRelevant
// ---------------------------------------------------------------------------

console.log('\n── isFavoriteRelevant ──');

// Helper: build a minimal entity stub for testing
function makeEntity(entity_id, state, attributes = {}) {
  return { entity_id, state, attributes, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null } };
}

// Light ON → relevant
assert(isFavoriteRelevant(makeEntity('light.living_room', 'on')), 'light on → relevant');

// Light OFF → not relevant
assert(!isFavoriteRelevant(makeEntity('light.living_room', 'off')), 'light off → not relevant');

// Binary sensor ON (e.g. motion detected) → relevant
assert(isFavoriteRelevant(makeEntity('binary_sensor.front_door', 'on', { device_class: 'door' })), 'binary_sensor on → relevant');

// Binary sensor OFF (door closed) → not relevant
assert(!isFavoriteRelevant(makeEntity('binary_sensor.front_door', 'off', { device_class: 'door' })), 'binary_sensor off → not relevant');

// Sensor always relevant (value-type)
assert(isFavoriteRelevant(makeEntity('sensor.living_room_temperature', '21.5', { unit_of_measurement: '°C' })), 'sensor always relevant');

// Unavailable → not relevant (even for sensor domain)
assert(!isFavoriteRelevant(makeEntity('sensor.broken', 'unavailable')), 'unavailable → not relevant');

// Media player playing → relevant
assert(isFavoriteRelevant(makeEntity('media_player.living_room_tv', 'playing')), 'media_player playing → relevant');

// Media player idle → not relevant
assert(!isFavoriteRelevant(makeEntity('media_player.speaker', 'idle')), 'media_player idle → not relevant');

// ---------------------------------------------------------------------------
// roomIconName + roomStatusIconName
// ---------------------------------------------------------------------------

console.log('\n── roomIconName ──');

assertEqual(roomIconName({ name: 'Kitchen' }), 'utensils', 'keyword kitchen → utensils');
assertEqual(roomIconName({ name: 'Living Room' }), 'sofa', 'keyword living → sofa');
assertEqual(roomIconName({ name: 'Bedroom', icon: 'mdi:bed' }), 'bed', 'mdi:bed → bed');
assertEqual(roomIconName({ name: 'Living Room', icon: 'sofa' }), 'sofa', 'passthrough sofa → sofa');
assertEqual(roomIconName({ name: 'Foobar' }), 'house', 'unknown name → house');
assertEqual(roomIconName({ name: 'Master Suite', icon: 'mdi:bed-double' }), 'bed', 'mdi:bed-double → bed');

// ---------------------------------------------------------------------------
// roomKind — classification multilingue des noms de pièce
//
// Les noms de pièce viennent de Home Assistant dans la langue du foyer, sans
// rapport avec la langue d'affichage : la table est multilingue d'un bloc, pas
// par locale.
// ---------------------------------------------------------------------------
console.log('\n── roomKind ──');

// Chaque type doit avoir une icône, sinon roomIconName renvoie undefined.
const kindsWithoutIcon = ROOM_KINDS.filter(
  (k) => !CANONICAL_ROOM_ICONS.includes(roomIconName({ name: `__${k}__` }))
    && roomKind(`__${k}__`) === k,
);
assert(kindsWithoutIcon.length === 0,
  `chaque type de pièce a une icône canonique${kindsWithoutIcon.length > 0 ? ` — sans icône: ${kindsWithoutIcon.join(', ')}` : ''}`);

// Français. Accents, apostrophe typographique et traits d'union sont normalisés.
assertEqual(roomKind('Cuisine'), 'kitchen', 'cuisine → kitchen');
assertEqual(roomKind('Salle à manger'), 'kitchen', 'salle à manger → kitchen');
assertEqual(roomKind('Séjour'), 'living', 'séjour → living (accent normalisé)');
assertEqual(roomKind('Salle d\u2019eau'), 'bathroom',
  'salle d’eau → bathroom (apostrophe typographique)');
assertEqual(roomKind('Sous-sol'), 'storage', 'sous-sol → storage (trait d\'union)');
assertEqual(roomKind('SdB'), 'bathroom', 'sdb → bathroom (casse)');

// Le spécifique avant le générique : une chambre d'enfant n'est pas une chambre.
assertEqual(roomKind('Chambre'), 'bedroom', 'chambre → bedroom');
assertEqual(roomKind('Chambre d\'enfant'), 'kids', 'chambre d\'enfant → kids');
assertEqual(roomKind('Chambre bébé'), 'kids', 'chambre bébé → kids');

// Anglais : le refactor ne doit rien déplacer.
assertEqual(roomKind('Kitchen'), 'kitchen', 'kitchen → kitchen');
assertEqual(roomKind('Pantry'), 'storage', 'pantry → storage (et non kitchen)');
assertEqual(roomKind('Guest Bedroom'), 'bedroom', 'guest bedroom → bedroom');
assertEqual(roomKind('Atelier'), 'other', 'nom non reconnu → other');

// L'icône se déduit du type, donc le français résout aussi.
assertEqual(roomIconName({ name: 'Cuisine' }), 'utensils', 'Cuisine → utensils');
assertEqual(roomIconName({ name: 'Grenier' }), 'triangle', 'Grenier → triangle');
assertEqual(roomIconName({ name: 'Piscine' }), 'waves', 'Piscine → waves');

// Une icône explicite de HA reste prioritaire sur le nom.
assertEqual(roomIconName({ name: 'Cuisine', icon: 'mdi:bed' }), 'bed',
  'icône HA prioritaire sur le nom');
assertEqual(roomIconName({ name: 'Hallway', icon: 'door-open' }), 'door-open', 'passthrough door-open → door-open');

console.log('\n── mdiIconExportName ──');
assertEqual(mdiIconExportName('mdi:sofa-outline'), 'mdiSofaOutline', 'mdi:sofa-outline → mdiSofaOutline');
assertEqual(mdiIconExportName('mdi:sofa'), 'mdiSofa', 'mdi:sofa → mdiSofa');
assertEqual(mdiIconExportName('sofa-outline'), 'mdiSofaOutline', 'bare sofa-outline → mdiSofaOutline');
assertEqual(mdiIconExportName('mdi:silverware-fork-knife'), 'mdiSilverwareForkKnife', 'multi-segment kebab → camel');
assertEqual(mdiIconExportName('mdi:numeric-1-box'), 'mdiNumeric1Box', 'digits preserved in segments');
assertEqual(mdiIconExportName('MDI:Sofa'), 'mdiSofa', 'case-insensitive prefix/name');
assertEqual(mdiIconExportName(''), null, 'empty → null');
assertEqual(mdiIconExportName(null), null, 'null → null');
assertEqual(mdiIconExportName('hass:foo'), null, 'other icon pack → null');
assertEqual(mdiIconExportName('mdi:bad name'), null, 'invalid chars → null');

console.log('\n── roomStatusIconName ──');

// Build a minimal room with a door binary sensor in 'on' state
const hallwayRoom = rooms.find(r => r.id === 'hallway');
assert(hallwayRoom !== undefined, 'hallway room found for status tests');

// No sensor triggered → null
const noStatusEntities = { ...DEMO_ENTITIES };
assertEqual(roomStatusIconName(hallwayRoom, noStatusEntities), null, 'status: no trigger → null');

// Open door → 'door-open'
const openDoorEntities = {
  ...DEMO_ENTITIES,
  'binary_sensor.front_door': {
    ...DEMO_ENTITIES['binary_sensor.front_door'],
    state: 'on',
    attributes: { ...DEMO_ENTITIES['binary_sensor.front_door'].attributes, device_class: 'door' },
  },
};
assertEqual(roomStatusIconName(hallwayRoom, openDoorEntities), 'door-open', 'status: open door → door-open');

// Open window → 'grid-2x2'
const bedroomRoom = rooms.find(r => r.id === 'bedroom');
assert(bedroomRoom !== undefined, 'bedroom room found for window status test');
const openWindowEntities = {
  ...DEMO_ENTITIES,
  'binary_sensor.bedroom_window': {
    ...DEMO_ENTITIES['binary_sensor.bedroom_window'],
    state: 'on',
    attributes: { ...DEMO_ENTITIES['binary_sensor.bedroom_window'].attributes, device_class: 'window' },
  },
};
assertEqual(roomStatusIconName(bedroomRoom, openWindowEntities), 'grid-2x2', 'status: open window → grid-2x2');

// [fork] Open garage door (cover device_class garage) → 'car'; closed / unreachable → no status
const garageRoom = rooms.find(r => r.id === 'garage');
assert(garageRoom !== undefined, 'garage room found for garage status test');
assertEqual(roomStatusIconName(garageRoom, DEMO_ENTITIES), null, 'status: closed garage door → null');
const withGarage = (state) => ({ ...DEMO_ENTITIES, 'cover.garage_door': { ...DEMO_ENTITIES['cover.garage_door'], state } });
assertEqual(roomStatusIconName(garageRoom, withGarage('open')), 'car', 'status: open garage door → car');
assertEqual(roomStatusIconName(garageRoom, withGarage('closing')), 'car', 'status: closing garage door → car (not shut yet)');
assertEqual(roomStatusIconName(garageRoom, withGarage('unavailable')), null, 'status: unreachable garage door → null');

// CANONICAL_ROOM_ICONS includes expected values
assert(Array.isArray(CANONICAL_ROOM_ICONS), 'CANONICAL_ROOM_ICONS is array');
assert(CANONICAL_ROOM_ICONS.includes('house'), 'CANONICAL_ROOM_ICONS includes house');
assert(CANONICAL_ROOM_ICONS.includes('sofa'), 'CANONICAL_ROOM_ICONS includes sofa');
assert(CANONICAL_ROOM_ICONS.includes('grid-2x2'), 'CANONICAL_ROOM_ICONS includes grid-2x2');

// ---------------------------------------------------------------------------
// createDemoTicker
// ---------------------------------------------------------------------------

console.log('\n── createDemoTicker ──');

let tickerFired = false;
const stop = createDemoTicker((entities) => {
  tickerFired = true;
  assert(typeof entities === 'object' && entities !== null, 'ticker provides entity map');
  assert(Object.keys(entities).length > 0, 'ticker entity map is not empty');
  stop();
  finish();
});

// ---------------------------------------------------------------------------
// applyDemoService
// ---------------------------------------------------------------------------

console.log('\n── applyDemoService ──');

// Toggle a light on
const afterTurnOff = applyDemoService(DEMO_ENTITIES, 'light', 'turn_off', {}, { entity_id: 'light.living_room_ceiling' });
assertEqual(afterTurnOff['light.living_room_ceiling'].state, 'off', 'turn_off light → off');

const afterTurnOn = applyDemoService(afterTurnOff, 'light', 'turn_on', { brightness: 128 }, { entity_id: 'light.living_room_ceiling' });
assertEqual(afterTurnOn['light.living_room_ceiling'].state, 'on', 'turn_on light → on');
assertEqual(afterTurnOn['light.living_room_ceiling'].attributes['brightness'], 128, 'brightness set');

// Lock/unlock
const afterUnlock = applyDemoService(DEMO_ENTITIES, 'lock', 'unlock', {}, { entity_id: 'lock.front_door' });
assertEqual(afterUnlock['lock.front_door'].state, 'unlocked', 'unlock → unlocked');

// Climate temp
const afterTemp = applyDemoService(DEMO_ENTITIES, 'climate', 'set_temperature', { temperature: 23 }, { entity_id: 'climate.living_room' });
assertEqual(afterTemp['climate.living_room'].attributes['temperature'], 23, 'climate temperature set');

// Media pause
const afterPause = applyDemoService(DEMO_ENTITIES, 'media_player', 'media_pause', {}, { entity_id: 'media_player.living_room_tv' });
assertEqual(afterPause['media_player.living_room_tv'].state, 'paused', 'media_pause → paused');

// Cover open
const afterOpen = applyDemoService(DEMO_ENTITIES, 'cover', 'open_cover', {}, { entity_id: 'cover.bedroom_blinds' });
assertEqual(afterOpen['cover.bedroom_blinds'].state, 'open', 'open_cover → open');

// Alarm arm away
const afterArm = applyDemoService(DEMO_ENTITIES, 'alarm_control_panel', 'alarm_arm_away', {}, { entity_id: 'alarm_control_panel.home' });
assertEqual(afterArm['alarm_control_panel.home'].state, 'armed_away', 'alarm arm away');

// ---------------------------------------------------------------------------
// OAuth helpers — error-mapping (no real HA needed)
// ---------------------------------------------------------------------------

console.log('\n── OAuth error mapping ──');

// HAAuthError has expected properties
const authErr = new HAAuthError('test');
assert(authErr instanceof Error, 'HAAuthError is instanceof Error');
assert(authErr instanceof HAAuthError, 'HAAuthError is instanceof HAAuthError');
assertEqual(authErr.code, 'ERR_INVALID_AUTH', 'HAAuthError.code');
assertEqual(authErr.name, 'HAAuthError', 'HAAuthError.name');

// HAConnectionError has expected properties
const connErr = new HAConnectionError('test conn');
assert(connErr instanceof Error, 'HAConnectionError is instanceof Error');
assertEqual(connErr.code, 'ERR_CANNOT_CONNECT', 'HAConnectionError.code');
assertEqual(connErr.name, 'HAConnectionError', 'HAConnectionError.name');

// startHASignIn rejects with HAConnectionError when hassUrl cannot redirect
// (ERR_HASS_HOST_REQUIRED is thrown by getAuth when hassUrl is empty/missing — here we pass a
//  non-empty but clearly unreachable URL so getAuth throws ERR_CANNOT_CONNECT or similar)
try {
  await startHASignIn({
    hassUrl: 'http://localhost:9',
    clientId: 'http://localhost:9/',
    redirectUrl: 'http://localhost:9/onboarding',
    saveTokens: () => {},
    loadTokens: async () => undefined,
  });
  assert(false, 'startHASignIn should reject for unreachable host');
} catch (err) {
  assert(
    err instanceof HAConnectionError || err instanceof HAAuthError,
    'startHASignIn rejects with typed error for unreachable host'
  );
}

// resumeHASession returns null when loadTokens returns undefined and there's no callback
try {
  const result = await resumeHASession({
    clientId: 'http://localhost:9/',
    redirectUrl: 'http://localhost:9/onboarding',
    saveTokens: () => {},
    loadTokens: async () => undefined,
  });
  assert(result === null, 'resumeHASession returns null when no tokens and no callback');
} catch (err) {
  // getAuth may throw ERR_HASS_HOST_REQUIRED which we map to null — also acceptable
  assert(
    err instanceof HAConnectionError || err instanceof HAAuthError,
    'resumeHASession throws typed error (no tokens path)'
  );
}

// resumeHASession rejects with HAAuthError for expired/invalid tokens
try {
  const expiredToken = {
    hassUrl: 'http://localhost:9',
    clientId: 'http://localhost:9/',
    expires: Date.now() - 1000,
    refresh_token: 'invalid',
    access_token: 'invalid',
    expires_in: 1800,
  };
  await resumeHASession({
    clientId: 'http://localhost:9/',
    redirectUrl: 'http://localhost:9/onboarding',
    saveTokens: () => {},
    loadTokens: async () => expiredToken,
  });
  assert(false, 'resumeHASession should reject for invalid tokens');
} catch (err) {
  assert(
    err instanceof HAAuthError || err instanceof HAConnectionError,
    'resumeHASession rejects with typed error for invalid tokens'
  );
}

// startHASignIn and resumeHASession are exported and callable
assert(typeof startHASignIn === 'function', 'startHASignIn exported as function');
assert(typeof resumeHASession === 'function', 'resumeHASession exported as function');

// ---------------------------------------------------------------------------
// THEMES
// ---------------------------------------------------------------------------

console.log('\n── THEMES ──');

const expectedThemeNames = ['aurora', 'sunset', 'ocean', 'forest'];
assertEqual(THEME_NAMES.length, 4, 'THEME_NAMES has exactly 4 identities');
assert(
  expectedThemeNames.every((n) => THEME_NAMES.includes(n)),
  'THEME_NAMES has exactly the 4 expected identities'
);
assert(
  Object.keys(THEMES).length === 4 && expectedThemeNames.every((n) => n in THEMES),
  'THEMES has exactly the 4 expected identities'
);

for (const name of THEME_NAMES) {
  assert(THEMES[name] && THEMES[name].light && THEMES[name].dark, `THEMES.${name} has light + dark variants`);
  assert(typeof THEME_LABELS[name] === 'string' && THEME_LABELS[name].length > 0, `THEME_LABELS.${name} is a non-empty string`);
}

// Spot-check known token values (aurora is the default identity)
assertEqual(THEMES.aurora.light.accent, '#f2941c', 'THEMES.aurora.light.accent');
assertEqual(THEMES.aurora.dark.accent, '#f5a623', 'THEMES.aurora.dark.accent');
assertEqual(THEMES.aurora.light.bg, '#f3f4f6', 'THEMES.aurora.light.bg');
assertEqual(THEMES.forest.dark.accent, '#5cc486', 'THEMES.forest.dark.accent');
assertEqual(THEMES.ocean.light.accent, '#2f7fd6', 'THEMES.ocean.light.accent');

// Every token set (across all identities and both modes) has identical key sets
const referenceKeys = Object.keys(THEMES.aurora.light).sort().join(',');
let allKeysMatch = true;
for (const name of THEME_NAMES) {
  for (const mode of ['light', 'dark']) {
    const keys = Object.keys(THEMES[name][mode]).sort().join(',');
    if (keys !== referenceKeys) allKeysMatch = false;
  }
}
assert(allKeysMatch, 'every THEMES token set has an identical key set');

// ---------------------------------------------------------------------------
// resolveThemeMode
// ---------------------------------------------------------------------------

console.log('\n── resolveThemeMode ──');

assertEqual(resolveThemeMode('auto', true), 'dark', "resolveThemeMode('auto', true) === 'dark'");
assertEqual(resolveThemeMode('auto', false), 'light', "resolveThemeMode('auto', false) === 'light'");
assertEqual(resolveThemeMode('dark', false), 'dark', "resolveThemeMode('dark', false) === 'dark'");
assertEqual(resolveThemeMode('light', true), 'light', "resolveThemeMode('light', true) === 'light'");

// ---------------------------------------------------------------------------
// accentOverride
// ---------------------------------------------------------------------------

console.log('\n── accentOverride ──');

const overrideLight = accentOverride(200, 'light');
const overrideDark = accentOverride(200, 'dark');

assert(typeof overrideLight.accent === 'string', 'accentOverride(light).accent is a string');
assert(typeof overrideLight.accentSoft === 'string', 'accentOverride(light).accentSoft is a string');
assert(typeof overrideLight.onAccent === 'string', 'accentOverride(light).onAccent is a string');
assert(
  overrideLight.accent !== overrideDark.accent ||
    overrideLight.accentSoft !== overrideDark.accentSoft ||
    overrideLight.onAccent !== overrideDark.onAccent,
  'accentOverride differs between light and dark mode'
);
assertEqual(overrideLight.accent, 'hsl(200, 78%, 50%)', 'accentOverride(200, light).accent');
assertEqual(overrideDark.accent, 'hsl(200, 78%, 60%)', 'accentOverride(200, dark).accent');
assertEqual(overrideLight.onAccent, '#ffffff', 'accentOverride(200, light).onAccent');
assertEqual(overrideDark.onAccent, '#140e04', 'accentOverride(200, dark).onAccent');

// ---------------------------------------------------------------------------
// buildHAAuthorizeUrl
// ---------------------------------------------------------------------------

console.log('\n── buildHAAuthorizeUrl ──');

const authorizeUrl = buildHAAuthorizeUrl({
  hassUrl: 'http://homeassistant.local:8123',
  clientId: 'hapulse-mobile',
  redirectUri: 'hapulse://auth-callback',
  state: 'xyz123',
});
assertEqual(
  authorizeUrl,
  'http://homeassistant.local:8123/auth/authorize?client_id=hapulse-mobile&redirect_uri=hapulse%3A%2F%2Fauth-callback&state=xyz123',
  'buildHAAuthorizeUrl encodes redirect_uri and appends state'
);

// Trailing-slash normalization of hassUrl
const authorizeUrlNoState = buildHAAuthorizeUrl({
  hassUrl: 'http://homeassistant.local:8123/',
  clientId: 'hapulse-mobile',
  redirectUri: 'hapulse://auth-callback',
});
assertEqual(
  authorizeUrlNoState,
  'http://homeassistant.local:8123/auth/authorize?client_id=hapulse-mobile&redirect_uri=hapulse%3A%2F%2Fauth-callback',
  'buildHAAuthorizeUrl strips trailing slash from hassUrl and omits state when absent'
);

// ---------------------------------------------------------------------------
// exchangeHAAuthCode
// ---------------------------------------------------------------------------

console.log('\n── exchangeHAAuthCode ──');

try {
  await exchangeHAAuthCode({
    hassUrl: 'http://localhost:9',
    clientId: 'hapulse-mobile',
    code: 'fake-code',
  });
  assert(false, 'exchangeHAAuthCode should reject for unreachable host');
} catch (err) {
  assert(err instanceof HAConnectionError, 'exchangeHAAuthCode rejects with HAConnectionError for unreachable host');
}

// ---------------------------------------------------------------------------
// connectWithAuthData + HAConnection.suspend (existence checks; no network)
// ---------------------------------------------------------------------------

console.log('\n── connectWithAuthData / suspend ──');

assert(typeof connectWithAuthData === 'function', 'connectWithAuthData exported as function');
assert(typeof HAConnection.prototype.suspend === 'function', 'HAConnection.prototype.suspend exported as function');

// ---------------------------------------------------------------------------
// HA-backed settings sync (frontend/user_data methods) — existence only, no network
// ---------------------------------------------------------------------------

console.log('\n── frontend/user_data methods ──');

assert(typeof HAConnection.prototype.getUserData === 'function', 'HAConnection.prototype.getUserData exported as function');
assert(typeof HAConnection.prototype.setUserData === 'function', 'HAConnection.prototype.setUserData exported as function');
assert(typeof HAConnection.prototype.subscribeUserData === 'function', 'HAConnection.prototype.subscribeUserData exported as function');
assert(typeof HAConnection.prototype.subscribeConfig === 'function', 'HAConnection.prototype.subscribeConfig exported as function'); // [fork]

// ---------------------------------------------------------------------------
// i18n — translate()
// ---------------------------------------------------------------------------
console.log('\n── i18n: translate ──');

const EN = {
  'nav.devices': 'Devices',
  'devices.count.one': '{count} device',
  'devices.count.other': '{count} devices',
  'greeting': 'Hello {name}',
};
const FR = {
  'nav.devices': 'Appareils',
  'devices.count.one': '{count} appareil',
  'devices.count.other': '{count} appareils',
};

assertEqual(translate(EN, EN, 'en', 'nav.devices'), 'Devices', 'clé simple');
assertEqual(translate(FR, EN, 'fr', 'nav.devices'), 'Appareils', 'clé traduite');

// Repli : dictionnaire cible incomplet → anglais
assertEqual(translate(FR, EN, 'fr', 'greeting', { name: 'Bap' }), 'Hello Bap',
  'repli sur en quand la clé manque dans la locale');

// Repli ultime : la clé elle-même, jamais un écran vide
assertEqual(translate(EN, EN, 'en', 'inconnue.totale'), 'inconnue.totale',
  'repli sur la clé quand elle est introuvable partout');

// Interpolation : variable absente laissée visible, pour repérer le bug
assertEqual(translate(EN, EN, 'en', 'greeting'), 'Hello {name}',
  'variable non fournie laissée telle quelle');

// Pluriels anglais
assertEqual(translate(EN, EN, 'en', 'devices.count', { count: 1 }), '1 device', 'en, count=1 → singulier');
assertEqual(translate(EN, EN, 'en', 'devices.count', { count: 2 }), '2 devices', 'en, count=2 → pluriel');
assertEqual(translate(EN, EN, 'en', 'devices.count', { count: 0 }), '0 devices', 'en, count=0 → pluriel');

// Pluriels français : le cas qui attrape les vraies régressions.
// En français 0 et 1 prennent le SINGULIER, contrairement à l'anglais.
assertEqual(translate(FR, EN, 'fr', 'devices.count', { count: 0 }), '0 appareil', 'fr, count=0 → singulier');
assertEqual(translate(FR, EN, 'fr', 'devices.count', { count: 1 }), '1 appareil', 'fr, count=1 → singulier');
assertEqual(translate(FR, EN, 'fr', 'devices.count', { count: 2 }), '2 appareils', 'fr, count=2 → pluriel');

// Non-integer and negative count values
assertEqual(translate(EN, EN, 'en', 'devices.count', { count: -1 }), '-1 device', 'en, count=-1 → singular (negative)');
assertEqual(translate(EN, EN, 'en', 'devices.count', { count: 1.5 }), '1.5 devices', 'en, count=1.5 → plural (fractional)');
assertEqual(translate(FR, EN, 'fr', 'devices.count', { count: -1 }), '-1 appareil', 'fr, count=-1 → singular (negative)');

// Completely empty target dictionary
const EMPTY_FR = {};
assertEqual(translate(EMPTY_FR, EN, 'fr', 'nav.devices'), 'Devices', 'empty dict → fallback English');
assertEqual(translate(EMPTY_FR, EN, 'fr', 'totally.unknown'), 'totally.unknown', 'empty dict, unknown key → key itself');

// ---------------------------------------------------------------------------
// i18n — resolveLanguage()
// ---------------------------------------------------------------------------
console.log('\n── i18n: resolveLanguage ──');

const AVAIL = ['en', 'fr'];

// Une préférence explicite gagne sur tout le reste
assertEqual(resolveLanguage('fr', 'en', ['en-US'], AVAIL), 'fr', 'préférence explicite prioritaire');

// auto : la langue de HA d'abord
assertEqual(resolveLanguage('auto', 'fr', ['en-US'], AVAIL), 'fr', 'auto → langue HA');

// auto : navigator en second, quand HA ne dit rien
assertEqual(resolveLanguage('auto', null, ['fr-FR', 'en'], AVAIL), 'fr', 'auto → navigator');

// Les balises régionales sont réduites à la langue de base
assertEqual(resolveLanguage('auto', 'fr-CA', [], AVAIL), 'fr', 'fr-CA → fr');

// Une langue HA non supportée ne doit pas gagner : on continue la chaîne
assertEqual(resolveLanguage('auto', 'de', ['fr-FR'], AVAIL), 'fr',
  'langue HA non supportée → on passe à navigator');

// Dernier recours
assertEqual(resolveLanguage('auto', 'de', ['ja-JP'], AVAIL), 'en', 'aucune correspondance → en');
assertEqual(resolveLanguage('auto', null, [], AVAIL), 'en', 'aucune information → en');

// Une préférence explicite devenue indisponible ne doit pas bloquer l'UI
assertEqual(resolveLanguage('fr', null, [], ['en']), 'en', 'préférence indisponible → en');

// ---------------------------------------------------------------------------
// i18n — dictionary parity, across every shipped locale
//
// Generic over LOCALE_DICTS rather than one hand-written block per language:
// each added locale otherwise means another near-identical block, and two of
// them landing at once is a merge conflict (which is exactly what fr and sv
// did). Adding a language is now one entry in LOCALE_DICTS.
// ---------------------------------------------------------------------------
console.log('\n── i18n: dictionary parity ──');

/** Every translated locale, keyed by its code. `en` is the source of truth. */
const LOCALE_DICTS = { de: DE_DICT, es: ES_DICT, fr: FR_DICT, it: IT_DICT, pt: PT_DICT, sv: SV_DICT };

const enKeys = Object.keys(EN_DICT).sort();
const placeholders = (s) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(',');

assertEqual(
  Object.keys(LOCALE_DICTS).sort().join(','),
  LOCALES.filter((l) => l !== 'en').sort().join(','),
  'every locale in LOCALES has a dictionary under test',
);

for (const [code, dict] of Object.entries(LOCALE_DICTS)) {
  const keys = Object.keys(dict).sort();

  const missing = enKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !enKeys.includes(k));
  assert(missing.length === 0, `${code}.json omits nothing (missing: ${missing.join(', ') || 'none'})`);
  assert(extra.length === 0, `${code}.json adds nothing (extra: ${extra.join(', ') || 'none'})`);

  // Placeholders must survive translation. One aggregated assertion per locale,
  // not one per key: 900 ticks per language would drown every other block's
  // failures, and this runner's stdout is its only report.
  const drifted = enKeys
    .map((k) => ({ k, en: placeholders(EN_DICT[k]), tr: placeholders(dict[k] ?? '') }))
    .filter(({ en, tr }) => en !== tr)
    .map(({ k, en, tr }) => `${k} (expected ${JSON.stringify(en)}, got ${JSON.stringify(tr)})`);
  assert(drifted.length === 0,
    `${code}.json preserves placeholders across ${enKeys.length} keys${drifted.length > 0 ? ` — drift: ${drifted.join('; ')}` : ''}`);

  // translate() always tries `${key}.other` as the plural fallback, so a lone
  // .one silently resolves to the raw key for every non-singular count.
  // Not checked in reverse per-locale: a bare ".other" is sometimes a category
  // literally named "Other", not a plural pair missing its .one.
  const oneWithoutOther = keys
    .filter((k) => k.endsWith('.one'))
    .filter((k) => dict[`${k.slice(0, -'.one'.length)}.other`] === undefined);
  assert(oneWithoutOther.length === 0,
    `${code}.json: every .one has its .other (missing: ${oneWithoutOther.join(', ') || 'none'})`);
}

// ---------------------------------------------------------------------------
// i18n — plural coverage (en.json)
//
// Found three times by hand while reviewing translations
// (security.hero.peopleHome.one, three orphaned .other keys,
// devices.hero.deviceCount): the one recurring defect, until now without a net.
// Checked bidirectionally here because en.json is the source every translation
// is generated from — an orphan here propagates to all seven languages.
// ---------------------------------------------------------------------------
console.log('\n── i18n: plural coverage ──');

const enKeySet = new Set(enKeys);

const unpairedPlurals = enKeys
  .filter((k) => k.endsWith('.one') || k.endsWith('.other'))
  .map((k) => {
    const base = k.endsWith('.one') ? k.slice(0, -'.one'.length) : k.slice(0, -'.other'.length);
    const sibling = k.endsWith('.one') ? `${base}.other` : `${base}.one`;
    return enKeySet.has(sibling) ? null : `${k} (missing ${sibling})`;
  })
  .filter((msg) => msg !== null);

assert(unpairedPlurals.length === 0,
  `every .one/.other key has its counterpart${unpairedPlurals.length > 0 ? ` — orphans: ${unpairedPlurals.join(', ')}` : ''}`);

// Any value containing {count} must belong to a .one/.other pair.
const countOutsidePlural = enKeys
  .filter((k) => !k.endsWith('.one') && !k.endsWith('.other'))
  .filter((k) => /\{count\}/.test(EN_DICT[k]))
  .map((k) => `${k} (${JSON.stringify(EN_DICT[k])})`);

assert(countOutsidePlural.length === 0,
  `{count} appears only in .one/.other keys${countOutsidePlural.length > 0 ? ` — outside a pair: ${countOutsidePlural.join(', ')}` : ''}`);

// ---------------------------------------------------------------------------
// Entity states — Home Assistant's own translations
//
// Key shape verified against homeassistant/helpers/translation.py and the
// integrations' strings.json: `component.{domain}.entity_component.{device
// class}.state.{state}`, with `_` as the device-class-less bucket.
// ---------------------------------------------------------------------------
console.log('\n── entity states ──');

const HA_STATES = {
  'component.weather.entity_component._.state.partlycloudy': 'Partiellement nuageux',
  'component.climate.entity_component._.state.fan_only': 'Ventilation seule',
  'component.climate.entity_component._.state_attributes.hvac_action.state.heating': 'Chauffage',
  'component.binary_sensor.entity_component._.state.on': 'Actif',
  'component.binary_sensor.entity_component.motion.state.on': 'Détecté',
};

assertEqual(lookupEntityState(HA_STATES, 'weather', 'partlycloudy'), 'Partiellement nuageux',
  'plain state resolved');

assertEqual(lookupEntityState(HA_STATES, 'climate', 'heating', { attribute: 'hvac_action' }),
  'Chauffage', 'attribute value resolved');

// Device class wins over the `_` bucket — the whole point of binary_sensor
// ("Détecté" rather than "Actif").
assertEqual(lookupEntityState(HA_STATES, 'binary_sensor', 'on', { deviceClass: 'motion' }),
  'Détecté', 'device class takes precedence');

// A device class HA draws no distinction for must fall back to `_`, not fail.
assertEqual(lookupEntityState(HA_STATES, 'binary_sensor', 'on', { deviceClass: 'plug' }),
  'Actif', 'unknown device class → `_` bucket');

assertEqual(lookupEntityState(HA_STATES, 'vacuum', 'cleaning'), undefined,
  'absent domain → undefined (caller picks the fallback)');
assertEqual(lookupEntityState({}, 'weather', 'sunny'), undefined,
  'empty dictionary → undefined');
assertEqual(lookupEntityState(HA_STATES, 'weather', ''), undefined, 'empty state → undefined');

// Fallback when HA is silent: demo mode, dropped connection, untranslated state.
assertEqual(humanizeState('fan_only'), 'Fan only', 'underscores flattened and capitalised');
assertEqual(humanizeState('clear-night'), 'Clear night', 'hyphens flattened');
assertEqual(humanizeState('armed_custom_bypass'), 'Armed custom bypass', 'several separators');
assertEqual(humanizeState('on'), 'On', 'short state');

// formatEntityState: the label is optional, and applies only to non-numeric
// states — a sensor with a unit stays a number.
const CLIMATE_ENTITY = {
  entity_id: 'climate.living_room',
  state: 'fan_only',
  attributes: {},
  last_changed: '',
  last_updated: '',
  context: { id: '' },
};
const label = (domain, state, opts) =>
  lookupEntityState(HA_STATES, domain, state, opts) ?? humanizeState(state);

assertEqual(formatEntityState(CLIMATE_ENTITY), 'fan_only',
  'without a label: raw state (non-UI callers)');
assertEqual(formatEntityState(CLIMATE_ENTITY, 'fr', label), 'Ventilation seule',
  'with a label: translated state');

const TEMP_SENSOR = {
  ...CLIMATE_ENTITY,
  entity_id: 'sensor.outside',
  state: '21.34',
  attributes: { unit_of_measurement: '°C' },
};
// The narrow no-break space between number and unit comes from upstream (U+202F).
assertEqual(formatEntityState(TEMP_SENSOR, 'fr', label), '21,3 °C', // [fork] French decimal comma
  'numeric value untouched despite the label');

const UNAVAILABLE = { ...CLIMATE_ENTITY, state: 'unavailable' };
assertEqual(formatEntityState(UNAVAILABLE, 'fr', label), 'Unavailable',
  'unavailable goes through the label');
assertEqual(formatEntityState({ ...CLIMATE_ENTITY, state: 'unknown' }, 'fr', label), 'Unavailable',
  'unknown stays folded onto unavailable');

// The HAPulse dictionary must not grow back into a state vocabulary: these two
// pseudo-states are the only ones HA does not ship under entity_component.
const ownStateKeys = enKeys.filter((k) => k.startsWith('entityState.'));
assertEqual(ownStateKeys.sort().join(','), 'entityState.unavailable,entityState.unknown',
  'HAPulse names only the pseudo-states HA lacks');

// ---------------------------------------------------------------------------
// Finish (after ticker or timeout)
// ---------------------------------------------------------------------------

const timeout = setTimeout(() => {
  if (!tickerFired) {
    console.error('  ✗ FAIL: createDemoTicker never fired within 8s');
    failed++;
  }
  finish();
}, 8000);

function finish() {
  clearTimeout(timeout);
  console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Changelog
//
// The release list is the version source for the whole app (Settings → About
// reads CURRENT_VERSION, the What's New modal diffs against it, and
// CHANGELOG.md is generated from it), so the invariants that keep it honest
// are worth asserting: newest first, well-formed, and in step with the
// package.json versions a release also has to bump.
// ---------------------------------------------------------------------------
console.log('\n── changelog ──');

assert(RELEASES.length > 0, 'at least one release is documented');
assertEqual(CURRENT_VERSION, RELEASES[0].version, 'CURRENT_VERSION is the newest release');

const SEMVER = /^\d+\.\d+\.\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const malformed = RELEASES.flatMap((r) => {
  const problems = [];
  if (!SEMVER.test(r.version)) problems.push(`${r.version}: version is not major.minor.patch`);
  if (!ISO_DATE.test(r.date)) problems.push(`${r.version}: date is not YYYY-MM-DD`);
  if (!r.title || typeof r.title !== 'string') problems.push(`${r.version}: missing title`);
  if (!Array.isArray(r.sections) || r.sections.length === 0) problems.push(`${r.version}: no sections`);
  for (const section of r.sections ?? []) {
    if (!CHANGE_KINDS.includes(section.kind)) problems.push(`${r.version}: unknown kind "${section.kind}"`);
    if (!Array.isArray(section.items) || section.items.length === 0) {
      problems.push(`${r.version}/${section.kind}: no items`);
    }
    for (const item of section.items ?? []) {
      // A trailing period reads as a sentence fragment next to its siblings;
      // the list renders as bullets, not prose.
      if (item.endsWith('.')) problems.push(`${r.version}/${section.kind}: "${item}" ends with a period`);
    }
  }
  return problems;
});
assert(malformed.length === 0, `every release is well-formed${malformed.length > 0 ? ` — ${malformed.join('; ')}` : ''}`);

// Newest first, and no duplicate versions — releasesSince() relies on both.
const misordered = RELEASES.slice(1)
  .map((r, i) => (compareVersions(RELEASES[i].version, r.version) > 0
    ? null
    : `${RELEASES[i].version} is not newer than ${r.version}`))
  .filter((m) => m !== null);
assert(misordered.length === 0,
  `releases are ordered newest first${misordered.length > 0 ? ` — ${misordered.join('; ')}` : ''}`);

assertEqual(compareVersions('1.2.0', '1.10.0') < 0, true, 'version compare is numeric, not lexical');
assertEqual(compareVersions('1.1.0', '1.1.0'), 0, 'equal versions compare equal');

// A fresh install must not be shown a changelog; an upgrade must be.
assertEqual(releasesSince(null).length, 0, 'a fresh install sees no releases');
assertEqual(releasesSince(CURRENT_VERSION).length, 0, 'an up-to-date install sees no releases');
assert(releasesSince('0.0.1').length === RELEASES.length, 'an ancient install sees every release');
assertEqual(
  releasesSince(RELEASES[RELEASES.length - 1].version).length,
  RELEASES.length - 1,
  'an install on the oldest release sees everything after it',
);

// The version shown in Settings → About must match what is published.
const PKG_PATHS = ['package.json', 'packages/core/package.json', 'apps/dashboard/package.json'];
const repoRoot = new URL('../../../', import.meta.url);
const drifted = PKG_PATHS
  .map((rel) => {
    const version = JSON.parse(readFileSync(new URL(rel, repoRoot), 'utf8')).version;
    return version === CURRENT_VERSION ? null : `${rel} is ${version}, expected ${CURRENT_VERSION}`;
  })
  .filter((m) => m !== null);
assert(drifted.length === 0,
  `package.json versions match CURRENT_VERSION${drifted.length > 0 ? ` — ${drifted.join('; ')}` : ''}`);


// ---------------------------------------------------------------------------
// System Monitor — metrics must resolve whatever HA's language is
// ---------------------------------------------------------------------------

console.log('\n── indexSystemMonitor / pickSystemMetrics ──');

const smState = (entity_id, state) => ({
  entity_id, state, attributes: {}, last_changed: '', last_updated: '',
  context: { id: '', parent_id: null, user_id: null },
});

// A French HA: entity_ids are translated, translation_key/unique_id are not.
const frRegistries = {
  areas: [], devices: [],
  entities: [
    { entity_id: 'sensor.system_monitor_utilisation_du_processeur', platform: 'systemmonitor', translation_key: 'processor_use' },
    { entity_id: 'sensor.system_monitor_utilisation_de_la_memoire', platform: 'systemmonitor', translation_key: 'memory_use_percent' },
    { entity_id: 'sensor.system_monitor_utilisation_du_disque_ssl', platform: 'systemmonitor', unique_id: 'disk_use_percent_ssl', translation_key: 'disk_use_percent' },
    { entity_id: 'sensor.system_monitor_utilisation_du_disque', platform: 'systemmonitor', unique_id: 'disk_use_percent', translation_key: 'disk_use_percent' },
    // last_boot is named through device_class: uptime — no translation_key, so
    // the unique_id is the only stable handle HA gives us here.
    { entity_id: 'sensor.system_monitor_dernier_demarrage', platform: 'systemmonitor', translation_key: null, unique_id: 'last_boot' },
    { entity_id: 'sensor.system_monitor_io_pressure_some_total', platform: 'systemmonitor', translation_key: 'io_pressure_some_total' },
    { entity_id: 'sensor.temperature_salon', platform: 'zwave_js' },
  ],
};
const frIndex = indexSystemMonitor(frRegistries);
const frEntities = [
  smState('sensor.system_monitor_utilisation_du_processeur', '22'),
  smState('sensor.system_monitor_utilisation_de_la_memoire', '80.1'),
  smState('sensor.system_monitor_utilisation_du_disque_ssl', '17.2'),
  smState('sensor.system_monitor_utilisation_du_disque', '17.2'),
  smState('sensor.temperature_salon', '21'),
];

assertEqual(frIndex.ids.size, 6, 'only systemmonitor entities are indexed');
assertEqual(frIndex.ids.has('sensor.temperature_salon'), false, 'non-systemmonitor entities are not indexed');
assertEqual(frIndex.familyOf('sensor.system_monitor_dernier_demarrage'), 'system', 'uptime is grouped as system');
assertEqual(frIndex.familyOf('sensor.system_monitor_utilisation_du_processeur'), 'processor', 'CPU is grouped as processor');
assertEqual(frIndex.keyOf('sensor.system_monitor_dernier_demarrage'), 'last_boot', 'a sensor without translation_key falls back to unique_id');
assertEqual(frIndex.familyOf('sensor.system_monitor_io_pressure_some_total'), 'disk', 'I/O pressure is grouped with disk');

const frMetrics = pickSystemMetrics(frEntities, frIndex);
assertEqual(frMetrics.cpu?.entity_id, 'sensor.system_monitor_utilisation_du_processeur', 'CPU found on a French HA');
assertEqual(frMetrics.memory?.entity_id, 'sensor.system_monitor_utilisation_de_la_memoire', 'RAM found on a French HA');
assertEqual(frMetrics.disk?.entity_id, 'sensor.system_monitor_utilisation_du_disque', 'disk picks the root mount, not /ssl');

// An English HA whose registry carries no keys must still work (old HA, demo data).
const enIndex = indexSystemMonitor({
  areas: [], devices: [],
  entities: [
    { entity_id: 'sensor.system_monitor_processor_use', platform: 'systemmonitor' },
    { entity_id: 'sensor.system_monitor_memory_use_percent', platform: 'systemmonitor' },
    { entity_id: 'sensor.system_monitor_disk_use_percent', platform: 'systemmonitor' },
  ],
});
const enMetrics = pickSystemMetrics([
  smState('sensor.system_monitor_processor_use', '10'),
  smState('sensor.system_monitor_memory_use_percent', '40'),
  smState('sensor.system_monitor_disk_use_percent', '50'),
], enIndex);
assertEqual(enMetrics.cpu?.entity_id, 'sensor.system_monitor_processor_use', 'CPU still found without registry keys');
assertEqual(enMetrics.memory?.entity_id, 'sensor.system_monitor_memory_use_percent', 'RAM still found without registry keys');
assertEqual(enMetrics.disk?.entity_id, 'sensor.system_monitor_disk_use_percent', 'disk still found without registry keys');

// ---------------------------------------------------------------------------
// [fork] Pool pump — schedule model round-trip
//
// The Pool page edits "on" windows; what we write back must stay compatible
// with the nielsfaber scheduler-component timeslot format (contiguous slots
// partitioning the day, each with a turn_on/turn_off action). These assertions
// pin the conversion in both directions.
// ---------------------------------------------------------------------------

console.log('\n── pool schedule ──');

// Time helpers
assertEqual(minutesToHHMM(0), '00:00', 'minutesToHHMM(0)');
assertEqual(minutesToHHMM(1440), '00:00', 'minutesToHHMM(1440) folds to 00:00');
assertEqual(minutesToHHMM(12 * 60 + 30), '12:30', 'minutesToHHMM(750)');
assertEqual(hhmmToMinutes('12:00:00'), 720, 'hhmmToMinutes with seconds');
assertEqual(hhmmToMinutes('nope'), null, 'hhmmToMinutes rejects garbage');
assertEqual(hhmmToMinutes('24:30'), null, 'hhmmToMinutes rejects hour 24 (out of clock range)');
assertEqual(hhmmToMinutes('23:59'), 1439, 'hhmmToMinutes accepts the last valid minute');

// normalizeWindows merges adjacent + overlapping and drops empties
const norm = normalizeWindows([
  { start: 600, stop: 720 },   // 10:00–12:00
  { start: 720, stop: 780 },   // 12:00–13:00 (adjacent → merge)
  { start: 60, stop: 120 },    // 01:00–02:00 (out of order)
  { start: 300, stop: 300 },   // empty → drop
  { start: 700, stop: 760 },   // overlaps the first block → merge
]);
assertEqual(JSON.stringify(norm), JSON.stringify([{ start: 60, stop: 120 }, { start: 600, stop: 780 }]),
  'normalizeWindows sorts, merges adjacency/overlap, drops empties');

// weekdays compaction
assertEqual(JSON.stringify(weekdaysToScheduler(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])), JSON.stringify(['daily']),
  'all seven weekdays → ["daily"]');
assertEqual(JSON.stringify(weekdaysToScheduler(['sat', 'mon'])), JSON.stringify(['mon', 'sat']),
  'partial weekdays are Monday-first');
assertEqual(JSON.stringify(parseWeekdays(['daily'])), JSON.stringify(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  'parseWeekdays expands "daily"');
assertEqual(JSON.stringify(parseWeekdays(['weekend'])), JSON.stringify(['sat', 'sun']),
  'parseWeekdays expands "weekend"');

// Parse the user's real schedule attributes → one 12:00–14:00 on-window
const realAttrs = {
  weekdays: ['daily'],
  timeslots: [
    '00:00:00 - 10:00:00', '10:00:00 - 11:00:00', '11:00:00 - 12:00:00',
    '12:00:00 - 14:00:00', '14:00:00 - 15:00:00', '15:00:00 - 16:00:00',
    '16:00:00 - 00:00:00',
  ],
  actions: [
    { service: 'input_boolean.turn_off' }, { service: 'input_boolean.turn_off' },
    { service: 'input_boolean.turn_off' }, { service: 'input_boolean.turn_on' },
    { service: 'input_boolean.turn_off' }, { service: 'input_boolean.turn_off' },
    { service: 'input_boolean.turn_off' },
  ],
  repeat_type: 'repeat',
};
const model = parseScheduleAttributes(realAttrs);
assertEqual(JSON.stringify(model.windows), JSON.stringify([{ start: 720, stop: 840 }]),
  'parseScheduleAttributes extracts the single on-window (12:00–14:00)');
assertEqual(model.repeatType, 'repeat', 'parseScheduleAttributes keeps repeat_type');
assertEqual(model.weekdays.length, 7, 'parseScheduleAttributes expands daily to 7 weekdays');

// Build timeslots back from that window → contiguous off/on/off covering the day
const slots = buildScheduleTimeslots(model.windows, { entityId: 'input_boolean.poolpumpe_zeitplan' });
assertEqual(slots.length, 3, 'buildScheduleTimeslots produces off/on/off around one window');
assertEqual(JSON.stringify(slots.map((s) => [s.start, s.stop])),
  JSON.stringify([['00:00', '12:00'], ['12:00', '14:00'], ['14:00', '00:00']]),
  'timeslots partition the day and end at 00:00');
assertEqual(slots[1].actions[0].service, 'input_boolean.turn_on', 'the on-window slot turns on');
assertEqual(slots[1].actions[0].entity_id, 'input_boolean.poolpumpe_zeitplan', 'action carries the entity_id');
assertEqual(slots[0].actions[0].service, 'input_boolean.turn_off', 'the leading slot turns off');

// Edge cases: no windows → single all-day off slot; full day → single on slot
assertEqual(JSON.stringify(buildScheduleTimeslots([], { entityId: 'x' }).map((s) => [s.start, s.stop, s.actions[0].service])),
  JSON.stringify([['00:00', '00:00', 'input_boolean.turn_off']]),
  'empty schedule → one all-day off slot');
assertEqual(JSON.stringify(buildScheduleTimeslots([{ start: 0, stop: 1440 }], { entityId: 'x' }).map((s) => [s.start, s.stop, s.actions[0].service])),
  JSON.stringify([['00:00', '00:00', 'input_boolean.turn_on']]),
  'full-day window → one all-day on slot');

assertEqual(scheduleOnMinutes(model.windows), 120, 'scheduleOnMinutes counts the on-window (2h = 120min)');

// Day-slot model (graphical editor) — round-trips with the on-window model.
const daySlots = windowsToDaySlots(model.windows);
assertEqual(JSON.stringify(daySlots),
  JSON.stringify([{ start: 0, action: 'off' }, { start: 720, action: 'on' }, { start: 840, action: 'off' }]),
  'windowsToDaySlots partitions the day off/on/off');
assertEqual(JSON.stringify(daySlotsToWindows(daySlots)), JSON.stringify([{ start: 720, stop: 840 }]),
  'daySlotsToWindows round-trips back to the on-window');

// Empty schedule → single all-day off slot, and back to no windows.
assertEqual(JSON.stringify(windowsToDaySlots([])), JSON.stringify([{ start: 0, action: 'off' }]),
  'windowsToDaySlots of empty → one off slot');
assertEqual(JSON.stringify(daySlotsToWindows([{ start: 0, action: 'off' }])), JSON.stringify([]),
  'all-off slots → no windows');

// normalizeDaySlots: anchors 00:00, merges neighbours, dedups starts.
assertEqual(JSON.stringify(normalizeDaySlots([{ start: 600, action: 'on' }, { start: 800, action: 'on' }])),
  JSON.stringify([{ start: 0, action: 'off' }, { start: 600, action: 'on' }]),
  'normalizeDaySlots anchors midnight and merges same-action neighbours');
assertEqual(JSON.stringify(daySlotsToWindows([{ start: 0, action: 'on' }, { start: 480, action: 'off' }, { start: 1020, action: 'on' }])),
  JSON.stringify([{ start: 0, stop: 480 }, { start: 1020, stop: 1440 }]),
  'two on-segments (morning + evening) → two windows');

// tidyDaySlots keeps same-action neighbours (the editor relies on this so a
// segment toggled off stays visible instead of merging away).
assertEqual(JSON.stringify(tidyDaySlots([{ start: 0, action: 'off' }, { start: 720, action: 'off' }, { start: 840, action: 'off' }])),
  JSON.stringify([{ start: 0, action: 'off' }, { start: 720, action: 'off' }, { start: 840, action: 'off' }]),
  'tidyDaySlots preserves distinct same-action segments (no merge)');
assertEqual(JSON.stringify(normalizeDaySlots([{ start: 0, action: 'off' }, { start: 720, action: 'off' }, { start: 840, action: 'off' }])),
  JSON.stringify([{ start: 0, action: 'off' }]),
  'normalizeDaySlots still merges them (for saving)');

// dailyRuntimeBars — per-day max of a resetting "runtime today" sensor.
const DAY = 86_400_000;
const d0 = 1_000_000_000_000; // arbitrary midnight
const bars = dailyRuntimeBars(
  [
    { t: d0 + 3_600_000, v: 1.0 },       // day 0
    { t: d0 + 7_200_000, v: 2.5 },       // day 0 (peak)
    { t: d0 + 5_000_000, v: 1.2 },       // day 0
    { t: d0 + DAY + 3_600_000, v: 0.4 }, // day 1
    { t: d0 + 2 * DAY + 60_000, v: 3.1 },// day 2 (last bucket → +inf)
  ],
  [d0, d0 + DAY, d0 + 2 * DAY],
);
assertEqual(bars.length, 3, 'dailyRuntimeBars returns one bar per day boundary');
assertEqual(bars[0].value, 2.5, 'day 0 bar is the peak runtime (2.5)');
assertEqual(bars[0].hasData, true, 'day 0 has data');
assertEqual(bars[1].value, 0.4, 'day 1 bar is its peak (0.4)');
assertEqual(bars[2].value, 3.1, 'last bucket runs to +inf and catches day 2');

// Manual run duration — presets, clamping, and the minutes→duration format.
assertEqual(JSON.stringify(POOL_MANUAL_PRESETS_MIN), JSON.stringify([30, 60, 120, 360, 1440]),
  'manual presets are 30min / 1h / 2h / 6h / 24h');
assertEqual(clampManualMinutes(0), 5, 'clampManualMinutes floors to 5');
assertEqual(clampManualMinutes(99999), 1440, 'clampManualMinutes caps at 1440 (24h)');
assertEqual(clampManualMinutes(31.6), 32, 'clampManualMinutes rounds');
assertEqual(clampManualMinutes(NaN), 5, 'clampManualMinutes handles NaN');
assertEqual(minutesToDurationString(30), '00:30:00', 'minutesToDurationString(30) → 00:30:00');
assertEqual(minutesToDurationString(1440), '24:00:00', 'minutesToDurationString(24h) → 24:00:00');
assertEqual(minutesToDurationString(90), '01:30:00', 'minutesToDurationString(90) → 01:30:00');
assertEqual(formatManualDuration(30), '30 min', 'formatManualDuration under an hour');
assertEqual(formatManualDuration(120), '2 h', 'formatManualDuration whole hours');
assertEqual(formatManualDuration(90), '1.5 h', 'formatManualDuration half hours');
assertEqual(formatManualDuration(1440), '24 h', 'formatManualDuration 24h');
assertEqual(formatManualDuration(90, 'de'), '1,5 h', 'formatManualDuration German decimal comma');

// [fork] Locale-aware numbers (numberFormat.ts) — decimal comma, grouping, sign, default 'en'.
console.log('\n── number format ──');
assertEqual(formatNumber(5.47), '5.5', 'formatNumber default is English, 1 decimal');
assertEqual(formatNumber(5.47, 'de'), '5,5', 'formatNumber de decimal comma');
assertEqual(formatNumber(5, 'de'), '5', 'formatNumber no trailing zeros by default');
assertEqual(formatNumber(21, 'de', { minDecimals: 1, maxDecimals: 1 }), '21,0', 'formatNumber minDecimals');
assertEqual(formatNumber(1250, 'de', { maxDecimals: 0 }), '1.250', 'formatNumber de grouping');
assertEqual(formatNumber(1250, 'en', { maxDecimals: 0 }), '1,250', 'formatNumber en grouping');
assertEqual(formatNumber(1250.5, 'es', { maxDecimals: 1 }), '1250,5', 'formatNumber es: no grouping below 10 000 (CLDR)');
assertEqual(formatNumber(-3.5, 'de'), '-3,5', 'formatNumber keeps the minus sign');
assertEqual(formatNumber(-0.04, 'de'), '0', 'formatNumber: no "-0"');
assertEqual(formatNumber(1.5, 'xx-invalid'), '1.5', 'formatNumber: an invalid locale falls back to English');
{
  const s = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null } });
  assertEqual(formatEntityState(s('sensor.t', '21.34', { unit_of_measurement: '°C' }), 'de'), '21,3 °C', 'formatEntityState de decimal comma');
  assertEqual(formatEntityState(s('sensor.t', '21.34', { unit_of_measurement: '°C' })), '21.3 °C', 'formatEntityState without locale stays English');
  assertEqual(formatEntityState(s('sensor.e', '1240.07', { unit_of_measurement: 'kWh' }), 'de'), '1.240,1 kWh', 'formatEntityState de grouping');
  assertEqual(formatEntityState(s('sensor.x', '-3.5'), 'de'), '-3,5', 'formatEntityState unit-less numeric keeps the minus (was dropped by humanizeState)');
  assertEqual(formatEntityState(s('counter.c', '7'), 'de'), '7', 'formatEntityState counter');
  assertEqual(formatEntityState(s('input_select.m', '1'), 'de', () => 'label'), 'label', 'formatEntityState: non-value domains still go through the label');
}
assertEqual(translate(EN, EN, 'de', 'devices.count', { count: 1.5 }), '1,5 devices', 'translate: fractional number var gets the locale separator');
assertEqual(translate({ k: 'HTTP {s} {y}' }, {}, 'de', 'k', { s: 404, y: 2026 }), 'HTTP 404 2026', 'translate: whole numbers are never grouped');
// poolDayStarts — calendar days across the DST change (run in Europe/Berlin via the TZ below).
{
  const prevTz = process.env.TZ;
  process.env.TZ = 'Europe/Berlin';
  const starts = poolDayStarts(new Date(2026, 9, 27, 15, 0).getTime(), 4); // 24.–27.10.2026, 25.10. has 25 h
  assertEqual(starts.map((t) => new Date(t).getHours()).join(','), '0,0,0,0', 'poolDayStarts: every bucket starts at local midnight across DST');
  assertEqual(starts.map((t) => new Date(t).getDate()).join(','), '24,25,26,27', 'poolDayStarts: consecutive calendar days, today last');
  assertEqual((starts[2] - starts[1]) / 3_600_000, 25, 'poolDayStarts: the fall-back day is 25 h long');
  if (prevTz === undefined) delete process.env.TZ; else process.env.TZ = prevTz;
}
const empty = dailyRuntimeBars([], [d0, d0 + DAY]);
assertEqual(empty[0].hasData, false, 'a day with no samples has hasData=false');
assertEqual(empty[0].value, 0, 'a day with no samples has value 0');

// ---------------------------------------------------------------------------
// Alarm panel selection (issue #16)
//
// With several panels (Alarmo master + per-area), every summary surface must
// agree, and the armed one must win over a stray disarmed one.
// ---------------------------------------------------------------------------
console.log('\n── pickAlarmPanel ──');

const mkPanel = (id, state) => ({
  entity_id: `alarm_control_panel.${id}`, state, attributes: {},
  last_changed: '', last_updated: '', context: { id: '' },
});

const PANELS = [
  mkPanel('area_garage', 'disarmed'),
  mkPanel('alarmo', 'armed_night'),
  { entity_id: 'light.hall', state: 'on', attributes: {}, last_changed: '', last_updated: '', context: { id: '' } },
];
assertEqual(pickAlarmPanel(PANELS)?.entity_id, 'alarm_control_panel.alarmo',
  'the armed panel wins over a disarmed one, whatever the list order');
assertEqual(pickAlarmPanel([mkPanel('b', 'disarmed'), mkPanel('a', 'disarmed')])?.entity_id,
  'alarm_control_panel.a', 'equal severity ties break on entity_id — deterministic');
assertEqual(pickAlarmPanel([mkPanel('a', 'armed_home'), mkPanel('b', 'triggered')])?.entity_id,
  'alarm_control_panel.b', 'triggered outranks armed');
assertEqual(pickAlarmPanel([mkPanel('a', 'unavailable'), mkPanel('b', 'disarmed')])?.entity_id,
  'alarm_control_panel.b', 'a real state outranks unavailable');
assertEqual(pickAlarmPanel([]), undefined, 'no panels → undefined');
assertEqual(sortAlarmPanels(PANELS).length, 2, 'sortAlarmPanels keeps only alarm panels');

// ---------------------------------------------------------------------------
// Entity history (issue #14)
// ---------------------------------------------------------------------------
console.log('\n── history parsing + demo generators ──');

// The WS command returns compressed rows; REST-shaped rows must parse too.
const parsed = parseHistoryStates([
  { s: 'on', lu: 1000 },
  { state: 'off', last_updated: '1970-01-01T00:33:20.000Z' }, // 2000s
  { s: 'on', lu: 1500 },
  { bogus: true },
]);
assertEqual(parsed.map((p) => p.state).join(','), 'on,on,off',
  'compressed and REST rows both parse, sorted by time, junk dropped');
assertEqual(parsed[0].start, 1000_000, 'lu seconds become ms');

assertEqual(
  parseLogbookEntries([{ when: 2, state: 'off' }, { when: 5, state: 'on' }, { when: 3 }])
    .map((e) => e.state).join(','),
  'on,off', 'logbook: newest first, stateless rows dropped');

assertEqual(isNumericHistory([{ state: '21.5', start: 0 }, { state: 'unavailable', start: 1 }]), true,
  'numeric series stays numeric despite unavailability gaps');
assertEqual(isNumericHistory([{ state: 'on', start: 0 }]), false, 'discrete series is not numeric');

const DEMO_BINARY = {
  entity_id: 'binary_sensor.office_motion', state: 'on', attributes: {},
  last_changed: '', last_updated: '', context: { id: '' },
};
const T0 = 1_000_000_000_000;
const series = generateDemoHistory(DEMO_BINARY, T0, T0 + 24 * 3_600_000);
assert(series.length > 1, 'demo binary history has multiple segments');
assertEqual(series[series.length - 1].state, 'on', 'demo history ends on the current state');
assertEqual(new Set(series.map((p) => p.state)).size, 2, 'demo binary history alternates two states');
const series2 = generateDemoHistory(DEMO_BINARY, T0, T0 + 24 * 3_600_000);
assertEqual(JSON.stringify(series), JSON.stringify(series2),
  'demo history is deterministic per entity (same on reopen)');

const DEMO_TEMP = { ...DEMO_BINARY, entity_id: 'sensor.office_temp', state: '21.4' };
const tempSeries = generateDemoHistory(DEMO_TEMP, T0, T0 + 24 * 3_600_000);
assertEqual(isNumericHistory(tempSeries), true, 'demo numeric history is numeric');
assertEqual(tempSeries[tempSeries.length - 1].state, '21.4', 'numeric demo history lands on the current value');

const activity = demoLogbookFromHistory(series);
assert(activity.length >= 2, 'demo logbook derives transitions');
assert(activity[0].when >= activity[activity.length - 1].when, 'demo logbook is newest first');

// ---------------------------------------------------------------------------
// Music Assistant (issue #2)
// ---------------------------------------------------------------------------
console.log('\n── music assistant ──');

// Registry shapes verified against a real HA: partial dicts carry platform
// and config_entry_id.
const MA_REGISTRIES = {
  areas: [], devices: [],
  entities: [
    { entity_id: 'media_player.kitchen_nest_2', platform: 'music_assistant', config_entry_id: 'ENTRY1' },
    { entity_id: 'media_player.living_room_nest_2', platform: 'music_assistant', config_entry_id: 'ENTRY1' },
    { entity_id: 'sensor.ma_diag', platform: 'music_assistant', config_entry_id: 'ENTRY1' },
    { entity_id: 'media_player.kitchen', platform: 'universal' },
  ],
};
const maInfo = findMusicAssistant(MA_REGISTRIES);
assertEqual(maInfo?.configEntryId, 'ENTRY1', 'MA config entry resolved from the registry');
assertEqual(maInfo?.playerIds.join(','),
  'media_player.kitchen_nest_2,media_player.living_room_nest_2',
  'only MA media players are listed (sorted, no universal wrappers, no diag sensors)');
assertEqual(findMusicAssistant({ areas: [], devices: [], entities: [] }), null,
  'no MA entities → null (Music page keeps its regular layout)');
assertEqual(findMusicAssistant(null), null, 'null registries → null');

// get_library response parsing — shape captured from a live call.
const LIVE_LIBRARY_RESPONSE = {
  items: [
    { media_type: 'playlist', uri: 'library://playlist/34', name: 'Morning', version: '', image: 'https://cdn/img.jpg', favorite: true, explicit: null },
    { media_type: 'playlist', uri: 'library://playlist/90', name: '', version: '', image: '', favorite: false },
    { bogus: true },
  ],
  limit: 25, offset: 0, order_by: 'name', media_type: 'playlist',
};
const page = parseMALibraryPage(LIVE_LIBRARY_RESPONSE, 'playlist');
assertEqual(page.items.length, 2, 'items parsed, junk rows dropped');
assertEqual(page.items[0].favorite, true, 'favorite flag kept');
assertEqual(page.items[1].image, null, 'empty image string becomes null (placeholder path)');
assertEqual(page.limit, 25, 'pagination fields kept');
assertEqual(parseMALibraryPage(null, 'album').items.length, 0, 'null response → empty page');

// Demo library: every tab has content, and pagination/filtering behave.
for (const type of MA_MEDIA_TYPES) {
  assert(DEMO_MA_LIBRARY[type].length > 0, `demo library has ${type}s`);
}
assertEqual(demoLibraryPage('playlist', { favorite: true }).items.every((i) => i.favorite), true,
  'demo favourite filter filters');
assertEqual(demoLibraryPage('playlist', { search: 'coffee' }).items.length, 1,
  'demo search matches case-insensitively');
assertEqual(demoLibraryPage('album', { offset: 10, limit: 5 }).items.length,
  Math.max(0, Math.min(5, DEMO_MA_LIBRARY.album.length - 10)),
  'demo pagination slices');

// music_assistant.search response — shape captured from a live call (Spotify
// provider enabled). Buckets are PLURAL; artist credits become the subtitle.
const LIVE_SEARCH_RESPONSE = {
  artists: [],
  albums: [
    {
      media_type: 'album', uri: 'spotify--oDU8PC5W://album/4m2880j', name: 'Random Access Memories',
      version: '', image: 'https://i.scdn.co/image/x.jpg', favorite: false, explicit: null,
      artists: [{ media_type: 'artist', uri: 'spotify--x://artist/1', name: 'Daft Punk' }],
    },
    { media_type: 'album', uri: 'spotify--x://album/2', name: 'Discovery', version: 'Radio Edit', image: '', favorite: false, artists: [] },
  ],
  tracks: [], playlists: [], radio: [],
};
const found = parseMASearchResults(LIVE_SEARCH_RESPONSE, 'album');
assertEqual(found.length, 2, 'search results parsed from the plural bucket');
assertEqual(found[0].subtitle, 'Daft Punk', 'artist credits become the subtitle');
assertEqual(found[0].uri.startsWith('spotify--'), true, 'provider URIs pass through for play_media');
assertEqual(found[1].subtitle, undefined, 'no artists → no subtitle (version shows instead)');
assertEqual(parseMASearchResults(LIVE_SEARCH_RESPONSE, 'track').length, 0, 'empty bucket → empty');
assertEqual(parseMASearchResults(null, 'album').length, 0, 'null response → empty');

// music_assistant.get_queue — response keyed by entity_id (shape captured live).
const LIVE_QUEUE_RESPONSE = {
  'media_player.kitchen_nest_2': {
    queue_id: 'c8a75856', active: true, name: 'Kitchen Nest', items: 23,
    shuffle_enabled: true, repeat_mode: 'all', current_index: 4, elapsed_time: 12,
    current_item: { name: 'Coastline', media_item: { name: 'Coastline', image: 'https://cdn/a.jpg', artists: [{ name: 'Echo Atlas' }] } },
    next_item: { media_item: { name: 'Amber' } },
  },
};
const queue = parseMAQueue(LIVE_QUEUE_RESPONSE, 'media_player.kitchen_nest_2');
assertEqual(queue?.items, 23, 'queue count parsed');
assertEqual(queue?.shuffle, true, 'shuffle parsed');
assertEqual(queue?.repeat, 'all', 'repeat parsed');
assertEqual(queue?.position, 5, 'current_index becomes a 1-based position');
assertEqual(queue?.current?.name, 'Coastline', 'current item name');
assertEqual(queue?.current?.artist, 'Echo Atlas', 'artist credits joined');
assertEqual(queue?.next?.name, 'Amber', 'next item name from nested media_item');
assertEqual(parseMAQueue(LIVE_QUEUE_RESPONSE, 'media_player.other'), null, 'unknown player → null');
assertEqual(parseMAQueue(null, 'x'), null, 'null response → null');

const demoQ = demoQueueSnapshot({ media_title: 'Midnight Rain', media_artist: 'Taylor Swift' });
assertEqual(demoQ.current?.name, 'Midnight Rain', 'demo queue mirrors the playing item');
assert(demoQ.next != null && demoQ.items > 0, 'demo queue fabricates a next item and count');
assertEqual(demoQueueSnapshot({}).current, null, 'idle demo player → empty queue');

// Demo speaker grouping — join lists the leader first on every member; unjoin
// dissolves groups of one.
const GROUP_BASE = {
  'media_player.a': { entity_id: 'media_player.a', state: 'idle', attributes: { group_members: [] }, last_changed: '', last_updated: '', context: { id: '' } },
  'media_player.b': { entity_id: 'media_player.b', state: 'idle', attributes: { group_members: [] }, last_changed: '', last_updated: '', context: { id: '' } },
};
const joined = applyDemoService(GROUP_BASE, 'media_player', 'join',
  { group_members: ['media_player.b'] }, { entity_id: 'media_player.a' });
assertEqual(joined['media_player.a'].attributes.group_members.join(','), 'media_player.a,media_player.b',
  'join: leader lists the group, itself first');
assertEqual(joined['media_player.b'].attributes.group_members.join(','), 'media_player.a,media_player.b',
  'join: member mirrors the group');
const unjoined = applyDemoService(joined, 'media_player', 'unjoin', {}, { entity_id: 'media_player.b' });
assertEqual(unjoined['media_player.b'].attributes.group_members.length, 0, 'unjoin clears the member');
assertEqual(unjoined['media_player.a'].attributes.group_members.length, 0, 'a group of one dissolves');

// player_queues/all → artwork entries (Now Playing / Zones fallback).
const QUEUES_ALL = [
  {
    queue_id: 'q1', display_name: 'Office Nest', items: 12,
    current_item: {
      name: 'Hotline Bling',
      image: { type: 'thumb', path: 'https://i.scdn.co/image/abc', provider: 'spotify', remotely_accessible: true },
      media_item: { name: 'Hotline Bling', artists: [{ name: 'Drake' }] },
    },
  },
  {
    queue_id: 'q2', current_item: {
      name: 'Local Track',
      image: { type: 'thumb', path: 'track.jpg', provider: 'file', remotely_accessible: false },
    },
  },
  { queue_id: 'q3', current_item: null },
  { bogus: true },
];
const art = parseMAQueuesArtwork(QUEUES_ALL);
assertEqual(art.length, 2, 'queues without a current item are skipped');
assertEqual(art[0].image, 'https://i.scdn.co/image/abc', 'remotely-accessible artwork kept');
assertEqual(art[0].title, 'Hotline Bling', 'title kept for wrapper-player matching');
assertEqual(art[1].image, null, 'proxied-only artwork stays null');
assertEqual(parseMAQueuesArtwork(null).length, 0, 'null response → empty');

// ---------------------------------------------------------------------------
// [fork] Waste collection — sensor detection, de-duplication, sorting.
//
// The Home "Waste collection" card auto-detects `waste_collection_schedule`
// sensors: several sensors often describe the same bin (a base one, a
// `_komplett` one folding in rescheduled "(verlegt)" dates, a `_verlegt` one),
// so we group by collection type and keep the richest, then sort soonest-first
// and drop bins with nothing scheduled. These assertions pin that behaviour on
// the user's real Kreis-Emmendingen entity shapes.
// ---------------------------------------------------------------------------
console.log('\n── waste collection ──');

// Small helpers reused across the cases.
assertEqual(wasteTypeName('Graue Tonne (verlegt)'), 'Graue Tonne', 'wasteTypeName strips "(verlegt)"');
assertEqual(wasteTypeName('Gelber Sack'), 'Gelber Sack', 'wasteTypeName leaves a plain name');
assertEqual(parseWasteDate('2026-09-18T00:00:00'), '2026-09-18', 'parseWasteDate takes the date part of a datetime');
assertEqual(parseWasteDate('2026-13-40'), null, 'parseWasteDate rejects an impossible date');
assertEqual(parseWasteDate('nope'), null, 'parseWasteDate rejects garbage');

const wasteSensor = (entity_id, daysTo, types, upcoming, icon = 'mdi:trash-can') =>
  makeEntity(entity_id, `${types[0]} in ${daysTo} days`, { daysTo, types, upcoming, icon });

// The three sensors that describe one grey-bin type: base, komplett (2 types),
// verlegt. Only the komplett one should survive de-duplication.
const grayBase = wasteSensor('sensor.grauetonne', 7, ['Graue Tonne'],
  [{ date: '2026-09-11', type: 'Graue Tonne' }, { date: '2026-09-25', type: 'Graue Tonne' }]);
const grayKomplett = wasteSensor('sensor.grauetonne_komplett', 7, ['Graue Tonne (verlegt)', 'Graue Tonne'],
  [{ date: '2026-09-11', type: 'Graue Tonne' }, { date: '2026-09-25', type: 'Graue Tonne' }]);
const grayVerlegt = makeEntity('sensor.grauetonne_verlegt', 'unknown',
  { types: ['Graue Tonne (verlegt)'], upcoming: [], daysTo: undefined, icon: 'mdi:trash-can' });
const yellow = wasteSensor('sensor.gelbersack_komplett', 14, ['Gelber Sack', 'Gelber Sack (verlegt)'],
  [{ date: '2026-09-18', type: 'Gelber Sack' }], 'mdi:recycle-variant');
const hazard = wasteSensor('sensor.schadstoffsammlung', 35, ['Schadstoffsammlung'],
  [{ date: '2026-10-09', type: 'Schadstoffsammlung' }]);
// A seasonal sensor with nothing scheduled — must be dropped.
const xmas = makeEntity('sensor.christbaumabfuhr', 'unknown',
  { types: ['Christbaumabfuhr'], upcoming: [], icon: 'mdi:trash-can' });
// A plain non-waste sensor — must be ignored.
const temperature = makeEntity('sensor.living_temperature', '21.5', { unit_of_measurement: '°C' });

const wasteEntities = Object.fromEntries(
  [grayBase, grayKomplett, grayVerlegt, yellow, hazard, xmas, temperature].map((e) => [e.entity_id, e])
);

const bins = detectWasteBins(wasteEntities);
assertEqual(bins.length, 3, 'detectWasteBins keeps grey + yellow + hazard, drops the empty seasonal one');
assertEqual(bins.map((b) => b.entityId).join(','),
  'sensor.grauetonne_komplett,sensor.gelbersack_komplett,sensor.schadstoffsammlung',
  'de-dup keeps the richest grey sensor and sorts soonest-first (7d, 14d, 35d)');
assertEqual(bins[0].name, 'Graue Tonne', 'display name comes from the plain type, not the "(verlegt)" one');
assertEqual(bins[0].daysTo, 7, 'daysTo is read from the sensor attribute');
assertEqual(bins[0].nextDate, '2026-09-11', 'nextDate is the soonest upcoming date');
assertEqual(bins[1].icon, 'mdi:recycle-variant', 'each bin keeps its own icon');

// hidden entities are skipped entirely.
const hiddenBins = detectWasteBins(wasteEntities, { hidden: ['sensor.grauetonne_komplett', 'sensor.grauetonne'] });
assertEqual(hiddenBins.some((b) => b.name === 'Graue Tonne'), false, 'hidden sensors are excluded from detection');

// With a clock, past dates are filtered and daysTo falls back to computation.
const noDaysTo = makeEntity('sensor.papiertonne', 'Papiertonne', {
  types: ['Papiertonne'],
  upcoming: [{ date: '2020-01-01', type: 'Papiertonne' }, { date: '2026-09-08', type: 'Papiertonne' }],
  icon: 'mdi:trash-can',
});
const nowMs = new Date(2026, 8, 4).getTime(); // 2026-09-04 local
const paperBins = detectWasteBins({ [noDaysTo.entity_id]: noDaysTo }, { nowMs });
assertEqual(paperBins.length, 1, 'a sensor with only a future date is still a bin');
assertEqual(paperBins[0].nextDate, '2026-09-08', 'the past date (2020) is filtered out');
assertEqual(paperBins[0].upcoming.length, 1, 'only future pickups remain in upcoming');
assertEqual(paperBins[0].daysTo, 4, 'daysTo is computed from the next date when the attribute is absent');

assertEqual(parseWasteSensor(temperature), null, 'a plain sensor is not a waste sensor');
assertEqual(detectWasteBins({}).length, 0, 'no entities → no bins');

// [fork] daysTo: null (the integration's "no next collection") must NOT be
// coerced to a 0-day "today" phantom bin, and a numeric-string daysTo is fine.
const nullDaysTo = makeEntity('sensor.restmuell', 'unknown',
  { types: ['Restmüll'], upcoming: [], daysTo: null, icon: 'mdi:trash-can' });
assertEqual(parseWasteSensor(nullDaysTo), null, 'daysTo:null with no upcoming is not a waste bin');
assertEqual(detectWasteBins({ 'sensor.restmuell': nullDaysTo }).length, 0, 'a null-daysTo empty sensor yields no phantom "today" bin');

const strDaysTo = makeEntity('sensor.biotonne', 'Biotonne in 3 days',
  { types: ['Biotonne'], daysTo: '3', upcoming: [{ date: '2026-09-07', type: 'Biotonne' }], icon: 'mdi:leaf' });
const strBins = detectWasteBins({ 'sensor.biotonne': strDaysTo });
assertEqual(strBins.length, 1, 'a numeric-string daysTo sensor is a bin');
assertEqual(strBins[0].daysTo, 3, 'numeric-string daysTo is parsed to a number');

// ---------------------------------------------------------------------------
// [fork] Garage doors / gates — handled like locks
// ---------------------------------------------------------------------------
console.log('\n── garage doors ──');
{
  const g = (state, attrs = {}) => ({
    entity_id: 'cover.g', state, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null },
    attributes: { device_class: 'garage', supported_features: 3, ...attrs },
  });
  assert(isGarageDoor(g('closed')), 'cover garage → garage door');
  assert(isGarageDoor(g('closed', { device_class: 'gate' })), 'cover gate → garage door');
  assert(!isGarageDoor(g('closed', { device_class: 'blind' })), 'cover blind → not a garage door');
  assert(!isGarageDoor({ ...g('on'), entity_id: 'binary_sensor.g', attributes: { device_class: 'garage_door' } }), 'binary_sensor garage_door stays a door sensor');
  assert(!isGarageDoor(undefined), 'undefined → false');

  assertEqual(garageStatus('closed'), 'closed', 'status closed');
  assertEqual(garageStatus('opening'), 'moving', 'status opening → moving');
  assertEqual(garageStatus('closing'), 'moving', 'status closing → moving');
  assertEqual(garageStatus('open'), 'open', 'status open');
  assertEqual(garageStatus('stopped'), 'open', 'status stopped half way → open');
  assertEqual(garageStatus('unavailable'), 'unavailable', 'status unavailable');
  assertEqual(garageStatus('unknown'), 'unavailable', 'status unknown → unavailable');
  assert(garageIsOpen('opening') && garageIsOpen('open') && !garageIsOpen('closed') && !garageIsOpen('unavailable'),
    'garageIsOpen: open/moving yes, closed/unreachable no');

  assert(garageSupports(g('closed'), 'open') && garageSupports(g('closed'), 'close') && !garageSupports(g('closed'), 'stop'),
    'features 3 = open + close, no stop');
  assert(garageSupports(g('closed', { supported_features: 11 }), 'stop'), 'features 11 includes stop');
  assert(garageSupports(g('closed', { supported_features: undefined }), 'open') && !garageSupports(g('closed', { supported_features: undefined }), 'stop'),
    'no supported_features → open/close assumed, no stop');
  assert(!garageCanStop(g('opening')), 'no stop without the STOP feature');
  assert(garageCanStop(g('opening', { supported_features: 11 })), 'stop while moving with STOP');
  assert(!garageCanStop(g('open', { supported_features: 11 })), 'no stop while standing');

  assert(garageCanAct(g('closed'), 'open') && !garageCanAct(g('closed'), 'close'), 'closed: can open, not close');
  assert(garageCanAct(g('open'), 'close') && !garageCanAct(g('open'), 'open'), 'open: can close, not open');
  assert(!garageCanAct(g('opening'), 'close') && !garageCanAct(g('opening'), 'open'), 'moving: no open/close');
  assert(!garageCanAct(g('unavailable'), 'open') && !garageCanAct(g('unavailable'), 'close'), 'unreachable: no action');
  assert(!garageCanAct(g('closed', { supported_features: 2 }), 'open'), 'no OPEN feature → cannot open');

  const fleet = [g('closed'), { ...g('open'), entity_id: 'cover.h' }, { ...g('unavailable'), entity_id: 'cover.i' }, { ...g('closing'), entity_id: 'cover.j' }];
  assertEqual(garageTargets(fleet, 'open').map((e) => e.entity_id).join(','), 'cover.g', 'open all → only the closed one');
  assertEqual(garageTargets(fleet, 'close').map((e) => e.entity_id).join(','), 'cover.h', 'close all → only the open, standing one');
  assert(garageNeedsDialog('open') && !garageNeedsDialog('close'), 'opening asks first, closing does not');

  const sum = garageSummary(fleet);
  assertEqual(JSON.stringify(sum), JSON.stringify({ total: 4, closed: 1, open: 2, unavailable: 1, allClosed: false }), 'summary counts');
  assert(garageSummary([g('closed')]).allClosed, 'all closed');
  assert(!garageSummary([g('closed'), { ...g('unavailable'), entity_id: 'cover.x' }]).allClosed, 'an unreachable door is never "all closed"');
  assert(!garageSummary([]).allClosed, 'no doors → not "all closed"');

  assertEqual(garageMdiIcon(g('closed')), 'mdi:garage', 'icon closed');
  assertEqual(garageMdiIcon(g('opening')), 'mdi:garage-open', 'icon moving');
  assertEqual(garageMdiIcon(g('unavailable')), 'mdi:garage-alert', 'icon unreachable');
  assertEqual(garageMdiIcon(g('open', { device_class: 'gate' })), 'mdi:gate-open', 'gate icon open');

  // demo: the garage door opens/closes through the demo service layer
  const opened = applyDemoService(DEMO_ENTITIES, 'cover', 'open_cover', {}, { entity_id: 'cover.garage_door' });
  assertEqual(opened?.['cover.garage_door']?.state, 'open', 'demo garage door opens');
}

// ---------------------------------------------------------------------------
// [fork] Glas tokens — second style (docs/GLAS-DESIGN.md, docs/glas/PLAN-ETAPPE-0-1.md §3.8)
// ---------------------------------------------------------------------------
console.log('\n── glas tokens ──');
{
  const json = JSON.parse(readFileSync(new URL('../../../docs/glas/glas-tokens.json', import.meta.url), 'utf8'));
  const modes = ['light', 'dark'];

  // colours: same keys in both modes, values verbatim from glas-tokens.json
  assert(Object.keys(GLAS_COLORS.light).join() === Object.keys(GLAS_COLORS.dark).join(), 'glas colours: same keys light/dark');
  for (const m of modes) {
    const want = json.color[m];
    const diff = Object.keys({ ...want, ...GLAS_COLORS[m] }).filter((k) => want[k] !== GLAS_COLORS[m][k]);
    assertEqual(diff.join(), '', `glas colours ${m} = glas-tokens.json (verbatim)`);
  }

  // default accent verbatim; the classic names: 24 tokens, the rest --g-*
  for (const m of modes) {
    const a = glasAccent(undefined, m);
    const want = json.accent.default[m];
    const diff = Object.keys(want).filter((k) => want[k] !== a[k]);
    assertEqual(diff.join(), '', `default accent ${m} = glas-tokens.json`);
  }
  const vars = glasCssVars({ mode: 'light', strength: 'clear' });
  const classicNames = Object.keys(glasThemeTokens({ mode: 'light', strength: 'clear' })).map(classicTokenVar);
  assertEqual(classicNames.length, 24, 'glas maps all 24 classic tokens');
  assert(Object.keys(vars).every((k) => classicNames.includes(k) || k.startsWith('--g-')), 'every glas variable is a classic token or --g-*');
  assert(Object.keys(GLAS_COLORS.light).every((k) => glasColorVar(k) in vars), 'every glas colour is written as --g-<kebab>');
  assertEqual(glasColorVar('glassLabel2'), '--g-glass-label-2', 'kebab: glassLabel2');
  assertEqual(glasColorVar('ct1'), '--g-ct-1', 'kebab: ct1');
  assertEqual(classicTokenVar('bgCardHover'), '--bg-card-hover', 'kebab: classic name');
  assertEqual(vars['--bg'], '#F2F2F7', 'glas light --bg');
  assertEqual(glasCssVars({ mode: 'dark', strength: 'clear' })['--bg'], '#000000', 'glas dark --bg is pure black');
  assertEqual(vars['--accent'], '#A64B00', 'plan K6: --accent is the accessible ink');
  assertEqual(vars['--g-accent'], '#FF9500', 'bright accent stays as --g-accent');
  assertEqual(vars['--border'], '#E5E5EA', 'plan K14: --border = fillSolid (controls and tracks stay visible)');
  assertEqual(glasCssVars({ mode: 'light', strength: 'opaque' })['--g-glass-tint'], '1', 'opaque: tint 1');
  assertEqual(glasCssVars({ mode: 'light', strength: 'tinted' })['--g-glass-tint'], '0.75', 'tinted: tint .75');
  // the design doc's table of the classic names (glas-tokens.json → classicMapping) = what the code writes
  for (const m of modes) {
    const written = glasCssVars({ mode: m, strength: 'clear' });
    const diff = classicNames.filter((k) => json.classicMapping[k]?.[m] !== written[k]);
    assertEqual(diff.join(), '', `classicMapping ${m} = glasCssVars (defaults)`);
  }

  // springs: 41 points, end at 1, the cubic-bezier fallback when linear() is missing
  for (const [name, sp] of Object.entries(GLAS_SPRINGS)) {
    const pts = sp.linear.slice('linear('.length, -1).split(',').map(Number);
    assert(pts.length === 41 && pts[0] === 0 && pts[40] === 1 && pts.every(Number.isFinite), `spring ${name}: linear() with 41 points 0…1`);
    assert(sp.linear === json.motion.springs[name].linear, `spring ${name} = glas-tokens.json`);
    assertEqual(sp.fallback, json.motion.springs[name].bezierFallback, `spring ${name} fallback = glas-tokens.json`);
  }
  assertEqual(glasCssVars({ mode: 'light', strength: 'clear', supportsLinear: false })['--g-spring-snappy'], GLAS_SPRINGS.snappy.fallback, 'no linear() → fallback curve');

  // frame (docs/glas/PLAN-ETAPPE-2.md K28, K29): surface tints per strength, sheet material, shadows — from the json
  const surfaceKeys = Object.keys(GLAS_SURFACE_TINT).filter((k) => k !== 'default');
  for (const strength of GLAS_STRENGTHS) {
    const w = glasCssVars({ mode: 'light', strength });
    const jsonKey = { clear: 'klar', tinted: 'getoent' }[strength];
    const bad = surfaceKeys.filter((k) => {
      const name = '--g-tint-' + k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      const want = strength === 'opaque' ? '1' : String(GLAS_SURFACE_TINT[k][strength]);
      return w[name] !== want || (jsonKey && json.glass.surfaceTint[k][jsonKey] !== GLAS_SURFACE_TINT[k][strength]);
    });
    assertEqual(bad.join(), '', `--g-tint-<surface> (${strength}) = GLAS_SURFACE_TINT = glas-tokens.json`);
  }
  assertEqual(glasCssVars({ mode: 'light', strength: 'clear' })['--g-tint-sidebar'], '0.5', 'K28: sidebar .5 when clear');
  assertEqual(glasCssVars({ mode: 'dark', strength: 'tinted' })['--g-tint-menu'], '0.94', 'K28: menu .94 when tinted');
  for (const m of modes) {
    const w = glasCssVars({ mode: m, strength: 'clear' });
    assertEqual(w['--g-glass-shadow'], json.glass.regular[m].shadow, `glass shadow ${m} = glas-tokens.json (inner + outer)`);
    assert(w['--g-glass-shadow'].startsWith(w['--g-glass-inner'] + ', '), `--g-glass-inner ${m} is the start of the glass shadow`);
    assertEqual(w['--g-sheet-fill'], json.glass.sheet[m].fill, `sheet fill ${m} = glas-tokens.json`);
    assertEqual(w['--g-sheet-filter'], json.glass.sheet[m].filter, `sheet filter ${m} = glas-tokens.json`);
    assertEqual(w['--g-sheet-solid'], json.glass.sheet[m].solid, `sheet solid ${m} = glas-tokens.json`);
    assertEqual(w['--g-glass-clear-fill'], json.glass.clear.fill, `clear fill ${m} = glas-tokens.json`);
    assertEqual(w['--g-glass-clear-text-fill'], json.glass.clear.textFill, `clear text fill ${m} = glas-tokens.json (K109)`);
  }
  const elevation = { menu: 'menuDesktop', popover: 'popoverDesktop', banner: 'banner', toast: 'toastPhone', prominent: 'prominent', chip: 'chipDesktop',
    live: 'live' };
  for (const [name, key] of Object.entries(elevation)) {
    assertEqual(GLAS_SHADOWS[name], json.elevation.light[key], `--g-shadow-${name} = elevation.${key}`);
    assertEqual(glasCssVars({ mode: 'dark', strength: 'clear' })[`--g-shadow-${name}`], GLAS_SHADOWS[name], `--g-shadow-${name} written`);
  }
  // windows and gestures (docs/glas/PLAN-ETAPPE-3.md §5.1): per mode, dark falls back to light where the json has no value
  const windowShadows = { dialog: 'dialog', inspector: 'inspector', 'sheet-large': 'sheetLarge', 'pushed-screen': 'pushedScreen', 'lift-context': 'liftContext', 'lift-context-desktop': 'liftContextDesktop',
    // tiles (docs/glas/PLAN-ETAPPE-4.md K83)
    'card-hover': 'cardHover', 'tile-lift': 'tileLift', 'tile-on-desktop': 'tileOnDesktop', knob: 'knob', 'light-glow': 'lightGlow' };
  for (const m of modes) {
    const w = glasCssVars({ mode: m, strength: 'clear' });
    for (const [name, key] of Object.entries(windowShadows)) {
      assertEqual(w[`--g-shadow-${name}`], json.elevation[m][key] ?? json.elevation.light[key], `--g-shadow-${name} ${m} = elevation.${key}`);
    }
  }
  assertEqual(resolveMix('color-mix(in srgb, #FFCC00 26%, #FFFFFF)'), '#FFF2BD', 'color-mix of the reconnecting banner');
  assertEqual(resolveMix('#1C1C1E'), '#1C1C1E', 'resolveMix: plain colour unchanged');

  // GLAS-DESIGN §2.5 recomputed (samples, ±0.05)
  const near = (got, want, label) => assert(Math.abs(got - want) <= 0.05, `${label}: ${got.toFixed(2)} ≈ ${want}`);
  assertEqual(compositeOver('rgba(120,120,128,.12)', '#FFFFFF'), '#EFEFF0', 'fill over card');
  assertEqual(compositeOver('rgba(120,120,128,.12)', '#F2F2F7'), '#E3E3E9', 'fill over bg');
  near(contrastRatio('#5F5F64', '#F2F2F7'), 5.69, 'label2 on bg');
  near(contrastRatio('#5F5F64', '#E3E3E9'), 4.98, 'label2 on fill over bg');
  near(contrastRatio('#A64B00', '#F2F2F7'), 5.19, 'accentInk on bg');
  near(contrastRatio('#A64B00', '#E6E6E9'), 4.65, 'accentInk on tab lens');
  near(contrastRatio('#1C1C1E', '#FF9500'), 7.74, 'onProminent on orange');
  near(contrastRatio('#A1A1A6', '#2C2C2E'), 5.42, 'dark textFaint on #2C2C2E');
  near(contrastRatio('#000000', glassOver('#808080', 'light', 0.6)), 10.24, 'tab bar light t.6: label over grey');
  near(contrastRatio('#000000', glassOver('#333333', 'light', 0.6)), 5.5, 'tab bar light t.6: label over #333');
  near(contrastRatio('#3A3A3C', glassOver('#808080', 'light', 0.5)), 5.25, 'sidebar light t.5: glassLabel2 over grey');
  near(contrastRatio('#FFFFFF', glassOver('#808080', 'dark', 0.6)), 7.78, 'glass dark t.6: label over grey');
  // the white sheet of Etappe 7 (K109); before: 15.36 / 8.3 / 3.56
  near(contrastRatio('#000000', sheetOver('#808080', 'light')), 17.3, 'sheet light: label over grey');
  near(contrastRatio('#3A3A3C', sheetOver('#808080', 'light')), 9.35, 'sheet light: glassLabel2 over grey');
  near(contrastRatio('#5F5F64', sheetOver('#000000', 'light')), 4.16, 'sheet light: label2 over black (why glassLabel2)');
  // a window rests over the scrimmed page (GLAS-DESIGN §2.5 table "Fenster"): the sheet over #F2F2F7 under .25
  near(contrastRatio('#A64B00', windowGround('light', 'rgba(0,0,0,.25)', '#F2F2F7')), 5.22, 'window light: accent ink over the scrimmed page');
  near(contrastRatio('#B25000', windowGround('light', 'rgba(0,0,0,.25)', '#F2F2F7')), 4.69, 'window light: orangeInk over the scrimmed page');
  near(contrastRatio('#D1D1D6', sheetOver('#FFFFFF', 'dark')), 6.35, 'sheet dark: glassLabel2 over white');

  // a focus ring on a picture (C40): light needs the counter-tone band inside the white one, dark not (orange 9.54:1)
  assertEqual(focusPair('#A64B00', '#FFFFFF'), '#000000', 'focus pair light: a black band inside the white one');
  assertEqual(focusPair('#FFB340', '#1C1C1E'), 'transparent', 'focus pair dark: focus and card colour are enough');
  assertEqual(glasCssVars({ mode: 'light', strength: 'tinted' })['--g-focus-pair'], '#000000', 'focus pair written (light)');

  // every text/glyph pair ≥ its minimum — modes × strengths × more contrast × accent hues (none + 0…345)
  const hues = [undefined];
  for (let h = 0; h < 360; h += 15) hues.push(h);
  const fails = [];
  let n = 0;
  for (const mode of modes) for (const strength of GLAS_STRENGTHS) for (const contrastMore of [false, true]) for (const accentHue of hues) {
    const input = { mode, strength, contrastMore, accentHue };
    for (const p of glasContrastPairs(input)) {
      n++;
      const r = contrastRatio(p.fg, p.bg);
      if (r < p.min) fails.push(`${mode}/${strength}/${contrastMore ? 'more' : 'normal'}/hue ${accentHue}: ${p.name} ${r.toFixed(2)}`);
    }
  }
  assert(fails.length === 0, `glas contrast: ${n} pairs ≥ minimum${fails.length ? ' — ' + fails.slice(0, 5).join('; ') : ''}`);

  // "more contrast" never lowers a pair
  const worse = [];
  for (const mode of modes) for (const strength of GLAS_STRENGTHS) {
    const normal = new Map(glasContrastPairs({ mode, strength }).map((p) => [p.name, contrastRatio(p.fg, p.bg)]));
    for (const p of glasContrastPairs({ mode, strength, contrastMore: true })) {
      const before = normal.get(p.name);
      if (before !== undefined && contrastRatio(p.fg, p.bg) < before - 1e-9) worse.push(`${mode}/${strength}: ${p.name}`);
    }
  }
  assert(worse.length === 0, `more contrast is never lower${worse.length ? ' — ' + worse.slice(0, 5).join('; ') : ''}`);
}

// ---------------------------------------------------------------------------
// [fork] Home hints, locks, active scenes, Glas energy chart, card sizes (docs/glas/PLAN-ETAPPE-4.md)
// ---------------------------------------------------------------------------
console.log('\n── hints, active scenes, glas energy, sizes ──');
{
  const T0 = Date.parse('2026-10-08T12:00:00Z');
  const iso = (ms) => new Date(ms).toISOString();
  const ent = (entity_id, state, attributes = {}, changedMs = T0 - 3600_000, updatedMs = changedMs) => ({
    entity_id, state, attributes, last_changed: iso(changedMs), last_updated: iso(updatedMs),
    context: { id: '', parent_id: null, user_id: null },
  });
  const kinds = (r) => r.hints.map((h) => h.kind).join(',');

  // locks (moved to core; the dashboard re-exports them)
  const ls = lockSummary([ent('lock.a', 'locked'), ent('lock.b', 'unlocked'), ent('lock.c', 'jammed'), ent('lock.d', 'locking')]);
  assertEqual(JSON.stringify(ls), JSON.stringify({ total: 4, locked: 1, open: 2, problem: 1 }), 'lockSummary counts (locking = open)');
  assertEqual(lockTone(ls), 'open', 'lockTone: an open lock wins');
  assertEqual(lockTone(lockSummary([ent('lock.a', 'locked'), ent('lock.c', 'unavailable')])), 'problem', 'lockTone: unreachable → problem');

  // hints: nothing deviates → no hints
  let r = collectHints([ent('lock.a', 'locked'), ent('binary_sensor.w', 'off', { device_class: 'window' })], { now: T0 });
  assertEqual(r.hints.length, 0, 'hints: nothing deviates → empty');
  assertEqual(r.recheckAt, null, 'hints: no recheck without a waiting door');

  // windows at once, doors after 10 minutes (E4)
  const doorJust = ent('binary_sensor.door', 'on', { device_class: 'door' }, T0 - 5 * 60_000);
  r = collectHints([ent('binary_sensor.w2', 'on', { device_class: 'window' }), ent('binary_sensor.w1', 'on', { device_class: 'window' }), doorJust], { now: T0 });
  assertEqual(kinds(r), 'window-open', 'hints: a window counts at once, a door open 5 min not yet');
  assertEqual(r.hints[0].entityIds.join(','), 'binary_sensor.w1,binary_sensor.w2', 'hints: entity ids sorted');
  assertEqual(r.hints[0].count, 2, 'hints: two windows');
  assertEqual(r.recheckAt, T0 + 5 * 60_000, 'hints: recheck when the door reaches 10 minutes');
  r = collectHints([ent('binary_sensor.door', 'on', { device_class: 'door' }, T0 - 10 * 60_000)], { now: T0 });
  assertEqual(kinds(r), 'door-open', 'hints: a door open 10 min counts');
  r = collectHints([ent('binary_sensor.gd', 'on', { device_class: 'garage_door' }, T0 - 11 * 60_000), ent('binary_sensor.op', 'on', { device_class: 'opening' }, T0 - 60_000)], { now: T0, doorOpenMinutes: 1 });
  assertEqual(r.hints[0]?.count, 2, 'hints: garage_door and opening sensors are doors (custom minutes)');
  r = collectHints([{ ...ent('binary_sensor.door', 'on', { device_class: 'door' }), last_changed: '' }], { now: T0 });
  assertEqual(kinds(r), 'door-open', 'hints: unknown opening time counts');

  // critical things, faults, alarm, cameras
  const garage = (id, state) => ent(id, state, { device_class: 'garage', supported_features: 3 });
  r = collectHints([
    garage('cover.g1', 'open'), garage('cover.g2', 'unavailable'), ent('lock.l1', 'unlocked'), ent('lock.l2', 'jammed'),
    ent('binary_sensor.leak', 'on', { device_class: 'moisture' }), ent('binary_sensor.co', 'on', { device_class: 'carbon_monoxide' }),
    ent('alarm_control_panel.home', 'triggered'), ent('binary_sensor.w', 'on', { device_class: 'window' }),
  ], { now: T0, camerasNotRecording: 2 });
  assertEqual(kinds(r), 'alarm-triggered,leak,smoke,garage-open,lock-open,garage-fault,lock-fault,window-open,camera-not-recording',
    'hints: critical first in table order, then warnings');
  assertEqual(r.hints.find((h) => h.kind === 'camera-not-recording')?.count, 2, 'hints: cameras not recording counted');
  assert(r.hints.slice(0, 5).every((h) => h.severity === 'critical'), 'hints: the first five are critical');
  r = collectHints([ent('alarm_control_panel.a', 'arming'), ent('alarm_control_panel.b', 'disarmed')], { now: T0 });
  assertEqual(kinds(r), 'alarm-pending', 'hints: arming → pending hint (most severe panel, like the chip)');
  assertEqual(kinds(collectHints([ent('alarm_control_panel.a', 'armed_away')], { now: T0 })), '', 'hints: armed is normal');
  assertEqual(kinds(collectHints([garage('cover.g', 'closing')], { now: T0 })), 'garage-open', 'hints: a moving door is open (chip rule)');
  assertEqual(kinds(collectHints([ent('cover.blind', 'open', { device_class: 'blind' })], { now: T0 })), '', 'hints: blinds are no garage');

  // hidden entities never count
  r = collectHints([ent('binary_sensor.w', 'on', { device_class: 'window' }), ent('lock.l', 'unlocked')], { now: T0, hidden: ['binary_sensor.w', 'lock.l'] });
  assertEqual(r.hints.length, 0, 'hints: hidden entities do not count');

  // waste today/tomorrow only, info last
  const bin = (entityId, daysTo) => ({ entityId, name: entityId, daysTo, nextDate: '2026-10-09', upcoming: [] });
  r = collectHints([ent('binary_sensor.w', 'on', { device_class: 'window' })], { now: T0, waste: [bin('sensor.b2', 2), bin('sensor.b1', 1), bin('sensor.b0', 0), bin('sensor.bx', null)] });
  assertEqual(r.hints.map((h) => h.id).join(','), 'window-open,waste-soon:sensor.b0,waste-soon:sensor.b1', 'hints: waste today, then tomorrow, after the warnings');
  assertEqual(r.hints[1].bin?.daysTo, 0, 'hints: waste hint carries its bin');
  assertEqual(collectHints([], { now: T0, waste: [bin('sensor.b0', 0)], hidden: ['sensor.b0'] }).hints.length, 0, 'hints: hidden bin skipped');

  // the demo deviates nowhere (Klassisch stays unchanged by default)
  const demoNow = Date.now();
  const demoHints = collectHints(Object.values(DEMO_ENTITIES), { now: demoNow, waste: detectWasteBins(DEMO_ENTITIES, { nowMs: demoNow }) });
  assertEqual(kinds(demoHints), '', 'hints: none in the default demo');

  // active scenes (E5 heuristic)
  const ACT = T0 - 60_000;
  const states = {
    'light.a': ent('light.a', 'on', {}, ACT - 5000, ACT + 2000),
    'light.b': ent('light.b', 'off', {}, ACT - 600_000, ACT - 600_000),
    'light.c': ent('light.c', 'on', {}, ACT + 30_000, ACT + 30_000),
    'light.u': ent('light.u', 'unavailable', {}, ACT - 600_000),
  };
  const scene = (id, at, members) => ent(id, at === null ? 'unknown' : iso(at), members ? { entity_id: members } : {});
  let act = activeSceneIds([scene('scene.ok', ACT, ['light.a', 'light.b'])], states, T0);
  assert(act.has('scene.ok'), 'active: members untouched since activation (within grace)');
  act = activeSceneIds([scene('scene.changed', ACT, ['light.a', 'light.c'])], states, T0);
  assert(!act.has('scene.changed'), 'active: a member changed after the grace → not active');
  act = activeSceneIds([scene('scene.c', ACT, ['light.c'])], states, T0, { graceMs: 40_000 });
  assert(act.has('scene.c'), 'active: graceMs widens the window');
  assert(!activeSceneIds([scene('scene.u', ACT, ['light.a', 'light.u'])], states, T0).has('scene.u'), 'active: unavailable member → not active');
  assert(!activeSceneIds([scene('scene.none', ACT, null)], states, T0).has('scene.none'), 'active: no member list → never');
  assert(!activeSceneIds([scene('scene.never', null, ['light.a'])], states, T0).has('scene.never'), 'active: never activated → not active');
  assert(!activeSceneIds([scene('scene.old', T0 - 13 * 3600_000, ['light.b'])], states, T0).has('scene.old'), 'active: older than 12 h → not active');
  act = activeSceneIds([scene('scene.first', ACT - 60_000, ['light.b', 'light.a']), scene('scene.later', ACT, ['light.b'])], states, T0);
  assert(act.has('scene.later') && !act.has('scene.first'), 'active: overlapping scenes → only the later one');
  act = activeSceneIds([scene('scene.x', ACT - 60_000, ['light.b']), scene('scene.y', ACT, ['light.a'])], { ...states, 'light.a': ent('light.a', 'on', {}, ACT - 600_000) }, T0);
  assert(act.has('scene.x') && act.has('scene.y'), 'active: disjoint scenes can both be active');
  assert(!activeSceneIds([scene('scene.gone', ACT, ['light.removed'])], states, T0).has('scene.gone'), 'active: only missing members → not active');
  assertEqual(sceneMembers(scene('scene.m', ACT, ['light.a', 5, ''])).join(','), 'light.a', 'sceneMembers: strings only');
  // a browser clock 60 s behind Home Assistant: the scene just activated is still active
  assert(activeSceneIds([scene('scene.skew', T0 + 60_000, ['light.b'])], states, T0).has('scene.skew'), 'active: activation ahead of the browser clock → active');
  // covers report until they stop moving: 40 s later still the scene's doing, 3 min later not
  const coverAt = (ms) => ({ ...states, 'cover.r': ent('cover.r', 'closed', {}, ACT + ms, ACT + ms) });
  assert(activeSceneIds([scene('scene.blinds', ACT, ['light.a', 'cover.r'])], coverAt(40_000), T0 + 60_000).has('scene.blinds'), 'active: a cover may report for 2 min');
  assert(!activeSceneIds([scene('scene.blinds', ACT, ['light.a', 'cover.r'])], coverAt(180_000), T0 + 200_000).has('scene.blinds'), 'active: a cover changed after 2 min → not active');
  assert(!activeSceneIds([scene('scene.c40', ACT, ['light.c'])], states, T0, { coverGraceMs: 600_000 }).has('scene.c40'), 'active: the cover grace leaves lights alone');

  // Glas energy chart — local calendar, DST days (Europe/Berlin)
  const tzBefore = process.env.TZ;
  process.env.TZ = 'Europe/Berlin';
  try {
    const at = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);
    const span = (w) => `${new Date(w.bounds[0]).toString().slice(4, 21)} → ${new Date(w.bounds[w.bounds.length - 1]).toString().slice(4, 21)}`;
    assertEqual(glasEnergyWindow('day', at(2026, 10, 8, 14, 30)).bounds.length - 1, 24, 'energy: normal day → 24 hours');
    assertEqual(glasEnergyWindow('day', at(2026, 10, 25, 14)).bounds.length - 1, 25, 'energy: DST end → 25 hours');
    assertEqual(glasEnergyWindow('day', at(2026, 3, 29, 14)).bounds.length - 1, 23, 'energy: DST start → 23 hours');
    assertEqual(glasEnergyWindow('day', at(2026, 3, 29, 14)).bucket, 'hour', 'energy: day asks for hours');
    const week = glasEnergyWindow('week', at(2026, 10, 8, 14, 30));
    assertEqual(week.bounds.length - 1, 7, 'energy: week → 7 days');
    assertEqual(span(week), 'Oct 02 2026 00:00 → Oct 09 2026 00:00', 'energy: week = the last 7 days including today');
    assertEqual(week.bucket, 'day', 'energy: week asks for days');
    const month = glasEnergyWindow('month', at(2026, 3, 10, 9));
    assertEqual(month.bounds.length - 1, 30, 'energy: month → 30 days');
    assertEqual(span(month), 'Feb 09 2026 00:00 → Mar 11 2026 00:00', 'energy: month = the last 30 days, across the month end');
    const dst = glasEnergyWindow('month', at(2026, 11, 5, 12));
    assert(dst.bounds.every((b) => new Date(b).getHours() === 0), 'energy: every day starts at local midnight across the DST end');

    const now = at(2026, 10, 8, 14, 30);
    const hour = (h) => at(2026, 10, 8, h).getTime();
    const dayWin = glasEnergyWindow('day', now);
    const bars = glasEnergyBars(dayWin, [
      { start: hour(0), gridConsumed: 0.5, gridReturned: 0, solar: 0 },
      { start: hour(13), gridConsumed: 0.2, gridReturned: 0.1, solar: 0.9 },
      { start: hour(14), gridConsumed: 0.3, gridReturned: 0, solar: 0.4 },
      { start: hour(14) + 1, gridConsumed: -1, gridReturned: 0, solar: 0 },
      { start: hour(12), gridConsumed: 0, gridReturned: 1.5, solar: 1.2 },
    ], now);
    assertEqual(bars.length, 24, 'energy bars: one per hour');
    assert(Math.abs(bars[13].solar - 0.8) < 1e-9 && Math.abs(bars[13].total - 1.0) < 1e-9, 'energy bars: used solar = produced − exported');
    assertEqual(bars[12].solar, 0, 'energy bars: exporting more than produced (battery) → no negative solar');
    assert(bars[14].current && !bars[14].future && bars[15].future && !bars[13].current, 'energy bars: current and future flags');
    assert(Math.abs(bars[14].total - 0.7) < 1e-9, 'energy bars: points inside one bucket add up, negative grid ignored');
    assert(bars[0].hasData && !bars[1].hasData, 'energy bars: buckets without rows are marked');
    const avg = energyAverage(bars);
    assert(Math.abs(avg - (0.5 + 1.0 + 0) / 3) < 1e-9, 'energy: Ø over completed hours with data (running one left out)');
    assertEqual(energyAverage(glasEnergyBars(dayWin, [{ start: hour(14), gridConsumed: 1, gridReturned: 0, solar: 0 }], now)), null, 'energy: only the running hour → no Ø');
    const weekBars = glasEnergyBars(week, [{ start: at(2026, 10, 2).getTime(), gridConsumed: 9, gridReturned: 1, solar: 4 }, { start: at(2026, 10, 8).getTime(), gridConsumed: 2, gridReturned: 0, solar: 1 }], now);
    assert(weekBars[0].total === 12 && weekBars[6].current && weekBars[6].total === 3, 'energy bars: daily rows land on their day, today is the running bar');

    assertEqual(JSON.stringify(energyAxis(1.6)), JSON.stringify({ step: 1, top: 2, ticks: [0, 1, 2] }), 'axis: day 0/1/2 kWh');
    assertEqual(JSON.stringify(energyAxis(18).ticks), JSON.stringify([0, 10, 20]), 'axis: week 0/10/20 kWh');
    assertEqual(energyAxis(2.3).top, 4, 'axis: 2.3 → top 4');
    assertEqual(energyAxis(45).step, 25, 'axis: 45 → step 25');
    assertEqual(energyAxis(0).top, 0.5, 'axis: empty → top 0.5');
    assertEqual(hiddenTicks(energyAxis(1.6), 0.95).join(','), '1', 'axis: value within 10 % of Ø hidden');
    assertEqual(hiddenTicks(energyAxis(1.6), 0.5).join(','), '', 'axis: Ø far from the values hides nothing');
    const tiny = barPercent({ grid: 0.005, solar: 0.005, total: 0.01 }, 2);
    assert(Math.abs(tiny.grid + tiny.solar - 1.5) < 1e-9 && Math.abs(tiny.grid - 0.75) < 1e-9, 'bar: at least 1.5 %, split in proportion');
    assertEqual(JSON.stringify(barPercent({ grid: 0, solar: 0, total: 0 }, 2)), JSON.stringify({ grid: 0, battery: 0, solar: 0 }), 'bar: empty stays empty');
    // [fork] the home battery as the middle part, by Home Assistant's allocation
    const batBars = glasEnergyBars(dayWin, [
      { start: hour(9), gridConsumed: 0.1, gridReturned: 0.2, solar: 2, batteryIn: 1, batteryOut: 0 },
      { start: hour(20), gridConsumed: 0.3, gridReturned: 0, solar: 0, batteryIn: 0, batteryOut: 0.5 },
    ], now);
    assert(Math.abs(batBars[9].solar - 0.8) < 1e-9 && batBars[9].battery === 0 && Math.abs(batBars[9].total - 0.9) < 1e-9, 'energy bars: charging and export leave the solar the home used');
    assert(batBars[20].battery === 0.5 && batBars[20].grid === 0.3 && batBars[20].total === 0.8, 'energy bars: the battery feeds the home before the grid');
    const third = barPercent({ grid: 1, battery: 1, solar: 2, total: 4 }, 4);
    assert(third.grid === 25 && third.battery === 25 && third.solar === 50, 'bar: three parts in proportion');

    const cmp = (period, n) => {
      const c = glasEnergyCompare(glasEnergyWindow(period, n), n);
      const f = (t) => new Date(t).toString().slice(4, 21);
      return `${f(c.current.start)} → ${f(c.current.end)} | ${f(c.previous.start)} → ${f(c.previous.end)}`;
    };
    assertEqual(cmp('day', now), 'Oct 08 2026 00:00 → Oct 08 2026 14:00 | Oct 07 2026 00:00 → Oct 07 2026 14:00', 'compare: today and yesterday up to the last full hour');
    assertEqual(cmp('week', now), 'Oct 02 2026 00:00 → Oct 08 2026 14:00 | Sep 25 2026 00:00 → Oct 01 2026 14:00', 'compare: the 7 days before, same wall times');
    assertEqual(cmp('month', at(2026, 3, 31, 10, 5)), 'Mar 02 2026 00:00 → Mar 31 2026 10:00 | Jan 31 2026 00:00 → Mar 01 2026 10:00', 'compare: the 30 days before');
    assertEqual(cmp('day', at(2026, 10, 26, 12)), 'Oct 26 2026 00:00 → Oct 26 2026 12:00 | Oct 25 2026 00:00 → Oct 25 2026 12:00', 'compare: across the DST end (wall time)');
    assertEqual(cmp('day', at(2026, 10, 8, 0, 20)), 'Oct 08 2026 00:00 → Oct 08 2026 00:00 | Oct 07 2026 00:00 → Oct 07 2026 00:00', 'compare: before the first full hour both spans are empty');
    const trimmed = trimStatistics({ a: [{ start: hour(12), end: hour(13), change: 1 }, { start: hour(14), end: hour(15), change: 2 }] }, hour(14));
    assertEqual(trimmed.a.length, 1, 'compare: rows from the last full hour on are left out');
    assertEqual(energyChange(88, 100), -12, 'change: −12 %');
    assertEqual(energyChange(1, 0), null, 'change: nothing to compare with');
  } finally {
    if (tzBefore === undefined) delete process.env.TZ;
    else process.env.TZ = tzBefore;
  }

  // card sizes S / M / L (E6)
  for (const p of ['S', 'M', 'L']) assertEqual(sizePresetOf(sizeOfPreset(p)), p, `size: ${p} round trip`);
  assertEqual(JSON.stringify(sizeOfPreset('L')), JSON.stringify({ span: 2, height: 0, tall: true }), 'size: L = 2 columns + taller');
  assertEqual(sizePresetOf({ span: 3, height: 0, tall: false }), null, 'size: 3 columns → own');
  assertEqual(sizePresetOf({ span: 2, height: 2, tall: false }), null, 'size: height cap → own');
  assertEqual(sizePresetOf({ span: 1, height: 0, tall: true }), null, 'size: 1 column + taller → own');
  assertEqual(tallKey('home', 'energy'), 'home:energy', 'size: tall key');
  assertEqual(withTall(['home:a', 'home:b'], 'home:a', true).join(','), 'home:b,home:a', 'size: withTall no duplicate');
  assertEqual(withTall(['home:a', 'home:b'], 'home:a', false).join(','), 'home:b', 'size: withTall removes');

  // main-room glances and light levels (Glas, K83)
  const glRoom = (domains) => ({ id: 'r', name: 'R', entityIds: Object.values(domains).flat(), domains });
  const glStates = {
    'sensor.t_bad': ent('sensor.t_bad', 'unknown', { device_class: 'temperature' }),
    'sensor.t': ent('sensor.t', '21.5', { device_class: 'temperature', unit_of_measurement: '°C' }),
    'sensor.t2': ent('sensor.t2', '19', { device_class: 'temperature', unit_of_measurement: '°C' }),
    'sensor.h': ent('sensor.h', '48', { device_class: 'humidity', unit_of_measurement: '%' }),
    'climate.a': ent('climate.a', 'heat', { current_temperature: 20.4 }),
    'climate.b': ent('climate.b', 'heat', { current_temperature: 18 }),
  };
  const glance = (domains) => roomGlances(glRoom(domains), glStates).map((g) => `${g.kind}:${g.entityId}=${g.value}${g.unit ?? ''}`).join(' ');
  assertEqual(glance({ sensor: ['sensor.t_bad', 'sensor.t', 'sensor.t2', 'sensor.h'], climate: ['climate.a'] }), 'temperature:sensor.t=21.5°C humidity:sensor.h=48%', 'glance: first numeric sensors, climate not needed');
  assertEqual(glance({ sensor: ['sensor.h'], climate: ['climate.gone', 'climate.a', 'climate.b'] }), 'temperature:climate.a=20.4 humidity:sensor.h=48%', 'glance: climate fallback = first existing climate, no unit');
  assertEqual(glance({ light: ['light.x'] }), '', 'glance: nothing to show');
  assertEqual(lightPercent(ent('light.x', 'on', { brightness: 204 })), 80, 'light: 204/255 → 80 %');
  assertEqual(lightPercent(ent('light.x', 'on', { brightness: 1 })), 1, 'light: a glimmer still shows 1 %');
  assertEqual(lightPercent(ent('light.x', 'off', { brightness: 204 })), null, 'light: off → no level');
  assertEqual(lightPercent(ent('light.x', 'on', {})), null, 'light: not dimmable → no level');
  assertEqual(climateTone(ent('climate.x', 'heat', { hvac_action: 'heating' })), 'heat', 'climate tone: heating');
  assertEqual(climateTone(ent('climate.x', 'cool', { hvac_action: 'cooling' })), 'cool', 'climate tone: cooling');
  assertEqual(climateTone(ent('climate.x', 'heat_cool', { hvac_action: 'idle' })), 'auto', 'climate tone: idle in heat_cool → auto');
  assertEqual(climateTone(ent('climate.x', 'heat', { hvac_action: 'idle' })), 'idle', 'climate tone: idle');
  assertEqual(climateTone(ent('climate.x', 'off', {})), 'idle', 'climate tone: off → idle');

  // demo scenes (K77): members everywhere, none active at start, active right after scene.turn_on
  const demoScenes = Object.values(DEMO_ENTITIES).filter((e) => e.entity_id.startsWith('scene.'));
  assert(demoScenes.length > 0 && demoScenes.every((e) => sceneMembers(e).length > 0), 'demo: every scene lists its members');
  assert(demoScenes.every((e) => sceneMembers(e).every((m) => DEMO_ENTITIES[m])), 'demo: every scene member exists');
  assertEqual(activeSceneIds(demoScenes, DEMO_ENTITIES, Date.now()).size, 0, 'demo: no scene active at start');
  const afterOn = applyDemoService(DEMO_ENTITIES, 'scene', 'turn_on', {}, { entity_id: 'scene.living_room_relax' });
  const nowActive = activeSceneIds(Object.values(afterOn).filter((e) => e.entity_id.startsWith('scene.')), afterOn, Date.now());
  assertEqual([...nowActive].join(','), 'scene.living_room_relax', 'demo: the activated scene is active');
  const dimmed = applyDemoService(afterOn, 'light', 'turn_on', { brightness: 20 }, { entity_id: 'light.living_room_shelf' });
  // a member changed after the activation (+ grace): no longer active
  const later = { ...dimmed, 'light.living_room_shelf': { ...dimmed['light.living_room_shelf'], last_updated: new Date(Date.now() + 60_000).toISOString() } };
  assertEqual(activeSceneIds(Object.values(later).filter((e) => e.entity_id.startsWith('scene.')), later, Date.now() + 61_000).size, 0, 'demo: a changed member ends "active"');
}

// ---------------------------------------------------------------------------
// [fork] Summary chip counts — the chips and the subtitles of their windows (docs/glas/PLAN-ETAPPE-5.md K97)
// ---------------------------------------------------------------------------
console.log('\n── chip counts ──');
{
  const ent = (entity_id, state, attributes = {}) => ({
    entity_id, state, attributes, last_changed: '', last_updated: '',
    context: { id: '', parent_id: null, user_id: null },
  });
  const map = (...es) => Object.fromEntries(es.map((e) => [e.entity_id, e]));
  const POOL = { poolPump: 'switch.pool_pump', poolRequired: ['switch.pool_pump', 'select.pool_mode'] };
  const c = chipCounts(map(
    ent('person.a', 'home'), ent('person.b', 'not_home'), ent('person.c', 'home'),
    ent('light.a', 'on'), ent('light.b', 'off'), ent('light.c', 'on'), ent('switch.lamp', 'on'),
    ent('binary_sensor.door', 'on', { device_class: 'door' }), ent('binary_sensor.window', 'on', { device_class: 'window' }),
    ent('binary_sensor.opening', 'off', { device_class: 'opening' }), ent('binary_sensor.gd', 'on', { device_class: 'garage_door' }),
    ent('binary_sensor.motion', 'on', { device_class: 'motion' }), ent('binary_sensor.plain', 'on'),
    ent('alarm_control_panel.a', 'disarmed'), ent('alarm_control_panel.b', 'triggered'),
    ent('media_player.a', 'playing'), ent('media_player.b', 'paused'),
    ent('switch.pool_pump', 'on'), ent('select.pool_mode', 'auto'),
    ent('cover.garage', 'open', { device_class: 'garage' }), ent('cover.gate', 'closed', { device_class: 'gate' }),
    ent('cover.blind', 'open', { device_class: 'shutter' }),
    ent('lock.a', 'locked'), ent('lock.b', 'unlocked'), ent('lock.c', 'jammed'),
  ), POOL);
  assertEqual(c.peopleHome.map((e) => e.entity_id).join(','), 'person.a,person.c', 'chips: people at home, in order');
  assertEqual(c.lightsOn, 2, 'chips: lights on (light.* only)');
  assertEqual(c.openDoorWindow, 3, 'chips: open doors, windows and garage door sensors; motion and no class do not count');
  assertEqual(c.alarm?.entity_id, 'alarm_control_panel.b', 'chips: the most severe alarm panel');
  assertEqual(c.mediaPlaying, 1, 'chips: media playing (paused does not count)');
  assertEqual(JSON.stringify(c.pool), JSON.stringify({ present: true, running: true }), 'chips: pool present and running');
  assertEqual(JSON.stringify(c.garages), JSON.stringify({ total: 2, closed: 1, open: 1, unavailable: 0, allClosed: false }), 'chips: garage doors and gates, no blinds');
  assertEqual(JSON.stringify(c.locks), JSON.stringify({ total: 3, locked: 1, open: 1, problem: 1 }), 'chips: locks');

  const none = chipCounts({}, POOL);
  assertEqual(
    JSON.stringify([none.peopleHome.length, none.lightsOn, none.openDoorWindow, none.alarm ?? null, none.mediaPlaying, none.pool, none.garages.total, none.locks.total]),
    JSON.stringify([0, 0, 0, null, 0, { present: false, running: false }, 0, 0]),
    'chips: nothing there → zero everywhere, no alarm, no pool',
  );
  const pumpOnly = chipCounts(map(ent('switch.pool_pump', 'on')), POOL);
  assertEqual(JSON.stringify(pumpOnly.pool), JSON.stringify({ present: false, running: true }), 'chips: the pool needs all its entities to show');
  assertEqual(chipCounts(map(ent('switch.pool_pump', 'off'), ent('select.pool_mode', 'auto')), POOL).pool.running, false, 'chips: pump off → not running');
}

// ---------------------------------------------------------------------------
// [fork] Spelling of upstream texts — the overlay of locales/case/<lang>.json (docs/glas/PLAN-TEXTE.md)
// ---------------------------------------------------------------------------
console.log('\n── text case ──');
{
  const dict = { 'a.title': 'türen & fenster', 'b.label': 'Licht', 'c.count': '{count} an' };
  const out = withCase(dict, { 'a.title': 'Türen & Fenster', 'gone.key': 'Weg' });
  assertEqual(out['a.title'], 'Türen & Fenster', 'withCase: the correction replaces the text');
  assertEqual(out['b.label'], 'Licht', 'withCase: a key without a correction keeps its text');
  assertEqual(out['c.count'], '{count} an', 'withCase: placeholders pass through');
  assert(!('gone.key' in out), 'withCase: a correction for a key the dictionary lacks is left out');
  assertEqual(dict['a.title'], 'türen & fenster', 'withCase: the dictionary itself stays untouched');
  for (const [lang, d] of Object.entries({ en: EN_DICT, de: DE_DICT, es: ES_DICT, fr: FR_DICT, it: IT_DICT, pt: PT_DICT, sv: SV_DICT })) {
    const fix = JSON.parse(readFileSync(new URL(`../locales/case/${lang}.json`, import.meta.url), 'utf8'));
    const keys = Object.keys(fix);
    assert(keys.length > 0 && keys.every((k) => k in d), `withCase: case/${lang}.json names only keys of ${lang}.json`);
  }
}

// ---------------------------------------------------------------------------
// [fork] Energy page after draft v5 — origins, shares, power now, battery (glas/energie-neu/umsetzung/PLAN.md)
// ---------------------------------------------------------------------------
console.log('\n── energy origins, power, battery ──');
{
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  // draft v5's day: solar 12.10 = 4.72 home + 3.10 battery + 4.28 export; battery out 2.40; grid 1.28
  let a = allocateEnergy(12.1, 2.4, 1.28, 3.1, 4.28);
  assert(near(a.solarHome, 4.72) && near(a.solarBattery, 3.1) && near(a.solarGrid, 4.28), 'allocate: solar → export, battery, rest home');
  assert(near(a.batteryHome, 2.4) && near(a.gridHome, 1.28) && near(a.home, 8.4), 'allocate: home 8.40 = 4.72 + 2.40 + 1.28');
  a = allocateEnergy(0, 0, 3, 2, 0);
  assert(near(a.gridBattery, 2) && near(a.gridHome, 1) && near(a.home, 1), 'allocate: battery charged from the grid → grid to battery');
  a = allocateEnergy(1, 2, 0, 0, 1.5);
  assert(near(a.solarGrid, 1) && near(a.batteryGrid, 0.5) && near(a.batteryHome, 1.5) && near(a.home, 1.5), 'allocate: export beyond solar comes from the battery');
  a = allocateEnergy(-1, NaN, 2, 0, 0);
  assert(near(a.home, 2) && near(a.solarHome, 0), 'allocate: negative or missing values count as 0');
  // linear: two hours add up like their sum (without grid charging)
  const h1 = allocateEnergy(2, 0, 0.1, 1, 0.5);
  const h2 = allocateEnergy(0, 0.8, 0.4, 0, 0);
  const both = allocateEnergy(2, 0.8, 0.5, 1, 0.5);
  assert(near(h1.solarHome + h2.solarHome, both.solarHome) && near(h1.batteryHome + h2.batteryHome, both.batteryHome) && near(h1.gridHome + h2.gridHome, both.gridHome), 'allocate: this sunny and this night hour happen to add up like their sum');
  // not linear: a bar of two hours differs from its hours when the battery charged from the grid in one of them
  const g1 = allocateEnergy(0, 0, 2, 1, 0);
  const g2 = allocateEnergy(3, 0, 0, 0, 1);
  const g12 = allocateEnergy(3, 0, 2, 1, 1);
  assert(!near(g1.solarBattery + g2.solarBattery, g12.solarBattery), 'allocate: per bar, not linear (grid charging in one hour)');
  a = allocateEnergy(1, 0, 2, 2, 0);
  assert(near(a.solarBattery, 1) && near(a.gridBattery, 1) && near(a.gridHome, 1) && near(a.home, 1), 'allocate: solar first into the battery, the rest of the charge from the grid');
  a = allocateEnergy(0, 2, 0, 0, 2);
  assert(near(a.batteryGrid, 2) && near(a.home, 0) && near(a.gridHome, 0), 'allocate: battery export → nothing negative');
  a = allocateEnergy(3, 0, 0, 0, 0.5);
  const solarSum = a.solarHome + a.solarBattery + a.solarGrid;
  assert(near(solarSum, 3), 'allocate: the solar destinations add up to the solar');

  assertEqual(sharePercents([4.72, 2.4, 1.28]).join(','), '56,29,15', 'shares: draft v5 consumption → 56 / 29 / 15');
  assertEqual(sharePercents([4.72, 3.1, 4.28]).join(','), '39,26,35', 'shares: draft v5 solar → 39 / 26 / 35');
  assertEqual(sharePercents([1, 1, 1]).reduce((x, y) => x + y, 0), 100, 'shares: thirds still add up to 100');
  assertEqual(sharePercents([0, 0, 0]).join(','), '0,0,0', 'shares: nothing → all 0');

  const tzBefore = process.env.TZ;
  process.env.TZ = 'Europe/Berlin';
  try {
    const at = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);
    const day = (t) => new Date(t).toString().slice(4, 21);
    assertEqual(energyPageWindow('today', at(2026, 10, 25, 14)).bounds.length - 1, 25, 'page window: DST end → 25 hours');
    assertEqual(energyPageWindow('today', at(2026, 3, 29, 14)).bounds.length - 1, 23, 'page window: DST start → 23 hours');
    const week = energyPageWindow('week', at(2026, 10, 21, 20)); // a Wednesday
    assertEqual(`${day(week.bounds[0])} → ${day(week.bounds[7])}`, 'Oct 19 2026 00:00 → Oct 26 2026 00:00', 'page window: week from Monday, 7 days');
    assertEqual(energyPageWindow('week', at(2026, 10, 25, 9)).bounds[0], at(2026, 10, 19).getTime(), 'page window: Sunday belongs to the week from Monday');
    assertEqual(energyPageWindow('month', at(2026, 2, 10)).bounds.length - 1, 28, 'page window: February 2026 → 28 days');
    assertEqual(energyPageWindow('month', at(2026, 10, 10)).bucket, 'day', 'page window: month asks for days');
    const year = energyPageWindow('year', at(2026, 10, 10));
    assertEqual(year.bounds.length - 1, 12, 'page window: year → 12 months');
    assertEqual(year.bucket, 'month', 'page window: year asks for months');

    let c = energyPageCompare('today', at(2026, 10, 21, 15, 12));
    assertEqual(`${day(c.current.start)}–${day(c.current.end)}`, 'Oct 21 2026 00:00–Oct 21 2026 15:00', 'compare: today up to the last full hour');
    assertEqual(`${day(c.previous.start)}–${day(c.previous.end)}`, 'Oct 20 2026 00:00–Oct 20 2026 15:00', 'compare: yesterday the same hours');
    c = energyPageCompare('today', at(2026, 10, 26, 10, 30)); // the day after DST end
    assertEqual(`${day(c.previous.start)}–${day(c.previous.end)}`, 'Oct 25 2026 00:00–Oct 25 2026 10:00', 'compare: across DST at the same wall times');
    c = energyPageCompare('week', at(2026, 10, 21, 15, 12));
    assertEqual(`${day(c.previous.start)}–${day(c.previous.end)}`, 'Oct 12 2026 00:00–Oct 14 2026 15:00', 'compare: last week the same span');
    c = energyPageCompare('month', at(2026, 10, 31, 18, 5));
    assertEqual(`${day(c.previous.start)}–${day(c.previous.end)}`, 'Sep 01 2026 00:00–Oct 01 2026 00:00', 'compare: 31 Oct → all of September');
    c = energyPageCompare('month', at(2026, 10, 21, 15, 12));
    assertEqual(`${day(c.previous.start)}–${day(c.previous.end)}`, 'Sep 01 2026 00:00–Sep 21 2026 15:00', 'compare: month the same day before');
    c = energyPageCompare('month', at(2026, 3, 30, 9, 45));
    assertEqual(`${day(c.previous.start)}–${day(c.previous.end)}`, 'Feb 01 2026 00:00–Mar 01 2026 00:00', 'compare: 30 Mar → all of February');
    c = energyPageCompare('year', at(2028, 2, 29, 10, 30));
    assertEqual(`${day(c.previous.start)}–${day(c.previous.end)}`, 'Jan 01 2027 00:00–Mar 01 2027 00:00', 'compare: 29 Feb → up to 1 Mar the year before');
    c = energyPageCompare('today', at(2026, 10, 21, 0, 20));
    assertEqual(c.current.end - c.current.start, 0, 'compare: before the first full hour nothing to compare');

    // bars: hourly series into today's window, future stubs, running hour
    const now = at(2026, 10, 21, 15, 12);
    const win = energyPageWindow('today', now);
    const pt = (h, o) => ({ start: at(2026, 10, 21, h).getTime(), gridConsumed: 0, gridReturned: 0, solar: 0, batteryIn: 0, batteryOut: 0, ...o });
    const bars = energyOriginBars(win, [pt(2, { batteryOut: 0.3, gridConsumed: 0.05 }), pt(12, { solar: 2, batteryIn: 0.4, gridReturned: 0.8 }), pt(15, { solar: 0.4 })], now);
    assertEqual(bars.length, 24, 'origin bars: one per hour');
    assert(near(bars[2].batteryHome, 0.3) && near(bars[2].gridHome, 0.05) && bars[2].hasData, 'origin bars: night hour from battery and grid');
    assert(near(bars[12].solarHome, 0.8) && near(bars[12].solarBattery, 0.4) && near(bars[12].produced, 2), 'origin bars: midday solar split');
    assert(bars[15].current && !bars[15].future && bars[16].future && !bars[14].hasData, 'origin bars: running hour, future stubs, empty hours');
    const sh = energyShares(bars);
    assert(near(sh.home, 0.3 + 0.05 + 0.8 + 0.4) && sh.homePct.own === sh.homePct.solar + sh.homePct.battery, 'energy shares: home total and own = solar + battery');
    assertEqual(sh.homePct.solar + sh.homePct.battery + sh.homePct.grid, 100, 'energy shares: origins add up to 100');
    assertEqual(sh.solarPct.self, sh.solarPct.home + sh.solarPct.battery, 'energy shares: self used = home + battery');

    // battery status
    const t0 = at(2026, 10, 21, 15, 12);
    let b = batteryStatus(70.5, -1200, 5.12, t0);
    assertEqual(`${b.state} ${day(b.at)}`, 'charging Oct 21 2026 16:30', 'battery: draft v5 → full at about 16:30');
    b = batteryStatus(40, 500, 5.12, t0);
    assertEqual(`${b.state} ${b.at}`, 'discharging null', 'battery: discharging → no time (the reserve is unknown)');
    assertEqual(batteryStatus(100, -30, 5.12, t0).state, 'full', 'battery: 100 % → full');
    assertEqual(batteryStatus(100, 400, 5.12, t0).state, 'discharging', 'battery: 100 % but discharging → discharging');
    assertEqual(batteryStatus(55, 20, 5.12, t0).state, 'idle', 'battery: under 50 W → idle');
    assertEqual(batteryStatus(55, -800, undefined, t0).at, null, 'battery: no capacity → no time');
    assertEqual(batteryStatus(5, -60, 20, t0).at, null, 'battery: more than 24 h → no time');
    // the repeated hour at DST end keeps its instant: 01:45 CEST + 1 h = 02:45 CEST (00:45Z), not 02:45 CET
    b = batteryStatus(50, -2560, 5.12, new Date(Date.UTC(2026, 9, 24, 23, 45)));
    assertEqual(new Date(b.at).toISOString(), '2026-10-25T00:45:00.000Z', 'battery: quarter hour in the repeated hour');
    // several batteries: charge weighted by capacity, else the mean; one unknown → none
    assert(near(combinedSoc([50, 100], [10, 5]), 200 / 3), 'combined charge: weighted by capacity');
    assert(near(combinedSoc([50, 100], null), 75), 'combined charge: without capacities the mean');
    assertEqual(combinedSoc([50, null], [10, 5]), null, 'combined charge: one unknown → null');
    const ser = combinedSocSeries([[{ t: 0, v: 40 }, { t: 20, v: 60 }], [{ t: 10, v: 100 }]], [3, 1], 0, 30, 10);
    assertEqual(ser.map((p) => p.v).join(), '40,55,70,70', 'combined series: last value per battery, weighted, a battery joins when it has a value');
    assertEqual(combinedSocSeries([[{ t: 5, v: 40 }]], null, 0, 10, 5).length, 2, 'combined series: no point before the first value');
    const ids = energyBatteryIds({ energy_sources: [
      { type: 'battery', stat_energy_from: 'a', stat_energy_to: 'b', stat_soc: 'sensor.soc1', stat_rate: 'sensor.p1', capacity: 5 },
      { type: 'battery', stat_energy_from: 'c', stat_energy_to: 'd', stat_soc: 'sensor.soc2' },
      { type: 'battery', stat_energy_from: 'e', stat_energy_to: 'f' },
    ], device_consumption: [] });
    assertEqual(JSON.stringify(ids), JSON.stringify({ soc: ['sensor.soc1', 'sensor.soc2'], power: [], capacities: null }),
      'battery ids: only batteries with a charge sensor; power and capacity only when every one has them');
    assertEqual(energyBatteryIds({ energy_sources: [{ type: 'battery', stat_energy_from: 'a', stat_energy_to: 'b' }], device_consumption: [] }), null,
      'battery ids: no charge sensor → no battery card');
    const dStart = at(2026, 10, 25).getTime();
    const dNow = at(2026, 10, 25, 14, 10).getTime();
    const demo = demoBatterySoc(dStart, dNow, 71);
    assert(demo[0].t === dStart && demo[demo.length - 1].t === dNow && demo[demo.length - 1].v === 71
      && Math.min(...demo.map((p) => p.v)) === 20, 'demo charge: from midnight, down to 20 %, ends at the entity value (25-hour day)');
    // a 25-hour day: 25 bars, the hour 2:00 twice
    const dst = at(2026, 10, 25, 14);
    const dstBars = energyOriginBars(energyPageWindow('today', dst), [
      { start: Date.UTC(2026, 9, 25, 0), gridConsumed: 0.2, gridReturned: 0, solar: 0, batteryIn: 0, batteryOut: 0 },
      { start: Date.UTC(2026, 9, 25, 1), gridConsumed: 0.3, gridReturned: 0, solar: 0, batteryIn: 0, batteryOut: 0 },
    ], dst);
    assert(dstBars.length === 25 && near(dstBars[2].gridHome, 0.2) && near(dstBars[3].gridHome, 0.3), 'origin bars: DST end → both 2:00 hours apart');
  } finally {
    if (tzBefore === undefined) delete process.env.TZ;
    else process.env.TZ = tzBefore;
  }
  // a second zone with another DST date and a week that starts on a Monday in a different month
  process.env.TZ = 'America/New_York';
  try {
    const at = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);
    assertEqual(energyPageWindow('today', at(2026, 11, 1, 12)).bounds.length - 1, 25, 'page window (New York): DST end 1 Nov → 25 hours');
    assertEqual(energyPageWindow('week', at(2026, 11, 1, 12)).bounds[0], at(2026, 10, 26).getTime(), 'page window (New York): Sunday 1 Nov → week from Monday 26 Oct');
    const c = energyPageCompare('today', at(2026, 11, 2, 9, 10));
    assertEqual(new Date(c.previous.end).getHours(), 9, 'compare (New York): yesterday up to the same wall hour across DST');
  } finally {
    if (tzBefore === undefined) delete process.env.TZ;
    else process.env.TZ = tzBefore;
  }

  // power now: Home Assistant's signs (grid + = import, battery + = discharge), units
  const P = (id, state, unit = 'W') => ({ [id]: { entity_id: id, state, attributes: { unit_of_measurement: unit }, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null } } });
  const prefs = {
    energy_sources: [
      { type: 'grid', stat_energy_from: 'sensor.g_in', stat_energy_to: 'sensor.g_out', stat_rate: 'sensor.g_p', cost_adjustment_day: 0 },
      { type: 'solar', stat_energy_from: 'sensor.s', stat_rate: 'sensor.s_p' },
      { type: 'battery', stat_energy_from: 'sensor.b_out', stat_energy_to: 'sensor.b_in', stat_rate: 'sensor.b_p' },
    ],
    device_consumption: [],
  };
  const ids = energyPowerIds(prefs);
  assertEqual(JSON.stringify(ids), JSON.stringify({ solar: ['sensor.s_p'], grid: ['sensor.g_p'], battery: ['sensor.b_p'] }), 'power ids: one per source');
  assertEqual(energyPowerIds({ ...prefs, energy_sources: [...prefs.energy_sources, { type: 'solar', stat_energy_from: 'sensor.s2' }] }), null, 'power ids: a source without a sensor → none');
  assertEqual(energyPowerIds({ energy_sources: [], device_consumption: [] }), null, 'power ids: nothing configured → none');
  const twoTariff = { ...prefs, energy_sources: [...prefs.energy_sources, { type: 'grid', stat_energy_from: 'sensor.g_in_nt', cost_adjustment_day: 0 }] };
  assertEqual(JSON.stringify(energyPowerIds(twoTariff)?.grid), JSON.stringify(['sensor.g_p']), 'power ids: two-tariff meter → the second grid source needs no sensor');
  assertEqual(energyPowerIds({ ...prefs, energy_sources: prefs.energy_sources.filter((x) => x.type !== 'grid') }), null, 'power ids: off grid → none');
  assertEqual(powerWatts(P('sensor.x', '2.1', 'kW'), 'sensor.x'), 2100, 'power: kW → W');
  assertEqual(powerWatts(P('sensor.x', 'unavailable'), 'sensor.x'), null, 'power: unavailable → null');
  assertEqual(powerWatts(P('sensor.x', '5', 'VA'), 'sensor.x'), null, 'power: unknown unit → null');
  const noon = energyPowerNow(ids, { ...P('sensor.s_p', '2.1', 'kW'), ...P('sensor.g_p', '-300'), ...P('sensor.b_p', '-1200') });
  assert(near(noon.home, 600) && near(noon.flows.solarBattery, 1200) && near(noon.flows.solarGrid, 300), 'power now: draft v5 noon → home 0.6 kW');
  assertEqual(energyNowSentence(noon.flows), 'sunBattery', 'sentence: the sun supplies the home and charges the battery');
  const evening = energyPowerNow(ids, { ...P('sensor.s_p', '0'), ...P('sensor.g_p', '10'), ...P('sensor.b_p', '500') });
  assertEqual(energyNowSentence(evening.flows), 'battery', 'sentence: grid under 50 W → the battery supplies the home');
  const clouds = energyPowerNow(ids, { ...P('sensor.s_p', '800'), ...P('sensor.g_p', '1400'), ...P('sensor.b_p', '0') });
  assertEqual(energyNowSentence(clouds.flows), 'sunAndGrid', 'sentence: not enough sun → the rest from the grid');
  assertEqual(energyPowerNow(ids, { ...P('sensor.s_p', '800'), ...P('sensor.g_p', 'unknown'), ...P('sensor.b_p', '0') }), null, 'power now: a sensor without a number → none');
  assertEqual(energyNowSentence(allocateEnergy(0, 0, 30, 0, 0)), 'idle', 'sentence: everything under 50 W → idle');
  assertEqual(energyNowSentence(allocateEnergy(0, 0, 1500, 1000, 0)), 'gridBattery', 'sentence: the grid supplies the home and charges the battery');

  // cost: Home Assistant's flat grid format with an export price
  const flat = {
    energy_sources: [{ type: 'grid', stat_energy_from: 'sensor.in', stat_energy_to: 'sensor.out', stat_cost: null, entity_energy_price: null, number_energy_price: 0.3, stat_compensation: null, entity_energy_price_export: null, number_energy_price_export: 0.08, cost_adjustment_day: 0 }],
    device_consumption: [],
  };
  const st = { 'sensor.in': [{ start: 0, end: 1, change: 10 }], 'sensor.out': [{ start: 0, end: 1, change: 5 }] };
  assert(near(computeEnergyDashboard(flat, st).cost, 10 * 0.3 - 5 * 0.08), 'cost: flat format subtracts the export compensation');
  const flatStat = { ...flat, energy_sources: [{ ...flat.energy_sources[0], number_energy_price_export: null, stat_compensation: 'sensor.comp' }] };
  assert(energyStatisticIds(flatStat).includes('sensor.comp'), 'cost: the flat compensation statistic is fetched');
  assert(near(computeEnergyDashboard(flatStat, { ...st, 'sensor.comp': [{ start: 0, end: 1, change: 0.6 }] }).cost, 3 - 0.6), 'cost: flat compensation statistic subtracted');
  const twoGrids = { energy_sources: [flat.energy_sources[0], { type: 'grid', stat_energy_from: 'sensor.in2', stat_energy_to: null, stat_cost: null, entity_energy_price: null, number_energy_price: 0.2, stat_compensation: null, entity_energy_price_export: null, number_energy_price_export: null, cost_adjustment_day: 0 }], device_consumption: [] };
  assert(near(computeEnergyDashboard(twoGrids, { ...st, 'sensor.in2': [{ start: 0, end: 1, change: 4 }] }).cost, 3 - 0.4 + 0.8), 'cost: two flat grid sources (two tariffs), export counted once');
  const oldFormat = { energy_sources: [{ type: 'grid', flow_from: [{ stat_energy_from: 'sensor.in', number_energy_price: 0.3 }], flow_to: [{ stat_energy_to: 'sensor.out', number_energy_price: 0.08 }], cost_adjustment_day: 0 }], device_consumption: [] };
  assert(near(computeEnergyDashboard(oldFormat, st).cost, 3 - 0.4), 'cost: the old flow format unchanged');
  const series = computeEnergyDashboard(prefs, { 'sensor.b_in': [{ start: 0, end: 1, change: 0.4 }], 'sensor.b_out': [{ start: 0, end: 1, change: 0.1 }] }).series;
  assert(series.length === 1 && near(series[0].batteryIn, 0.4) && near(series[0].batteryOut, 0.1), 'series: battery charge and discharge per bucket');
}

// ---------------------------------------------------------------------------
// [fork] Heating plan per room (heatingPlan.ts, glas/heizung-zeitplan/PLAN.md)
//
// Room → entities from area + label, the schedule as HA's get_schedule returns it (seconds, end of day as
// 23:59:59.999999), the check that mirrors the save automation in HA, groups of equal days and the status line,
// also on the 23- and 25-hour days (run in Europe/Berlin).
// ---------------------------------------------------------------------------
console.log('\n── heating plan ──');
{
  const E = (entity_id, extra = {}) => ({
    entity_id, area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null,
    original_name: null, icon: null, ...extra,
  });
  const L = [HEATING_PLAN_LABEL];
  const reg = {
    areas: [{ area_id: 'bad', name: 'Bad' }, { area_id: 'flur', name: 'Flur' }, { area_id: 'kueche', name: 'Küche' }],
    devices: [{ id: 'd1', area_id: 'bad', name: 'TRV Bad' }, { id: 'd2', area_id: 'flur', name: 'TRV Flur' }],
    entities: [
      E('input_number.heizplan_bad_komfort', { area_id: 'bad', labels: L, hidden_by: 'user' }),
      E('climate.bad', { device_id: 'd1' }),
      E('automation.advanced_heating_bad', { area_id: 'bad', labels: L }),
      E('schedule.zeitplan_heizung_bad', { area_id: 'bad', labels: L }),
      E('input_number.heizplan_bad_eco', { area_id: 'bad', labels: L }),
      E(HEATING_PLAN_SAVE_AUTOMATION),
      E('climate.flur', { device_id: 'd2' }),
      E('schedule.zeitplan_heizung_flur', { area_id: 'flur', labels: L }),
      E('automation.advanced_heating_kueche', { area_id: 'kueche', labels: L, disabled_by: 'user' }),
      E('automation.advanced_heating_nowhere', { labels: L }),
      E('climate.flur_labelled', { area_id: 'flur', labels: L }),
    ],
  };
  const plans = findHeatingPlans(reg);
  assertEqual(Object.keys(plans).join(','), 'bad', 'plans: only rooms with a labelled, enabled automation');
  assertEqual(JSON.stringify(plans.bad), JSON.stringify({
    areaId: 'bad', automation: 'automation.advanced_heating_bad', schedule: 'schedule.zeitplan_heizung_bad',
    comfort: 'input_number.heizplan_bad_komfort', eco: 'input_number.heizplan_bad_eco', thermostats: ['climate.bad'],
  }), 'plans: automation, schedule, hidden helper by suffix, thermostat via its device');
  assertEqual(findHeatingPlans({ ...reg, entities: [...reg.entities].reverse() }).bad.automation, 'automation.advanced_heating_bad', 'plans: independent of the registry order');

  const states = Object.fromEntries(reg.entities.map((e) => [e.entity_id, { entity_id: e.entity_id, state: 'on', attributes: {} }]));
  const bad = buildRooms(reg, states).find((r) => r.id === 'bad');
  assertEqual(Object.keys(bad.domains).sort().join(','), 'climate', 'buildRooms: labelled entries are not in the room\'s domains');
  assert(bad.entityIds.includes('schedule.zeitplan_heizung_bad'), 'buildRooms: labelled entries stay in entityIds');
  const flur = buildRooms(reg, states).find((r) => r.id === 'flur');
  assertEqual((flur.domains.climate ?? []).join(','), 'climate.flur,climate.flur_labelled', 'buildRooms: the label on a thermostat hides nothing');
  const lr = buildRooms(DEMO_REGISTRIES, DEMO_ENTITIES).find((r) => r.id === 'living_room');
  assert(!lr.domains.automation && !lr.domains.schedule && !lr.domains.input_number, 'demo living room: no heating plan entries among its devices');
  const demoPlan = findHeatingPlans(DEMO_REGISTRIES).living_room;
  assert(demoPlan?.automation === DEMO_HEATING.automation && demoPlan.schedule === DEMO_HEATING.schedule && demoPlan.comfort === DEMO_HEATING.comfort && demoPlan.eco === DEMO_HEATING.eco, 'demo living room: heating plan found');
  assertEqual(demoPlan?.thermostats.join(','), 'climate.living_room', 'demo living room: its thermostat');

  const times = { '06:00:00': '06:00', '7:05': '07:05', '06:00:30': '06:00', '23:59': '23:59', '23:59:59.999999': '24:00', '24:00:00': '24:00', '24:00': '24:00', '24:01': null, '25:00': null, '12:60': null, 'x': null, '': null };
  for (const [input, expected] of Object.entries(times)) assertEqual(normalizeHeatingTime(input), expected, `time ${JSON.stringify(input)}`);
  assertEqual(normalizeHeatingTime(360), null, 'time: a number is not a time');

  const response = {
    'schedule.k': {
      monday: [{ from: '17:00:00', to: '23:59:59.999999' }, { from: '06:00:00', to: '08:00:00', data: { x: 1 } }],
      tuesday: [],
    },
  };
  const week = parseHeatingWeek(response, 'schedule.k');
  assertEqual(JSON.stringify(week.monday), JSON.stringify([{ from: '06:00', to: '08:00' }, { from: '17:00', to: '24:00' }]), 'get_schedule: sorted, seconds cut, end of day 24:00, data dropped');
  assertEqual(week.sunday.length, 0, 'get_schedule: a day left out has no periods');
  assertEqual(parseHeatingWeek(response, 'schedule.other'), null, 'get_schedule: other entity → null');
  assertEqual(parseHeatingWeek({ 'schedule.k': { monday: [{ from: '06:00:00' }] } }, 'schedule.k'), null, 'get_schedule: a period without end → null');
  assertEqual(parseHeatingWeek({ 'schedule.k': { monday: [{ from: '24:00:00', to: '24:00:00' }] } }, 'schedule.k'), null, 'get_schedule: a period from 24:00 → null');
  assertEqual(parseHeatingWeek(null, 'schedule.k'), null, 'get_schedule: no response → null');
  const short = parseHeatingWeek({ 'schedule.k': { monday: [{ from: '05:00:00', to: '06:00:00' }, { from: '06:00:00', to: '06:00:30' }] } }, 'schedule.k');
  assertEqual(JSON.stringify(short.monday), JSON.stringify([{ from: '05:00', to: '06:00' }]), 'get_schedule: a period under a minute is left out');

  const B = (from, to) => ({ from, to });
  assert(validHeatingBlocks([B('17:00', '24:00'), B('06:00', '08:00'), B('08:00', '09:00')]), 'valid: unsorted, touching, until 24:00');
  assert(validHeatingBlocks([]), 'valid: a day without periods');
  assert(!validHeatingBlocks([B('06:00', '08:00'), B('07:30', '09:00')]), 'invalid: overlap');
  assert(!validHeatingBlocks([B('08:00', '08:00')]), 'invalid: empty period');
  assert(!validHeatingBlocks([B('09:00', '08:00')]), 'invalid: from after to');
  assert(!validHeatingBlocks([B('24:00', '24:00')]), 'invalid: from 24:00');
  assert(!validHeatingBlocks([B('6:00', '08:00')]), 'invalid: from without leading zero');
  assert(!validHeatingBlocks([B('06:00:00', '08:00')]), 'invalid: seconds (HAPulse sends HH:MM)');
  assert(!validHeatingBlocks(Array.from({ length: 11 }, (_, i) => B(`${String(i).padStart(2, '0')}:00`, `${String(i).padStart(2, '0')}:30`))), 'invalid: more than 10 periods');

  const days = heatingSaveDays({ ...emptyHeatingWeek(), monday: [{ from: '17:00', to: '24:00', extra: 1 }, B('06:00', '08:00')] }, ['tuesday', 'monday']);
  assertEqual(JSON.stringify(days), JSON.stringify([{ tag: 'monday', bloecke: [B('06:00', '08:00'), B('17:00', '24:00')] }, { tag: 'tuesday', bloecke: [] }]), 'save days: week order, sorted, only from/to');
  const changed = { ...week, tuesday: [B('06:30', '22:00')] };
  assert(heatingWeekMatches(changed, { ...week, tuesday: [B('06:30', '22:00')] }, ['monday', 'tuesday']), 'read back: equal');
  assert(!heatingWeekMatches(changed, week, ['tuesday']), 'read back: the change is missing');
  assert(heatingWeekMatches(changed, week, ['monday']), 'read back: only the sent days count');

  const badWeek = { ...emptyHeatingWeek() };
  for (const d of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) badWeek[d] = [B('05:30', '20:00')];
  for (const d of ['saturday', 'sunday']) badWeek[d] = [B('07:00', '20:00')];
  const groups = heatingDayGroups(badWeek);
  assertEqual(groups.map((g) => heatingDayGroupKind(g.days)).join(','), 'weekdays,weekend', 'groups: workdays and weekend');
  assertEqual(groups[0].blocks[0].from, '05:30', 'groups: periods of the group');
  assertEqual(heatingDayGroups(emptyHeatingWeek()).map((g) => `${heatingDayGroupKind(g.days)}:${g.blocks.length}`).join(), 'daily:0', 'groups: empty week = one group without periods');
  const mixed = { ...badWeek, wednesday: [B('05:30', '12:00')] };
  assertEqual(heatingDayGroups(mixed).map((g) => g.days.join('+')).join(' | '), 'monday+tuesday+thursday+friday | wednesday | saturday+sunday', 'groups: a different Wednesday');
  assertEqual(heatingDayGroupKind(['wednesday']), 'custom', 'group kind: single day');

  const tzBefore = process.env.TZ;
  process.env.TZ = 'Europe/Berlin';
  try {
    const at = (...a) => new Date(...a);
    const status = (now, scheduleOn, w = badWeek, extra = {}) => heatingPlanStatus({ automationOn: true, scheduleOn, week: w, now, ...extra });
    const fmt = (s) => `${s.phase}${s.until ? ` ${s.until.time}+${s.until.dayOffset} ${s.until.weekday}` : ''}`;
    assertEqual(heatingWeekday(at(2026, 9, 24, 12)), 'saturday', 'weekday: 24.10.2026 is a Saturday');
    assertEqual(fmt(status(at(2026, 9, 24, 12, 30), true)), 'comfort 20:00+0 saturday', 'status: comfort until 20:00');
    assertEqual(fmt(status(at(2026, 9, 24, 21, 0), false)), 'eco 07:00+1 sunday', 'status: eco until tomorrow 07:00');
    assertEqual(fmt(status(at(2026, 9, 23, 21, 0), false)), 'eco 07:00+1 saturday', 'status: Friday evening → Saturday 07:00');
    assertEqual(fmt(status(at(2026, 9, 25, 2, 30), false)), 'eco 07:00+0 sunday', 'status: 25-hour day (25.10.), 02:30 → 07:00 today');
    assertEqual(fmt(status(at(2026, 9, 25, 19, 59), true)), 'comfort 20:00+0 sunday', 'status: 25-hour day, comfort until 20:00');
    assertEqual(fmt(status(at(2026, 2, 29, 3, 30), false)), 'eco 07:00+0 sunday', 'status: 23-hour day (29.03.), 03:30 → 07:00 today');
    assertEqual(fmt(status(at(2026, 2, 29, 20, 0), false)), 'eco 05:30+1 monday', 'status: 23-hour day, at the end of the period → eco');
    assertEqual(fmt(status(at(2026, 9, 26, 5, 29, 59), false)), 'eco 05:30+0 monday', 'status: a second before the start → eco');
    const night = { ...emptyHeatingWeek(), monday: [B('17:00', '24:00')], tuesday: [B('00:00', '06:00'), B('06:00', '08:00')] };
    assertEqual(fmt(status(at(2026, 9, 26, 18, 0), true, night)), 'comfort 08:00+1 tuesday', 'status: touching periods count as one, across midnight');
    assertEqual(fmt(status(at(2026, 9, 27, 9, 0), false, night)), 'eco 17:00+6 monday', 'status: next period next Monday');
    const once = { ...emptyHeatingWeek(), monday: [B('06:00', '07:00')] };
    assertEqual(fmt(status(at(2026, 9, 26, 8, 0), false, once)), 'eco 06:00+7 monday', 'status: the only period was earlier today → in a week');
    const always = Object.fromEntries(Object.keys(emptyHeatingWeek()).map((d) => [d, [B('00:00', '24:00')]]));
    assertEqual(fmt(status(at(2026, 9, 24, 12), true, always)), 'comfort', 'status: comfort all week → no end');
    const wrap = { ...always, monday: [B('00:00', '06:00'), B('08:00', '24:00')] };
    assertEqual(fmt(status(at(2026, 9, 26, 10, 0), true, wrap)), 'comfort 06:00+7 monday', 'status: comfort until next Monday 06:00');
    const zero = { ...emptyHeatingWeek(), monday: [B('05:00', '06:00'), B('06:00', '06:00')], tuesday: [B('00:00', '00:00')] };
    assertEqual(fmt(status(at(2026, 9, 26, 5, 30), true, zero)), 'comfort 06:00+0 monday', 'status: an empty period does not hang the end');
    assertEqual(fmt(status(at(2026, 9, 24, 12), false, emptyHeatingWeek())), 'eco', 'status: no periods → eco without end');
    assertEqual(fmt(status(at(2026, 9, 24, 12), null)), 'comfort 20:00+0 saturday', 'status: schedule state unknown → from the periods');
    assertEqual(fmt(status(at(2026, 9, 24, 12), null, null)), 'unknown', 'status: nothing known');
    assertEqual(fmt(heatingPlanStatus({ automationOn: false, scheduleOn: true, week: badWeek, now: at(2026, 9, 24, 12) })), 'off', 'status: automation off');
    assertEqual(fmt(status(at(2026, 9, 24, 12), true, badWeek, { windowOpen: true })), 'window', 'status: window open');
    const ev = at(2026, 9, 26, 5, 30).toISOString();
    assertEqual(fmt(status(at(2026, 9, 24, 22, 0), true, badWeek, { nextEvent: ev })), 'comfort 05:30+2 monday', 'status: state and periods disagree → next_event, across the 25-hour day');
    assertEqual(fmt(status(at(2026, 9, 24, 12), true, null, { nextEvent: at(2026, 9, 25, 0, 0).toISOString() })), 'comfort 24:00+0 saturday', 'status: next_event at midnight = 24:00 today');
    assertEqual(fmt(status(at(2026, 9, 24, 12), true, null, { nextEvent: 'garbage' })), 'comfort', 'status: unreadable next_event → no end');
  } finally {
    if (tzBefore === undefined) delete process.env.TZ;
    else process.env.TZ = tzBefore;
  }

  // demo: get_schedule and the save automation work on the schedule entity's demo periods
  const demoWeek = demoHeatingWeek(DEMO_ENTITIES, DEMO_HEATING.schedule);
  assertEqual(heatingDayGroups(demoWeek).map((g) => `${heatingDayGroupKind(g.days)}:${g.blocks.length}`).join(), 'weekdays:2,weekend:1', 'demo: weekdays with two periods, weekend with one');
  const save = (tage, zeitplan = DEMO_HEATING.schedule) =>
    applyDemoService(DEMO_ENTITIES, 'automation', 'trigger', { variables: { zeitplan, tage } }, { entity_id: HEATING_PLAN_SAVE_AUTOMATION });
  const saved = save([{ tag: 'monday', bloecke: [B('07:00', '09:00')] }, { tag: 'sunday', bloecke: [] }]);
  const savedWeek = demoHeatingWeek(saved, DEMO_HEATING.schedule);
  assert(JSON.stringify(savedWeek.monday) === JSON.stringify([B('07:00', '09:00')]) && savedWeek.sunday.length === 0 && savedWeek.tuesday.length === 2, 'demo save: the sent days change, the others stay');
  assert(saved[HEATING_PLAN_SAVE_AUTOMATION].attributes.last_triggered, 'demo save: the automation ran');
  assertEqual(JSON.stringify(demoHeatingWeek(DEMO_ENTITIES, DEMO_HEATING.schedule)), JSON.stringify(demoWeek), 'demo save: the input map is unchanged');
  const refused = (tage, zeitplan, label) => assertEqual(JSON.stringify(demoHeatingWeek(save(tage, zeitplan), DEMO_HEATING.schedule)), JSON.stringify(demoWeek), label);
  refused([{ tag: 'monday', bloecke: [B('07:00', '09:00')] }, { tag: 'tuesday', bloecke: [B('09:00', '08:00')] }], undefined, 'demo save: one invalid day → nothing saved');
  refused([{ tag: 'funday', bloecke: [] }], undefined, 'demo save: unknown weekday → nothing saved');
  refused([{ tag: 'monday', bloecke: [] }], 'input_number.heating_plan_living_room_eco', 'demo save: not a schedule → nothing saved');
  refused([], undefined, 'demo save: no days → nothing saved');
  const setValue = (id, value) => applyDemoService(DEMO_ENTITIES, 'input_number', 'set_value', { value }, { entity_id: id })[id].state;
  assertEqual(setValue(DEMO_HEATING.comfort, 22.5), '22.5', 'demo: comfort helper takes a value');
  assertEqual(setValue(DEMO_HEATING.eco, 40), DEMO_ENTITIES[DEMO_HEATING.eco].state, 'demo: a value above max is refused');
  assertEqual(setValue('input_number.poolpumpe_manuell_dauer', 30), DEMO_ENTITIES['input_number.poolpumpe_manuell_dauer'].state, 'demo: other helpers unchanged as before');
}

// [fork] Heating plan, Etappe 2a: the room's windows, whether the thermostat follows, the demo schedule on the clock
console.log('\n── heating plan: room ──');
{
  const S = (entity_id, state, attributes = {}) => ({
    entity_id, state, attributes, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null },
  });
  const entities = {
    'binary_sensor.w': S('binary_sensor.w', 'off', { device_class: 'window' }),
    'binary_sensor.d': S('binary_sensor.d', 'on', { device_class: 'door' }),
    'binary_sensor.o': S('binary_sensor.o', 'off', { device_class: 'opening' }),
    'binary_sensor.m': S('binary_sensor.m', 'on', { device_class: 'motion' }),
    'sensor.w': S('sensor.w', '1', { device_class: 'window' }),
  };
  const ids = ['binary_sensor.w', 'binary_sensor.d', 'binary_sensor.o', 'binary_sensor.m', 'sensor.w', 'binary_sensor.gone'];
  assertEqual(heatingWindowSensors(ids, entities).join(), 'binary_sensor.w,binary_sensor.d,binary_sensor.o', 'windows: window, door and opening contacts only');

  const now = Date.UTC(2026, 9, 24, 12);
  const T = (state, temperature, step) => S('climate.t', state, { temperature, ...(step ? { target_temp_step: step } : {}) });
  const dev = (thermostats, extra = {}) =>
    heatingThermostatDeviates({ phase: 'comfort', expected: 21, thermostats, changedAt: now - HEATING_FOLLOW_GRACE_MS, now, ...extra });
  assert(!dev([T('heat', 21)]), 'follow: holds the value');
  assert(!dev([T('heat', 21.2)]), 'follow: within half a step');
  assert(dev([T('heat', 22)]), 'follow: set by hand');
  assert(!dev([T('heat', 21.5, 1)]), 'follow: a whole-degree thermostat rounds half a degree');
  assert(dev([T('heat', 22, 1)]), 'follow: a whole-degree thermostat a degree off');
  assert(dev([T('off')]), 'follow: switched off');
  assert(!dev([T('unavailable'), undefined]), 'follow: an unavailable thermostat says nothing');
  assert(dev([T('heat', 21), T('heat', 18)]), 'follow: one of two thermostats is enough');
  assert(!dev([T('heat', 22)], { changedAt: now - HEATING_FOLLOW_GRACE_MS + 1 }), 'follow: grace after a change');
  assert(!dev([T('heat', 22)], { phase: 'window' }), 'follow: not with the window open');
  assert(!dev([T('off')], { phase: 'off' }), 'follow: not with the plan off');
  assert(!dev([T('heat', 22)], { expected: null }), 'follow: no expected value');
  assert(!dev([T('heat', '22')]), 'follow: no numeric target');
  assert(dev([T('heat', 16)], { phase: 'eco', expected: 18 }), 'follow: eco too');

  // demo: the schedule's state and next_event follow the clock (Monday 26 Oct 2026, the day after the 25-hour day)
  const first = demoHeatingWeek(DEMO_ENTITIES, DEMO_HEATING.schedule).monday[0];
  const [fh, fm] = first.from.split(':').map(Number);
  const map = { ...DEMO_ENTITIES };
  const original = map[DEMO_HEATING.schedule];
  const before = new Date(2026, 9, 26, fh, fm - 1);
  tickDemoHeating(map, before);
  assertEqual(map[DEMO_HEATING.schedule].state, 'off', 'demo tick: off before the first period');
  assertEqual(new Date(map[DEMO_HEATING.schedule].attributes.next_event).getTime(), new Date(2026, 9, 26, fh, fm).getTime(), 'demo tick: next_event = start of the period');
  const inside = new Date(2026, 9, 26, fh, fm + 1);
  tickDemoHeating(map, inside);
  assertEqual(map[DEMO_HEATING.schedule].state, 'on', 'demo tick: on inside the period');
  assertEqual(map[DEMO_HEATING.schedule].last_changed, inside.toISOString(), 'demo tick: last_changed moves with the state');
  const kept = map[DEMO_HEATING.schedule];
  tickDemoHeating(map, new Date(inside.getTime() + 1000));
  assert(map[DEMO_HEATING.schedule] === kept, 'demo tick: nothing changed → the same entity');
  assert(DEMO_ENTITIES[DEMO_HEATING.schedule] === original, 'demo tick: the demo map itself is untouched');
}

console.log('\n── heating plan: editing the periods ──');
{
  const B = (from, to) => ({ from, to });
  const day = [B('06:00', '08:30'), B('16:30', '22:00')];
  assertEqual(heatingTimeOf(0), '00:00', 'edit: 0 = 00:00');
  assertEqual(heatingTimeOf(1440), '24:00', 'edit: 1440 = 24:00');
  assertEqual(heatingTimeOf(1500), '24:00', 'edit: beyond the day = 24:00');
  assertEqual(JSON.stringify(heatingEdgeRange(day, 0, 'from')), JSON.stringify({ min: 0, max: 505 }), 'edit: first start from midnight to 5 min before its end');
  assertEqual(JSON.stringify(heatingEdgeRange(day, 0, 'to')), JSON.stringify({ min: 365, max: 990 }), 'edit: first end up to the next start');
  assertEqual(JSON.stringify(heatingEdgeRange(day, 1, 'to')), JSON.stringify({ min: 995, max: 1440 }), 'edit: last end up to 24:00');
  assertEqual(JSON.stringify(heatingEdgeRange(day, 1, 'from')), JSON.stringify({ min: 510, max: 1315 }), 'edit: second start after the first end');
  assertEqual(moveHeatingEdge(day, 0, 'from', 333)[0].from, '05:35', 'edit: snapped to 5 minutes');
  assertEqual(moveHeatingEdge(day, 0, 'to', 1200)[0].to, '16:30', 'edit: an end stops at the next start (touching)');
  assertEqual(moveHeatingEdge(day, 1, 'from', 0)[1].from, '08:30', 'edit: a start stops at the previous end');
  assertEqual(moveHeatingEdge(day, 1, 'to', 2000)[1].to, '24:00', 'edit: the last end stops at 24:00');
  {
    // A period shorter than a step (set outside HAPulse) keeps a range around its own value and never flips
    const odd = [{ from: '05:00', to: '06:00' }, { from: '06:00', to: '06:03' }];
    assertEqual(JSON.stringify(heatingEdgeRange(odd, 1, 'from')), JSON.stringify({ min: 360, max: 360 }), 'edit: a too short period keeps its start in range');
    const moved = moveHeatingEdge(odd, 1, 'from', 400);
    assertEqual(moved[1].from, '06:00', 'edit: a too short period does not flip its start past its end');
    assertEqual(validHeatingBlocks(moveHeatingEdge(odd, 1, 'to', 500)), true, 'edit: a too short period can grow');
  }
  assertEqual(moveHeatingEdge(day, 0, 'from', 900)[0].from, '08:25', 'edit: a start stays a step before its end');
  assert(moveHeatingEdge(day, 0, 'from', 900)[1] === day[1], 'edit: the other periods stay the same objects');
  assert(validHeatingBlocks(moveHeatingEdge(day, 0, 'to', 1200)), 'edit: a moved day stays valid');
  // ring: the side of midnight closest to the current value
  assertEqual(heatingRingMinutes(90, 300), 360, 'ring: 90° = 06:00');
  assertEqual(heatingRingMinutes(355, 1380), 1440 - 20, 'ring: just before the top from the evening = late evening');
  assertEqual(heatingRingMinutes(5, 1420), 1440 + 20, 'ring: past the top from the evening runs beyond the end (clamped later)');
  assertEqual(heatingRingMinutes(355, 30), -20, 'ring: before the top from the morning runs below 0 (clamped later)');
  assertEqual(moveHeatingEdge(day, 1, 'to', heatingRingMinutes(5, 1320))[1].to, '24:00', 'ring: dragging the last end past the top stops at 24:00');
  assertEqual(moveHeatingEdge(day, 0, 'from', heatingRingMinutes(355, 360))[0].from, '00:00', 'ring: dragging the first start past the top stops at 00:00');
  // adding and removing
  assertEqual(JSON.stringify(addHeatingBlock([])), JSON.stringify([B('06:00', '22:00')]), 'add: a day without periods gets 06:00–22:00');
  const added = addHeatingBlock(day);
  assert(added && added.length === 3 && validHeatingBlocks(added), 'add: a third period fits and stays valid');
  assertEqual(JSON.stringify(added[1]), JSON.stringify(B('09:30', '11:30')), 'add: in the largest stretch (08:30–16:30), an hour in, two hours long');
  assertEqual(addHeatingBlock([B('00:00', '23:50')]), null, 'add: no room for 15 minutes with space around → null');
  const full = Array.from({ length: HEATING_MAX_BLOCKS }, (_, i) => B(`${String(i * 2).padStart(2, '0')}:00`, `${String(i * 2).padStart(2, '0')}:30`));
  assertEqual(addHeatingBlock(full), null, 'add: at most HEATING_MAX_BLOCKS periods');
  assertEqual(JSON.stringify(removeHeatingBlock(day, 0)), JSON.stringify([B('16:30', '22:00')]), 'remove: the period goes');
  assertEqual(heatingBlockMinutes(B('05:30', '20:00')), 870, 'length: 14 h 30 min');
  assertEqual(heatingBlockMinutes(B('22:00', '24:00')), 120, 'length: up to 24:00');
  // time fields
  assertEqual(heatingFieldMinutes('05:32', 'from'), 330, 'field: snapped');
  assertEqual(heatingFieldMinutes('00:00', 'to'), 1440, 'field: 00:00 as an end = 24:00');
  assertEqual(heatingFieldMinutes('00:00', 'from'), 0, 'field: 00:00 as a start = midnight');
  assertEqual(heatingFieldMinutes('', 'from'), null, 'field: empty = null');
  assertEqual(heatingFieldMinutes('25:00', 'to'), null, 'field: no time = null');
  assertEqual(heatingFieldValue('24:00'), '00:00', 'field: 24:00 shows as 00:00');
  // the week
  const week = { ...emptyHeatingWeek(), monday: day, tuesday: day, saturday: [B('08:00', '22:30')] };
  const blocks = [B('07:00', '21:00')];
  const next = heatingWeekWith(week, ['monday', 'saturday'], blocks);
  assertEqual(next.monday[0].from, '07:00', 'week: the chosen days get the periods');
  assert(next.tuesday === day, 'week: the other days keep theirs');
  assert(week.monday === day, 'week: the old week is untouched');
  assertEqual(heatingChangedDays(week, ['sunday', 'monday', 'tuesday'], day).join(), 'sunday', 'changed days: only those that differ');
  assertEqual(heatingChangedDays(week, ['saturday', 'monday'], blocks).join(), 'monday,saturday', 'changed days: in week order');
}

// ---------------------------------------------------------------------------
// [fork] Heating plan: set up with one button (heatingSetup.ts, glas/heizung-zeitplan/PLAN-ETAPPE-4.md)
//
// Which rooms have a thermostat but no plan, the ids of the new entries (umlauts, rooms that share a name, a setup that
// stopped halfway), the start values, the automation's config, the hint and the demo setup.
// ---------------------------------------------------------------------------
console.log('\n── heating plan: set up ──');
{
  // slug and ids
  assertEqual(heatingRoomSlug('Küche'), 'kueche', 'slug: ü → ue');
  assertEqual(heatingRoomSlug('Zimmer Jannick'), 'zimmer_jannick', 'slug: space → _');
  assertEqual(heatingRoomSlug('Bad/WC  Süd'), 'bad_wc_sued', 'slug: runs of other characters → one _');
  assertEqual(heatingRoomSlug('Großes Café'), 'grosses_cafe', 'slug: ß → ss, accents dropped');
  assertEqual(heatingRoomSlug('  ✨  '), 'raum', 'slug: nothing left → raum');
  assertEqual(heatingSetupAutomationId('0f3a9c2e-1b'), 'heizplan_0f3a9c2e_1b', 'automation id: fixed per area, safe characters');

  const cl = (id, state, attrs = {}) => ({ entity_id: id, state, attributes: { hvac_modes: ['off', 'heat'], ...attrs }, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null } });
  assert(heatingCanHeat(cl('climate.a', 'off')), 'can heat: heat in hvac_modes');
  assert(!heatingCanHeat(cl('climate.a', 'cool', { hvac_modes: ['off', 'cool'] })), 'can heat: an air conditioner without heat');
  assert(heatingCanCool(cl('climate.a', 'off', { hvac_modes: ['off', 'heat_cool'] })), 'can cool: heat_cool');
  assert(!heatingCanCool(cl('climate.a', 'off')), 'can cool: a radiator thermostat');
  assert(!heatingCanHeat(undefined), 'can heat: no state');

  // rooms without a plan
  const E = (entity_id, extra = {}) => ({
    entity_id, area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null,
    original_name: null, icon: null, ...extra,
  });
  const L = [HEATING_PLAN_LABEL];
  const reg = {
    areas: [
      { area_id: 'bad', name: 'Bad' }, { area_id: 'kueche', name: 'Küche' }, { area_id: 'buero', name: 'Büro' },
      { area_id: 'flur', name: 'Flur' }, { area_id: 'keller', name: 'Keller' }, { area_id: 'gast', name: 'Gast' },
    ],
    devices: [{ id: 'dk', area_id: 'kueche', name: 'TRV Küche' }],
    entities: [
      E('climate.bad', { area_id: 'bad' }),
      E('automation.advanced_heating_bad', { area_id: 'bad', labels: L }),
      E('climate.kueche', { device_id: 'dk' }),
      E('climate.kueche_hidden', { area_id: 'kueche', hidden_by: 'user' }),
      E('climate.kueche_off', { area_id: 'kueche', disabled_by: 'user' }),
      E('climate.buero_ac', { area_id: 'buero' }),
      E('climate.buero', { area_id: 'buero' }),
      E('climate.flur', { area_id: 'flur' }),
      E('climate.keller', { area_id: 'keller', labels: [HEATING_SKIP_LABEL] }),
      E('climate.gast', { area_id: 'gast' }),
      E('climate.gast_2', { area_id: 'gast', labels: [HEATING_SKIP_LABEL] }),
      E('climate.nowhere'),
    ],
  };
  const states = Object.fromEntries([
    cl('climate.bad', 'heat'), cl('climate.kueche', 'off'), cl('climate.kueche_hidden', 'off'), cl('climate.kueche_off', 'off'),
    cl('climate.buero_ac', 'cool', { hvac_modes: ['off', 'cool', 'fan_only'] }), cl('climate.buero', 'unavailable'),
    cl('climate.flur', 'heat'), cl('climate.keller', 'off'), cl('climate.gast', 'off'), cl('climate.gast_2', 'off'), cl('climate.nowhere', 'off'),
  ].map((s) => [s.entity_id, s]));
  const plans = findHeatingPlans(reg);
  const rooms = findHeatingSetupRooms({ registries: reg, entities: states, plans, covered: new Set(['climate.flur']) });
  assertEqual(
    rooms.map((r) => `${r.areaId}:${r.thermostats.join('+')}:${r.skipped ? 'skip' : 'set'}`).join(' '),
    'gast:climate.gast+climate.gast_2:set keller:climate.keller:skip kueche:climate.kueche:set',
    'setup rooms: plan room, hidden, disabled, air conditioner, unavailable, covered elsewhere and no area are left out; skipped only when all carry the label; by name',
  );
  assertEqual(rooms.find((r) => r.areaId === 'kueche').name, 'Küche', 'setup rooms: the area name');
  assertEqual(findHeatingSetupRooms({ registries: reg, entities: { ...states, 'climate.buero': cl('climate.buero', 'heat') }, plans, covered: new Set() }).map((r) => r.areaId).join(), 'buero,flur,gast,keller,kueche',
    'setup rooms: back when reachable; a thermostat no automation uses counts');

  // search/related
  assertEqual(heatingRelatedIds({ automation: ['automation.a', 3, 'automation.b'] }, 'automation').join(), 'automation.a,automation.b', 'related: strings under the key');
  assertEqual(heatingRelatedIds(null, 'automation').length, 0, 'related: no answer → nothing');
  assertEqual(heatingRelatedIds({ entity: 'x' }, 'entity').length, 0, 'related: not a list → nothing');
  assertEqual([...heatingCoveredThermostats([{ entity: ['climate.a', 'schedule.s', 'input_number.k'] }, { entity: ['climate.b', 'climate.a'] }, {}])].sort().join(),
    'climate.a,climate.b', 'covered: only thermostats, from all automations');

  // contacts
  const bs = (id, dc) => [id, { entity_id: id, state: 'off', attributes: { device_class: dc } }];
  const contactStates = Object.fromEntries([bs('binary_sensor.t', 'door'), bs('binary_sensor.f', 'window'), bs('binary_sensor.o', 'opening'), bs('binary_sensor.g', 'garage_door'), bs('binary_sensor.m', 'motion')]);
  assertEqual(heatingSetupContacts(['binary_sensor.t', 'binary_sensor.g', 'binary_sensor.o', 'binary_sensor.m', 'binary_sensor.f', 'light.x'], contactStates).map((c) => `${c.id}:${c.preselected ? 1 : 0}`).join(),
    'binary_sensor.f:1,binary_sensor.o:1,binary_sensor.t:0', 'contacts: windows and openings chosen, doors offered, garage doors and the rest left out');

  // temperatures
  assertEqual(heatingSnapTemp(20.26, { min: 5, max: 30, step: 0.5 }), 20.5, 'snap: to the step');
  assertEqual(heatingSnapTemp(3, { min: 7, max: 30, step: 0.5 }), 7, 'snap: into the range');
  const t1 = heatingSetupTemps([cl('climate.a', 'off', { min_temp: 7, max_temp: 35, target_temp_step: 0.5, temperature: 5 }), cl('climate.b', 'heat', { min_temp: 4.5, max_temp: 28, target_temp_step: 1, temperature: 20.4 })]);
  assertEqual(JSON.stringify(t1), JSON.stringify({ min: 7, max: 28, step: 1, comfort: 20, eco: 20 }), 'temps: narrowest range, coarsest step, the running thermostat\'s target');
  assertEqual(JSON.stringify(heatingSetupTemps([cl('climate.a', 'off', { temperature: 5 })])), JSON.stringify({ min: 5, max: 30, step: 0.5, comfort: 5, eco: 5 }), 'temps: all off → the minimum');
  assertEqual(JSON.stringify(heatingSetupTemps([cl('climate.a', 'heat', { min_temp: 25, max_temp: 20, temperature: 22 })])), JSON.stringify({ min: 5, max: 30, step: 0.5, comfort: 22, eco: 22 }), 'temps: an impossible range → 5–30');
  assertEqual(heatingSetupTemps([]).comfort, 5, 'temps: no thermostat → the minimum');

  // ids of the new entries
  const ids = (numbers, schedules) => JSON.stringify(heatingSetupIds('kueche', 'k1', numbers, schedules));
  assertEqual(ids([], []), JSON.stringify({ comfort: 'heizplan_kueche_komfort', eco: 'heizplan_kueche_eco', schedule: 'zeitplan_heizung_kueche' }), 'ids: from the slug');
  assertEqual(ids([{ id: 'heizplan_kueche_komfort', areaId: 'k1' }, { id: 'heizplan_kueche_eco', areaId: null }], [{ id: 'zeitplan_heizung_kueche', areaId: null }]),
    JSON.stringify({ comfort: 'heizplan_kueche_komfort', eco: 'heizplan_kueche_eco', schedule: 'zeitplan_heizung_kueche' }), 'ids: entries of this room or of none are taken over');
  assertEqual(ids([{ id: 'heizplan_kueche_eco', areaId: 'k2' }], []),
    JSON.stringify({ comfort: 'heizplan_kueche_2_komfort', eco: 'heizplan_kueche_2_eco', schedule: 'zeitplan_heizung_kueche_2' }), 'ids: one taken by another room → all with _2');
  const taken = new Set(['input_number.heizplan_kueche_2_komfort']);
  assertEqual(heatingSuffixedEntityId('input_number.heizplan_kueche_komfort', '_komfort', taken), null, 'entity id: ends right → keep');
  assertEqual(heatingSuffixedEntityId('input_number.heizplan_kueche_komfort_2', '_komfort', taken), 'input_number.heizplan_kueche_3_komfort', 'entity id: HA\'s _2 → number before the ending, the next free one');
  assertEqual(heatingSuffixedEntityId('input_number.heizplan_kueche_eco_2', '_eco', new Set()), 'input_number.heizplan_kueche_2_eco', 'entity id: eco');

  // the automation
  const config = heatingAutomationConfig({
    roomName: 'Küche', description: 'Heizplan Küche: …', thermostats: ['climate.kueche'], contacts: ['binary_sensor.f'],
    schedule: 'schedule.zeitplan_heizung_kueche', comfort: 'input_number.heizplan_kueche_komfort', eco: 'input_number.heizplan_kueche_eco',
    comfortValue: 20, ecoValue: 20,
  });
  assertEqual(JSON.stringify(config), JSON.stringify({
    alias: 'Advanced Heating Küche',
    description: 'Heizplan Küche: …',
    use_blueprint: {
      path: HEATING_BLUEPRINT_PATH,
      input: {
        input_log_level: 'info', input_physical_change: false, input_schedulers: ['schedule.zeitplan_heizung_kueche'],
        input_temperature_comfort: 'input_number.heizplan_kueche_komfort', input_temperature_comfort_static: 20,
        input_temperature_eco: 'input_number.heizplan_kueche_eco', input_temperature_eco_static: 20,
        input_trvs: ['climate.kueche'], input_windows: ['binary_sensor.f'],
      },
    },
  }), 'automation: the inputs of the WC');
  assert(!('input_windows' in heatingAutomationConfig({ ...{ roomName: 'X', description: '', thermostats: ['climate.x'], contacts: [], schedule: 's', comfort: 'c', eco: 'e', comfortValue: 5, ecoValue: 5 } }).use_blueprint.input),
    'automation: no contacts → no window input');
  assertEqual(JSON.stringify(heatingPriorStates([cl('climate.k', 'off', { friendly_name: 'TRV Küche', temperature: 5 }), undefined, cl('climate.x', 'heat')])),
    JSON.stringify([{ name: 'TRV Küche', mode: 'off', temperature: 5 }, { name: 'climate.x', mode: 'heat', temperature: null }]), 'prior states: name, mode, target');

  // the hint
  const hint = collectHints([], { now: 0, heatingMissing: [{ areaId: 'k2', name: 'Küche', thermostats: ['climate.b', 'climate.a'] }, { areaId: 'b1', name: 'Bad', thermostats: ['climate.c'] }, { areaId: 'h', name: 'Hidden', thermostats: ['climate.h'] }], hidden: new Set(['climate.h']) });
  assertEqual(hint.hints.map((h) => `${h.id}:${h.severity}:${h.entityIds.join('+')}:${h.room?.name}`).join(' '),
    'heating-missing:b1:info:climate.c:Bad heating-missing:k2:info:climate.a+climate.b:Küche', 'hint: one per room by name, info, hidden thermostats left out');

  // the demo setup
  const bedroom = findHeatingSetupRooms({ registries: DEMO_REGISTRIES, entities: DEMO_ENTITIES, plans: findHeatingPlans(DEMO_REGISTRIES), covered: new Set(findHeatingPlans(DEMO_REGISTRIES).living_room.thermostats) });
  assertEqual(bedroom.map((r) => r.areaId).join(), 'bedroom', 'demo: the bedroom has a thermostat but no plan');
  const setup = {
    areaId: 'bedroom', roomName: 'Bedroom', automation: 'automation.advanced_heating_bedroom', schedule: 'schedule.zeitplan_heizung_bedroom',
    comfort: 'input_number.heizplan_bedroom_komfort', eco: 'input_number.heizplan_bedroom_eco', comfortValue: 18, ecoValue: 18, min: 5, max: 30, step: 0.5,
  };
  const done = demoHeatingSetup(DEMO_ENTITIES, DEMO_REGISTRIES.entities, setup, new Date('2026-10-25T08:00:00Z'));
  const demoReg = { ...DEMO_REGISTRIES, entities: done.entries };
  assertEqual(JSON.stringify(findHeatingPlans(demoReg).bedroom), JSON.stringify({
    areaId: 'bedroom', automation: setup.automation, schedule: setup.schedule, comfort: setup.comfort, eco: setup.eco, thermostats: ['climate.bedroom'],
  }), 'demo setup: the bedroom has its plan');
  assertEqual(done.entities[setup.comfort].state, '18.0', 'demo setup: the helper holds the start value');
  assert(done.entities[setup.eco].attributes[DEMO_SETUP_ATTRIBUTE] === true, 'demo setup: the helpers are marked');
  assert(!DEMO_ENTITIES[setup.comfort] && !DEMO_REGISTRIES.entities.some((e) => e.entity_id === setup.automation), 'demo setup: the inputs are untouched');
  assertEqual(demoHeatingSetup(done.entities, done.entries, setup, new Date()).entries.length, done.entries.length, 'demo setup: a second setup adds nothing');
  const set = applyDemoService(done.entities, 'input_number', 'set_value', { value: 21 }, { entity_id: setup.comfort });
  assertEqual(set[setup.comfort].state, '21.0', 'demo setup: set_value works on the new helpers');
  assertEqual(findHeatingSetupRooms({ registries: demoReg, entities: done.entities, plans: findHeatingPlans(demoReg), covered: new Set() }).length, 0, 'demo setup: no room left without a plan');
}
