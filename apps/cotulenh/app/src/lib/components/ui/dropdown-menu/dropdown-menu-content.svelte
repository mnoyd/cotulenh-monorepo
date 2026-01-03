<script lang="ts">
  import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
  import DropdownMenuPortal from './dropdown-menu-portal.svelte';
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
  import type { ComponentProps } from 'svelte';

  let {
    ref = $bindable(null),
    sideOffset = 4,
    portalProps,
    class: className,
    ...restProps
  }: DropdownMenuPrimitive.ContentProps & {
    portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DropdownMenuPortal>>;
  } = $props();
</script>

<DropdownMenuPortal {...portalProps}>
  <DropdownMenuPrimitive.Content
    bind:ref
    data-slot="dropdown-menu-content"
    {sideOffset}
    class={cn(
      'bg-mw-bg-panel/95 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-end-2 data-[side=right]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 z-[150] max-h-(--bits-dropdown-menu-content-available-height) min-w-[8rem] origin-(--bits-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border border-primary/40 p-1 shadow-[0_0_15px_rgba(0,243,255,0.15)] outline-none backdrop-blur-xl',
      className
    )}
    {...restProps}
  />
</DropdownMenuPortal>
