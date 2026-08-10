import './Stage4.css';
import { STAGE4 } from '../stages/Stage4Config';

export type Stage4HUDState = { playerHP: number; hits: number; phase: string; attack: string; regen: boolean };
export type Stage4Result = { clear: boolean; playerHP: number; hits: number; accuracy: number; shotsFired: number };

export class Stage4UI {
  readonly intro = document.createElement('div');
  readonly hud = document.createElement('div');
  readonly result = document.createElement('div');

  constructor() {
    this.intro.id = 'stage4-intro';
    this.intro.innerHTML = '<section><small>COLOSSUS INTERCEPTION</small><h1>STAGE 4</h1><p><b>거대 병기의 약점을 순서대로 파괴하세요.</b></p><p>양쪽 어깨 보호대 → 이마 코어 → 양쪽 무릎 관절<br>벽과 천장 구조물에 그래플을 걸어 공격을 회피할 수 있습니다.</p><button id="stage4-start">클릭하여 게임 시작</button><button id="stage4-intro-back" class="secondary">스테이지 선택으로</button></section>';
    this.hud.id = 'stage4-hud'; this.result.id = 'stage4-result';
    document.body.append(this.intro, this.hud, this.result); this.hideAll();
  }

  bind(start: () => void, retry: () => void, back: () => void, next: () => void) {
    this.intro.querySelector('#stage4-start')!.addEventListener('click', start);
    this.intro.querySelector('#stage4-intro-back')!.addEventListener('click', back);
    this.result.addEventListener('click', event => {
      const id = (event.target as HTMLElement).id;
      if (id === 'stage4-retry') retry();
      if (id === 'stage4-back') back();
      if (id === 'stage4-next') next();
    });
  }

  showIntro() { this.hideAll(); this.intro.style.display = 'grid'; }
  showHUD() { this.intro.style.display = this.result.style.display = 'none'; this.hud.style.display = 'block'; }
  update(value: Stage4HUDState) {
    const boss = Math.max(0, (STAGE4.totalWeakpointHits - value.hits) / STAGE4.totalWeakpointHits * 100);
    const player = Math.max(0, value.playerHP / STAGE4.playerMaxHP * 100);
    this.hud.innerHTML = `<div class="stage4-boss"><small>TITAN CLASS // ACTIVE WEAKPOINT</small><strong>${value.phase}</strong><div class="stage4-boss-bar"><i style="width:${boss}%"></i><b>${STAGE4.totalWeakpointHits - value.hits} / ${STAGE4.totalWeakpointHits}</b></div></div>${value.attack ? `<div class="stage4-attack">${value.attack}</div>` : ''}<div class="stage4-player ${value.playerHP <= 25 ? 'low' : ''}"><b>HP ${Math.ceil(value.playerHP)} / ${STAGE4.playerMaxHP}</b><div><i style="width:${player}%"></i></div><small>${value.regen ? '자동 회복 중' : 'PLAYER VITALS'}</small></div>`;
  }
  showResult(value: Stage4Result) {
    this.hideAll(); this.result.style.display = 'grid';
    this.result.innerHTML = `<section><small>${value.clear ? 'BOSS DISABLED' : 'MISSION FAILED'}</small><h1>STAGE 4 ${value.clear ? 'CLEAR' : 'FAILED'}</h1><p>${value.clear ? '거대 병기의 모든 약점이 파괴되어 가동이 정지되었습니다.' : '플레이어가 전투 불능 상태가 되었습니다.'}</p><div class="result-grid"><span>약점 적중</span><b>${value.hits} / ${STAGE4.totalWeakpointHits}</b><span>명중률</span><b>${value.accuracy.toFixed(1)}%</b><span>남은 플레이어 체력</span><b>${Math.ceil(value.playerHP)} / ${STAGE4.playerMaxHP}</b></div><div class="result-buttons"><button id="stage4-retry">다시 도전</button>${value.clear ? '<button id="stage4-next">다음 스테이지로</button>' : ''}<button id="stage4-back" class="secondary">스테이지 선택으로</button></div></section>`;
  }
  hideAll() { this.intro.style.display = this.hud.style.display = this.result.style.display = 'none'; }
}
