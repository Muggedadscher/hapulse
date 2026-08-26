/**
 * CameraGrid — Live camera snapshots with 10s refresh.
 *
 * Uses each camera entity's `entity_picture` attribute — a pre-signed
 * `/api/camera_proxy/...?token=…` URL HA serves for unauthenticated `<img>`
 * loads. This works in BOTH OAuth mode (no long-lived token available to the
 * app) and token mode, and avoids the CORS preflight an `Authorization`-header
 * fetch would trigger. Falls back to a placeholder for demo mode / no picture.
 */

import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useT } from '../../i18n/useT';
import { Card } from '../ui/Card';
import { resolveEntityPicture } from '../../lib/media';
import type { HassEntity, Room } from '@hapulse/core';
import { getRoomName } from './roomUtils';
import { useUIStore } from '../../stores/uiStore';
import './CameraGrid.css';

const REFRESH_INTERVAL_MS = 10_000;

// ---------------------------------------------------------------------------
// Single camera tile
// ---------------------------------------------------------------------------

interface CameraTileProps {
  entity: HassEntity;
  motionActive?: boolean | undefined;
  roomName?: string | undefined;
}

function CameraTile({ entity, motionActive, roomName }: CameraTileProps) {
  const t = useT();
  const url = useConnectionStore((s) => s.url);
  const demo = useConnectionStore((s) => s.demo);

  const name = (entity.attributes['friendly_name'] as string | undefined) ?? entity.entity_id;

  const picture = entity.attributes['entity_picture'] as string | undefined;
  const base = demo ? null : resolveEntityPicture(picture, url || null);

  const [tick, setTick] = useState(0);
  const [error, setError] = useState(false);

  // Reset the error state whenever the underlying picture URL changes
  // (e.g. HA rotated the signed token).
  useEffect(() => { setError(false); }, [base]);

  useEffect(() => {
    if (!base) return;
    const interval = setInterval(() => setTick((t) => t + 1), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [base]);

  const src = base ? `${base}${base.includes('?') ? '&' : '?'}_ts=${tick}` : null;

  const openEntityDetail = useUIStore((st) => st.openEntityDetail);

  return (
    <Card
      className="camera-tile camera-tile--pressable"
      onClick={() => openEntityDetail(entity.entity_id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openEntityDetail(entity.entity_id);
        }
      }}
    >
      <div className="camera-tile__frame">
        {src && !error ? (
          <img
            src={src}
            alt={name}
            className="camera-tile__img"
            onError={() => setError(true)}
          />
        ) : (
          <div className="camera-tile__placeholder" aria-hidden="true">
            <Camera size={32} strokeWidth={1.5} />
          </div>
        )}

        {/* Motion badge */}
        {motionActive && (
          <span className="camera-tile__motion-badge" aria-label={t('security.cameras.motionDetectedAria')}>
            {t('security.sensor.motion')}
          </span>
        )}
      </div>

      <div className="camera-tile__footer">
        <span className="camera-tile__name">{name}</span>
        {roomName && <span className="camera-tile__room">{roomName}</span>}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Camera grid
// ---------------------------------------------------------------------------

interface CameraGridProps {
  cameras: HassEntity[];
  rooms: Room[];
  motionSensors: HassEntity[];
}

export function CameraGrid({ cameras, rooms, motionSensors }: CameraGridProps) {
  return (
    <div className="camera-grid">
      {cameras.map((cam) => {
        const roomName = getRoomName(cam.entity_id, rooms);
        // Find a motion sensor sharing the same room
        const motionActive = motionSensors.some((ms) => {
          const msRoom = getRoomName(ms.entity_id, rooms);
          return msRoom !== undefined && msRoom === roomName && ms.state === 'on';
        });

        return (
          <CameraTile
            key={cam.entity_id}
            entity={cam}
            motionActive={motionActive}
            roomName={roomName}
          />
        );
      })}
    </div>
  );
}
