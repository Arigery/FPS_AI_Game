import * as THREE from 'three';
import { Stage3Map } from './Stage3Map';
import { STAGE3,STAGE3_SIEGE_POINTS,type SiegePointDef,type SiegeSide } from './Stage3Config';
import { Stage3Crystal } from '../target/Stage3Crystal';
import { Stage3Enemy } from '../target/Stage3Enemy';
import { EnemyGroup } from '../target/EnemyGroup';
import { Stage3SiegePoint } from './Stage3SiegePoint';
import { Stage3UI,type Stage3HUDState,type Stage3Result,type Stage3Threat,type Stage3ScreenMarker } from '../ui/Stage3UI';
import { PROGRESSION } from '../core/ProgressionConfig';

export type Stage3State='INACTIVE'|'INTRO'|'PLAYING'|'CLEAR'|'FAILED_PLAYER'|'FAILED_CRYSTAL';
export interface Stage3Callbacks{lock:()=>Promise<boolean>;intro:(continueStart:()=>void)=>void;respawn:()=>void;started:()=>void;finished:(result:Stage3Result)=>void;back:()=>void;next:()=>void;fell:()=>void;playerDamaged:()=>void;}

export class Stage3{
  map:Stage3Map;crystal:Stage3Crystal;ui=new Stage3UI();points:Stage3SiegePoint[];
  groups:EnemyGroup[]=[];enemies:Stage3Enemy[]=[];state:Stage3State='INACTIVE';
  playerHP:number=STAGE3.playerMaxHP;kills=0;siegeKills=0;escortKills=0;shotsFired=0;shotsHit=0;
  remaining:number=STAGE3.duration;startTime=0;pauseStartedAt:number|null=null;pausedDuration=0;lastPlayerDamageAt=-Infinity;
  nextGroupId=1;nextEnemyId=1;totalSpawned=0;lastPointId='';lastSide:SiegeSide|null=null;lastNorthRoute=-1;lastSouthRoute=-1;
  warningPoint:Stage3SiegePoint|null=null;secondaryWarningPoint:Stage3SiegePoint|null=null;nextPartyAt=0;nextWarningLead=4;

