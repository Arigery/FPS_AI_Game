import * as THREE from 'three';
import { createTracerBeam,type TracerBeam } from '../visual/TracerBeam';
import { STAGE3 } from '../stages/Stage3Config';
import type { EnemyGroup } from './EnemyGroup';

export type EnemyRole='SIEGE'|'ESCORT';
export type EnemyState=
  |'SPAWNING'|'ADVANCE_TO_SIEGE'|'DEPLOY_SIEGE'|'ATTACK_CRYSTAL'
  |'ESCORT_SIEGE'|'ENGAGE_PLAYER'|'RETURN_TO_ESCORT'|'HUNT_PLAYER'|'DEAD';

export interface EnemyUpdateContext{
  dt:number;time:number;playerPosition:THREE.Vector3;playerSpeed:number;
  occluders:THREE.Object3D[];scene:THREE.Scene;
  navigationNodes:THREE.Vector3[];
  damagePlayer:(amount:number,headshot:boolean)=>void;
  damageCrystal:(amount:number)=>void;
}

export class Stage3Enemy{
  group=new THREE.Group();body:THREE.Mesh;head:THREE.Mesh;marker:THREE.Mesh;
  alive=true;state:EnemyState='SPAWNING';ammo=STAGE3.enemyMagazine;reload=0;
  fireCooldown=0;spawnDelay=.35;rotationY=0;routeIndex=0;routeStall=0;
  deployRemaining=THREE.MathUtils.randFloat(STAGE3.siegeDeployMin,STAGE3.siegeDeployMax);
  hunting=false;repathTimer=0;huntWaypoint:THREE.Vector3|null=null;
  guardPosition=new THREE.Vector3();
  lastRoutePosition=new THREE.Vector3();tracers:{line:TracerBeam;life:number}[]=[];

  constructor(
    public id:number,public squad:EnemyGroup,public role:EnemyRole,
    spawn:THREE.Vector3,public laneOffset:number,public escortIndex:number,
    scene:THREE.Scene,
  ){
    const siege=role==='SIEGE';
    const uniform=new THREE.MeshStandardMaterial({color:siege?0x9a3f2d:0x526b78,roughness:.5,metalness:.12});
    this.body=new THREE.Mesh(new THREE.CapsuleGeometry(siege?.5:.42,siege?1.05:.9,5,10),uniform);
    this.body.position.y=siege?1.08:1;this.body.userData={stage3Enemy:this,hitType:'BODY'};
    this.head=new THREE.Mesh(new THREE.SphereGeometry(siege?.31:.28,14,9),new THREE.MeshStandardMaterial({color:0xd7b39b,roughness:.6}));
    this.head.position.y=siege?1.9:1.72;this.head.userData={stage3Enemy:this,hitType:'BODY'};
    this.marker=new THREE.Mesh(
      siege?new THREE.OctahedronGeometry(.25):new THREE.BoxGeometry(.5,.13,.12),
      new THREE.MeshBasicMaterial({color:siege?0xff5a3d:0x5fd8ff}),
    );
    this.marker.position.set(0,siege?2.45:1.25,siege?0:.43);
    const weapon=new THREE.Mesh(
      new THREE.BoxGeometry(siege?.2:.12,siege?.18:.12,siege?.85:.7),
      new THREE.MeshStandardMaterial({color:0x16242d,metalness:.5,roughness:.3}),
    );
    weapon.position.set(.35,1.05,.25);weapon.rotation.x=-.15;
    this.group.add(this.body,this.head,this.marker,weapon);this.group.position.copy(spawn);
    this.fireCooldown=.2+Math.random()*.5;this.guardPosition.copy(spawn);this.lastRoutePosition.copy(spawn);scene.add(this.group);squad.add(this);
  }

