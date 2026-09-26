import { describe, expect, it } from 'vitest';
import { cameraSourceFor, camerasForArea, isHaCameraEntity, suggestArea, withoutHaCameras } from '../src/nvr/cameraSource';
import { resolveNvrConfig, nvrUsable } from '../src/nvr/config';
import type { SentinelCamera } from '@sentinel-nvr/web/api';

const cam = (id: string, name: string): SentinelCamera =>
  ({ id, name, recording: true, online: true, lastSegmentAt: 0, eventsToday: 0, lastEventTs: 0, latestThumbId: null, latestTs: 0, codecs: '' }) as unknown as SentinelCamera;

describe('camera source', () => {
  it('Sentinel only when URL AND token are present', () => {
    expect(cameraSourceFor(null)).toBe('ha');
    expect(cameraSourceFor(resolveNvrConfig('https://nvr.example:10443', ''))).toBe('ha'); // URL shared, token not
    expect(nvrUsable(resolveNvrConfig('https://nvr.example:10443', ''))).toBe(false);
    expect(cameraSourceFor(resolveNvrConfig('https://nvr.example:10443', 'TOK'))).toBe('sentinel');
    // old installs: token inside the URL
    expect(cameraSourceFor(resolveNvrConfig('https://nvr.example:10443/endpoint/@local/sentinel-nvr/public/?token=T', ''))).toBe('sentinel');
  });

  it('filters HA camera entities only while Sentinel is the source', () => {
    const ids = ['light.a', 'camera.pool', 'switch.b'];
    expect(withoutHaCameras(ids, 'sentinel')).toEqual(['light.a', 'switch.b']);
    expect(withoutHaCameras(ids, 'ha')).toBe(ids);
    expect(isHaCameraEntity('camera.x')).toBe(true);
    expect(isHaCameraEntity('binary_sensor.camera_motion')).toBe(false);
  });

  it('room assignment picks the cameras mapped to the area', () => {
    const cams = [cam('33', 'Pool'), cam('34', 'Einfahrt'), cam('35', 'Garten')];
    const map = { '33': 'aussen', '34': null, '35': 'garten' };
    expect(camerasForArea(map, 'aussen', cams).map((c) => c.id)).toEqual(['33']);
    expect(camerasForArea(map, 'garten', cams).map((c) => c.id)).toEqual(['35']);
    expect(camerasForArea({}, 'aussen', cams)).toEqual([]);
  });

  it('suggests an area by name (longest match, accents/ß, no guessing)', () => {
    const areas = [
      { id: 'pool', name: 'Pool' },
      { id: 'garten', name: 'Garten' },
      { id: 'garten_nord', name: 'Garten Nord' },
      { id: 'strasse', name: 'Straße' },
      { id: 'buero', name: 'Büro' },
    ];
    expect(suggestArea('Kamera Pool', areas)).toBe('pool');
    expect(suggestArea('Garten Nord 2', areas)).toBe('garten_nord');
    expect(suggestArea('Garten', areas)).toBe('garten');
    expect(suggestArea('Strasse Ost', areas)).toBe('strasse');
    expect(suggestArea('buero', areas)).toBe('buero');
    expect(suggestArea('IP5M-T1179E', areas)).toBeNull();
    expect(suggestArea('Po', areas)).toBeNull(); // too short to guess
  });
});
