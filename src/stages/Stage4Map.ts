import * as THREE from 'three';
import type { BoxObstacle } from '../world/TestArena';
import { STAGE4 } from './Stage4Config';

export class Stage4Map {
  readonly group = new THREE.Group();
  readonly obstacles: BoxObstacle[] = [];
  readonly grappleMeshes: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene) {
    this.group.name = 'Stage4Arena'; scene.add(this.group);
    const white = new THREE.MeshStandardMaterial({ color: 0xcbd0d3, roughness: .68, metalness: .16 });
    const pale = new THREE.MeshStandardMaterial({ color: 0xe4e6e7, roughness: .76, metalness: .06 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a353e, roughness: .46, metalness: .52 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x667984, emissive: 0x142832, roughness: .38, metalness: .62 });
    const register = (mesh: THREE.Mesh, collidable = true, grapple = true) => {
      mesh.castShadow = mesh.receiveShadow = true; this.group.add(mesh); mesh.updateMatrixWorld(true);
      if (collidable) this.obstacles.push({ mesh, box: new THREE.Box3().setFromObject(mesh) });
      if (grapple) this.grappleMeshes.push(mesh); return mesh;
    };
    const box = (size: [number, number, number], position: [number, number, number], material = white, collidable = true) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); return register(mesh, collidable);
    };

    const floor = new THREE.Mesh(new THREE.CylinderGeometry(STAGE4.arenaRadius, STAGE4.arenaRadius, 1, 64), pale); floor.position.y = -.5; register(floor);

    // The visual wall is segmented and rotated, but collision is handled by an exact radial boundary in Game.move.
    // This avoids oversized axis-aligned corner boxes that previously caused invisible impacts.
    const wallCount = 24, radius = STAGE4.arenaRadius + .7;
    const chord = 2 * radius * Math.sin(Math.PI / wallCount) + .45;
    for (let index = 0; index < wallCount; index++) {
      const angle = index / wallCount * Math.PI * 2;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(chord, STAGE4.wallHeight, 1.45), index % 3 === 0 ? accent : dark);
      mesh.position.set(Math.sin(angle) * radius, STAGE4.wallHeight / 2, Math.cos(angle) * radius); mesh.rotation.y = angle;
      register(mesh, false);
    }

    // Floating vertical grapple walls. Every wall starts well above the ground and uses axis-aligned collision.
    const floatingWalls: Array<{ size: [number, number, number]; position: [number, number, number] }> = [
      { size: [12, 8, 1], position: [-11, 13, 10] },
      { size: [1, 11, 10], position: [12, 18, 8] },
      { size: [9, 9, 1], position: [8, 27, -10] },
      { size: [1, 12, 12], position: [-14, 24, -7] },
      { size: [11, 7, 1], position: [1, 35, 14] },
      { size: [1, 9, 9], position: [17, 13, -7] },
      { size: [10, 10, 1], position: [-4, 18, -18] },
      { size: [1, 8, 11], position: [-20, 33, 2] },
      { size: [8, 7, 1], position: [17, 31, 10] },
      { size: [1, 10, 8], position: [4, 22, 19] },
      { size: [9, 8, 1], position: [-18, 14, 13] },
      { size: [1, 7, 10], position: [20, 22, -13] },
      { size: [10, 6, 1], position: [-6, 6, 16] },
      { size: [1, 7, 9], position: [15, 8, -2] },
    ];
    for (const [index, wall] of floatingWalls.entries()) box(wall.size, wall.position, index % 3 === 0 ? accent : index % 2 ? white : dark);

    // Horizontal planes reach the outer wall, so none of them reads as a loose floating slab.
    const edgePlatforms: Array<{ size: [number, number, number]; position: [number, number, number] }> = [
      { size: [10, .8, 10], position: [-12, 11, 25.5] },
      { size: [12, .8, 9], position: [11, 24, 26] },
      { size: [9, .8, 11], position: [-8, 34, -25.5] },
      { size: [11, .8, 10], position: [13, 16, -25.5] },
      { size: [10, .8, 12], position: [25.5, 12, 10] },
      { size: [9, .8, 11], position: [26, 30, -10] },
      { size: [10, .8, 10], position: [-25.5, 20, 11] },
      { size: [9, .8, 12], position: [-26, 37, -9] },
      { size: [9, .8, 10], position: [8, 6.5, 25.5] },
      { size: [10, .8, 9], position: [-25.5, 8, -12] },
    ];
    for (const [index, platform] of edgePlatforms.entries()) {
      box(platform.size, platform.position, index % 2 ? pale : white);
      const [x, y, z] = platform.position;
      const outerX = Math.abs(x) > Math.abs(z) ? Math.sign(x) * 29.45 : x;
      const outerZ = Math.abs(z) >= Math.abs(x) ? Math.sign(z) * 29.45 : z;
      box([.7, 5, .7], [outerX, y + 2.1, outerZ], accent);
    }
    this.setVisible(false);
  }

  setVisible(visible: boolean) { this.group.visible = visible; }
}
