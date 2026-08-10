import * as THREE from 'three';
import { BoxObstacle } from '../world/TestArena';
import type { SiegePointDef } from './Stage3Config';

type RouteSide='NORTH'|'SOUTH';
type Size3=[number,number,number];
type Position3=[number,number,number];
type Stories=1|2;

export class Stage3Map{
  obstacles:BoxObstacle[]=[];grappleMeshes:THREE.Object3D[]=[];meshes:THREE.Mesh[]=[];
  buildingCount=0;oneStoryCount=0;twoStoryCount=0;cubeCount=0;structureFootprintArea=0;structureFootprintRatio=0;
  readonly terrainLevels=[0,2,4,6,8];
  routes:Record<RouteSide,THREE.Vector3[][]>={
    NORTH:[
      [[0,2,-92],[-5,2,-83],[-5,4,-77],[6,4,-70],[-5,4,-63],[-5,6,-57],[-5,6,-43],[-5,4,-37],[-6,4,-23],[-6,0,-17],[-5,0,-11],[-7,0,-9]].map(p=>new THREE.Vector3(p[0],p[1],p[2])),
      [[0,2,-92],[-20,2,-97],[-20,2,-90],[-20,2,-82],[-20,4,-77],[-20,4,-70],[-20,4,-63],[-13,6,-57],[-20,6,-43],[-20,4,-37],[-20,4,-30],[-20,4,-23],[-20,2,-17],[-10,2,-12.5],[-7,0,-12.5],[-7,0,-9]].map(p=>new THREE.Vector3(p[0],p[1],p[2])),
      [[0,2,-92],[13,2,-92],[13,2,-82],[20,4,-77],[27,4,-74.5],[25,4,-68],[15,4,-71.3],[13,4,-65.5],[20,4,-63],[20,4,-43],[20,6,-37],[20,6,-23],[20,4,-17],[10,4,-12.5],[5,0,-12.5],[7,0,-9]].map(p=>new THREE.Vector3(p[0],p[1],p[2])),
    ],
    SOUTH:[
      [[0,2,92],[5,2,83],[5,4,77],[-6,4,70],[5,4,63],[5,6,57],[5,6,43],[5,4,37],[6,4,23],[6,0,17],[5,0,11],[7,0,9]].map(p=>new THREE.Vector3(p[0],p[1],p[2])),
      [[0,2,92],[20,2,97],[20,2,90],[20,2,82],[20,4,77],[20,4,70],[20,4,63],[13,6,57],[20,6,43],[20,4,37],[20,4,30],[20,4,23],[20,4,17],[10,4,12.5],[5,0,12.5],[7,0,9]].map(p=>new THREE.Vector3(p[0],p[1],p[2])),
      [[0,2,92],[-13,2,92],[-13,2,82],[-20,4,77],[-27,4,74.5],[-25,4,68],[-15,4,71.3],[-13,4,65.5],[-20,4,63],[-20,4,43],[-20,4,37],[-20,4,23],[-20,2,17],[-10,2,12.5],[-7,0,12.5],[-7,0,9]].map(p=>new THREE.Vector3(p[0],p[1],p[2])),
    ],
  };

