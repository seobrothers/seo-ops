<script lang="ts">
	import CampaignProfileForm from '$lib/forms/campaign-profile/campaign-profile-form.svelte';
	let { data } = $props();
</script>

<CampaignProfileForm sform={data.form} oncancel={data.oncancel} />