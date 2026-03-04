<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { GameConfig } from '$lib/invitations/types';
  import { TIME_PRESETS } from '$lib/invitations/types';

  interface Props {
    selectedConfig: GameConfig;
    onselect: (config: GameConfig) => void;
  }

  let { selectedConfig, onselect }: Props = $props();

  const i18n = getI18n();

  let isCustom = $state(false);
  let customMinutes = $state(10);
  let customIncrement = $state(0);

  function selectPreset(config: GameConfig) {
    isCustom = false;
    onselect(config);
  }

  function enableCustom() {
    isCustom = true;
    customMinutes = selectedConfig.timeMinutes;
    customIncrement = selectedConfig.incrementSeconds;
    onselect({ timeMinutes: customMinutes, incrementSeconds: customIncrement });
  }

  function updateCustom() {
    const minutes = Math.floor(Math.max(1, Math.min(60, customMinutes)));
    const increment = Math.floor(Math.max(0, Math.min(30, customIncrement)));
    customMinutes = minutes;
    customIncrement = increment;
    onselect({ timeMinutes: minutes, incrementSeconds: increment });
  }

  function isPresetSelected(config: GameConfig): boolean {
    return (
      !isCustom &&
      selectedConfig.timeMinutes === config.timeMinutes &&
      selectedConfig.incrementSeconds === config.incrementSeconds
    );
  }
</script>

<div class="time-control" role="group" aria-label={i18n.t('invitation.timeControl.title')}>
  <h3 class="time-control-title">{i18n.t('invitation.timeControl.title')}</h3>
  <div class="preset-buttons">
    {#each TIME_PRESETS as preset (preset.label)}
      <button
        type="button"
        class="preset-btn"
        class:selected={isPresetSelected(preset.config)}
        onclick={() => selectPreset(preset.config)}
        aria-pressed={isPresetSelected(preset.config)}
        aria-label="{preset.label} {i18n.t('invitation.timeControl.title')}"
      >
        {preset.label}
      </button>
    {/each}
    <button
      type="button"
      class="preset-btn"
      class:selected={isCustom}
      onclick={enableCustom}
      aria-pressed={isCustom}
      aria-label={i18n.t('invitation.timeControl.custom')}
    >
      {i18n.t('invitation.timeControl.custom')}
    </button>
  </div>

  {#if isCustom}
    <div class="custom-inputs">
      <label class="custom-field">
        <span class="custom-label">{i18n.t('invitation.timeControl.minutes')}</span>
        <input
          type="number"
          class="custom-input"
          min="1"
          max="60"
          step="1"
          bind:value={customMinutes}
          onchange={updateCustom}
          aria-label={i18n.t('invitation.timeControl.minutes')}
        />
      </label>
      <label class="custom-field">
        <span class="custom-label">{i18n.t('invitation.timeControl.increment')}</span>
        <input
          type="number"
          class="custom-input"
          min="0"
          max="30"
          step="1"
          bind:value={customIncrement}
          onchange={updateCustom}
          aria-label={i18n.t('invitation.timeControl.increment')}
        />
      </label>
    </div>
  {/if}
</div>

<style>
  .time-control {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .time-control-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--theme-text-secondary, #aaa);
    margin: 0;
  }

  .preset-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .preset-btn {
    min-height: 44px;
    min-width: 44px;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--theme-border, #444);
    background: var(--theme-bg-panel, #222);
    color: var(--theme-text-primary, #eee);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .preset-btn:hover {
    border-color: var(--theme-primary, #06b6d4);
  }

  .preset-btn:focus-visible {
    outline: 2px solid var(--theme-primary, #06b6d4);
    outline-offset: 2px;
  }

  .preset-btn.selected {
    background: var(--theme-primary, #06b6d4);
    border-color: var(--theme-primary, #06b6d4);
    color: white;
  }

  .custom-inputs {
    display: flex;
    gap: 1rem;
  }

  .custom-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .custom-label {
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .custom-input {
    width: 80px;
    min-height: 44px;
    padding: 0.5rem;
    border-radius: 8px;
    border: 1px solid var(--theme-border, #444);
    background: var(--theme-bg-panel, #222);
    color: var(--theme-text-primary, #eee);
    font-size: 0.875rem;
    text-align: center;
  }

  .custom-input:focus-visible {
    outline: 2px solid var(--theme-primary, #06b6d4);
    outline-offset: 2px;
  }
</style>
