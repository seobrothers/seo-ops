<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { ComponentType } from 'svelte';

	interface Action {
		icon: ComponentType;
		onClick: () => void;
		tooltip: string;
		screenReaderText: string;
	}

	let { actions }: { actions: Action[] } = $props();
</script>

<div class="flex items-center gap-1 justify-end">
	{#each actions as action}
		<Tooltip.Root>
			<Tooltip.Trigger>
				<Button variant="ghost" size="sm" onclick={action.onClick} class="h-8 w-8 p-0">
					<svelte:component this={action.icon} class="h-4 w-4" />
					<span class="sr-only">{action.screenReaderText}</span>
				</Button>
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p>{action.tooltip}</p>
			</Tooltip.Content>
		</Tooltip.Root>
	{/each}
</div>