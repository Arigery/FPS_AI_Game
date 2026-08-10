import * as THREE from 'three';
import type { SiegePointDef } from '../stages/Stage3Config';
import type { Stage3Enemy } from './Stage3Enemy';

export class EnemyGroup{
  enemies:Stage3Enemy[]=[];siegeEnemy:Stage3Enemy|null=null;siegeDead=false;lastSeen=new THREE.Vector3();lastSeenAt=-Infinity;
  constructor(public id:number,public point:SiegePointDef,public path:THREE.Vector3[],public routeId:number,private routes:THREE.Vector3[][],private onSiegeDeath:(group:EnemyGroup)=>void){}
  add(enemy:Stage3Enemy){this.enemies.push(enemy);if(enemy.role==='SIEGE')this.siegeEnemy=enemy;}
  sharePlayer(position:THREE.Vector3,time:number){this.lastSeen.copy(position);this.lastSeenAt=time;}
  alive(){return this.enemies.filter(enemy=>enemy.alive);}
  escorts(){return this.alive().filter(enemy=>enemy.role==='ESCORT');}
  siegeAlive(){return !!this.siegeEnemy?.alive&&!this.siegeDead;}
  notifySiegeKilled(){if(this.siegeDead)return;this.siegeDead=true;for(const escort of this.escorts())escort.beginHunt();this.onSiegeDeath(this);}
  escortPosition(index:number){const point=new THREE.Vector3(...this.point.position),side=index%2?-1:1;point.x+=side*2.4;point.z+=index%2?1.2:-1.2;return point;}
  reroute(){this.routeId=(this.routeId+1)%this.routes.length;this.path=this.routes[this.routeId].map(point=>point.clone());for(const enemy of this.alive())enemy.routeIndex=0;}
}
