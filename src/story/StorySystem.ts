import './StorySystem.css';

export type StoryKey =
  | 'tutorialIntro'
  | 'tutorialOutro'
  | 'stage2Intro'
  | 'stage2Outro'
  | 'stage3Intro'
  | 'stage3Outro'
  | 'stage4Intro'
  | 'stage4Outro';

export const STORIES: Record<StoryKey, string[]> = {
  tutorialIntro: [
    '\uc2e0\uc785 \ub300\uc6d0\uc774\uad70. \ub098\ub294 \uc774\ubc88 \ud6c8\ub828\uc744 \ub2f4\ub2f9\ud55c \uc11c \ub300\uc704\ub2e4.',
    '\uc6b0\uc120 \uc774\ub3d9\uacfc \uc0ac\uaca9, \uadf8\ub798\ud50c \uac19\uc740 \uac00\uc7a5 \uae30\ubcf8\uc801\uc778 \ub2a5\ub825\ubd80\ud130 \ud655\uc778\ud558\uaca0\ub2e4.',
    '\uae34\uc7a5\ud560 \ud544\uc694\ub294 \uc5c6\ub2e4. \uc9c0\uc2dc\ub97c \ub530\ub77c \ud558\ub098\uc529 \uc218\ud589\ud558\ub3c4\ub85d.',
  ],
  tutorialOutro: [
    '\uc0dd\uac01\ubcf4\ub2e4 \uae08\ubc29 \ub530\ub77c\uc624\ub294\uad70.',
    '\uc774 \uc815\ub3c4\uba74 \ud6c8\ub828 \ub09c\uc774\ub3c4\ub97c \uc870\uae08 \ub192\uc5ec\ub3c4 \ub418\uaca0\uc5b4.',
    '\uc7a5\ube44\ub97c \uc815\ube44\ud558\uace0 \ub2e4\uc74c \uacfc\uc815\uc744 \uc9c4\ud589\ud558\uc9c0.',
  ],
  stage2Intro: [
    '\uc774\ubc88 \ud6c8\ub828\uc740 \uadf8\ub798\ud50c\uc744 \uc774\uc6a9\ud55c \uace0\uc18d \uc774\ub3d9\uacfc \uc0ac\uaca9\uc774\ub2e4.',
    '\uc9c0\uba74\ub9cc \ubcf4\uace0 \uc6c0\uc9c1\uc5ec\uc11c\ub294 \uc88b\uc740 \uae30\ub85d\uc744 \ub0bc \uc218 \uc5c6\uc744 \uac70\ub2e4.',
    '\uaf64 \uc5b4\ub824\uc6b8 \ud14c\ub2c8, \uc774\ub3d9 \uacbd\ub85c\ub97c \ube60\ub974\uac8c \ud310\ub2e8\ud558\ub3c4\ub85d.',
  ],
  stage2Outro: [
    '\uc774\uc81c \uadf8\ub798\ud50c \uc774\ub3d9\uc774 \uc880 \uc775\uc219\ud574\uc84c\ub098?',
    '\uc18d\ub3c4 \uc18d\uc5d0\uc11c\ub3c4 \ud45c\uc801\uc744 \ub193\uce58\uc9c0 \uc54a\ub294\uad70.',
    '\ub2e4\uc74c\uc740 \uc880 \ub354 \uc2e4\uc804\uc5d0 \uac00\uae4c\uc6b4 \ubc29\uc5b4 \ud6c8\ub828\uc774\ub2e4.',
  ],
  stage3Intro: [
    '\uc774\ubc88\uc5d0\ub294 \uc8fc\uae30\uc801\uc73c\ub85c \ud22c\uc785\ub418\ub294 \uc801\uc744 \ucc98\uce58\ud558\uba70 \ud06c\ub9ac\uc2a4\ud0c8\uc744 \ubc29\uc5b4\ud55c\ub2e4.',
    '\uacf5\uc131\ubcd1\uc740 \ud06c\ub9ac\uc2a4\ud0c8\uc744 \ub178\ub9ac\uace0, \ud638\uc704\ubcd1\uc740 \ub124 \uc6c0\uc9c1\uc784\uc744 \ubc29\ud574\ud560 \uac70\ub2e4.',
    '\uc704\ud611\uc758 \uc6b0\uc120\uc21c\uc704\ub97c \ud310\ub2e8\ud558\uace0 \uadf8\ub798\ud50c\ub85c \uc804\uc7a5\uc744 \ube60\ub974\uac8c \uc624\uac00\ub3c4\ub85d.',
    '\uc790, \uadf8\ub7fc \ubb34\uc6b4\uc744 \ube4c\uc9c0.',
  ],
  stage3Outro: [
    '크리스탈 방어 훈련도 무사히 마쳤군.',
    '기동 중에 위협의 우선순위를 판단하는 능력은 충분히 확인했다.',
    '이제 최종 훈련만 남았다. 장비를 정비하고 다음 지시를 기다리도록.',
  ],
  stage4Intro: [
    '이제 최종 훈련이다.',
    '네가 상대할 것은 실전에 투입될 거대한 전쟁 기계다.',
    '공격을 피하며 모든 약점을 파괴하고, 반드시 승리해 돌아와라.',
  ],
  stage4Outro: [
    '축하한다. 최종 훈련을 성공적으로 마쳤군.',
    '이 정도면 현장에 투입할 기본 자격은 갖춘 셈이다.',
    '이제부터가 진짜 시작이다. 앞으로 잘해 보자.',
  ],
};

