<script lang="ts">
	import PermissionForm from '$lib/forms/permission/permission-form.svelte';
	let { data } = $props();
</script>

<PermissionForm sform={data.form} serviceItems={data.serviceItems} serviceCategories={data.serviceCategories} campaignProfiles={data.campaignProfiles} oncancel={data.oncancel} />