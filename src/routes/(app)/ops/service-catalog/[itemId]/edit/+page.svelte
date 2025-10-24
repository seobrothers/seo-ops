<script lang="ts">
	import CatalogItemForm from '$lib/forms/catalog-item/catalog-item-form.svelte';
	let { data } = $props();
</script>

<CatalogItemForm sform={data.form} partners={data.partners} serviceCategories={data.serviceCategories} oncancel={data.oncancel} />