<script lang="ts">
	import ServiceCategoryForm from '$lib/forms/service-category/service-category-form.svelte';
	let { data } = $props();
</script>

<ServiceCategoryForm sform={data.form} oncancel={data.oncancel} />
