<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import { ShieldAlert } from 'lucide-svelte';
  import { logRender } from '$lib/debug';

  const i18n = getI18n();

  // Log renders
  logRender('🔄 [RENDER] CheckAlert.svelte component rendered');
</script>

<div class="p-2 md:p-3">
  <div
    class="w-full relative overflow-hidden rounded-sm border border-[color:var(--theme-error)]/50 bg-[color:var(--theme-error)]/10 p-2 md:p-3"
  >
    <div class="absolute inset-0 bg-[color:var(--theme-error)]/5"></div>
    <div class="relative flex items-center gap-2 md:gap-3">
      <div class="p-1.5 md:p-2 bg-[color:var(--theme-error)]/10 rounded-full border border-[color:var(--theme-error)]/20">
        <ShieldAlert class="w-4 h-4 md:w-5 md:h-5 text-[color:var(--theme-error)]" />
      </div>
      <div class="flex flex-col">
        <span
          class="text-[0.6rem] md:text-xs font-mono text-[color:var(--theme-error)]/80 uppercase tracking-widest"
          >{i18n.t('game.warning')}</span
        >
        <span class="text-xs md:text-sm font-bold text-[color:var(--theme-error)] uppercase tracking-wide"
          >{i18n.t('game.commanderUnderThreat')}</span
        >
      </div>
    </div>
  </div>
</div>
