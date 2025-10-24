<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Icons } from '$lib/icons';
	import { preloadData, pushState, goto, invalidateAll } from '$app/navigation';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';

	let { data } = $props();
	const item = data.item;
	let statusDialogOpen = $state(false);

	async function openEditForm() {
		const href = `/team/ops/access-items/${item.id}/edit`;
		const result = await preloadData(href);
		if (result.type === 'loaded' && result.status === 200) {
			pushState(href, { editData: result.data });
		} else {
			goto(href);
		}
	}

	async function handleToggleStatus() {
		try {
			const method = item.isActive ? 'DELETE' : 'POST';
			const response = await fetch(`/team/ops/access-items/${item.id}`, {
				method,
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const action = item.isActive ? 'deactivated' : 'activated';
				toast.success(`Access item ${action} successfully`);
				statusDialogOpen = false;
				await invalidateAll();
				goto('/team/ops/access-items');
			} else {
				const errorData = await response.text();
				const action = item.isActive ? 'deactivate' : 'activate';
				console.error(`Failed to ${action} access item:`, errorData);
				toast.error(`Failed to ${action} access item. Please try again.`);
			}
		} catch (error) {
			const action = item.isActive ? 'deactivate' : 'activate';
			console.error(`Error ${action}ing access item:`, error);
			toast.error(`Error ${action}ing access item. Please try again.`);
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between pb-4 border-b">
		<div class="flex gap-2">
			{#if item.isActive}
				<Button size="sm" variant="outline" onclick={() => statusDialogOpen = true}>
					<Icons.Archive class="mr-2 h-4 w-4" />
					Deactivate
				</Button>
			{:else}
				<Button size="sm" variant="outline" onclick={() => statusDialogOpen = true}>
					<Icons.Check class="mr-2 h-4 w-4" />
					Activate
				</Button>
			{/if}
			<Button size="sm" onclick={openEditForm}>
				<Icons.Edit class="mr-2 h-4 w-4" />
				Edit
			</Button>
		</div>
	</div>

	<div class="space-y-4">
		<div>
			<div class="text-sm font-medium text-muted-foreground mb-1">Username</div>
			<div class="text-sm">{item.username}</div>
		</div>

		{#if item.email}
			<div>
				<div class="text-sm font-medium text-muted-foreground mb-1">Email</div>
				<div class="text-sm">{item.email}</div>
			</div>
		{/if}

		<div>
			<div class="text-sm font-medium text-muted-foreground mb-1">Partner</div>
			<div class="text-sm">
				{#if item.partnerEntityId && item.partnerEntityName}
					<a href="/team/partners/{item.partnerEntityId}" class="text-primary hover:text-primary/80 hover:underline">
						{item.partnerEntityName}
					</a>
				{:else}
					-
				{/if}
			</div>
		</div>

		<div>
			<div class="text-sm font-medium text-muted-foreground mb-1">Stored in LastPass</div>
			<div class="text-sm">{item.inLastpass ? 'Yes' : 'No'}</div>
		</div>

		{#if item.tfaType}
			<div>
				<div class="text-sm font-medium text-muted-foreground mb-1">2FA Type</div>
				<div class="text-sm capitalize">{item.tfaType}</div>
			</div>
		{/if}

		{#if item.tfaTypeValue}
			<div>
				<div class="text-sm font-medium text-muted-foreground mb-1">2FA Value</div>
				<div class="text-sm">{item.tfaTypeValue}</div>
			</div>
		{/if}

		{#if item.tfaContactId}
			<div>
				<div class="text-sm font-medium text-muted-foreground mb-1">2FA Contact</div>
				<div class="text-sm">
					{#if item.tfaContactName}
						<a href="/team/entities/{item.tfaContactId}" class="text-primary hover:text-primary/80 hover:underline">
							{item.tfaContactName}
						</a>
					{:else}
						-
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<Dialog.Root bind:open={statusDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{item.isActive ? 'Deactivate' : 'Activate'} Access Item</Dialog.Title>
			<Dialog.Description>
				{#if item.isActive}
					Are you sure you want to deactivate <strong>{item.username}</strong>? This will hide it from the access items list.
				{:else}
					Are you sure you want to activate <strong>{item.username}</strong>? This will make it visible in the access items list.
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => statusDialogOpen = false}>
				Cancel
			</Button>
			<Button variant={item.isActive ? 'destructive' : 'default'} onclick={handleToggleStatus}>
				{item.isActive ? 'Deactivate' : 'Activate'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>