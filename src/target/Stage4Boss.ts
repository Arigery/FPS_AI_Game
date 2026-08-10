import * as THREE from 'three';
import type { BoxObstacle } from '../world/TestArena';

export type Stage4WeakpointId = 'LEFT_SHOULDER' | 'RIGHT_SHOULDER' | 'FOREHEAD' | 'LEFT_KNEE' | 'RIGHT_KNEE';
export type Stage4BossPhase = 'SHOULDERS' | 'FOREHEAD' | 'KNEES' | 'DEFEATED';
type Weakpoint = { id: Stage4WeakpointId; mesh: THREE.Mesh; hp: number; max: number; active: boolean; flash: number };

export class Stage4Boss {
  readonly group = new THREE.Group();
  readonly blockers: THREE.Mesh[] = [];
  readonly weakpoints = new Map<Stage4WeakpointId, Weakpoint>();
  readonly obstacles: BoxObstacle[] = [];
  readonly leftArm = new THREE.Group();
  readonly rightArm = new THREE.Group();
  phase: Stage4BossPhase = 'SHOULDERS';
  totalHits = 0;
  defeatTime = 0;
  private readonly armor = new THREE.MeshStandardMaterial({ color: 0x343b42, metalness: .82, roughness: .28 });
  private readonly plate = new THREE.MeshStandardMaterial({ color: 0x78838b, metalness: .92, roughness: .18 });
  private readonly dark = new THREE.MeshStandardMaterial({ color: 0x11171c, metalness: .72, roughness: .35 });
  private readonly inactive = new THREE.MeshStandardMaterial({ color: 0x431b1c, emissive: 0x210506, metalness: .55, roughness: .32 });
  private readonly active = new THREE.MeshStandardMaterial({ color: 0xff403a, emissive: 0x8d0905, metalness: .42, roughness: .22 });

