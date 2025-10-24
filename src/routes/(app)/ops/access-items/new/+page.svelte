<script lang="ts">
	import AccessItemForm from '$lib/forms/access-item/access-item-form.svelte';
	let { data } = $props();
</script>

<AccessItemForm sform={data.form} entities={data.entities} partners={data.partners} oncancel={data.oncancel} />