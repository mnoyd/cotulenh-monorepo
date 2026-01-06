<script lang="ts">
  import { ShieldAlert } from 'lucide-svelte';
</script>

<div class="p-2 md:p-3">
  <div
    class="w-full relative overflow-hidden rounded-sm border border-red-500/50 bg-red-950/30 p-2 md:p-3"
  >
    <div class="absolute inset-0 bg-red-500/5 animate-pulse"></div>
    <div class="relative flex items-center gap-2 md:gap-3">
      <div class="p-1.5 md:p-2 bg-red-500/10 rounded-full border border-red-500/20">
        <ShieldAlert class="w-4 h-4 md:w-5 md:h-5 text-red-500 animate-bounce" />
      </div>
      <div class="flex flex-col">
        <span
          class="text-[0.6rem] md:text-xs font-mono text-red-400 uppercase tracking-widest opacity-80"
          >Warning</span
        >
        <span class="text-xs md:text-sm font-bold text-red-500 uppercase tracking-wide"
          >Commander Under Threat</span
        >
      </div>
    </div>
  </div>
</div>
