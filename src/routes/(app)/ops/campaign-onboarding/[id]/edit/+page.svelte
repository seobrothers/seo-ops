<script lang="ts">
	import CampaignOnboardingTaskTemplateForm from '$lib/forms/task-template/campaign-onboarding-task-template-form.svelte';
	let { data } = $props();
</script>

<CampaignOnboardingTaskTemplateForm
	sform={data.form}
	partners={data.partners}
	campaignProfiles={data.campaignProfiles}
	serviceCategories={data.serviceCategories}
	template={data.template}
	templateId={data.templateId}
/>
