<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import confetti from 'canvas-confetti';
  import { portal } from 'svelte-portal';

  let canvas: HTMLCanvasElement;
  let myConfetti: confetti.CreateTypes;

  function fireConfetti() {
    if (!myConfetti) return;

    const count = 200;
    const defaults = {
      origin: { y: 0.7 }
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      myConfetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55
    });

    fire(0.2, {
      spread: 60,
      startVelocity: 30
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45
    });
  }

  onMount(() => {
    if (canvas) {
      myConfetti = confetti.create(canvas, {
        resize: true,
        useWorker: true
      });
      fireConfetti();
    }
  });

  onDestroy(() => {
    if (myConfetti) {
      myConfetti.reset();
    }
  });
</script>

<div class="celebration-container" use:portal={'body'}>
  <canvas bind:this={canvas} class="confetti-canvas"></canvas>
</div>

<style>
  .celebration-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 100;
  }

  .confetti-canvas {
    width: 100%;
    height: 100%;
  }
</style>