  beginHunt(){if(!this.alive||this.role!=='ESCORT')return;this.hunting=true;this.state='HUNT_PLAYER';this.routeIndex=0;this.huntWaypoint=null;this.repathTimer=0;}
  hitObjects(){return [this.head,this.body];}
  center(out=new THREE.Vector3()){return this.group.getWorldPosition(out).add(new THREE.Vector3(0,1,0));}
  eye(out=new THREE.Vector3()){return this.group.getWorldPosition(out).add(new THREE.Vector3(0,1.55,0));}
  lineClear(target:THREE.Vector3,occluders:THREE.Object3D[]){
    const eye=this.eye(),to=target.clone().sub(eye),distance=to.length();
    if(distance<.2)return true;
    return new THREE.Raycaster(eye,to.normalize(),0,Math.max(0,distance-.3)).intersectObjects(occluders,false).length===0;
  }
  moveToward(target:THREE.Vector3,dt:number,speed:number=STAGE3.enemyMoveSpeed){
    const delta=target.clone().sub(this.group.position),distance=delta.length();if(distance<.05)return true;
    delta.normalize();this.rotationY=Math.atan2(delta.x,delta.z);this.group.rotation.y=this.rotationY;
    this.group.position.addScaledVector(delta,Math.min(distance,speed*dt));return distance<.35;
  }
  face(target:THREE.Vector3){this.rotationY=Math.atan2(target.x-this.group.position.x,target.z-this.group.position.z);this.group.rotation.y=this.rotationY;}
  scheduleShot(){this.fireCooldown=THREE.MathUtils.lerp(STAGE3.enemyFireIntervalMin,STAGE3.enemyFireIntervalMax,Math.random());}
  tracer(target:THREE.Vector3,scene:THREE.Scene,color:number){
    const line=createTracerBeam(this.eye(),target,color,.022,.9);
    scene.add(line);this.tracers.push({line,life:.16});
  }
  updateTracers(dt:number,scene:THREE.Scene){
    for(const tracer of this.tracers){tracer.life-=dt;tracer.line.material.opacity=Math.max(0,tracer.life/.16);if(tracer.life<=0){scene.remove(tracer.line);tracer.line.geometry.dispose();tracer.line.material.dispose();}}
    this.tracers=this.tracers.filter(tracer=>tracer.life>0);
  }
  firePlayer(context:EnemyUpdateContext){
    const target=context.playerPosition,distance=this.group.position.distanceTo(target);
    if(distance>STAGE3.enemyAttackRange||this.reload>0||this.fireCooldown>0||this.ammo<=0||!this.lineClear(target,context.occluders))return;
    this.ammo--;this.scheduleShot();const hitChance=Math.max(STAGE3.enemyPlayerMinHitChance,STAGE3.enemyPlayerHitChance*(1-context.playerSpeed/55)),hit=Math.random()<hitChance;
    if(hit){const headshot=Math.random()<STAGE3.enemyHeadshotChance;context.damagePlayer(headshot?STAGE3.playerHeadDamage:STAGE3.playerBodyDamage,headshot);}
    const end=hit?target:target.clone().add(new THREE.Vector3((Math.random()-.5)*5,(Math.random()-.5)*3,(Math.random()-.5)*5));
    this.tracer(end,context.scene,0xff776b);if(this.ammo===0)this.reload=STAGE3.enemyReloadDuration;
  }
  followRoute(context:EnemyUpdateContext){
    if(this.routeIndex>=this.squad.path.length)return true;
    const waypoint=this.squad.path[this.routeIndex].clone();waypoint.x+=this.laneOffset;
    if(this.moveToward(waypoint,context.dt)){this.routeIndex++;this.routeStall=0;}
    if(this.group.position.distanceToSquared(this.lastRoutePosition)<.0004)this.routeStall+=context.dt;
    else{this.routeStall=0;this.lastRoutePosition.copy(this.group.position);}
    if(this.routeStall>2){this.squad.reroute();this.routeStall=0;this.lastRoutePosition.copy(this.group.position);}
    return this.routeIndex>=this.squad.path.length;
  }
  chooseHuntWaypoint(context:EnemyUpdateContext){
    if(this.lineClear(context.playerPosition,context.occluders)){this.huntWaypoint=context.playerPosition.clone();return;}
    let best:THREE.Vector3|null=null,bestScore=Infinity;
    for(const node of context.navigationNodes){
      if(!this.lineClear(node,context.occluders))continue;
      const score=this.group.position.distanceTo(node)*.35+node.distanceTo(context.playerPosition);
      if(score<bestScore){bestScore=score;best=node;}
    }
    this.huntWaypoint=best?.clone()??context.playerPosition.clone();
  }
  updateSiege(context:EnemyUpdateContext){
    if(this.routeIndex<this.squad.path.length){this.state='ADVANCE_TO_SIEGE';this.followRoute(context);return;}
    const point=new THREE.Vector3(...this.squad.point.position);
    if(this.group.position.distanceTo(point)>1){this.state='ADVANCE_TO_SIEGE';this.moveToward(point,context.dt);return;}
    const crystalTarget=new THREE.Vector3(...this.squad.point.position).add(new THREE.Vector3(0,1.65,0));
    if(this.deployRemaining>0){this.state='DEPLOY_SIEGE';this.deployRemaining=Math.max(0,this.deployRemaining-context.dt);this.face(crystalTarget);return;}
    this.state='ATTACK_CRYSTAL';this.face(crystalTarget);
    if(this.fireCooldown<=0){
      this.fireCooldown=STAGE3.siegeFireInterval;context.damageCrystal(STAGE3.siegeDamage);this.tracer(crystalTarget,context.scene,0xff4c33);
    }
  }
  updateEscort(context:EnemyUpdateContext){
    if(this.hunting||!this.squad.siegeAlive()){
      this.hunting=true;this.state='HUNT_PLAYER';this.repathTimer-=context.dt;
      if(this.repathTimer<=0||!this.huntWaypoint||this.group.position.distanceTo(this.huntWaypoint)<.8){this.repathTimer=STAGE3.enemyRepathInterval;this.chooseHuntWaypoint(context);}
      if(this.huntWaypoint)this.moveToward(this.huntWaypoint,context.dt,STAGE3.escortHuntSpeed);
      if(this.group.position.distanceTo(context.playerPosition)<=STAGE3.enemyAttackRange&&this.lineClear(context.playerPosition,context.occluders)){this.state='ENGAGE_PLAYER';this.face(context.playerPosition);this.firePlayer(context);}
      return;
    }
    const siege=this.squad.siegeEnemy!,escortTarget=this.guardPosition;
    const playerDistance=this.group.position.distanceTo(context.playerPosition),siegeDistance=this.group.position.distanceTo(siege.group.position);
    const mayEngage=playerDistance<=STAGE3.enemyAttackRange&&siegeDistance<=STAGE3.escortLeashRange&&this.lineClear(context.playerPosition,context.occluders);
    if(mayEngage){this.state='ENGAGE_PLAYER';this.face(context.playerPosition);this.firePlayer(context);return;}
    if(this.group.position.distanceTo(escortTarget)>.2){this.state='RETURN_TO_ESCORT';this.moveToward(escortTarget,context.dt);return;}
    this.state='ESCORT_SIEGE';this.face(context.playerPosition);
  }
  update(context:EnemyUpdateContext){
    this.updateTracers(context.dt,context.scene);if(!this.alive)return;
    if(this.spawnDelay>0){this.spawnDelay-=context.dt;this.state='SPAWNING';return;}
    this.fireCooldown=Math.max(0,this.fireCooldown-context.dt);
    if(this.reload>0){this.reload=Math.max(0,this.reload-context.dt);if(this.reload===0)this.ammo=STAGE3.enemyMagazine;}
    if(this.role==='SIEGE')this.updateSiege(context);else this.updateEscort(context);
  }
  kill(){
    if(!this.alive)return false;this.alive=false;this.state='DEAD';this.group.visible=false;
    if(this.role==='SIEGE')this.squad.notifySiegeKilled();return true;
  }
  dispose(scene:THREE.Scene){
    for(const tracer of this.tracers){scene.remove(tracer.line);tracer.line.geometry.dispose();tracer.line.material.dispose();}
    scene.remove(this.group);
  }
}
