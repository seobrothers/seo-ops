<script lang="ts">
	import ServiceItemForm from '$lib/forms/service-item/service-item-form.svelte';
	let { data } = $props();
</script>

<ServiceItemForm sform={data.form} serviceCategories={data.serviceCategories} oncancel={data.oncancel} />
