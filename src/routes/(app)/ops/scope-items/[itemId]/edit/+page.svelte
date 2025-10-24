<script lang="ts">
	import ServiceItemForm from '$lib/forms/service-item/service-item-form.svelte';
	let { data } = $props();
</script>

<ServiceItemForm sform={data.form} partners={data.partners} serviceCategories={data.serviceCategories} oncancel={data.oncancel} />
