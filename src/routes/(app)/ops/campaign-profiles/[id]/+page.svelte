<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Icons } from '$lib/icons';
	import { goto } from '$app/navigation';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import NotesStream from '$lib/components/notes-stream.svelte';
	import EnhancedBulletPointList from '$lib/components/ui/enhanced-bullet-point-list.svelte';
	import type { EnhancedBulletPoint } from '$lib/types/campaign-profile';
	import * as Dialog from '$lib/components/ui/dialog';

	let { data } = $props();

	let deleteDialogOpen = $state(false);

	// Editing states for text fields only
	let isEditingName = $state(false);
	let isEditingCriteria = $state(false);
	let isEditingExamples = $state(false);
	let isEditingShortDescription = $state(false);

	// Trigger states for bullet point lists
	let triggerSeoAdd = $state(false);
	let triggerChallengesAdd = $state(false);
	let triggerCampaignAdd = $state(false);
	let triggerPresaleAdd = $state(false);

	// Local state for field values
	let name = $state(data.profile.name || '');
	let criteria = $state(data.profile.criteria || '');
	let examples = $state(data.profile.examples || '');
	let shortDescription = $state(data.profile.shortDescription || '');

	// Parser for bullet point fields - descriptions/tooltips not used
	function safeParseEnhancedJSON(jsonString: string | null): EnhancedBulletPoint[] {
		if (!jsonString) return [];
		try {
			const parsed = JSON.parse(jsonString);
			if (Array.isArray(parsed)) {
				// Ensure each item has the proper structure for enhanced bullet points
				return parsed.map(item => ({
					id: item.id || `bp-migration-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
					text: item.text || '',
					order: item.order || 1
				}));
			}
			return [];
		} catch {
			// If parsing fails, treat as legacy text data and create a single enhanced bullet point
			return jsonString.trim() ? [{
				id: `bp-legacy-${Date.now()}`,
				text: jsonString.trim(),
				order: 1
			}] : [];
		}
	}

	// Parse bullet point fields from JSON or create empty arrays
	let seoGrowthOpportunities = $state(safeParseEnhancedJSON(data.profile.seoGrowthOpportunities));
	let commonChallenges = $state(safeParseEnhancedJSON(data.profile.commonChallenges));
	let campaignConsiderations = $state(safeParseEnhancedJSON(data.profile.campaignConsiderations));
	let presaleConsiderations = $state(safeParseEnhancedJSON(data.profile.presaleConsiderations));

	// Activity log from database - update when data changes
	let activities = $state(data.activities || []);
	let showingAllActivities = $state(false);
	
	// Update activities when data changes
	$effect(() => {
		activities = data.activities || [];
		// Reset pagination when data changes
		showingAllActivities = false;
	});
	
	// Computed property for displayed activities
	let displayedActivities = $derived(showingAllActivities ? activities : activities.slice(0, 5));
	let hasMoreActivities = $derived(activities.length > 5);
	
	function showMoreActivities() {
		showingAllActivities = true;
	}

	function goBack() {
		goto('/team/ops/campaign-profiles');
	}


	// Create a hidden form for bullet point saves
	let hiddenForm: HTMLFormElement;

	// Function to save bullet point fields
	async function saveBulletPointField(field: string, items: any[]): Promise<void> {
		return new Promise<void>((resolve) => {
			// Create form data
			const fieldInput = hiddenForm.querySelector('input[name="field"]') as HTMLInputElement;
			const valueInput = hiddenForm.querySelector('input[name="value"]') as HTMLInputElement;

			fieldInput.value = field;
			valueInput.value = JSON.stringify(items);

			// Submit the form
			hiddenForm.requestSubmit();

			// Resolve after a short delay to allow form submission
			setTimeout(() => resolve(), 100);
		});
	}

	// Generic field editing functions
	function handleEdit(field: string) {
		switch(field) {
			case 'name': isEditingName = true; break;
			case 'criteria': isEditingCriteria = true; break;
			case 'examples': isEditingExamples = true; break;
			case 'shortDescription': isEditingShortDescription = true; break;
		}
	}

	function handleCancel(field: string) {
		// Reset to original values
		switch(field) {
			case 'name':
				name = data.profile.name || '';
				isEditingName = false;
				break;
			case 'criteria':
				criteria = data.profile.criteria || '';
				isEditingCriteria = false;
				break;
			case 'examples':
				examples = data.profile.examples || '';
				isEditingExamples = false;
				break;
			case 'shortDescription':
				shortDescription = data.profile.shortDescription || '';
				isEditingShortDescription = false;
				break;
		}
	}


	// Helper to get current value and editing state
	function getFieldState(field: string) {
		switch(field) {
			case 'name': return { value: name, isEditing: isEditingName };
			case 'criteria': return { value: criteria, isEditing: isEditingCriteria };
			case 'examples': return { value: examples, isEditing: isEditingExamples };
			case 'shortDescription': return { value: shortDescription, isEditing: isEditingShortDescription };
			default: return { value: '', isEditing: false };
		}
	}
</script>

<svelte:head>
	<title>{data.profile.name} - Campaign Profile</title>
</svelte:head>

<div class="space-y-6 p-6">
	<!-- Header Section -->
	<div>
		<!-- Title with back button -->
		<div class="flex items-center justify-between mb-2">
			<div class="flex items-center gap-4">
				<Button variant="outline" onclick={goBack} class="p-2">
					<Icons.ArrowUpRight class="h-4 w-4 rotate-180" />
				</Button>
				{#if getFieldState('name').isEditing}
					<form
						action="?/updateField"
						method="POST"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === 'success') {
									isEditingName = false;
									await invalidateAll();
								}
								await update();
							};
						}}
						class="flex items-center gap-2 flex-1"
					>
						<input type="hidden" name="field" value="name" />
						<Input
							bind:value={name}
							name="value"
							class="text-2xl font-bold bg-transparent border-b-2 border-blue-500 outline-none flex-1 h-auto py-1"
							placeholder="Enter profile name"
							onkeydown={(e) => {
								if (e.key === 'Escape') handleCancel('name');
							}}
						/>
						<Button size="sm" type="submit">Save</Button>
						<Button size="sm" variant="outline" type="button" onclick={() => handleCancel('name')}>Cancel</Button>
					</form>
				{:else}
					<h1 class="text-2xl font-bold cursor-pointer hover:text-blue-600" onclick={() => handleEdit('name')}>
						{data.profile.name}
					</h1>
					{#if data.canEdit}
						<Button size="sm" variant="ghost" onclick={() => handleEdit('name')} class="h-6 w-6 p-0">
							<Icons.Edit class="h-3 w-3" />
						</Button>
					{/if}
				{/if}
			</div>
			{#if data.canEdit}
				<Button
					variant="ghost"
					size="sm"
					class="text-destructive hover:text-destructive hover:bg-destructive/10"
					onclick={() => deleteDialogOpen = true}
				>
					<Icons.Trash class="h-4 w-4 mr-2" />
					Deactivate
				</Button>
			{/if}
		</div>
		
		<!-- Divider -->
		<hr class="border-border mt-4 mb-1">
		
		<!-- Short Description -->
		<div class="mt-4 text-sm leading-relaxed">
			{#if getFieldState('shortDescription').isEditing}
				<form 
					action="?/updateField" 
					method="POST"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								isEditingShortDescription = false;
							}
							await update();
						};
					}}
					class="space-y-2"
				>
					<input type="hidden" name="field" value="shortDescription" />
					<div class="flex items-start gap-3">
						<div class="flex-1 space-y-2">
							<Textarea
								name="value"
								bind:value={shortDescription}
								placeholder="Enter a short description..."
								rows={2}
								class="w-full text-sm"
							/>
							<div class="flex gap-2">
								<Button size="sm" type="submit">Save</Button>
								<Button size="sm" variant="outline" type="button" onclick={() => handleCancel('shortDescription')}>Cancel</Button>
							</div>
						</div>
					</div>
				</form>
			{:else}
				<div class="flex items-center gap-3">
					<span class="text-gray-600 cursor-pointer hover:text-blue-600" onclick={() => handleEdit('shortDescription')}>
						{data.profile.shortDescription || 'Click to add description'}
					</span>
					<Button size="sm" variant="ghost" onclick={() => handleEdit('shortDescription')} class="h-6 w-6 p-0">
						<Icons.Edit class="h-3 w-3" />
					</Button>
				</div>
			{/if}
		</div>
		
		<!-- Divider -->
		<hr class="border-border mt-4 mb-1">
	</div>

	<!-- Criteria and Examples Side by Side -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Criteria Card -->
			<Card class="flex flex-col h-48">
				<CardHeader class="pb-2">
					<div class="flex items-center justify-between">
						<CardTitle class="text-lg">Criteria</CardTitle>
						<Button size="sm" variant="outline" onclick={() => handleEdit('criteria')}>
							<Icons.Edit class="h-4 w-4" />
						</Button>
					</div>
				</CardHeader>
				<CardContent class="flex-1 pt-0">
					{#if getFieldState('criteria').isEditing}
						<form 
							action="?/updateField" 
							method="POST"
							use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								isEditingCriteria = false;
							}
							await update();
						};
					}}
							class="flex flex-col h-full space-y-2"
						>
							<input type="hidden" name="field" value="criteria" />
							<Textarea
								name="value"
								bind:value={criteria}
								placeholder="Enter criteria..."
								class="w-full flex-1 resize-none"
							/>
							<div class="flex gap-2">
								<Button size="sm" type="submit">Save</Button>
								<Button size="sm" variant="outline" type="button" onclick={() => handleCancel('criteria')}>Cancel</Button>
							</div>
						</form>
					{:else}
						<p class="text-sm text-gray-600 cursor-pointer hover:text-blue-600" onclick={() => handleEdit('criteria')}>
							{data.profile.criteria || 'Click to add criteria...'}
						</p>
					{/if}
				</CardContent>
			</Card>

			<!-- Examples Card -->
			<Card class="flex flex-col h-48">
				<CardHeader class="pb-2">
					<div class="flex items-center justify-between">
						<CardTitle class="text-lg">Examples</CardTitle>
						<Button size="sm" variant="outline" onclick={() => handleEdit('examples')}>
							<Icons.Edit class="h-4 w-4" />
						</Button>
					</div>
				</CardHeader>
				<CardContent class="flex-1 pt-0">
					{#if getFieldState('examples').isEditing}
						<form 
							action="?/updateField" 
							method="POST"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										isEditingExamples = false;
									}
									await update();
								};
							}}
							class="flex flex-col h-full space-y-2"
						>
							<input type="hidden" name="field" value="examples" />
							<Textarea
								name="value"
								bind:value={examples}
								placeholder="Enter examples..."
								class="w-full flex-1 resize-none"
							/>
							<div class="flex gap-2">
								<Button size="sm" type="submit">Save</Button>
								<Button size="sm" variant="outline" type="button" onclick={() => handleCancel('examples')}>Cancel</Button>
							</div>
						</form>
					{:else}
						<p class="text-sm text-gray-600 cursor-pointer hover:text-blue-600" onclick={() => handleEdit('examples')}>
							{data.profile.examples || 'Click to add examples...'}
						</p>
					{/if}
				</CardContent>
			</Card>
	</div>

	<!-- Two Column Grid for Additional Fields -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- SEO Growth Opportunities -->
		<Card>
			<CardHeader>
				<div class="flex items-center gap-2">
					<CardTitle class="text-lg">SEO Growth Opportunities</CardTitle>
					{#if data.canEdit}
						<button class="p-1 hover:bg-gray-100 rounded" title="Add SEO growth opportunity" onclick={() => triggerSeoAdd = !triggerSeoAdd}>
							<Icons.Plus class="h-4 w-4 text-gray-600" />
						</button>
					{/if}
				</div>
			</CardHeader>
			<CardContent>
				<EnhancedBulletPointList
					bind:items={seoGrowthOpportunities}
					placeholder="Enter SEO growth opportunity..."
					canEdit={data.canEdit}
					bind:triggerAdd={triggerSeoAdd}
					onSave={() => saveBulletPointField('seoGrowthOpportunities', seoGrowthOpportunities)}
					hideDescription={true}
					hideTitle={true}
				/>
			</CardContent>
		</Card>

		<!-- Common Challenges -->
		<Card>
			<CardHeader>
				<div class="flex items-center gap-2">
					<CardTitle class="text-lg">Common Challenges</CardTitle>
					{#if data.canEdit}
						<button class="p-1 hover:bg-gray-100 rounded" title="Add common challenge" onclick={() => triggerChallengesAdd = !triggerChallengesAdd}>
							<Icons.Plus class="h-4 w-4 text-gray-600" />
						</button>
					{/if}
				</div>
			</CardHeader>
			<CardContent>
				<EnhancedBulletPointList
					bind:items={commonChallenges}
					placeholder="Enter common challenge..."
					canEdit={data.canEdit}
					bind:triggerAdd={triggerChallengesAdd}
					onSave={() => saveBulletPointField('commonChallenges', commonChallenges)}
					hideDescription={true}
					hideTitle={true}
				/>
			</CardContent>
		</Card>

		<!-- Campaign Considerations -->
		<Card>
			<CardHeader>
				<div class="flex items-center gap-2">
					<CardTitle class="text-lg">Campaign Considerations</CardTitle>
					{#if data.canEdit}
						<button class="p-1 hover:bg-gray-100 rounded" title="Add campaign consideration" onclick={() => triggerCampaignAdd = !triggerCampaignAdd}>
							<Icons.Plus class="h-4 w-4 text-gray-600" />
						</button>
					{/if}
				</div>
			</CardHeader>
			<CardContent>
				<EnhancedBulletPointList
					bind:items={campaignConsiderations}
					placeholder="Enter campaign consideration..."
					canEdit={data.canEdit}
					bind:triggerAdd={triggerCampaignAdd}
					onSave={() => saveBulletPointField('campaignConsiderations', campaignConsiderations)}
					hideDescription={true}
					hideTitle={true}
				/>
			</CardContent>
		</Card>

		<!-- Presale Considerations -->
		<Card>
			<CardHeader>
				<div class="flex items-center gap-2">
					<CardTitle class="text-lg">Presale Considerations</CardTitle>
					{#if data.canEdit}
						<button class="p-1 hover:bg-gray-100 rounded" title="Add presale consideration" onclick={() => triggerPresaleAdd = !triggerPresaleAdd}>
							<Icons.Plus class="h-4 w-4 text-gray-600" />
						</button>
					{/if}
				</div>
			</CardHeader>
			<CardContent>
				<EnhancedBulletPointList
					bind:items={presaleConsiderations}
					placeholder="Enter presale consideration..."
					canEdit={data.canEdit}
					bind:triggerAdd={triggerPresaleAdd}
					onSave={() => saveBulletPointField('presaleConsiderations', presaleConsiderations)}
					hideDescription={true}
					hideTitle={true}
				/>
			</CardContent>
		</Card>


	</div>

	<!-- Campaign Profile Notes - Full Width -->
	<div class="mt-6">
		<NotesStream 
			notes={data.notes || []}
			canEdit={data.canEdit}
			title="Campaign Profile Notes"
			description="These are notes about this campaign profile template."
			placeholder="Add notes about this campaign profile..."
			emptyStateTitle="No profile notes yet"
			emptyStateDescription="Add the first note about this campaign profile to get started"
		/>
	</div>

	<!-- Activity Log - Full Width -->
	<Card class="mt-6">
		<CardHeader>
			<CardTitle>Activity</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			{#each displayedActivities as activity, index}
				<div class="text-sm">
					<div class="flex items-center gap-4 text-muted-foreground mb-2">
						<span class="font-medium text-foreground">{activity.activityType}</span>
						<span>•</span>
						<span>{new Date(activity.activityDate).toLocaleString()}</span>
						<span>•</span>
						<span>by {activity.actor || 'Unknown'}</span>
					</div>
					{#if activity.details}
						<div class="text-muted-foreground leading-relaxed">
							{activity.details}
						</div>
					{/if}
				</div>
				{#if index < displayedActivities.length - 1}
					<hr class="border-border">
				{/if}
			{/each}
			
			<!-- Show more button -->
			{#if hasMoreActivities && !showingAllActivities}
				<div class="text-center pt-4">
					<Button variant="outline" size="sm" onclick={showMoreActivities}>
						Show More Activities ({activities.length - 5} more)
					</Button>
				</div>
			{/if}
			
			{#if activities.length === 0}
				<div class="text-center py-8">
					<div class="h-12 w-12 mx-auto text-muted-foreground/50 mb-3">
						<svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<h3 class="font-medium mb-1">No activity yet</h3>
					<p class="text-muted-foreground text-sm">
						Activities will appear here when changes are made to this campaign profile
					</p>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>

<!-- Hidden form for bullet point auto-saving -->
<form
	bind:this={hiddenForm}
	action="?/updateField"
	method="POST"
	use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				await invalidateAll();
			}
			await update();
		};
	}}
	style="display: none;"
>
	<input type="hidden" name="field" />
	<input type="hidden" name="value" />
</form>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Deactivate Campaign Profile</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to deactivate "{data.profile.name}"? This will hide it from the active campaign profiles list.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex justify-end gap-3">
			<Button variant="outline" onclick={() => deleteDialogOpen = false}>Cancel</Button>
			<Button
				variant="destructive"
				onclick={() => {
					const form = document.createElement('form');
					form.method = 'POST';
					form.action = '?/deactivateProfile';
					document.body.appendChild(form);
					form.submit();
				}}
			>
				Deactivate
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>