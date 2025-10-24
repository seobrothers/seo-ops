<script lang="ts">
	import PermissionForm from '$lib/forms/permission/permission-form.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Icons } from '$lib/icons';
	import * as Dialog from '$lib/components/ui/dialog';
	import { enhance } from '$app/forms';

	let { data } = $props();
	let showToggleActiveDialog = $state(false);
</script>

<div class="mb-6">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-4">
			{#if data.canEdit}
				<div>
					{#if data.permission.isActive}
						<Button variant="outline" size="sm" onclick={() => showToggleActiveDialog = true}>
							<Icons.Trash class="mr-2 h-4 w-4" />
							Deactivate
						</Button>
					{:else}
						<Button variant="outline" size="sm" onclick={() => showToggleActiveDialog = true}>
							<Icons.RotateCcw class="mr-2 h-4 w-4" />
							Reactivate
						</Button>
					{/if}
				</div>
			{/if}
			{#if data.permission.campaignProfileId}
				<a
					href="/team/ops/campaign-profiles/{data.permission.campaignProfileId}"
					class="flex items-center gap-2 text-sm text-primary hover:underline"
				>
					<Icons.ExternalLink class="h-4 w-4" />
					View Campaign Profile
				</a>
			{/if}
		</div>
	</div>
	<hr class="border-border" />
</div>

<PermissionForm
	sform={data.form}
	serviceItems={data.serviceItems}
	serviceCategories={data.serviceCategories}
	campaignProfiles={data.campaignProfiles}
	oncancel={data.oncancel}
	action="?/update"
/>

<!-- Toggle Active Status Confirmation Dialog -->
<Dialog.Root bind:open={showToggleActiveDialog}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>{data.permission.isActive ? 'Deactivate' : 'Reactivate'} Permission</Dialog.Title>
			<Dialog.Description>
				{#if data.permission.isActive}
					When you deactivate this permission, it will no longer be applied to new campaigns or configurations.
				{:else}
					When you reactivate this permission, it will become available for use in new campaigns and configurations.
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showToggleActiveDialog = false}>Cancel</Button>
			<form action="?/updateField" method="POST" use:enhance class="inline">
				<input type="hidden" name="field" value="isActive" />
				<input type="hidden" name="value" value={!data.permission.isActive} />
				<Button type="submit" variant={data.permission.isActive ? 'destructive' : 'default'}>
					{data.permission.isActive ? 'Deactivate' : 'Reactivate'}
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>