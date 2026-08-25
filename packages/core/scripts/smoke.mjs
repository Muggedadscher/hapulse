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
assertEqual(formatEntityState(TEMP_SENSOR, 'fr', label), '21.3 °C',
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
const empty = dailyRuntimeBars([], [d0, d0 + DAY]);
assertEqual(empty[0].hasData, false, 'a day with no samples has hasData=false');
assertEqual(empty[0].value, 0, 'a day with no samples has value 0');
