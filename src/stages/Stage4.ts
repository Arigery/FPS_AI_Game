import * as THREE from 'three';
import { Stage4Map } from './Stage4Map';
import { Stage4Boss } from '../target/Stage4Boss';
import { Stage4UI, type Stage4Result } from '../ui/Stage4UI';
import { STAGE4 } from './Stage4Config';
import { CFG } from '../core/GameConfig';

export type Stage4State = 'INACTIVE' | 'INTRO' | 'PLAYING' | 'CLEAR' | 'FAILED';
export type Stage4Sound = 'RAIL_CHARGE' | 'RAIL_FIRE' | 'SLAM_CHARGE' | 'SLAM_IMPACT' | 'WAVE_CHARGE' | 'WAVE_IMPACT' | 'MISSILE_LAUNCH' | 'MISSILE_EXPLOSION';
export interface Stage4Callbacks { lock: () => Promise<boolean>; intro: (continueStart: () => void) => void; respawn: () => void; started: () => void; finished: (result: Stage4Result) => void; back: () => void; next: () => void; playerDamaged: () => void; sound: (cue: Stage4Sound) => void; }
type Attack = 'IDLE' | 'RAIL' | 'MISSILE' | 'SLAM' | 'WAVE';
type ActiveAttack = Exclude<Attack, 'IDLE'>;
type Missile = { mesh: THREE.Mesh; velocity: THREE.Vector3; target: THREE.Vector3; locked: boolean; age: number; life: number };
type Explosion = { mesh: THREE.Mesh; age: number; life: number };
type AttackSlot = {
  attack: Attack; start: number; end: number; resolved: boolean; volleyRemaining: number; nextMissileAt: number;
  rail: THREE.Mesh; slam: THREE.Mesh; floorWave: THREE.Mesh;
  railOrigin: THREE.Vector3; railDirection: THREE.Vector3; slamDirection: THREE.Vector3;
};

export class Stage4 {
  readonly map: Stage4Map;
  readonly boss: Stage4Boss;
  readonly ui = new Stage4UI();
  state: Stage4State = 'INACTIVE';
  playerHP: number = STAGE4.playerMaxHP;
  shotsFired = 0; shotsHit = 0;
  startTime = 0; pauseStartedAt: number | null = null; pausedDuration = 0; lastDamageAt = -Infinity;
  attack: Attack = 'IDLE'; nextAttackAt = 2;
  volleyRemaining = 0; nextMissileAt = 0; missiles: Missile[] = []; explosions: Explosion[] = [];
  defeatPending = false;
  private readonly attackSlots: AttackSlot[];
  private lastPrimaryAttack: ActiveAttack | null = null;
  private attackGroupTarget = 0;

  constructor(private scene: THREE.Scene, private callbacks: Stage4Callbacks) {
    this.map = new Stage4Map(scene); this.boss = new Stage4Boss(scene);
    this.attackSlots = [this.createAttackSlot(), this.createAttackSlot()];
    this.ui.bind(() => void this.begin(), () => this.enter(), callbacks.back, callbacks.next);
  }

