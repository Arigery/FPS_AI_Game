import * as THREE from 'three';
export const STAGE2={
  width:80,length:500,maxHeight:60,targetCount:20,highlightRange:50,
  minKillsToClear:10,
  targetScore:5,meleeScore:5,hookScore:5,
  fastTimeLimit:180,normalTimeLimit:300,fastTimeScore:40,normalTimeScore:25,slowTimeScore:10,
  start:new THREE.Vector3(0,31.62,238),goal:new THREE.Vector3(0,5.62,-247),goalRadius:7,deathFloorY:0,fallY:-12
} as const;

export interface Stage2TargetDefinition{ id:string; position:[number,number,number]; rotationY?:number; }
const TARGET_X=[24,-24,22,-22,26,-26,24,-24,22,-22,26,-26,24,-24,22,-22,26,-26,24,-24];
const TARGET_HEIGHT=[15,18,21,24,27,30,16,19,22,25,28,15,18,21,24,27,30,16,20,23];
export const STAGE2_TARGETS:Stage2TargetDefinition[]=Array.from({length:STAGE2.targetCount},(_,index)=>({
  id:`T${String(index+1).padStart(2,'0')}`,
  position:[TARGET_X[index],TARGET_HEIGHT[index],214-index*23]
}));
