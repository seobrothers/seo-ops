<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { getContext, type ComponentProps } from 'svelte';
	import Asc from '@lucide/svelte/icons/chevron-down';
	import Desc from '@lucide/svelte/icons/chevron-up';
	import None from '@lucide/svelte/icons/chevrons-up-down';
	import type { SortingState } from '@tanstack/table-core';
	import { cn } from '$lib/utils';

	let {
		label,
		colId,
		variant = 'ghost',
		size = 'cell',
		class: klass,
		// eslint-disable-next-line svelte/valid-compile
		...rest
	}: ComponentProps<typeof Button> & { label: string; colId: string } = $props();
	const ctx = getContext('tableCtx') as { sorting: SortingState; headerFontSize: string; headerFontWeight: string; headerTextColor: string };
	let desc = $derived(ctx && ctx.sorting.find((x) => x.id === colId)?.desc);
</script>

<Button {variant} {size} {...rest} class={cn(ctx?.headerFontSize || 'text-xs', ctx?.headerFontWeight || 'font-medium', ctx?.headerTextColor, 'uppercase', klass)}>
	{label}
	{#if desc === false}<Asc />{:else if desc === true}<Desc />{:else}<None />{/if}
</Button>
