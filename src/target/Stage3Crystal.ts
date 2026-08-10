import * as THREE from 'three';
import { STAGE3,type SiegePointDef } from '../stages/Stage3Config';

type CrystalInstance={group:THREE.Group;core:THREE.Mesh};

export class Stage3Crystal{
  group=new THREE.Group();instances:CrystalInstance[]=[];hp:number=STAGE3.crystalMaxHP;flash=0;
  collisionBoxes:{mesh:THREE.Mesh;box:THREE.Box3}[]=[];
  constructor(scene:THREE.Scene,points:readonly SiegePointDef[]){
    for(const point of points){
      const instance=new THREE.Group();instance.position.set(...point.position);instance.userData.siegePointId=point.id;
      const base=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.3,.45,8),new THREE.MeshStandardMaterial({color:0x283d4a,metalness:.45,roughness:.3}));base.position.y=.225;
      const core=new THREE.Mesh(new THREE.OctahedronGeometry(1.15,0),new THREE.MeshStandardMaterial({color:0x7bf1ff,emissive:0x168eae,emissiveIntensity:1.8,roughness:.15,metalness:.1}));core.position.y=1.65;core.scale.y=1.35;
      const ring=new THREE.Mesh(new THREE.TorusGeometry(1.5,.07,7,24),new THREE.MeshBasicMaterial({color:0x70eaff,transparent:true,opacity:.85}));ring.rotation.x=Math.PI/2;ring.position.y=.65;
      for(const object of [base,core,ring])object.userData.ignoreBullets=true;
      instance.add(base,core,ring);this.group.add(instance);this.instances.push({group:instance,core});
    }
    scene.add(this.group);this.group.updateMatrixWorld(true);
    for(const {group,core} of this.instances){
      const collider=new THREE.Mesh(new THREE.BoxGeometry(2.3,3.1,2.3),new THREE.MeshBasicMaterial({visible:false}));collider.position.copy(group.position).add(new THREE.Vector3(0,1.55,0));collider.updateMatrixWorld(true);
      this.collisionBoxes.push({mesh:collider,box:new THREE.Box3().setFromObject(collider)});
      core.userData.sharedStage3Crystal=true;
    }
    this.setVisible(false);
  }
  reset(){this.hp=STAGE3.crystalMaxHP;this.flash=0;for(const instance of this.instances)instance.group.visible=true;}
  damage(amount:number){this.hp=Math.max(0,this.hp-amount);this.flash=.16;return this.hp===0;}
  update(dt:number){
    this.flash=Math.max(0,this.flash-dt);const low=this.hp/STAGE3.crystalMaxHP<.25;
    for(const instance of this.instances){
      instance.group.rotation.y+=dt*.35;
      const material=instance.core.material as THREE.MeshStandardMaterial;
      material.color.setHex(this.flash>0?0xff8790:0x7bf1ff);material.emissive.setHex(low?0xb82335:0x168eae);
    }
  }
  target(point:SiegePointDef){return new THREE.Vector3(...point.position).add(new THREE.Vector3(0,1.65,0));}
  setVisible(value:boolean){this.group.visible=value;}
  grappleMeshes(){return this.instances.flatMap(instance=>instance.group.children);}
}