export class StorySystem {
  private readonly root = document.createElement('div');
  private readonly portrait = document.createElement('img');
  private readonly text = document.createElement('p');
  private readonly hint = document.createElement('span');
  private active = false;
  private lineIndex = 0;
  private characterIndex = 0;
  private lines: string[] = [];
  private timer: number | null = null;
  private complete = false;
  private done: (() => void) | null = null;

  constructor(
    private readonly typeSound: (index: number) => void,
    private readonly advanceSound: () => void,
  ) {
    this.root.id = 'story-overlay';
    this.portrait.src = new URL('../assets/story/captain-seo-dialogue-v2.png', import.meta.url).href;
    this.portrait.alt = '\uc11c \ub300\uc704';
    this.portrait.className = 'story-portrait';
    this.text.className = 'story-text';
    this.hint.className = 'story-next';
    this.root.innerHTML =
      '<div class="story-skip">ESC \u00b7 \uc2a4\ud1a0\ub9ac \uc2a4\ud0b5</div>' +
      '<section class="story-dialogue"><div class="story-portrait-slot"></div>' +
      '<div class="story-copy"><strong>\uc11c \ub300\uc704</strong></div></section>';
    this.root.querySelector('.story-portrait-slot')!.append(this.portrait);
    this.root.querySelector('.story-copy')!.append(this.text, this.hint);
    document.body.append(this.root);
    this.root.style.display = 'none';
    window.addEventListener('keydown', (event) => this.key(event), true);
  }

  play(lines: string[], done: () => void) {
    this.stopTimer();
    this.lines = lines;
    this.done = done;
    this.lineIndex = 0;
    this.active = true;
    this.root.style.display = 'block';
    this.showLine();
  }

  private showLine() {
    this.stopTimer();
    this.characterIndex = 0;
    this.complete = false;
    this.text.textContent = '';
    this.hint.textContent = 'SPACE \u00b7 \ube60\ub974\uac8c \ud45c\uc2dc';
    const line = this.lines[this.lineIndex] ?? '';
    this.timer = window.setInterval(() => {
      const character = line[this.characterIndex++];
      if (character === undefined) {
        this.finishTyping();
        return;
      }
      this.text.textContent += character;
      if (!/[\s.,!?]/.test(character)) this.typeSound(this.characterIndex);
    }, 26);
  }

  private finishTyping() {
    this.stopTimer();
    this.complete = true;
    this.text.textContent = this.lines[this.lineIndex] ?? '';
    this.hint.textContent = 'SPACE \u00b7 \ub2e4\uc74c \ub300\uc0ac';
  }

  private next() {
    this.advanceSound();
    if (!this.complete) {
      this.finishTyping();
      return;
    }
    if (this.lineIndex < this.lines.length - 1) {
      this.lineIndex++;
      this.showLine();
      return;
    }
    this.finish();
  }

  private skip() {
    this.advanceSound();
    this.finish(true);
  }

  private finish(afterEscapeRelease = false) {
    this.stopTimer();
    this.active = false;
    this.root.style.display = 'none';
    const done = this.done;
    this.done = null;
    if (!done) return;
    if (!afterEscapeRelease) { done(); return; }
    const resume = (event: KeyboardEvent) => {
      if (event.code !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation();
      window.removeEventListener('keyup', resume, true); done();
    };
    window.addEventListener('keyup', resume, true);
  }

  private key(event: KeyboardEvent) {
    if (!this.active || event.repeat) return;
    if (event.code !== 'Space' && event.code !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.code === 'Escape') this.skip();
    else this.next();
  }

  private stopTimer() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
