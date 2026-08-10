import * as THREE from 'three';

export type TracerBeam=THREE.Mesh<THREE.CylinderGeometry,THREE.MeshBasicMaterial>;

export function createTracerBeam(start:THREE.Vector3,end:THREE.Vector3,color:number,radius:number,opacity=1):TracerBeam{
  const direction=end.clone().sub(start),length=direction.length();
  const geometry=new THREE.CylinderGeometry(radius,radius,Math.max(.01,length),7,1,true);
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending});
  const beam=new THREE.Mesh(geometry,material);beam.position.copy(start).add(end).multiplyScalar(.5);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());beam.frustumCulled=false;beam.renderOrder=12;return beam;
}
