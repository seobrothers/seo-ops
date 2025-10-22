<script lang="ts">
	type StatusConfig = Record<string, string>;

	type Props = {
		status: string;
		colorClass?: string;
		statusConfig?: StatusConfig;
		formatText?: boolean;
	};

	let { 
		status, 
		colorClass,
		statusConfig,
		formatText = false
	}: Props = $props();

	// Use provided colorClass or derive from statusConfig
	const finalColorClass = colorClass || (statusConfig ? statusConfig[status] : undefined) || 'text-gray-500';
	
	// Format text if requested (replace underscores, capitalize)
	const displayStatus = formatText 
		? status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
		: status;
</script>

<span class={finalColorClass}>{displayStatus}</span>