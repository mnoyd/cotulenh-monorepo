<script lang="ts">
  import { type ComponentType, type Snippet } from 'svelte';
  import { logRender } from '$lib/debug';

  let {
    icon: Icon,
    title,
    borderColor,
    bgColor,
    textColor,
    children
  }: {
    icon: ComponentType;
    title: string;
    borderColor: string;
    bgColor: string;
    textColor: string;
    children?: Snippet;
  } = $props();

  // Log renders in effect to track reactive changes
  $effect(() => {
    logRender('🔄 [RENDER] MissionResult.svelte component rendered', { title });
  });
</script>

<div
  class="w-full flex flex-col items-center justify-center text-center p-4 md:p-6 rounded-sm border {borderColor} {bgColor} relative overflow-hidden group"
>
  <!-- Background decoration -->
  <div
    class="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-current to-transparent"
  ></div>

  <Icon
    class="w-8 h-8 md:w-12 md:h-12 {textColor} mb-2 md:mb-3 drop-shadow-[0_0_15px_rgba(var(--color-primary),0.5)]"
  />

  <h2
    class="text-lg md:text-2xl font-black italic tracking-tighter {textColor} mb-1 drop-shadow-md"
  >
    {title}
  </h2>

  {@render children?.()}
</div>
