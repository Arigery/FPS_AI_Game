import * as THREE from 'three';
import { BoxObstacle } from '../world/TestArena';
import { STAGE2, STAGE2_TARGETS } from './Stage2Config';

type Size3 = [number, number, number];
type Position3 = [number, number, number];

/** Deterministic Stage 2 city course. No gameplay object is randomized. */
export class Stage2Map {
  obstacles: BoxObstacle[] = [];
  grappleMeshes: THREE.Object3D[] = [];
  meshes: THREE.Mesh[] = [];
  goalMeshes: THREE.Object3D[] = [];

  constructor(private scene: THREE.Scene) {
    const buildingMaterial = (color: number) => new THREE.MeshStandardMaterial({
      color,
      roughness: .72,
      metalness: .05,
    });
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x718089,
      emissive: 0x182d37,
      emissiveIntensity: .52,
      roughness: .32,
      metalness: .2,
      side: THREE.DoubleSide,
    });
    const cyanMaterial = new THREE.MeshBasicMaterial({ color: 0x91e5ed });

    const decorateFacade = (mesh: THREE.Mesh, size: Size3) => {
      if (size[1] <= 2) {
        const rim = new THREE.Mesh(
          new THREE.BoxGeometry(size[0] * .72, .16, .05),
          new THREE.MeshStandardMaterial({ color: 0x839199, roughness: .5, metalness: .15 }),
        );
        rim.position.set(0, 0, size[2] / 2 + .025);
        const light = new THREE.Mesh(new THREE.BoxGeometry(size[0] * .38, .07, .06), cyanMaterial);
        light.position.set(0, .22, size[2] / 2 + .055);
        mesh.add(rim, light);
        return;
      }

      const panelHeight = Math.min(11, Math.max(2, size[1] * .5));
      const panelY = Math.min(size[1] * .12, size[1] / 2 - panelHeight / 2 - .25);
      const panel = (width: number, position: Position3, rotationY: number) => {
        const facade = new THREE.Mesh(new THREE.PlaneGeometry(width, panelHeight), windowMaterial);
        facade.position.set(...position);
        facade.rotation.y = rotationY;
        facade.renderOrder = 2;
        mesh.add(facade);
      };
      panel(Math.max(1, size[0] * .68), [0, panelY, size[2] / 2 + .012], 0);
      panel(Math.max(1, size[0] * .68), [0, panelY, -size[2] / 2 - .012], Math.PI);
      panel(Math.max(1, size[2] * .62), [size[0] / 2 + .012, panelY, 0], Math.PI / 2);
      panel(Math.max(1, size[2] * .62), [-size[0] / 2 - .012, panelY, 0], -Math.PI / 2);

      const guide = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1, size[0] * .45), .1, .035), cyanMaterial);
      guide.position.set(0, Math.min(size[1] / 2 - .2, panelY + panelHeight / 2 + .24), size[2] / 2 + .025);
      mesh.add(guide);
    };

    const createBox = (size: Size3, position: Position3, color: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), buildingMaterial(color));
      mesh.position.set(...position);
      mesh.castShadow = mesh.receiveShadow = true;
      this.scene.add(mesh);
      mesh.updateMatrixWorld();
      this.meshes.push(mesh);
      this.obstacles.push({ mesh, box: new THREE.Box3().setFromObject(mesh) });
      this.grappleMeshes.push(mesh);
      decorateFacade(mesh, size);
      return mesh;
    };

    const bounds = (size: Size3, position: Position3) => new THREE.Box3(
      new THREE.Vector3(position[0] - size[0] / 2, position[1] - size[1] / 2, position[2] - size[2] / 2),
      new THREE.Vector3(position[0] + size[0] / 2, position[1] + size[1] / 2, position[2] + size[2] / 2),
    );

    // Face contact is allowed; shared internal volume is forbidden.
    const overlapsExisting = (size: Size3, position: Position3) => {
      const candidate = bounds(size, position);
      const epsilon = .035;
      return this.obstacles.some(({ box }) =>
        candidate.min.x < box.max.x - epsilon && candidate.max.x > box.min.x + epsilon &&
        candidate.min.y < box.max.y - epsilon && candidate.max.y > box.min.y + epsilon &&
        candidate.min.z < box.max.z - epsilon && candidate.max.z > box.min.z + epsilon
      );
    };

    const entersTargetBody = (size: Size3, position: Position3) => {
      const candidate = bounds(size, position);
      return STAGE2_TARGETS.some(({ position: target }) =>
        candidate.max.x > target[0] - .8 && candidate.min.x < target[0] + .8 &&
        candidate.max.z > target[2] - .8 && candidate.min.z < target[2] + .8 &&
        candidate.max.y > target[1] + .035 && candidate.min.y < target[1] + 2.2
      );
    };

    const addCourseBox = (size: Size3, position: Position3, color = 0xe4e7e9) => {
      if (overlapsExisting(size, position) || entersTargetBody(size, position)) return undefined;
      return createBox(size, position, color);
    };

    // Fixed boundaries and safe start/goal areas are reserved first.
    createBox([2, 60, 500], [-40, 30, 0], 0xc8cdd1);
    createBox([2, 60, 500], [40, 30, 0], 0xc8cdd1);
    createBox([22, 30, 18], [0, 15, 238], 0xf3f5f6);
    createBox([24, 4, 24], [0, 2, -247], 0xe8ebed);

    // 40 large ground buildings: two per row, with 10–15m footprints and
    // 15–30m heights. The target tower occupies the remaining outer lane.
    const largeWidths = [12, 15, 10, 14, 11];
    const largeDepths = [12, 10, 14, 11, 13];
    const largeHeights = [18, 22, 26, 30, 16, 20, 24, 28];
    STAGE2_TARGETS.forEach((target, index) => {
      const outerSize: Size3 = [
        largeWidths[index % largeWidths.length],
        largeHeights[index % largeHeights.length],
        largeDepths[index % largeDepths.length],
      ];
      const side = Math.sign(target.position[0]) || 1;
      const outerPosition: Position3 = [-side * 22, outerSize[1] / 2, target.position[2]];
      addCourseBox(outerSize, outerPosition, index % 3 === 0 ? 0xf0f2f3 : index % 3 === 1 ? 0xd9dee1 : 0xe6e9eb);

      const centerSize: Size3 = [
        largeWidths[(index + 2) % largeWidths.length],
        largeHeights[(index + 3) % largeHeights.length],
        largeDepths[(index + 1) % largeDepths.length],
      ];
      const centerPosition: Position3 = [-side * 4, centerSize[1] / 2, target.position[2]];
      addCourseBox(centerSize, centerPosition, index % 2 === 0 ? 0xe2e6e8 : 0xf1f2f3);
    });

    // 20 slim target towers: 2–3m footprints, 15–30m heights. Their top
    // surfaces exactly match the target feet, so no mannequin is embedded.
    STAGE2_TARGETS.forEach((target, index) => {
      const footprint = index % 2 === 0 ? 2.6 : 3;
      addCourseBox(
        [footprint, target.position[1], footprint],
        [target.position[0], target.position[1] / 2, target.position[2]],
        index % 2 === 0 ? 0xf3f4f5 : 0xdfe3e6,
      );
    });

    // 14 hand-placed floating walls. They remain Z-oriented, but irregular X,
    // Y and Z positions prevent the course from reading as two side rails.
    const floatingWalls: Array<[number, number, number, number]> = [
      [-26,34,205,28],[9,38,177,22],[24,36,141,30],[-8,40,112,25],
      [-22,35,76,27],[18,39,43,24],[2,36,8,30],[-27,40,-28,22],
      [13,34,-61,28],[26,38,-97,25],[-5,36,-132,30],[-20,40,-166,24],
      [21,35,-199,28],[0,39,-226,20],
    ];
    floatingWalls.forEach(([x,y,z,length],index) => {
      addCourseBox([1.2, 7, length], [x, y, z], index % 2 === 0 ? 0xd2d8dc : 0xe8ebed);
    });

    // Five smaller mid-height walls fill only the largest empty gaps between
    // building rows. They float around y=15m and keep the Z-oriented profile.
    const lowGapWalls: Array<[number, number, number]> = [
      [-12,202.5,10],[15,110.5,12],[-25,18.5,15],[24,-73.5,11],[0,-165.5,14],
    ];
    lowGapWalls.forEach(([x,z,height],index) => {
      addCourseBox([1.2, height, 8], [x, 15, z], index % 2 === 0 ? 0xd8dde0 : 0xebeef0);
    });

    // 12 irregular ceiling slabs. Their heights, lateral offsets, spacing and
    // Z lengths vary, while every slab remains a plain horizontal hook surface.
    const ceilingSlabs: Array<[number, number, number, number, number]> = [
      [0,46,196,26,22],[-12,49,153,20,18],[10,45,118,24,26],[-4,51,79,28,17],
      [14,47,37,20,24],[-13,50,1,26,20],[5,45,-42,22,28],[15,49,-79,24,18],
      [-10,47,-119,28,24],[1,51,-154,20,27],[12,46,-193,26,20],[-7,49,-225,22,18],
    ];
    ceilingSlabs.forEach(([x,y,z,width,depth]) => {
      addCourseBox([width, 1.2, depth], [x, y, z], 0xf2f4f5);
    });

    // Visible lethal canyon floor. It is deliberately excluded from collision
    // and grapple arrays; Stage2 handles contact as an immediate respawn.
    const deathFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(STAGE2.width - 4, STAGE2.length),
      new THREE.MeshStandardMaterial({ color: 0x626b71, roughness: .92, metalness: .02 }),
    );
    deathFloor.rotation.x = -Math.PI / 2;
    deathFloor.position.set(0, STAGE2.deathFloorY + .006, 0);
    deathFloor.receiveShadow = true;
    this.scene.add(deathFloor);
    this.meshes.push(deathFloor);

    for (let z = 225; z > -245; z -= 30) {
      const hazard = new THREE.Mesh(
        new THREE.PlaneGeometry(32, .28),
        new THREE.MeshBasicMaterial({ color: 0xd75c57, transparent: true, opacity: .72, side: THREE.DoubleSide }),
      );
      hazard.rotation.x = -Math.PI / 2;
      hazard.position.set(0, STAGE2.deathFloorY + .012, z);
      this.scene.add(hazard);
      this.meshes.push(hazard);
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(STAGE2.goalRadius - 1, STAGE2.goalRadius, 64),
      new THREE.MeshBasicMaterial({ color: 0x38f58a, side: THREE.DoubleSide, transparent: true, opacity: .9, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 4.03, -247);
    this.scene.add(ring);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(.25, 1.8, 35, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x51f49a, transparent: true, opacity: .2, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.set(0, 21.5, -247);
    this.scene.add(beam);
    this.goalMeshes.push(ring, beam);
    this.setVisible(false);
  }

  setVisible(value: boolean) {
    for (const mesh of this.meshes) mesh.visible = value;
    for (const mesh of this.goalMeshes) mesh.visible = value;
  }
}
