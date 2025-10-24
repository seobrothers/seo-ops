<script lang="ts">
	import PartnerOnboardingForm from '$lib/forms/task-template/partner-onboarding-form.svelte';
	let { data } = $props();
</script>

<PartnerOnboardingForm
	sform={data.form}
/>
