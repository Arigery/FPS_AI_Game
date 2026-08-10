import * as THREE from 'three';
export class TargetDummy {
  group=new THREE.Group(); alive=true; head:THREE.Mesh; body:THREE.Mesh;
  constructor(scene:THREE.Scene){
    const bodyMat=new THREE.MeshStandardMaterial({color:0xe04f5f,roughness:.55});
    this.body=new THREE.Mesh(new THREE.CapsuleGeometry(.38,.85,5,10),bodyMat); this.body.position.y=1;
    this.head=new THREE.Mesh(new THREE.SphereGeometry(.27,16,10),new THREE.MeshStandardMaterial({color:0xffc59a})); this.head.position.y=1.7;
    this.body.userData.hit='BODY'; this.head.userData.hit='HEAD'; this.group.add(this.body,this.head); this.group.position.set(0,0,-18); scene.add(this.group);
  }
  kill(){this.alive=false;this.group.visible=false;} reset(){this.alive=true;this.group.visible=true;}
}