  private createAttackSlot(): AttackSlot {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 18), new THREE.MeshBasicMaterial({ color: 0xff302b, transparent: true, opacity: .25, depthWrite: false, blending: THREE.AdditiveBlending }));
    const slam = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: .62, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    const floorWave = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64), new THREE.MeshBasicMaterial({ color: 0xff1710, transparent: true, opacity: .3, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    rail.visible = slam.visible = floorWave.visible = false; this.scene.add(rail, slam, floorWave);
    return { attack: 'IDLE', start: 0, end: 0, resolved: false, volleyRemaining: 0, nextMissileAt: 0, rail, slam, floorWave, railOrigin: new THREE.Vector3(), railDirection: new THREE.Vector3(), slamDirection: new THREE.Vector3() };
  }

  enter() {
    this.clearDynamic(); this.state = 'INTRO'; this.playerHP = STAGE4.playerMaxHP; this.shotsFired = this.shotsHit = 0;
    this.startTime = 0; this.pauseStartedAt = null; this.pausedDuration = 0; this.lastDamageAt = -Infinity;
    this.attack = 'IDLE'; this.nextAttackAt = 2; this.lastPrimaryAttack = null; this.attackGroupTarget = 0; this.defeatPending = false;
    this.boss.reset(); this.boss.setVisible(true); this.map.setVisible(true); this.callbacks.respawn(); this.ui.showIntro(); this.ui.update(this.hudState(false));
  }
  begin() { if (this.state !== 'INTRO') return; this.ui.hideAll(); this.callbacks.intro(() => void this.startAfterIntro()); }
  async startAfterIntro() { if (this.state !== 'INTRO') return; const locked = await this.callbacks.lock(); if (!locked) { this.ui.showIntro(); return; } this.state = 'PLAYING'; this.startTime = performance.now(); this.ui.showHUD(); this.callbacks.started(); }
  activeTime(now = performance.now()) { return Math.max(0, (now - this.startTime - this.pausedDuration) / 1000); }
  accuracy() { return this.shotsFired ? this.shotsHit / this.shotsFired * 100 : 0; }
  shot() { if (this.state === 'PLAYING') this.shotsFired++; }
  hitObjects() { return this.boss.hitObjects(); }
  hitObject(object: THREE.Object3D) {
    if (this.state !== 'PLAYING') return false;
    const result = this.boss.hit(object); if (!result.hit) return false; this.shotsHit++;
    if (result.defeated) { this.defeatPending = true; this.clearAttacks(); this.removeMissiles(); } return true;
  }
  obstacles() { return [...this.map.obstacles, ...this.boss.obstacles]; }
  grappleMeshes() { return this.map.grappleMeshes; }
  hudState(regen: boolean) { return { playerHP: this.playerHP, hits: this.boss.totalHits, phase: this.boss.phaseLabel(), attack: this.attackLabel(), regen }; }
  attackLabel() {
    return this.attackSlots.filter(slot => slot.attack !== 'IDLE').map(slot => slot.attack === 'RAIL' ? 'RAILGUN LOCK // 붉은 궤적에서 이탈' : slot.attack === 'MISSILE' ? `GUIDED MISSILES // ${slot.volleyRemaining}발 대기` : slot.attack === 'SLAM' ? 'ARM SLAM // 붉은 범위에서 이탈' : 'GROUND SHOCK // 그래플로 지면에서 이탈').join(' + ');
  }

  update(playerPosition: THREE.Vector3, dt: number, paused = false) {
    if (this.state !== 'PLAYING') { this.boss.update(dt); return; }
    const now = performance.now();
    if (paused) { if (this.pauseStartedAt === null) this.pauseStartedAt = now; this.ui.update(this.hudState(false)); return; }
    if (this.pauseStartedAt !== null) { this.pausedDuration += now - this.pauseStartedAt; this.pauseStartedAt = null; }
    const elapsed = this.activeTime(now); this.boss.facePlayer(playerPosition, dt);
    if (this.defeatPending) { this.boss.update(dt); this.ui.update(this.hudState(false)); if (this.boss.defeatTime >= 1.4) this.finish(true); return; }
    const regen = elapsed - this.lastDamageAt >= STAGE4.playerRegenDelay && this.playerHP < STAGE4.playerMaxHP;
    if (regen) this.playerHP = Math.min(STAGE4.playerMaxHP, this.playerHP + STAGE4.playerRegenPerSecond * dt);
    this.updateAttack(elapsed, playerPosition, dt); this.updateMissiles(playerPosition, elapsed, dt); this.updateExplosions(dt); this.boss.update(dt); this.ui.update(this.hudState(regen));
  }

  private updateAttack(elapsed: number, player: THREE.Vector3, dt: number) {
    let active = this.attackSlots.filter(slot => slot.attack !== 'IDLE');
    if (active.length === 0 && elapsed >= this.nextAttackAt) this.startAttackGroup(elapsed, player);
    else if (this.boss.phase === 'KNEES' && this.attackGroupTarget === 1 && active.length === 1) {
      const free = this.attackSlots.find(slot => slot.attack === 'IDLE');
      if (free) { this.startAttackSlot(free, this.chooseAttack([active[0].attack as ActiveAttack]), elapsed, player); this.attackGroupTarget = 2; }
    }
    active = this.attackSlots.filter(slot => slot.attack !== 'IDLE');
    for (const slot of active) this.updateAttackSlot(slot, elapsed, player, dt);
    this.syncAttackState();
  }

  private updateAttackSlot(slot: AttackSlot, elapsed: number, player: THREE.Vector3, dt: number) {
    if (slot.attack === 'IDLE' || this.state !== 'PLAYING') return;
    if (slot.attack === 'MISSILE') {
      if (slot.volleyRemaining > 0 && elapsed >= slot.nextMissileAt) { this.launchMissile(player, slot.volleyRemaining); slot.volleyRemaining--; slot.nextMissileAt += STAGE4.missileLaunchGap; }
      if (slot.volleyRemaining === 0 && elapsed >= slot.nextMissileAt + .1) this.endAttackSlot(slot, elapsed, .85);
      return;
    }
    if (slot.attack === 'RAIL') {
      if (!slot.resolved && elapsed >= slot.end) {
        slot.resolved = true; slot.end = elapsed + .14; (slot.rail.material as THREE.MeshBasicMaterial).opacity = .92; this.callbacks.sound('RAIL_FIRE');
        if (this.distanceToSegment(player, slot.railOrigin, slot.railOrigin.clone().addScaledVector(slot.railDirection, 70)) <= STAGE4.railRadius) this.damage(STAGE4.railDamage, elapsed);
      } else if (slot.resolved && elapsed >= slot.end) this.endAttackSlot(slot, elapsed, .72);
      return;
    }
    if (slot.attack === 'WAVE') {
      if (!slot.resolved && elapsed >= slot.end) {
        slot.resolved = true; slot.end = elapsed + .28; (slot.floorWave.material as THREE.MeshBasicMaterial).opacity = .92; this.callbacks.sound('WAVE_IMPACT');
        if (player.y - CFG.eyeHeight <= STAGE4.floorWaveHeight) this.damage(STAGE4.floorWaveDamage, elapsed);
      } else if (slot.resolved && elapsed >= slot.end) this.endAttackSlot(slot, elapsed, 1);
      return;
    }
    const charge = THREE.MathUtils.clamp((elapsed - slot.start) / STAGE4.slamTelegraph, 0, 1); this.boss.setSlamPose(charge);
    if (!slot.resolved && elapsed >= slot.end) {
      slot.resolved = true; slot.end = elapsed + .2; (slot.slam.material as THREE.MeshBasicMaterial).opacity = 1; this.boss.setSlamPose(1); this.callbacks.sound('SLAM_IMPACT');
      const flat = new THREE.Vector3(player.x, 0, player.z), along = flat.dot(slot.slamDirection), lateral = Math.abs(flat.x * slot.slamDirection.z - flat.z * slot.slamDirection.x);
      if (along >= 0 && along <= STAGE4.slamLength && lateral <= STAGE4.slamWidth / 2) this.damage(STAGE4.slamDamage, elapsed);
    } else if (slot.resolved && elapsed >= slot.end) this.endAttackSlot(slot, elapsed, .9);
    void dt;
  }

  private startAttackGroup(elapsed: number, player: THREE.Vector3) {
    const first = this.chooseAttack([], true); this.lastPrimaryAttack = first; this.attackGroupTarget = this.boss.phase === 'KNEES' ? 2 : 1;
    this.startAttackSlot(this.attackSlots[0], first, elapsed, player);
    if (this.attackGroupTarget === 2) this.startAttackSlot(this.attackSlots[1], this.chooseAttack([first]), elapsed, player);
    this.syncAttackState();
  }

  private chooseAttack(excluded: ActiveAttack[] = [], avoidPrevious = false): ActiveAttack {
    const pool: ActiveAttack[] = ['RAIL', 'MISSILE', 'SLAM', 'WAVE'];
    let choices = pool.filter(value => !excluded.includes(value) && !(excluded.includes('SLAM') && value === 'WAVE') && !(excluded.includes('WAVE') && value === 'SLAM'));
    if (avoidPrevious && this.lastPrimaryAttack && choices.length > 1) choices = choices.filter(value => value !== this.lastPrimaryAttack);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  private startAttackSlot(slot: AttackSlot, attack: ActiveAttack, elapsed: number, player: THREE.Vector3) {
    slot.attack = attack; slot.start = elapsed; slot.end = elapsed; slot.resolved = false; slot.volleyRemaining = 0; slot.nextMissileAt = 0;
    slot.rail.visible = slot.slam.visible = slot.floorWave.visible = false;
    if (attack === 'RAIL') {
      slot.railOrigin.copy(this.boss.railOrigin()); slot.railDirection.copy(player).sub(slot.railOrigin).normalize(); slot.end = elapsed + STAGE4.railTelegraph;
      this.placeCylinder(slot.rail, slot.railOrigin, slot.railOrigin.clone().addScaledVector(slot.railDirection, 70), STAGE4.railRadius); (slot.rail.material as THREE.MeshBasicMaterial).opacity = .25; slot.rail.visible = true; this.callbacks.sound('RAIL_CHARGE');
    } else if (attack === 'MISSILE') {
      const progress = this.boss.totalHits / STAGE4.totalWeakpointHits; slot.volleyRemaining = Math.min(5, 2 + Math.floor(progress * 4)); slot.nextMissileAt = elapsed;
    } else if (attack === 'SLAM') {
      slot.slamDirection.set(player.x, 0, player.z).normalize(); if (slot.slamDirection.lengthSq() < .1) slot.slamDirection.set(0, 0, 1); slot.end = elapsed + STAGE4.slamTelegraph;
      slot.slam.position.copy(slot.slamDirection).multiplyScalar(STAGE4.slamLength / 2); slot.slam.position.y = 1.5; slot.slam.scale.set(STAGE4.slamWidth, 3, STAGE4.slamLength); slot.slam.rotation.y = Math.atan2(slot.slamDirection.x, slot.slamDirection.z); (slot.slam.material as THREE.MeshBasicMaterial).opacity = .62; slot.slam.visible = true; this.callbacks.sound('SLAM_CHARGE');
    } else {
      slot.end = elapsed + STAGE4.floorWaveTelegraph; slot.floorWave.position.set(0, STAGE4.floorWaveHeight / 2, 0); slot.floorWave.scale.set(STAGE4.arenaRadius, STAGE4.floorWaveHeight, STAGE4.arenaRadius); (slot.floorWave.material as THREE.MeshBasicMaterial).opacity = .3; slot.floorWave.visible = true; this.callbacks.sound('WAVE_CHARGE');
    }
  }

  private endAttackSlot(slot: AttackSlot, elapsed: number, delay: number) {
    slot.rail.visible = slot.slam.visible = slot.floorWave.visible = false; if (slot.attack === 'SLAM') this.boss.setSlamPose(0); slot.attack = 'IDLE'; slot.resolved = false; slot.volleyRemaining = 0;
    if (!this.attackSlots.some(value => value.attack !== 'IDLE')) { this.nextAttackAt = elapsed + delay; this.attackGroupTarget = 0; }
  }

  private syncAttackState() {
    const active = this.attackSlots.filter(slot => slot.attack !== 'IDLE'), missileSlots = active.filter(slot => slot.attack === 'MISSILE'); this.attack = active[0]?.attack ?? 'IDLE'; this.volleyRemaining = active.reduce((sum, slot) => sum + slot.volleyRemaining, 0); this.nextMissileAt = missileSlots.length ? Math.min(...missileSlots.map(slot => slot.nextMissileAt)) : 0;
  }

  private clearAttacks() {
    for (const slot of this.attackSlots) { slot.attack = 'IDLE'; slot.resolved = false; slot.volleyRemaining = 0; slot.rail.visible = slot.slam.visible = slot.floorWave.visible = false; }
    this.attack = 'IDLE'; this.volleyRemaining = 0; this.nextMissileAt = 0; this.attackGroupTarget = 0; this.boss.setSlamPose(0);
  }

  private launchMissile(player: THREE.Vector3, volleyIndex: number) {
    const origin = this.boss.missileOrigin(volleyIndex);
    const material = new THREE.MeshStandardMaterial({ color: 0x2b3035, emissive: 0xff3b18, emissiveIntensity: 2, metalness: .72, roughness: .25 });
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(.28, 1.15, 10), material); mesh.position.copy(origin); mesh.castShadow = true; this.scene.add(mesh);
    const velocity = player.clone().sub(origin).normalize().multiplyScalar(STAGE4.missileSpeed); this.missiles.push({ mesh, velocity, target: player.clone(), locked: false, age: 0, life: 0 }); this.callbacks.sound('MISSILE_LAUNCH');
  }
  private updateMissiles(player: THREE.Vector3, elapsed: number, dt: number) {
    for (const missile of [...this.missiles]) {
      missile.age += dt; missile.life += dt;
      if (!missile.locked && missile.age < STAGE4.missileGuideTime) {
        const desired = player.clone().sub(missile.mesh.position).normalize().multiplyScalar(STAGE4.missileSpeed); missile.velocity.lerp(desired, Math.min(1, dt * 2.8)); missile.target.copy(player);
      } else if (!missile.locked) { missile.locked = true; missile.target.copy(player); missile.velocity.copy(missile.target).sub(missile.mesh.position).normalize().multiplyScalar(STAGE4.missileSpeed); }
      const distance = missile.mesh.position.distanceTo(missile.target); missile.mesh.position.addScaledVector(missile.velocity, dt); missile.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), missile.velocity.clone().normalize());
      if ((missile.locked && distance <= STAGE4.missileSpeed * dt * 1.4) || missile.mesh.position.y <= .15 || missile.life >= 4.2) this.explode(missile, player, elapsed);
    }
  }
  private explode(missile: Missile, player: THREE.Vector3, elapsed: number) {
    const point = missile.mesh.position.clone(); this.scene.remove(missile.mesh); missile.mesh.geometry.dispose(); (missile.mesh.material as THREE.Material).dispose(); this.missiles = this.missiles.filter(value => value !== missile);
    const material = new THREE.MeshBasicMaterial({ color: 0xff5b22, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), material); mesh.position.copy(point); mesh.scale.setScalar(.2); this.scene.add(mesh); this.explosions.push({ mesh, age: 0, life: .48 }); this.callbacks.sound('MISSILE_EXPLOSION');
    if (player.distanceTo(point) <= STAGE4.missileExplosionRadius) this.damage(STAGE4.missileDamage, elapsed);
  }
  private updateExplosions(dt: number) {
    for (const effect of [...this.explosions]) { effect.age += dt; const t = effect.age / effect.life; effect.mesh.scale.setScalar(STAGE4.missileExplosionRadius * (.2 + t * .95)); (effect.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, .82 * (1 - t)); if (t >= 1) { this.scene.remove(effect.mesh); effect.mesh.geometry.dispose(); (effect.mesh.material as THREE.Material).dispose(); this.explosions = this.explosions.filter(value => value !== effect); } }
  }
  private damage(amount: number, elapsed: number) { if (this.state !== 'PLAYING') return; this.playerHP = Math.max(0, this.playerHP - amount); this.lastDamageAt = elapsed; this.callbacks.playerDamaged(); if (this.playerHP === 0) this.finish(false); }
  private distanceToSegment(point: THREE.Vector3, start: THREE.Vector3, end: THREE.Vector3) { const line = end.clone().sub(start), length = line.lengthSq(), t = length ? THREE.MathUtils.clamp(point.clone().sub(start).dot(line) / length, 0, 1) : 0; return point.distanceTo(start.clone().addScaledVector(line, t)); }
  private placeCylinder(mesh: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3, radius: number) { const direction = end.clone().sub(start), length = direction.length(); mesh.position.copy(start).add(end).multiplyScalar(.5); mesh.scale.set(radius, length, radius); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); }

  private finish(clear: boolean) {
    if (this.state !== 'PLAYING') return; this.state = clear ? 'CLEAR' : 'FAILED'; this.clearAttacks();
    this.removeMissiles();
    const result: Stage4Result = { clear, playerHP: this.playerHP, hits: this.boss.totalHits, accuracy: this.accuracy(), shotsFired: this.shotsFired }; if (clear) this.ui.hideAll(); else this.ui.showResult(result); this.callbacks.finished(result);
  }
  private removeMissiles() { for (const missile of [...this.missiles]) { this.scene.remove(missile.mesh); missile.mesh.geometry.dispose(); (missile.mesh.material as THREE.Material).dispose(); } this.missiles = []; }
  private clearDynamic() { this.clearAttacks(); for (const missile of this.missiles) { this.scene.remove(missile.mesh); missile.mesh.geometry.dispose(); (missile.mesh.material as THREE.Material).dispose(); } for (const effect of this.explosions) { this.scene.remove(effect.mesh); effect.mesh.geometry.dispose(); (effect.mesh.material as THREE.Material).dispose(); } this.missiles = []; this.explosions = []; }
  leave() { this.state = 'INACTIVE'; this.clearDynamic(); this.map.setVisible(false); this.boss.setVisible(false); this.ui.hideAll(); }
  debugText() { return `STAGE4 ${this.state}\nHP ${this.playerHP.toFixed(1)} BOSS ${this.boss.phase} ${this.boss.totalHits}/${STAGE4.totalWeakpointHits}\nATTACK ${this.attackSlots.filter(slot => slot.attack !== 'IDLE').map(slot => slot.attack).join('+') || 'IDLE'} MISSILES ${this.missiles.length}`; }
}