  constructor(private scene:THREE.Scene,private camera:THREE.PerspectiveCamera,private callbacks:Stage3Callbacks){
    this.map=new Stage3Map(scene);this.crystal=new Stage3Crystal(scene,STAGE3_SIEGE_POINTS);
    this.points=STAGE3_SIEGE_POINTS.map(point=>new Stage3SiegePoint(point,scene));
    this.ui.bind(()=>void this.begin(),()=>this.enter(),callbacks.back,callbacks.next);
  }
  resetRuntime(){
    this.clearEnemies();this.playerHP=STAGE3.playerMaxHP;this.kills=this.siegeKills=this.escortKills=this.shotsFired=this.shotsHit=0;
    this.remaining=STAGE3.duration;this.startTime=0;this.pauseStartedAt=null;this.pausedDuration=0;this.lastPlayerDamageAt=-Infinity;
    this.nextGroupId=1;this.nextEnemyId=1;this.totalSpawned=0;this.lastPointId='';this.lastSide=null;
    this.lastNorthRoute=this.lastSouthRoute=-1;this.warningPoint=this.secondaryWarningPoint=null;this.nextWarningLead=this.randomWarning();this.nextPartyAt=this.nextWarningLead;
    for(const point of this.points)point.setState('IDLE');
  }
  enter(){
    this.resetRuntime();this.state='INTRO';this.map.setVisible(true);this.crystal.reset();this.crystal.setVisible(true);
    this.callbacks.respawn();this.ui.showIntro();this.ui.update(this.hudState(new THREE.Vector3()));
  }
  begin(){if(this.state!=='INTRO')return;this.ui.hideAll();this.callbacks.intro(()=>void this.startAfterIntro());}
  async startAfterIntro(){
    if(this.state!=='INTRO')return;const locked=await this.callbacks.lock();if(!locked){this.ui.showIntro();return;}
    this.state='PLAYING';this.startTime=performance.now();this.pauseStartedAt=null;this.pausedDuration=0;
    this.selectWarningPoint(new THREE.Vector3(...STAGE3.start.toArray()));this.ui.showHUD();this.callbacks.started();
  }
  randomWarning(){return THREE.MathUtils.randFloat(STAGE3.siegeWarningMin,STAGE3.siegeWarningMax);}
  activeTime(now=performance.now()){return Math.max(0,(now-this.startTime-this.pausedDuration)/1000);}
  activeGroups(){return this.groups.filter(group=>group.alive().length>0).length;}
  activeEnemies(){return this.enemies.filter(enemy=>enemy.alive).length;}
  activeSieges(){return this.groups.filter(group=>group.siegeAlive()).length;}
  canSpawnParties(count:number){return this.activeEnemies()+STAGE3.enemyGroupSize*count<=STAGE3.maxActiveEnemies&&this.activeGroups()+count<=STAGE3.maxActiveGroups&&this.activeSieges()+count<=this.simultaneousLimit();}
  canSpawnParty(){return this.canSpawnParties(1);}
  intervalForRemaining(){return this.remaining>120?STAGE3.spawnIntervalEarly:this.remaining>60?STAGE3.spawnIntervalMid:STAGE3.spawnIntervalLate;}
  doubleSpawnUnlocked(){return STAGE3.duration-this.remaining>=STAGE3.doubleSpawnStartElapsed;}
  simultaneousLimit(){return this.doubleSpawnUnlocked()?STAGE3.maxSimultaneousSiegesLate:STAGE3.maxSimultaneousSiegesEarly;}
  pointBusy(point:Stage3SiegePoint){return this.groups.some(group=>group.point.id===point.def.id&&group.siegeAlive());}
  choosePoint(playerPosition:THREE.Vector3,excludedIds:string[]=[]){
    const candidates=this.points.filter(point=>point.def.id!==this.lastPointId&&!excludedIds.includes(point.def.id)&&!this.pointBusy(point));
    if(!candidates.length)return null;
    const safe=candidates.filter(point=>new THREE.Vector3(...point.def.position).distanceTo(playerPosition)>12);
    const pool=safe.length?safe:candidates;
    const differentSide=this.lastSide?pool.filter(point=>point.def.side!==this.lastSide):pool;
    const weighted=differentSide.length&&Math.random()<.7?differentSide:pool;
    return weighted[Math.floor(Math.random()*weighted.length)]??null;
  }
  selectWarningPoint(playerPosition:THREE.Vector3){
    if(this.warningPoint||this.remaining<=STAGE3.spawnStopRemaining)return;
    const point=this.choosePoint(playerPosition);if(!point)return;
    this.warningPoint=point;point.setState('WARNING');
    const canDouble=this.doubleSpawnUnlocked()&&this.canSpawnParties(STAGE3.maxSpawnPartiesPerCycle)&&Math.random()<STAGE3.doubleSpawnChance;
    if(canDouble){const second=this.choosePoint(playerPosition,[point.def.id]);if(second){this.secondaryWarningPoint=second;second.setState('WARNING');}}
  }
  routeFor(point:SiegePointDef){
    const previous=point.side==='NORTH'?this.lastNorthRoute:this.lastSouthRoute;
    const choices=point.allowedRoutes.filter(route=>route!==previous),routeId=(choices.length?choices:point.allowedRoutes)[Math.floor(Math.random()*(choices.length||point.allowedRoutes.length))];
    if(point.side==='NORTH')this.lastNorthRoute=routeId;else this.lastSouthRoute=routeId;
    return {routeId,path:this.map.pathTo(point,routeId),routes:point.allowedRoutes.map(id=>this.map.pathTo(point,id))};
  }
  spawnParty(marker:Stage3SiegePoint){
    if(!this.canSpawnParty())return false;
    const point=marker.def,target=new THREE.Vector3(...point.position),path=[target.clone()];
    const group=new EnemyGroup(this.nextGroupId++,point,path,0,[path.map(value=>value.clone())],dead=>this.onSiegeDeath(dead));
    const outward=new THREE.Vector3(target.x,0,target.z).normalize(),tangent=new THREE.Vector3(-outward.z,0,outward.x);
    const base=target.clone().addScaledVector(outward,4.5);
    for(let index=0;index<STAGE3.enemyGroupSize;index++){
      const spawn=base.clone().addScaledVector(tangent,(index-1)*2.1);
      const role=index===0?'SIEGE':'ESCORT';
      const enemy=new Stage3Enemy(this.nextEnemyId++,group,role,spawn,0,Math.max(0,index-1),this.scene);
      enemy.rotationY=point.side==='NORTH'?0:Math.PI;enemy.group.rotation.y=enemy.rotationY;
      this.enemies.push(enemy);this.totalSpawned++;
    }
    this.groups.push(group);marker.setState('ACTIVE');this.lastPointId=point.id;this.lastSide=point.side;return true;
  }
  onSiegeDeath(group:EnemyGroup){const marker=this.points.find(point=>point.def.id===group.point.id);marker?.setState('IDLE');}
  updateSpawning(elapsed:number,playerPosition:THREE.Vector3){
    if(this.remaining<=STAGE3.spawnStopRemaining){if(this.warningPoint)this.warningPoint.setState('IDLE');if(this.secondaryWarningPoint)this.secondaryWarningPoint.setState('IDLE');this.warningPoint=this.secondaryWarningPoint=null;return;}
    if(!this.warningPoint&&elapsed>=this.nextPartyAt-this.nextWarningLead){
      if(this.canSpawnParty())this.selectWarningPoint(playerPosition);else this.nextPartyAt=elapsed+this.nextWarningLead+.5;
    }
    if(!this.warningPoint||elapsed<this.nextPartyAt)return;
    const pending=[this.warningPoint,this.secondaryWarningPoint].filter((point):point is Stage3SiegePoint=>point!==null);let spawned=0;
    for(const point of pending){if(this.spawnParty(point))spawned++;else point.setState('IDLE');}
    this.warningPoint=this.secondaryWarningPoint=null;
    if(!spawned){this.nextPartyAt=elapsed+this.nextWarningLead+.5;return;}
    this.nextWarningLead=this.randomWarning();this.nextPartyAt=elapsed+this.intervalForRemaining();
  }
  direction(from:THREE.Vector3,to:THREE.Vector3){
    const dx=to.x-from.x,dz=to.z-from.z;if(Math.abs(dx)<4)return dz<0?'↑':'↓';if(Math.abs(dz)<4)return dx<0?'←':'→';return `${dz<0?'↑':'↓'}${dx<0?'←':'→'}`;
  }
  threatFor(group:EnemyGroup,playerPosition:THREE.Vector3):Stage3Threat{
    const enemy=group.siegeEnemy!,point=new THREE.Vector3(...group.point.position);
    const state=enemy.state==='DEPLOY_SIEGE'?`공격 준비 ${enemy.deployRemaining.toFixed(1)}초`:enemy.state==='ATTACK_CRYSTAL'?'크리스탈 공격 중':'공성 지점으로 이동 중';
    return {name:group.point.name,state,distance:playerPosition.distanceTo(point),direction:this.direction(playerPosition,point)};
  }
  screenMarker(point:SiegePointDef,state:'WARNING'|'ACTIVE',playerPosition:THREE.Vector3):Stage3ScreenMarker{
    this.camera.updateMatrixWorld();const target=new THREE.Vector3(...point.position).add(new THREE.Vector3(0,2.2,0));
    const cameraSpace=target.clone().applyMatrix4(this.camera.matrixWorldInverse),projected=target.clone().project(this.camera),behind=cameraSpace.z>0;
    if(behind){projected.x=-projected.x;projected.y=-projected.y;}
    const offscreen=behind||Math.abs(projected.x)>.86||Math.abs(projected.y)>.76;
    return {id:point.id,label:state==='ACTIVE'?point.shortName:`다음 ${point.shortName}`,x:THREE.MathUtils.clamp((projected.x*.5+.5)*100,7,93),y:THREE.MathUtils.clamp((-projected.y*.5+.5)*100,12,88),offscreen,state,distance:playerPosition.distanceTo(target)};
  }
  hudState(playerPosition:THREE.Vector3,regen=false):Stage3HUDState{
    const elapsed=this.state==='PLAYING'?this.activeTime():0;
    const next=this.warningPoint?{name:this.warningPoint.def.name,seconds:Math.max(0,this.nextPartyAt-elapsed),distance:playerPosition.distanceTo(new THREE.Vector3(...this.warningPoint.def.position)),direction:this.direction(playerPosition,new THREE.Vector3(...this.warningPoint.def.position))}:undefined;
    const markers=this.groups.filter(group=>group.siegeAlive()).map(group=>this.screenMarker(group.point,'ACTIVE',playerPosition));
    if(this.warningPoint)markers.push(this.screenMarker(this.warningPoint.def,'WARNING',playerPosition));if(this.secondaryWarningPoint)markers.push(this.screenMarker(this.secondaryWarningPoint.def,'WARNING',playerPosition));
    return {remaining:this.remaining,crystalHP:this.crystal.hp,playerHP:this.playerHP,regen,siegeKills:this.siegeKills,escortKills:this.escortKills,activeThreats:this.groups.filter(group=>group.siegeAlive()).map(group=>this.threatFor(group,playerPosition)),nextThreat:next,huntingEscorts:this.enemies.filter(enemy=>enemy.alive&&enemy.role==='ESCORT'&&enemy.hunting).length,markers};
  }
  update(playerPosition:THREE.Vector3,playerVelocity:THREE.Vector3,dt:number,paused=false){
    if(this.state!=='PLAYING')return;const now=performance.now();
    if(paused){if(this.pauseStartedAt===null)this.pauseStartedAt=now;this.remaining=Math.max(0,STAGE3.duration-(this.pauseStartedAt-this.startTime-this.pausedDuration)/1000);this.ui.update(this.hudState(playerPosition));return;}
    if(this.pauseStartedAt!==null){this.pausedDuration+=now-this.pauseStartedAt;this.pauseStartedAt=null;}
    const elapsed=this.activeTime(now);this.remaining=Math.max(0,STAGE3.duration-elapsed);
    const regen=elapsed-this.lastPlayerDamageAt>=STAGE3.playerRegenDelay&&this.playerHP<STAGE3.playerMaxHP;
    if(regen)this.playerHP=Math.min(STAGE3.playerMaxHP,this.playerHP+STAGE3.playerRegenPerSecond*dt);
    this.updateSpawning(elapsed,playerPosition);
    const context={dt,time:elapsed,playerPosition,playerSpeed:playerVelocity.length(),occluders:this.map.grappleMeshes,scene:this.scene,navigationNodes:this.map.navigationNodes(),damagePlayer:(amount:number,headshot:boolean)=>this.damagePlayer(amount,headshot,elapsed),damageCrystal:(amount:number)=>this.damageCrystal(amount)};
    for(const enemy of this.enemies)enemy.update(context);for(const point of this.points)point.update(dt);this.crystal.update(dt);this.ui.update(this.hudState(playerPosition,regen));
    if(playerPosition.y<STAGE3.fallY){this.callbacks.fell();this.callbacks.respawn();}if(this.remaining<=0)this.finish('CLEAR');
  }
  damagePlayer(amount:number,_headshot:boolean,time:number){if(this.state!=='PLAYING')return;this.playerHP=Math.max(0,this.playerHP-amount);this.lastPlayerDamageAt=time;this.callbacks.playerDamaged();if(this.playerHP===0)this.finish('PLAYER');}
  damageCrystal(amount:number){if(this.state!=='PLAYING')return;if(this.crystal.damage(amount))this.finish('CRYSTAL');}
  shot(){if(this.state==='PLAYING')this.shotsFired++;}
  accuracy(){return this.shotsFired?this.shotsHit/this.shotsFired*100:0;}
  score(){return this.siegeKills*PROGRESSION.stage3Score.siegeKill+this.escortKills*PROGRESSION.stage3Score.escortKill+Math.floor(this.crystal.hp/PROGRESSION.stage3Score.crystalHpPerPoint);}
  hitObjects(){return this.enemies.filter(enemy=>enemy.alive).flatMap(enemy=>enemy.hitObjects());}
  hitObject(object:THREE.Object3D,type:'SHOT'|'MELEE'|'HOOK'='SHOT'){
    const enemy=object.userData.stage3Enemy as Stage3Enemy|undefined;if(!enemy||!enemy.alive||this.state!=='PLAYING'||!enemy.kill())return false;
    if(type==='SHOT')this.shotsHit++;this.kills++;if(enemy.role==='SIEGE')this.siegeKills++;else this.escortKills++;return true;
  }
  melee(position:THREE.Vector3,forward:THREE.Vector3,range:number,halfAngle:number){
    let best:Stage3Enemy|undefined,bestDistance=Infinity;for(const enemy of this.enemies){if(!enemy.alive)continue;const to=enemy.center().sub(position),distance=to.length();to.y=0;if(distance<range&&forward.angleTo(to.normalize())<halfAngle&&distance<bestDistance){best=enemy;bestDistance=distance;}}
    if(best)this.hitObject(best.body,'MELEE');
  }
  finish(reason:'CLEAR'|'PLAYER'|'CRYSTAL'){
    if(this.state!=='PLAYING')return;this.state=reason==='CLEAR'?'CLEAR':reason==='PLAYER'?'FAILED_PLAYER':'FAILED_CRYSTAL';
    for(const marker of this.points)marker.setState('IDLE');
    const result:Stage3Result={clear:reason==='CLEAR',reason,remaining:this.remaining,crystalHP:this.crystal.hp,playerHP:this.playerHP,kills:this.kills,siegeKills:this.siegeKills,escortKills:this.escortKills,score:this.score(),accuracy:this.accuracy(),shotsFired:this.shotsFired};
    if(reason==='CLEAR')this.ui.hideAll();else this.ui.showResult(result);this.callbacks.finished(result);
  }
  debugText(){
    const alive=this.enemies.filter(enemy=>enemy.alive),details=alive.slice(0,10).map(enemy=>`E${enemy.id} G${enemy.squad.id} ${enemy.role} ${enemy.state} ${enemy.ammo}`).join('\n');
    const next=this.warningPoint?`${[this.warningPoint,this.secondaryWarningPoint].filter(Boolean).map(point=>point!.def.id).join('+')} ${(this.nextPartyAt-this.activeTime()).toFixed(1)}s`:'NONE';
    return `STAGE3 ${this.state}\nTIME ${this.remaining.toFixed(2)} PLAYER ${this.playerHP.toFixed(1)} CRYSTAL ${this.crystal.hp}\nENEMIES ${alive.length}/${STAGE3.maxActiveEnemies} SIEGES ${this.activeSieges()}/${this.simultaneousLimit()}\nNEXT ${next} KILLS S${this.siegeKills}/E${this.escortKills}${details?`\n${details}`:''}`;
  }
  clearEnemies(){for(const enemy of this.enemies)enemy.dispose(this.scene);this.enemies=[];this.groups=[];}
  leave(){this.state='INACTIVE';this.clearEnemies();for(const point of this.points)point.setState('IDLE');this.map.setVisible(false);this.crystal.setVisible(false);this.ui.hideAll();}
  obstacles(){return [...this.map.obstacles,...this.crystal.collisionBoxes];}
  grappleMeshes(){return [...this.map.grappleMeshes,...this.crystal.grappleMeshes()];}
}
