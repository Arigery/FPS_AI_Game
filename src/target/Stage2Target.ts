import * as THREE from 'three';

export class Stage2Target {
  group = new THREE.Group();
  body: THREE.Mesh;
  outline: THREE.Mesh;
  alive = true;

  constructor(public id: string, position: THREE.Vector3, scene: THREE.Scene) {
    // Stage 2 intentionally uses one generous capsule. There is no separate
    // head hitbox or headshot reward in this movement-focused time attack.
    const geometry = new THREE.CapsuleGeometry(.46, 1.15, 6, 12);
    this.body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xe2e7ea, roughness: .5 }));
    this.body.position.y = 1.08;
    this.body.userData = { stage2Target: this, hitType: 'SHOT' };

    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0xff7880,
      transparent: true,
      opacity: .42,
      depthTest: false,
      depthWrite: false,
      side: THREE.BackSide,
    });
    this.outline = new THREE.Mesh(geometry, outlineMaterial);
    this.outline.position.copy(this.body.position);
    this.outline.scale.setScalar(1.1);
    this.outline.renderOrder = 1000;

    this.group.position.copy(position);
    this.group.add(this.body, this.outline);
    scene.add(this.group);
    this.setHighlight(false);
  }

  hitObjects() { return [this.body]; }
  center(out = new THREE.Vector3()) { return this.group.getWorldPosition(out).add(new THREE.Vector3(0, 1.08, 0)); }
  setHighlight(value: boolean) { this.outline.visible = value && this.alive; }
  kill() { if (!this.alive) return false; this.alive = false; this.body.visible = false; this.setHighlight(false); return true; }
  reset() { this.alive = true; this.body.visible = true; this.setHighlight(false); }
  setVisible(value: boolean) { this.group.visible = value; }
}
