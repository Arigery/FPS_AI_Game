import * as THREE from 'three';
export interface BoxObstacle { box: THREE.Box3; mesh: THREE.Mesh; }
export class TestArena {
  obstacles: BoxObstacle[]=[]; grappleMeshes: THREE.Object3D[]=[];
  constructor(scene:THREE.Scene){
    const mat=(c:number)=>new THREE.MeshStandardMaterial({color:c,roughness:.76,metalness:.03});
    const register=(m:THREE.Mesh)=>{m.castShadow=m.receiveShadow=true;scene.add(m);m.updateMatrixWorld();this.obstacles.push({mesh:m,box:new THREE.Box3().setFromObject(m)});this.grappleMeshes.push(m);return m;};
    const add=(size:THREE.Vector3,pos:THREE.Vector3,color=0xb8bcc1)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z),mat(color));m.position.copy(pos);return register(m);};
    const pillar=(radius:number,height:number,pos:THREE.Vector3,color=0xc9ccd0)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,16),mat(color));m.position.copy(pos);return register(m);};
    add(new THREE.Vector3(80,1,80),new THREE.Vector3(0,-.5,0),0xd2d3d4);
    add(new THREE.Vector3(80,35,1),new THREE.Vector3(0,17.5,-40),0xa5a8ac); add(new THREE.Vector3(80,35,1),new THREE.Vector3(0,17.5,40),0xa5a8ac);
    add(new THREE.Vector3(1,35,80),new THREE.Vector3(-40,17.5,0),0xa5a8ac); add(new THREE.Vector3(1,35,80),new THREE.Vector3(40,17.5,0),0xa5a8ac);
    add(new THREE.Vector3(8,3,8),new THREE.Vector3(9,1.5,-10),0xb7bbc0);
    add(new THREE.Vector3(6,8,6),new THREE.Vector3(13,4,-17),0xc4c7ca);
    add(new THREE.Vector3(18,.8,8),new THREE.Vector3(-12,7,-20),0xe0e1e2);
    add(new THREE.Vector3(3,18,3),new THREE.Vector3(-22,9,3),0xb0b4b8);
    add(new THREE.Vector3(16,.8,5),new THREE.Vector3(12,13,8),0xdddddd);
    add(new THREE.Vector3(10,.7,10),new THREE.Vector3(-8,21,10),0xe3e3e3);
    add(new THREE.Vector3(16,12,1),new THREE.Vector3(12,6,10.5),0xb4b7ba);
    add(new THREE.Vector3(10,8,1),new THREE.Vector3(-8,17,15),0xb8bbbe);
    pillar(1.25,16,new THREE.Vector3(23,8,18));pillar(1.6,23,new THREE.Vector3(-27,11.5,-20),0xb5b8bc);pillar(.9,11,new THREE.Vector3(4,5.5,23),0xd9d9d9);
    add(new THREE.Vector3(12,9,7),new THREE.Vector3(-14,4.5,18),0xaeb2b7);
    add(new THREE.Vector3(9,13,6),new THREE.Vector3(25,6.5,-5),0xc7c9cc);
    add(new THREE.Vector3(12,.7,3),new THREE.Vector3(18,18,-18),0xe4e4e4);add(new THREE.Vector3(3,12,3),new THREE.Vector3(18,12,-18),0xb9bdc1);
  }
}
