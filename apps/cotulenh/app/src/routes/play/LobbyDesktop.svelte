<script lang="ts">
  import { goto } from '$app/navigation';
  import { getI18n } from '$lib/i18n/index.svelte';
  import { TIME_PRESETS, type GameConfig } from '$lib/invitations/types';
  import '$lib/styles/command-center.css';

  const i18n = getI18n();

  let selectedPresetIndex = $state<number | null>(null);
  let customMode = $state(false);
  let customMinutes = $state(10);
  let customIncrement = $state(0);

  let selectedConfig = $derived.by((): GameConfig | null => {
    if (customMode) {
      return { timeMinutes: customMinutes, incrementSeconds: customIncrement };
    }
    if (selectedPresetIndex !== null) {
      return { ...TIME_PRESETS[selectedPresetIndex].config };
    }
    return null;
  });

  function selectPreset(index: number) {
    customMode = false;
    selectedPresetIndex = index;
  }

  function selectCustom() {
    selectedPresetIndex = null;
    customMode = true;
  }

  function createGame() {
    if (!selectedConfig) return;
    const params = new URLSearchParams({
      timeMinutes: String(selectedConfig.timeMinutes),
      incrementSeconds: String(selectedConfig.incrementSeconds)
    });
    goto(`/play/online?${params}`);
  }

  function startPractice() {
    goto('/play/practice');
  }
</script>

<svelte:head>
  <title>{i18n.t('play.lobby.title')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<div class="lobby">
  <div class="lobby-grid">
    <!-- Play Online Section -->
    <section class="lobby-section">
      <h2 class="section-header">{i18n.t('play.lobby.playOnline')}</h2>

      <div class="tc-grid">
        {#each TIME_PRESETS as preset, idx}
          <button
            class="tc-btn"
            class:active={!customMode && selectedPresetIndex === idx}
            onclick={() => selectPreset(idx)}
          >
            {preset.label}
          </button>
        {/each}
      </div>

      <button
        class="tc-btn custom-btn"
        class:active={customMode}
        onclick={selectCustom}
      >
        {i18n.t('play.lobby.custom')}
      </button>

      {#if customMode}
        <div class="custom-inputs">
          <label class="custom-field">
            <span class="text-secondary">{i18n.t('play.lobby.customMinutes')}</span>
            <input type="number" bind:value={customMinutes} min="1" max="60" />
          </label>
          <label class="custom-field">
            <span class="text-secondary">{i18n.t('play.lobby.customIncrement')}</span>
            <input type="number" bind:value={customIncrement} min="0" max="30" />
          </label>
        </div>
      {/if}

      <button
        class="primary-cta"
        disabled={!selectedConfig}
        onclick={createGame}
      >
        {i18n.t('play.lobby.createGame')}
      </button>
    </section>

    <!-- Practice Section -->
    <section class="lobby-section">
      <h2 class="section-header">{i18n.t('play.lobby.practice')}</h2>
      <p class="text-secondary">{i18n.t('play.lobby.practiceDesc')}</p>
      <button class="primary-cta" onclick={startPractice}>
        {i18n.t('play.lobby.startPractice')}
      </button>
    </section>
  </div>
</div>

<style>
  .lobby {
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
    min-height: 100%;
  }

  .lobby-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    max-width: 700px;
    width: 100%;
    align-content: start;
  }

  .lobby-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .tc-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .tc-btn {
    padding: 0.625rem 0.5rem;
    background: transparent;
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-mono, monospace);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    text-align: center;
  }

  .tc-btn:hover {
    border-color: var(--theme-text-secondary, #aaa);
  }

  .tc-btn.active {
    background: var(--theme-primary, #06b6d4);
    border-color: var(--theme-primary, #06b6d4);
    color: #000;
  }

  .custom-btn {
    width: 100%;
  }

  .custom-inputs {
    display: flex;
    gap: 0.75rem;
  }

  .custom-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .custom-field input {
    padding: 0.375rem 0.5rem;
    background: var(--theme-bg-dark, #111);
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-mono, monospace);
    font-size: 0.8125rem;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
  }
</style>