  constructor(private scene:THREE.Scene){
    const solidBoxes:THREE.Box3[]=[],materials=new Map<number,THREE.MeshStandardMaterial>();
    const material=(color:number)=>{let value=materials.get(color);if(!value){value=new THREE.MeshStandardMaterial({color,roughness:.68,metalness:.07});materials.set(color,value);}return value;};
    const overlaps=(a:THREE.Box3,b:THREE.Box3)=>a.min.x<b.max.x-.01&&a.max.x>b.min.x+.01&&a.min.y<b.max.y-.01&&a.max.y>b.min.y+.01&&a.min.z<b.max.z-.01&&a.max.z>b.min.z+.01;
    const add=(size:Size3,position:Position3,color=0xe2e7e9,required=true)=>{
      const half=new THREE.Vector3(size[0]/2,size[1]/2,size[2]/2),center=new THREE.Vector3(...position),box=new THREE.Box3(center.clone().sub(half),center.clone().add(half));
      if(solidBoxes.some(existing=>overlaps(box,existing))){if(required)throw new Error(`Stage3Map overlap at ${position.join(',')}`);return null;}
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color));mesh.position.copy(center);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);solidBoxes.push(box);this.meshes.push(mesh);this.obstacles.push({mesh,box:box.clone()});this.grappleMeshes.push(mesh);return mesh;
    };
    const terrain=(x:number,z:number,w:number,d:number,top:number)=>add([w,top+2,d],[x,(top-2)/2,z],top===0?0xeef2f3:top<=4?0xdce3e6:0xcbd6da);
    const terrainStepsZ=(x:number,boundary:number,northY:number,southY:number,width=4)=>{const rise=Math.abs(southY-northY);if(rise<.1)return;const count=Math.round(rise/.4),lowY=Math.min(northY,southY),direction=northY<southY?1:-1,start=boundary-direction*(.5+(count-1)*.55);for(let i=0;i<count;i++){const top=(i+1)*.4;add([width,top,.5],[x,lowY+top/2,start+direction*i*.55],i%2?0xc8d3d7:0xe4e9eb);}};
    const terrainStepsX=(z:number,boundary:number,westY:number,eastY:number,width=4)=>{const rise=Math.abs(eastY-westY);if(rise<.1)return;const count=Math.round(rise/.4),lowY=Math.min(westY,eastY),direction=westY<eastY?1:-1,start=boundary-direction*(.5+(count-1)*.55);for(let i=0;i<count;i++){const top=(i+1)*.4;add([.5,top,width],[start+direction*i*.55,lowY+top/2,z],i%2?0xc8d3d7:0xe4e9eb);}};
    const buildingStairs=(x:number,zStart:number,direction:-1|1,baseY:number)=>{for(let i=0;i<11;i++){const top=(i+1)*.38;add([4,top,.5],[x,baseY+.2+top/2,zStart+direction*i*.58],i%2?0xd1dadd:0xedf1f2);}};
    const frameBuilding=(x:number,z:number,w:number,d:number,baseY:number,stories:Stories)=>{
      this.buildingCount++;this.structureFootprintArea+=w*d;if(stories===1)this.oneStoryCount++;else this.twoStoryCount++;
      const addFrame=(levelBase:number)=>{for(const sx of [-1,1])for(const sz of [-1,1])add([2,4,2],[x+sx*(w/2-1),levelBase+2.2,z+sz*(d/2-1)],0xc2cdd2);const panel=(w-8)/2;for(const edgeZ of [z-d/2,z+d/2]){add([panel,1.2,.3],[x-w/2+2+panel/2,levelBase+.8,edgeZ],0xaebec5);add([panel,1.2,.3],[x+w/2-2-panel/2,levelBase+.8,edgeZ],0xaebec5);}};
      add([w,.2,d],[x,baseY+.1,z],0xf1f4f5);addFrame(baseY);
      if(stories===1){add([w,.2,d],[x,baseY+4.3,z],0xd7e0e3);return;}
      const platformWidth=w-8;add([platformWidth,.2,d],[x,baseY+4.3,z],0xd7e0e3);
      for(const side of [-1,1])for(const end of [-1,1])add([4,.2,2],[x+side*(w/2-2),baseY+4.3,z+end*(d/2-1)],0xd7e0e3);
      buildingStairs(x+w/2-2,z-d/2+2.5,1,baseY);buildingStairs(x-w/2+2,z+d/2-2.5,-1,baseY);
      addFrame(baseY+4.2);add([w,.2,d],[x,baseY+8.5,z],0xe8edef);
    };
    const largeCube=(x:number,z:number,w:number,d:number,baseY:number,height:4|8|12|16|20)=>{this.cubeCount++;this.structureFootprintArea+=w*d;add([w,height,d],[x,baseY+height/2,z],height>=16?0xa8b9c1:height>=12?0xb7c6cc:0xc8d3d7);};
    const suspendedPlatform=(x:number,z:number,w:number,d:number)=>{this.structureFootprintArea+=w*d;add([w,.3,d],[x,12,z],0xdce4e7);for(const sx of [-1,1])for(const sz of [-1,1])add([.35,11.85,.35],[x+sx*(w/2-1),18.075,z+sz*(d/2-1)],0x8298a3);add([w,.8,.16],[x,12.55,z-d/2+.08],0x8fa5ae);add([w,.8,.16],[x,12.55,z+d/2-.08],0x8fa5ae);};
    // Deliberate terrain plates: only the central 20 x 20m tile remains at Y=0 and unobstructed.
    const northRows=[{z:-90,h:[2,2,2]},{z:-70,h:[4,4,4]},{z:-50,h:[6,6,4]},{z:-30,h:[4,4,6]}];
    const southRows=[{z:30,h:[4,4,6]},{z:50,h:[4,6,4]},{z:70,h:[4,4,4]},{z:90,h:[2,2,2]}];
    for(const row of northRows)for(let i=0;i<3;i++)terrain(-20+i*20,row.z,20,20,row.h[i]);
    for(const row of southRows)for(let i=0;i<3;i++)terrain(-20+i*20,row.z,20,20,row.h[i]);
    for(const [x,h] of [[-20,2],[0,0],[20,4]] as const){terrain(x,-15,20,10,h);terrain(x,15,20,10,h);}
    terrain(-20,0,20,20,2);terrain(0,0,20,20,0);terrain(20,0,20,20,4);

    // Vertical terrain connections: three grounded lanes per side plus convergence stairs before the crystal square.
    const northBands=[[2,2,2],[4,4,4],[6,6,4],[4,4,6],[2,0,4]];for(let r=0;r<4;r++)for(let lane=0;lane<3;lane++)terrainStepsZ(-20+lane*20,-80+r*20,northBands[r][lane],northBands[r+1][lane]);
    const southBands=[[2,0,4],[4,4,6],[4,6,4],[4,4,4],[2,2,2]];for(let r=0;r<4;r++)for(let lane=0;lane<3;lane++)terrainStepsZ(-20+lane*20,20+r*20,southBands[r][lane],southBands[r+1][lane]);
    terrainStepsX(-12.5,-10,2,0);terrainStepsX(-12.5,10,0,4);terrainStepsX(12.5,-10,2,0);terrainStepsX(12.5,10,0,4);

    // Restore the enterable open-frame buildings. Large solid cubes and bridges stay removed.
    frameBuilding(-20,-90,18,14,2,2);frameBuilding(0,-90,16,14,2,1);
    frameBuilding(-20,-70,18,14,4,1);frameBuilding(20,-70,18,14,4,2);
    frameBuilding(0,-50,18,14,6,2);frameBuilding(20,-50,16,14,4,2);
    frameBuilding(-20,-30,18,14,4,2);frameBuilding(20,-30,18,14,6,1);
    frameBuilding(20,90,18,14,2,2);frameBuilding(0,90,16,14,2,1);
    frameBuilding(20,70,18,14,4,1);frameBuilding(-20,70,18,14,4,2);
    frameBuilding(0,50,18,14,6,2);frameBuilding(-20,50,16,14,4,2);
    frameBuilding(20,30,18,14,6,2);frameBuilding(-20,30,18,14,4,1);
    frameBuilding(-20,0,18,16,2,2);frameBuilding(20,0,18,16,4,2);

    // Break only the long sightline from (18, 12, 0) to the north-west siege point.
    // The north-center and north-east points remain open to reward a useful sniper perch.
    add([9,11,1],[-2,9.5,-30],0xb8c7cd);

    // Ceiling slabs and suspended grapple walls remain as the only non-building traversal structures.
    add([1,25,200],[-30.5,12.5,0],0xb5c1c6);add([1,25,200],[30.5,12.5,0],0xb5c1c6);add([60,18,1],[0,9,-100.5],0xc2ccd0);add([60,18,1],[0,9,100.5],0xc2ccd0);
    const ceilings:[number,number,number,number,number][]=[
      [-18,19,-86,16,12],[12,21,-66,18,10],[-10,20,-44,15,11],[17,22,-22,14,12],
      [-16,21,22,16,11],[10,19,42,18,12],[-12,22,64,15,10],[17,20,86,17,12],
      [18,23,-92,12,8],[-18,22,0,12,10],[-20,22,88,12,8],
      [0,15,0,14,14],
    ];
    for(const [x,y,z,w,d] of ceilings){
      add([w,.45,d],[x,y,z],0xdce5e8);
      const supportBottom=y+.225,supportHeight=24-supportBottom;
      for(const sx of [-1,1])for(const sz of [-1,1])add([.28,supportHeight,.28],[x+sx*(w/2-1),supportBottom+supportHeight/2,z+sz*(d/2-1)],0x8298a3);
    }
    const aerial:[number,number,number,number,number][]=[
      [-8,15,-92,9,.7],[13,18,-80,.7,10],[-15,17,-67,.7,12],[5,20,-55,11,.7],
      [18,16,-40,.7,10],[-7,19,-27,10,.7],[-18,15,-12,.7,9],[14,18,-4,12,.7],
      [-9,16,14,.7,11],[17,20,27,10,.7],[-16,18,42,.7,12],[6,19,56,11,.7],
      [15,19,72,.7,10],[-7,17,90,10,.7],
      [0,20,-82,.7,10],[-4,19,34,10,.7],[4,20,82,.7,10],
    ];
    for(const [x,y,z,w,d] of aerial){add([w,6,d],[x,y,z],0xb1c2c9);add([.35,24-(y+3),.35],[x,(y+3+24)/2,z],0x8298a3);}

    // The central 20 x 20m tile remains an unobstructed crossing area.
    this.structureFootprintRatio=this.structureFootprintArea/(60*200-20*20);
    this.setVisible(false);
  }

  pathTo(point:SiegePointDef,routeId:number){
    const source=this.routes[point.side][routeId]??this.routes[point.side][0],target=new THREE.Vector3(...point.position),result:THREE.Vector3[]=[];
    for(const waypoint of source){const passed=point.side==='NORTH'?waypoint.z>target.z+4:waypoint.z<target.z-4;if(passed)break;result.push(waypoint.clone());}
    result.push(target);return result;
  }
  navigationNodes(){return [...this.routes.NORTH.flat(),...this.routes.SOUTH.flat()].map(point=>point.clone());}

  setVisible(value:boolean){for(const mesh of this.meshes)mesh.visible=value;}
}
