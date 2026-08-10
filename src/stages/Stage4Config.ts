import * as THREE from 'three';
import { STAGE3 } from './Stage3Config';

export const STAGE4 = {
  arenaRadius: 30,
  wallHeight: 50,
  start: new THREE.Vector3(0, 1.62, 24),
  fallY: -8,
  playerMaxHP: STAGE3.playerMaxHP,
  playerRegenDelay: STAGE3.playerRegenDelay,
  playerRegenPerSecond: STAGE3.playerRegenPerSecond,
  missileDamage: 20,
  missileExplosionRadius: 3,
  missileSpeed: 15,
  missileGuideTime: 1.15,
  missileLaunchGap: .55,
  railDamage: 15,
  railRadius: 2,
  railTelegraph: 2.1,
  slamDamage: 40,
  slamWidth: 6,
  slamLength: 30,
  slamTelegraph: 2.4,
  floorWaveDamage: 30,
  floorWaveHeight: 1,
  floorWaveTelegraph: 2.5,
  totalWeakpointHits: 18,
} as const;
