import * as THREE from 'three';
import type { SiegePointDef } from './Stage3Config';

export type SiegeMarkerState='IDLE'|'WARNING'|'ACTIVE';
export class Stage3SiegePoint{
  group=new THREE.Group();ring:THREE.Mesh;beam:THREE.Mesh;state:SiegeMarkerState='IDLE';pulse=0;
  constructor(public def:SiegePointDef,scene:THREE.Scene){
    this.group.position.set(...def.position);
    this.ring=new THREE.Mesh(new THREE.TorusGeometry(1.6,.12,8,28),new THREE.MeshBasicMaterial({color:0xffb25f,transparent:true,opacity:.8,depthTest:false}));this.ring.rotation.x=Math.PI/2;this.ring.position.y=.12;this.ring.renderOrder=999;
    this.beam=new THREE.Mesh(new THREE.CylinderGeometry(.035,.18,9,8),new THREE.MeshBasicMaterial({color:0xff7f61,transparent:true,opacity:.35,depthTest:false}));this.beam.position.y=4.5;this.beam.renderOrder=998;
    this.group.add(this.ring,this.beam);scene.add(this.group);this.setState('IDLE');
  }
  setState(state:SiegeMarkerState){this.state=state;this.group.visible=state!=='IDLE';const color=state==='ACTIVE'?0xff564f:0xffc466;(this.ring.material as THREE.MeshBasicMaterial).color.setHex(color);(this.beam.material as THREE.MeshBasicMaterial).color.setHex(color);}
  update(dt:number){if(this.state==='IDLE')return;this.pulse+=dt*(this.state==='ACTIVE'?5:3);const scale=1+Math.sin(this.pulse)*.12;this.ring.scale.setScalar(scale);(this.beam.material as THREE.MeshBasicMaterial).opacity=this.state==='ACTIVE'?.55:.25+.12*Math.sin(this.pulse);}
  setVisible(value:boolean){this.group.visible=value&&this.state!=='IDLE';}
  dispose(scene:THREE.Scene){scene.remove(this.group);}
}
