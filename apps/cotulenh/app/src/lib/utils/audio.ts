import { browser } from '$app/environment';

export type SoundType = 'move' | 'capture' | 'check' | 'gameEnd' | 'error' | 'deploy';

const SOUND_PATHS: Record<SoundType, string> = {
  move: '/sounds/move.mp3',
  capture: '/sounds/capture.mp3',
  check: '/sounds/check.mp3',
  gameEnd: '/sounds/game-end.mp3',
  error: '/sounds/error.mp3',
  deploy: '/sounds/deploy.mp3'
};

const POOL_SIZE = 5;

class AudioPool {
  private pools: Map<SoundType, HTMLAudioElement[]> = new Map();
  private indices: Map<SoundType, number> = new Map();
  private volume = 0.5;
  private enabled = true;

  constructor() {
    if (browser) {
      this.initializePools();
    }
  }

  private initializePools(): void {
    for (const [type, path] of Object.entries(SOUND_PATHS) as [SoundType, string][]) {
      const pool: HTMLAudioElement[] = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = this.volume;
        pool.push(audio);
      }
      this.pools.set(type, pool);
      this.indices.set(type, 0);
    }
  }

  play(type: SoundType): void {
    if (!browser || !this.enabled) return;

    const pool = this.pools.get(type);
    if (!pool) return;

    const index = this.indices.get(type) ?? 0;
    const audio = pool[index];

    audio.currentTime = 0;
    audio.volume = this.volume;
    audio.play().catch(() => {
      // Ignore autoplay errors - user hasn't interacted yet
    });

    this.indices.set(type, (index + 1) % POOL_SIZE);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (!browser) return;

    for (const pool of Array.from(this.pools.values())) {
      for (const audio of pool) {
        audio.volume = this.volume;
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  getVolume(): number {
    return this.volume;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const audioPool = new AudioPool();

export function playSound(type: SoundType): void {
  audioPool.play(type);
}

export function setAudioVolume(volume: number): void {
  audioPool.setVolume(volume);
}

export function setAudioEnabled(enabled: boolean): void {
  audioPool.setEnabled(enabled);
}
