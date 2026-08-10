import * as THREE from 'three';

export const STAGE3 = {
  duration: 180,
  mapSizeX: 60,
  mapSizeZ: 200,
  mapMaxY: 25,
  start: new THREE.Vector3(7, 1.62, 8),
  crystalMaxHP: 200,
  playerMaxHP: 100,
  playerBodyDamage: 3,
  playerHeadDamage: 6,
  playerRegenDelay: 10,
  playerRegenPerSecond: 10,
  enemyGroupSize: 3,
  maxActiveGroups: 6,
  maxActiveEnemies: 18,
  spawnIntervalEarly: 20,
  spawnIntervalMid: 15,
  spawnIntervalLate: 12,
  doubleSpawnStartElapsed: 100,
  doubleSpawnChance: .4,
  maxSpawnPartiesPerCycle: 2,
  spawnStopRemaining: 4,
  siegeWarningMin: 5,
  siegeWarningMax: 8,
  siegeDeployMin: 4,
  siegeDeployMax: 6,
  siegeDamage: 5,
  siegeFireInterval: 1,
  maxSimultaneousSiegesEarly: 1,
  maxSimultaneousSiegesLate: 2,
  escortLeashRange: 14,
  escortHuntSpeed: 6.5,
  enemyRepathInterval: .5,
  enemyMoveSpeed: 4.2,
  enemyDetectionRange: 36,
  enemyFovDegrees: 90,
  enemyAttackRange: 30,
  enemyCloseResponseRange: 8,
  enemyMagazine: 10,
  enemyFireIntervalMin: .5,
  enemyFireIntervalMax: 1,
  enemyReloadDuration: 5,
  enemyPlayerHitChance: .40,
  enemyPlayerMinHitChance: .10,
  enemyHeadshotChance: .10,
  enemyCrystalHitChance: .30,
  enemyCrystalDamage: 3,
  lastSeenMemory: 4,
  northSpawn: new THREE.Vector3(0, 2, -88),
  southSpawn: new THREE.Vector3(0, 2, 88),
  fallY: -8,
} as const;

export type SiegeSide='NORTH'|'SOUTH';
export type SiegePointDef={id:string;name:string;shortName:string;side:SiegeSide;position:readonly[number,number,number];allowedRoutes:readonly number[]};
export const STAGE3_SIEGE_POINTS:readonly SiegePointDef[]=[
  {id:'NORTH_WEST',name:'북서 공성 지점',shortName:'북서',side:'NORTH',position:[-22,6,-60],allowedRoutes:[0,1]},
  {id:'NORTH_CENTER',name:'북부 옥상 공성 지점',shortName:'북부 옥상',side:'NORTH',position:[0,14.5,-50],allowedRoutes:[0,2]},
  {id:'NORTH_EAST',name:'북동 2층 공성 지점',shortName:'북동 2층',side:'NORTH',position:[21,8.4,-72],allowedRoutes:[0,2]},
  {id:'SOUTH_EAST',name:'남동 공성 지점',shortName:'남동',side:'SOUTH',position:[22,4,60],allowedRoutes:[0,1]},
  {id:'SOUTH_CENTER',name:'남부 옥상 공성 지점',shortName:'남부 옥상',side:'SOUTH',position:[0,14.5,50],allowedRoutes:[0,2]},
  {id:'SOUTH_WEST',name:'남서 공성 지점',shortName:'남서',side:'SOUTH',position:[-22,4,60],allowedRoutes:[1,2]},
] as const;

export const STAGE3_ATTACK_POSITIONS:[number,number,number][]=Array.from({length:24},(_,index)=>{
  const ring=Math.floor(index/8),angle=(index%8)/8*Math.PI*2+(ring%2)*Math.PI/8,radius=9+ring*4;
  return [Math.cos(angle)*radius,0,Math.sin(angle)*radius];
});
