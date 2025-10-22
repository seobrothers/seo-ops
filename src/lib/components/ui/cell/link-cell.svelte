<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button, type ButtonSize, type ButtonVariant } from '../button';

	type LinkCellProps = {
		href?: string;
		fallback?: string;
		label?: string;
		class?: string;
		variant?: ButtonVariant;
		size?: ButtonSize;
	};
	let {
		href,
		fallback = 'N/A',
		label = 'View',
		variant = 'link',
		size = 'link',
		class: className,
	}: LinkCellProps = $props();
</script>

{#if href}
	<Button {href} {size} {variant} class={cn('h-6', className)}>{label}</Button>
{:else}
	<span class="inline-block h-6">{fallback}</span>
{/if}
