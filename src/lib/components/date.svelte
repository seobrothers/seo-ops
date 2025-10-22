<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { formatDate, formatDateTime } from '$lib/dates';
	import type { ClassValue } from 'svelte/elements';

	type Props = {
		iso: string | undefined | null;
		dateOnly?: boolean;
		class?: ClassValue;
	};
	let { iso, dateOnly = false, class: klass }: Props = $props();

	const compact = formatDate(iso, dateOnly);
	const full = dateOnly ? `${compact} (date only)` : formatDateTime(iso);
</script>

<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger class={klass}>{compact}</Tooltip.Trigger>
		<Tooltip.Content>
			<p>{full}</p>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
