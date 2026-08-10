import * as THREE from 'three';
export class InputManager {
  keys = new Set<string>(); pressed = new Set<string>(); mousePressed = new Set<number>();
  look = new THREE.Vector2(); locked = false; zoom = false;
  lockError = '';
  ignoreNextMouseMove = false;
  constructor(private canvas: HTMLCanvasElement) {
    addEventListener('keydown', e => { if (!e.repeat) this.pressed.add(e.code); this.keys.add(e.code); });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('mousedown', e => {
      if (!this.locked) return;
      this.mousePressed.add(e.button);
      if (e.button === 2) this.zoom = true;
    });
    addEventListener('mouseup', e => { if (e.button === 2) this.zoom = false; });
    addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => {
      if (!this.locked) return;
      if (this.ignoreNextMouseMove) { this.ignoreNextMouseMove = false; return; }
      this.look.x += THREE.MathUtils.clamp(e.movementX, -200, 200);
      this.look.y += THREE.MathUtils.clamp(e.movementY, -200, 200);
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (this.locked) { this.lockError = ''; this.look.set(0,0); this.ignoreNextMouseMove = true; }
    });
    document.addEventListener('pointerlockerror', () => {
      this.locked = false;
      this.lockError = '마우스 잠금에 실패했습니다. 화면을 다시 클릭하세요.';
    });
  }
  async lock(){
    if (this.locked) return true;
    this.lockError = '';
    try { await this.canvas.requestPointerLock({unadjustedMovement:true}); }
    catch {
      try { await this.canvas.requestPointerLock(); }
      catch { this.lockError = '마우스 잠금에 실패했습니다. 화면을 다시 클릭하세요.'; return false; }
    }
    return document.pointerLockElement === this.canvas;
  }
  down(code:string){ return this.keys.has(code); } take(code:string){ const v=this.pressed.has(code); this.pressed.delete(code); return v; }
  takeMouse(button:number){ const v=this.mousePressed.has(button); this.mousePressed.delete(button); return v; }
  endFrame(){ this.look.set(0,0); }
}
