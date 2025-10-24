<script lang="ts">
	import PackageForm from '$lib/forms/package/package-form.svelte';
	
	let { data } = $props();
</script>

<div class="p-6">
	<div class="mb-6">
		<h2 class="text-2xl font-bold">
			{data.isDuplicating ? 'Duplicate Package' : 'Create New Package'}
		</h2>
		<p class="text-muted-foreground mt-1">
			{data.isDuplicating 
				? `Create a new package based on "${data.sourcePackageName}".`
				: 'Create a new service package for your partners.'}
		</p>
	</div>
	
	<PackageForm 
		sform={data.form} 
		partners={data.partners}
		campaignProfiles={data.campaignProfiles}
		oncancel={data.oncancel}
		isDuplicating={data.isDuplicating}
		sourcePackageName={data.sourcePackageName}
		sourcePackageId={data.sourcePackageId}
	/>
</div>