  constructor(scene: THREE.Scene) {
    this.group.name = 'Stage4Boss';
    scene.add(this.group);
    const box = (size: [number, number, number], position: [number, number, number], material: THREE.Material, parent: THREE.Object3D = this.group, blocker = true) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      if (blocker) { mesh.userData.stage4BossBlocker = true; this.blockers.push(mesh); }
      return mesh;
    };
    const cylinder = (radius: number, height: number, position: [number, number, number], material: THREE.Material, parent: THREE.Object3D = this.group, blocker = true) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * .88, height, 12), material);
      mesh.position.set(...position);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      if (blocker) { mesh.userData.stage4BossBlocker = true; this.blockers.push(mesh); }
      return mesh;
    };

    box([5.6, 4.8, 3.2], [0, 8.2, 0], this.armor);
    box([6.4, 1.1, 3.6], [0, 10.4, 0], this.plate);
    box([2.2, 2.1, 2.2], [0, 12.1, .1], this.dark);
    box([1.5, .45, 1.4], [0, 13.25, .05], this.plate);
    cylinder(1.05, 5.4, [-1.35, 3.5, 0], this.armor);
    cylinder(1.05, 5.4, [1.35, 3.5, 0], this.armor);
    box([2.2, .85, 3.4], [-1.35, .6, .15], this.dark);
    box([2.2, .85, 3.4], [1.35, .6, .15], this.dark);

    this.leftArm.position.set(-3.35, 9.6, 0);
    this.rightArm.position.set(3.35, 9.6, 0);
    this.group.add(this.leftArm, this.rightArm);
    cylinder(.72, 5.7, [0, -2.7, 0], this.armor, this.leftArm);
    cylinder(.72, 5.7, [0, -2.7, 0], this.armor, this.rightArm);
    box([1.6, 1.2, 2.3], [0, -5.75, .2], this.dark, this.leftArm);
    box([1.6, 1.2, 2.3], [0, -5.75, .2], this.dark, this.rightArm);
    box([1.7, 2.2, 3], [-3.35, 9.8, 0], this.plate);
    box([1.7, 2.2, 3], [3.35, 9.8, 0], this.plate);

    this.addWeakpoint('LEFT_SHOULDER', [-3.65, 10, 1.58], [1.25, 1.65, .3], 3);
    this.addWeakpoint('RIGHT_SHOULDER', [3.65, 10, 1.58], [1.25, 1.65, .3], 3);
    this.addWeakpoint('FOREHEAD', [0, 12.55, 1.22], [.85, .65, .28], 4);
    this.addWeakpoint('LEFT_KNEE', [-1.35, 3.8, 1.03], [1.15, 1.1, .28], 4);
    this.addWeakpoint('RIGHT_KNEE', [1.35, 3.8, 1.03], [1.15, 1.1, .28], 4);
    this.reset();
    this.group.updateMatrixWorld(true);
    for (const mesh of [this.blockers[0], this.blockers[4], this.blockers[5]]) {
      this.obstacles.push({ mesh, box: new THREE.Box3().setFromObject(mesh) });
    }
    this.setVisible(false);
  }

  private addWeakpoint(id: Stage4WeakpointId, position: [number, number, number], size: [number, number, number], hp: number) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), this.inactive);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.userData.stage4Weakpoint = id;
    this.group.add(mesh);
    this.weakpoints.set(id, { id, mesh, hp, max: hp, active: false, flash: 0 });
  }

  reset() {
    this.phase = 'SHOULDERS'; this.totalHits = 0; this.defeatTime = 0;
    this.group.position.y = 0; this.group.rotation.x = 0;
    this.leftArm.rotation.set(0, 0, 0); this.rightArm.rotation.set(0, 0, 0);
    for (const weakpoint of this.weakpoints.values()) {
      weakpoint.hp = weakpoint.max; weakpoint.flash = 0; weakpoint.mesh.visible = true; weakpoint.active = false; weakpoint.mesh.material = this.inactive;
    }
    this.activate(['LEFT_SHOULDER', 'RIGHT_SHOULDER']);
  }

  private activate(ids: Stage4WeakpointId[]) {
    for (const id of ids) { const point = this.weakpoints.get(id)!; point.active = true; point.mesh.material = this.active; }
  }

  hit(object: THREE.Object3D) {
    const id = object.userData.stage4Weakpoint as Stage4WeakpointId | undefined;
    const point = id ? this.weakpoints.get(id) : undefined;
    if (!point?.active || point.hp <= 0 || this.phase === 'DEFEATED') return { hit: false, destroyed: false, defeated: false };
    point.hp--; point.flash = .09; this.totalHits++;
    const destroyed = point.hp === 0;
    if (destroyed) { point.active = false; point.mesh.visible = false; }
    if (this.phase === 'SHOULDERS' && this.dead('LEFT_SHOULDER') && this.dead('RIGHT_SHOULDER')) { this.phase = 'FOREHEAD'; this.activate(['FOREHEAD']); }
    else if (this.phase === 'FOREHEAD' && this.dead('FOREHEAD')) { this.phase = 'KNEES'; this.activate(['LEFT_KNEE', 'RIGHT_KNEE']); }
    else if (this.phase === 'KNEES' && this.dead('LEFT_KNEE') && this.dead('RIGHT_KNEE')) this.phase = 'DEFEATED';
    return { hit: true, destroyed, defeated: this.phase === 'DEFEATED' };
  }

  private dead(id: Stage4WeakpointId) { return this.weakpoints.get(id)!.hp <= 0; }
  hitObjects() { return [...this.blockers, ...[...this.weakpoints.values()].filter(point => point.mesh.visible).map(point => point.mesh)]; }
  missileOrigin(index: number) { return new THREE.Vector3(index % 2 ? 3.6 : -3.6, 11.1, .4).applyMatrix4(this.group.matrixWorld); }
  railOrigin() { return new THREE.Vector3(0, 12.5, 1.1).applyMatrix4(this.group.matrixWorld); }
  setSlamPose(value: number) { this.rightArm.rotation.x = -1.45 * THREE.MathUtils.clamp(value, 0, 1); }
  facePlayer(player: THREE.Vector3, dt: number) {
    if (this.phase === 'DEFEATED') return;
    const target = Math.atan2(player.x - this.group.position.x, player.z - this.group.position.z);
    const delta = Math.atan2(Math.sin(target - this.group.rotation.y), Math.cos(target - this.group.rotation.y));
    this.group.rotation.y += delta * Math.min(1, dt * 3.2);
    this.group.updateMatrixWorld(true);
    for (const obstacle of this.obstacles) obstacle.box.setFromObject(obstacle.mesh);
  }
  phaseLabel() { return this.phase === 'SHOULDERS' ? '\uc591\ucabd \uc5b4\uae68 \ubcf4\ud638\ub300' : this.phase === 'FOREHEAD' ? '\uc774\ub9c8 \ucf54\uc5b4' : this.phase === 'KNEES' ? '\uc591\ucabd \ubb34\ub98e \uad00\uc808' : '\uac00\ub3d9 \uc911\uc9c0'; }

  update(dt: number) {
    for (const point of this.weakpoints.values()) {
      if (point.flash > 0) { point.flash -= dt; point.mesh.material = point.flash > 0 ? this.plate : point.active ? this.active : this.inactive; }
    }
    if (this.phase === 'DEFEATED') {
      this.defeatTime += dt;
      const t = THREE.MathUtils.clamp(this.defeatTime / 1.4, 0, 1);
      this.group.position.y = -2.3 * t;
      this.group.rotation.x = .13 * t;
      this.leftArm.rotation.z = -.28 * t; this.rightArm.rotation.z = .28 * t;
    }
  }

  setVisible(visible: boolean) { this.group.visible = visible; }
}
