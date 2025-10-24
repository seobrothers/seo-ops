<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Icons } from '$lib/icons';
	import { goto } from '$app/navigation';
	import { Textarea } from '$lib/components/ui/textarea';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import NotesStream from '$lib/components/notes-stream.svelte';
	import EnhancedBulletPointList from '$lib/components/ui/enhanced-bullet-point-list.svelte';
	import EntityPicker from '$lib/components/entity-picker.svelte';
	import SpecialistPlanItems from '$lib/components/specialist-plan-items.svelte';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Form from '$lib/components/ui/form';
	import * as Dialog from '$lib/components/ui/dialog';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { z } from 'zod/v4';
	import { toast } from 'svelte-sonner';
	import type { EnhancedBulletPoint } from '$lib/types/campaign-profile';

	let { data } = $props();

	// Editing states for text fields
	let isEditingName = $state(false);
	let isEditingDescription = $state(false);
	let isEditingPartner = $state(false);
	let isEditingPrice = $state(false);
	let isEditingCampaignProfile = $state(false);
	let isEditingStatus = $state(false);
	let selectedActionItemDescription = $state('');
	let showActionItemDescription = $state(false);
	let showToggleActiveDialog = $state(false);
	let showSpecialistTimeWarning = $state(false);
	let specialistTimeItemToRemove = $state(-1);

	// Trigger states for bullet point lists (only for editable fields)
	let isAddingServiceItem = $state(false);
	let triggerActionItemsAdd = $state(false);
	let triggerCampaignAdd = $state(false);
	let triggerPresaleAdd = $state(false);
	let triggerSeoGrowthAdd = $state(false);

	// Local state for field values
	let name = $state(data.package.name || '');
	let description = $state(data.package.description || '');
	let partnerEntityId = $state(data.package.partnerEntityId);
	let monthlyPriceCents = $state(data.package.monthlyPriceCents);
	let currency = $state(data.package.currency || 'USD');
	let relatedCampaignProfileId = $state(data.package.relatedCampaignProfileId);
	let isActive = $state(data.package.isActive);

	// Convert price from cents to dollars for display (whole dollars only)
	let priceInDollars = $state(data.package.monthlyPriceCents ? Math.round(data.package.monthlyPriceCents / 100) : null);

	// Form setups for individual field editing (like SOPs)
	const partnerSchema = z.object({
		partnerEntityId: z.number().nullable()
	});
	const partnerForm = superForm({ partnerEntityId: data.package.partnerEntityId }, { validators: zod4Client(partnerSchema) });
	const { form: partnerFormData } = partnerForm;
	
	const campaignProfileSchema = z.object({
		relatedCampaignProfileId: z.number()
	});
	const campaignProfileForm = superForm({ relatedCampaignProfileId: data.package.relatedCampaignProfileId }, { validators: zod4Client(campaignProfileSchema) });
	const { form: campaignProfileFormData } = campaignProfileForm;
	
	const serviceItemSchema = z.object({
		serviceItemId: z.number()
	});
	const serviceItemForm = superForm({ serviceItemId: 0 }, { validators: zod4Client(serviceItemSchema) });
	const { form: serviceItemFormData } = serviceItemForm;
	
	// Schema for bulk editing form
	const serviceItemsSchema = z.object({});
	const serviceItemsForm = superForm({}, { validators: zod4Client(serviceItemsSchema) });
	
	// Schema for action items bulk editing
	const actionItemsSchema = z.object({});
	const actionItemsForm = superForm({}, { validators: zod4Client(actionItemsSchema) });
	
	// State for bulk editing mode
	let isEditingServiceItems = $state(false);
	let editingServiceItems = $state([]);
	let newServiceItems = $state([]);
	
	// State for action items bulk editing
	let isEditingActionItems = $state(false);
	let editingActionItems = $state([]);
	let newActionItems = $state([]);
	
	// Helper function to safely parse JSON or return empty array
	function safeParseEnhancedJSON(jsonString: string): EnhancedBulletPoint[] {
		if (!jsonString) return [];
		try {
			const parsed = JSON.parse(jsonString);
			if (Array.isArray(parsed)) {
				return parsed.map(item => ({
					id: item.id || `bp-migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					text: item.text || '',
					description: item.description || undefined,
					order: item.order || 1
				}));
			}
			return [];
		} catch {
			return jsonString.trim() ? [{ 
				id: `bp-legacy-${Date.now()}`, 
				text: jsonString.trim(), 
				description: undefined,
				order: 1 
			}] : [];
		}
	}

	// Parse bullet point fields from JSON
	let seoGrowthOpportunities = $state(safeParseEnhancedJSON(data.package.seoGrowthOpportunities));
	let commonChallenges = $derived(
		data.package.campaignProfile ? safeParseEnhancedJSON(data.package.campaignProfile.commonChallenges) : []
	);
	let campaignComponents = $state(safeParseEnhancedJSON(data.package.campaignComponents || '[]'));
	let actionItems = $state(safeParseEnhancedJSON(data.package.actionItems || '[]'));
	let campaignConsiderations = $state(safeParseEnhancedJSON(data.package.campaignConsiderations));
	let presaleConsiderations = $state(safeParseEnhancedJSON(data.package.presaleConsiderations));

	// Activity log from database
	let activities = $state(data.activities || []);
	let showingAllActivities = $state(false);
	
	// Update activities when data changes
	$effect(() => {
		activities = data.activities || [];
		showingAllActivities = false;
	});
	
	// Computed property for displayed activities
	let displayedActivities = $derived(showingAllActivities ? activities : activities.slice(0, 5));
	let hasMoreActivities = $derived(activities.length > 5);
	
	function showMoreActivities() {
		showingAllActivities = true;
	}

	function goBack() {
		goto('/team/ops/packages');
	}

	// Create a hidden form for bullet point saves
	let hiddenForm: HTMLFormElement;

	// Function to save bullet point fields
	async function saveBulletPointField(field: string, items: any[]) {
		return new Promise((resolve) => {
			const fieldInput = hiddenForm.querySelector('input[name="field"]') as HTMLInputElement;
			const valueInput = hiddenForm.querySelector('input[name="value"]') as HTMLInputElement;
			
			fieldInput.value = field;
			valueInput.value = JSON.stringify(items);
			
			hiddenForm.requestSubmit();
			
			setTimeout(() => resolve(true), 100);
		});
	}

	function handleCancel(field: string) {
		switch(field) {
			case 'name':
				name = data.package.name || '';
				isEditingName = false;
				break;
			case 'description': 
				description = data.package.description || '';
				isEditingDescription = false;
				break;
			case 'partner':
				partnerEntityId = data.package.partnerEntityId;
				isEditingPartner = false;
				break;
			case 'price':
				monthlyPriceCents = data.package.monthlyPriceCents;
				currency = data.package.currency || 'USD';
				priceInDollars = data.package.monthlyPriceCents ? data.package.monthlyPriceCents / 100 : null;
				isEditingPrice = false;
				break;
			case 'campaignProfile':
				relatedCampaignProfileId = data.package.relatedCampaignProfileId;
				isEditingCampaignProfile = false;
				break;
			case 'status':
				isActive = data.package.isActive;
				isEditingStatus = false;
				break;
		}
	}

	function handleEdit(field: string) {
		switch(field) {
			case 'name': isEditingName = true; break;
			case 'description': isEditingDescription = true; break;
			case 'partner': isEditingPartner = true; break;
			case 'price': isEditingPrice = true; break;
			case 'campaignProfile': isEditingCampaignProfile = true; break;
			case 'status': isEditingStatus = true; break;
		}
	}

	// Handle form submission for different fields
	const handleFieldForm = (field: string) => {
		return async ({ result, update }) => {
			console.log('Form result:', result);
			if (result && result.type === 'success') {
				switch(field) {
					case 'name': isEditingName = false; break;
					case 'partner': isEditingPartner = false; break;
					case 'price': isEditingPrice = false; break;
					case 'campaignProfile': isEditingCampaignProfile = false; break;
					case 'status': isEditingStatus = false; break;
				}
				await invalidateAll();
			} else if (result && result.type === 'failure') {
				console.error('Form validation failed:', result.data);
			}
			await update();
		};
	};

	// Individual field handlers (like SOPs)
	const handlePartnerForm = () => {
		return async ({ result, update }) => {
			console.log('Partner form result:', result);
			if (result && result.type === 'success') {
				isEditingPartner = false;
				await invalidateAll();
			} else if (result && result.type === 'failure') {
				console.error('Partner form validation failed:', result.data);
			}
			await update();
		};
	};

	const handleCampaignProfileForm = () => {
		return async ({ result, update }) => {
			console.log('Campaign profile form result:', result);
			if (result && result.type === 'success') {
				isEditingCampaignProfile = false;
				await invalidateAll();
			} else if (result && result.type === 'failure') {
				console.error('Campaign profile form validation failed:', result.data);
			}
			await update();
		};
	};

	const handlePriceForm = () => {
		return async ({ result, update }) => {
			console.log('Price form result:', result);
			if (result && result.type === 'success') {
				isEditingPrice = false;
				await invalidateAll();
			} else if (result && result.type === 'failure') {
				console.error('Price form validation failed:', result.data);
			}
			await update();
		};
	};

	const handleStatusForm = () => {
		return async ({ result, update }) => {
			console.log('Status form result:', result);
			if (result && result.type === 'success') {
				isEditingStatus = false;
				await invalidateAll();
			} else if (result && result.type === 'failure') {
				console.error('Status form validation failed:', result.data);
			}
			await update();
		};
	};

	const handleServiceItemForm = () => {
		return async ({ result, update }) => {
			console.log('Service item form result:', result);
			if (result && result.type === 'success') {
				// Reset form fields but keep adding mode open
				await invalidateAll();
				
				// Reset fields after the page updates
				setTimeout(() => {
					$serviceItemFormData.serviceItemId = 0;
					quantityValue = '';
					frequencyValue = 'monthly';
					
					// Reset form inputs
					const form = document.getElementById('add-service-item-form');
					if (form) {
						const quantityInput = form.querySelector('input[name="quantity"]');
						const valueInput = form.querySelector('input[name="monthlyValue"]');
						const freqSelect = form.querySelector('select[name="frequency"]');
						
						if (quantityInput) quantityInput.value = '';
						if (valueInput) valueInput.value = '';
						if (freqSelect) freqSelect.value = 'monthly';
					}
				}, 100);
			} else if (result && result.type === 'failure') {
				console.error('Service item form validation failed:', result.data);
			}
			await update();
		};
	};

	const handleRemoveServiceItem = () => {
		return async ({ result, update }) => {
			if (result && result.type === 'success') {
				await invalidateAll();
			}
			await update();
		};
	};

	// Functions for bulk editing
	function startEditingServiceItems() {
		isEditingServiceItems = true;
		// Copy existing items for editing, converting cents to dollars for display
		editingServiceItems = [...(data.packageServiceItems || [])].map((item, index) => ({
			...item,
			monthlyValueCents: (item.monthlyValueCents || 0) / 100, // Convert cents to dollars for editing
			orderOverride: item.orderOverride || index + 1
		}));
		newServiceItems = [];
	}

	function addNewServiceItem() {
		const nextOrder = Math.max(
			...editingServiceItems.map(item => item.orderOverride || 0),
			...newServiceItems.map(item => item.orderOverride || 0),
			0
		) + 1;
		
		newServiceItems = [...newServiceItems, {
			id: `new-${Date.now()}`,
			serviceItemId: 0,
			serviceItemName: '',
			quantity: 1,
			frequency: 'monthly',
			monthlyValueCents: 0,
			orderOverride: nextOrder,
			isPartnerSpecific: false,
			isNew: true
		}];
	}

	function moveServiceItemUp(index) {
		if (index > 0) {
			const newItems = [...editingServiceItems];
			[newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];

			// Reassign sequential order values based on new positions
			newItems.forEach((item, i) => {
				item.orderOverride = i + 1;
			});

			editingServiceItems = newItems;
		}
	}

	function moveServiceItemDown(index) {
		if (index < editingServiceItems.length - 1) {
			const newItems = [...editingServiceItems];
			[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];

			// Reassign sequential order values based on new positions
			newItems.forEach((item, i) => {
				item.orderOverride = i + 1;
			});

			editingServiceItems = newItems;
		}
	}

	function moveNewServiceItemUp(index) {
		if (index > 0) {
			const newItems = [...newServiceItems];
			[newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];

			// Reassign sequential order values for new items (continue from existing items)
			const baseOrder = editingServiceItems.length;
			newItems.forEach((item, i) => {
				item.orderOverride = baseOrder + i + 1;
			});

			newServiceItems = newItems;
		}
	}

	function moveNewServiceItemDown(index) {
		if (index < newServiceItems.length - 1) {
			const newItems = [...newServiceItems];
			[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];

			// Reassign sequential order values for new items (continue from existing items)
			const baseOrder = editingServiceItems.length;
			newItems.forEach((item, i) => {
				item.orderOverride = baseOrder + i + 1;
			});

			newServiceItems = newItems;
		}
	}

	function removeExistingItem(index) {
		const item = editingServiceItems[index];
		const serviceItem = data.availableServiceItems?.find(si => si.id === item.serviceItemId);
		
		// Check if this is a specialist_time item and there are action items
		if (serviceItem?.serviceLabel === 'specialist_time' && data.packageActionItems && data.packageActionItems.length > 0) {
			specialistTimeItemToRemove = index;
			showSpecialistTimeWarning = true;
			return;
		}
		
		// Remove immediately if not specialist_time or no action items
		editingServiceItems = editingServiceItems.filter((_, i) => i !== index);
	}

	function confirmRemoveSpecialistTime() {
		if (specialistTimeItemToRemove >= 0) {
			editingServiceItems = editingServiceItems.filter((_, i) => i !== specialistTimeItemToRemove);
			specialistTimeItemToRemove = -1;
		}
		showSpecialistTimeWarning = false;
	}

	function removeNewItem(index) {
		newServiceItems = newServiceItems.filter((_, i) => i !== index);
	}

	function cancelEditingServiceItems() {
		isEditingServiceItems = false;
		editingServiceItems = [];
		newServiceItems = [];
	}

	// Functions for action items bulk editing
	function startEditingActionItems() {
		isEditingActionItems = true;
		// Copy existing items for editing with order numbers
		editingActionItems = [...(data.packageActionItems || [])].map((item, index) => ({
			...item,
			orderOverride: item.orderOverride || index + 1
		}));
		newActionItems = [];
	}

	function addNewActionItem() {
		const nextOrder = Math.max(
			...editingActionItems.map(item => item.orderOverride || 0),
			...newActionItems.map(item => item.orderOverride || 0),
			0
		) + 1;
		
		newActionItems = [...newActionItems, {
			id: `new-${Date.now()}`,
			serviceItemId: 0,
			name: '',
			title: '',
			isPartnerSpecific: false,
			orderOverride: nextOrder,
			isNew: true
		}];
	}

	function removeEditingActionItem(index) {
		editingActionItems = editingActionItems.filter((_, i) => i !== index);
		// Reassign order numbers
		editingActionItems = editingActionItems.map((item, i) => ({
			...item,
			orderOverride: i + 1
		}));
	}

	function removeNewActionItem(index) {
		newActionItems = newActionItems.filter((_, i) => i !== index);
		// Reassign order numbers
		newActionItems = newActionItems.map((item, i) => ({
			...item,
			orderOverride: editingActionItems.length + i + 1
		}));
	}

	function moveActionItemUp(index) {
		if (index > 0) {
			const temp = editingActionItems[index];
			const tempOrder = temp.orderOverride;
			editingActionItems[index] = editingActionItems[index - 1];
			editingActionItems[index - 1] = temp;
			// Swap order numbers
			editingActionItems[index].orderOverride = tempOrder;
			editingActionItems[index - 1].orderOverride = editingActionItems[index].orderOverride;
		}
	}

	function moveActionItemDown(index) {
		if (index < editingActionItems.length - 1) {
			const temp = editingActionItems[index];
			const tempOrder = temp.orderOverride;
			editingActionItems[index] = editingActionItems[index + 1];
			editingActionItems[index + 1] = temp;
			// Swap order numbers
			editingActionItems[index].orderOverride = tempOrder;
			editingActionItems[index + 1].orderOverride = editingActionItems[index].orderOverride;
		}
	}

	function moveNewActionItemUp(index) {
		if (index > 0) {
			const temp = newActionItems[index];
			const tempOrder = temp.orderOverride;
			newActionItems[index] = newActionItems[index - 1];
			newActionItems[index - 1] = temp;
			// Swap order numbers
			newActionItems[index].orderOverride = tempOrder;
			newActionItems[index - 1].orderOverride = newActionItems[index].orderOverride;
		}
	}

	function moveNewActionItemDown(index) {
		if (index < newActionItems.length - 1) {
			const temp = newActionItems[index];
			const tempOrder = temp.orderOverride;
			newActionItems[index] = newActionItems[index + 1];
			newActionItems[index + 1] = temp;
			// Swap order numbers
			newActionItems[index].orderOverride = tempOrder;
			newActionItems[index + 1].orderOverride = newActionItems[index].orderOverride;
		}
	}

	function cancelEditingActionItems() {
		isEditingActionItems = false;
		editingActionItems = [];
		newActionItems = [];
	}

	function showActionItemDetails(description: string) {
		selectedActionItemDescription = description || 'No description available';
		showActionItemDescription = true;
	}

	// Currency options
	const currencyOptions = [
		{ id: 'USD', name: 'USD' },
		{ id: 'CAD', name: 'CAD' },
		{ id: 'GBP', name: 'GBP' },
		{ id: 'EUR', name: 'EUR' }
	];

	// Update cents when dollars change (dollars are whole numbers, multiply by 100 for cents)
	$effect(() => {
		if (priceInDollars !== null && priceInDollars !== undefined) {
			monthlyPriceCents = Math.round(priceInDollars) * 100; // Ensure whole dollars converted to cents
		} else {
			monthlyPriceCents = null;
		}
	});

	// Format currency display
	function formatCurrency(cents: number | null, currency: string = 'USD'): string {
		if (cents === null || cents === undefined) return 'Not set';
		const amount = Math.round(cents / 100); // Round to whole dollars, no decimals
		const symbols = { USD: '$', CAD: '$', GBP: '£', EUR: '€' };
		const symbol = symbols[currency as keyof typeof symbols] || '$';
		return `${symbol}${amount} ${currency}`;
	}

	// Calculate monthly value from frequency (returns value in dollars, no cents)
	function calculateMonthlyValue(valueCents: number, frequency: string): number {
		const valueDollars = valueCents / 100;
		switch(frequency) {
			case 'quarterly':
				return Math.round(valueDollars / 3);
			case 'weekly':
				return Math.round(valueDollars * 52 / 12);
			case 'monthly':
			case 'one-time':
			default:
				return Math.round(valueDollars);
		}
	}

	// Get available frequency options based on package type
	function getFrequencyOptions(packageType: 'ongoing' | 'one_time' | null) {
		if (packageType === 'one_time') {
			return [{ value: 'one-time', label: 'One-time' }];
		}
		// For ongoing packages, exclude daily and one-time
		return [
			{ value: 'monthly', label: 'Monthly' },
			{ value: 'quarterly', label: 'Quarterly' },
			{ value: 'weekly', label: 'Weekly' }
		];
	}
</script>

<svelte:head>
	<title>{data.package.name} - Package</title>
</svelte:head>

<div class="space-y-6 p-6">
	<!-- Header Section -->
	<div>
		<!-- Title with back button -->
		<div class="flex items-center gap-4 mb-2">
			<Button variant="outline" onclick={goBack} class="p-2">
				<Icons.ArrowUpRight class="h-4 w-4 rotate-180" />
			</Button>
			{#if isEditingName}
				<form
					action="?/updatePackageName"
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
					<Input
						bind:value={name}
						name="name"
						class="text-2xl font-bold bg-transparent border-b-2 border-blue-500 outline-none flex-1 h-auto py-1"
						placeholder="Enter package name"
						onkeydown={(e) => {
							if (e.key === 'Escape') handleCancel('name');
						}}
					/>
					<Button size="sm" type="submit">Save</Button>
					<Button size="sm" variant="outline" type="button" onclick={() => handleCancel('name')}>Cancel</Button>
				</form>
			{:else}
				<div class="flex items-center gap-2 flex-1">
					<h1 class="text-2xl font-bold cursor-pointer hover:text-blue-600" onclick={() => handleEdit('name')}>
						{data.package.name}
					</h1>
					{#if data.canEdit}
						<Button size="sm" variant="ghost" onclick={() => handleEdit('name')} class="h-6 w-6 p-0">
							<Icons.Edit class="h-3 w-3" />
						</Button>
					{/if}
				</div>
			{/if}
			{#if data.canEdit}
				<div class="ml-auto">
					{#if data.package.isActive}
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
		</div>
		
		<!-- Divider -->
		<hr class="border-border mt-4 mb-1">
		
		<!-- Description -->
		<div class="mt-4 text-sm leading-relaxed">
			{#if isEditingDescription}
				<form 
					action="?/updateField" 
					method="POST"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								isEditingDescription = false;
							}
							await update();
						};
					}}
					class="space-y-2"
				>
					<input type="hidden" name="field" value="description" />
					<div class="flex items-start gap-3">
						<span><strong class="text-foreground">Description:</strong></span>
						<div class="flex-1 space-y-2">
							<Textarea
								name="value"
								bind:value={description}
								placeholder="Enter package description..."
								rows={2}
								class="w-full text-sm"
							/>
							<div class="flex gap-2">
								<Button size="sm" type="submit">Save</Button>
								<Button size="sm" variant="outline" type="button" onclick={() => handleCancel('description')}>Cancel</Button>
							</div>
						</div>
					</div>
				</form>
			{:else}
				<div class="flex items-center gap-3">
					<span><strong class="text-foreground">Description:</strong></span>
					<span class="text-gray-600 cursor-pointer hover:text-blue-600" onclick={() => handleEdit('description')}>
						{data.package.description || 'Click to add description'}
					</span>
					{#if data.canEdit}
						<Button size="sm" variant="ghost" onclick={() => handleEdit('description')} class="h-6 w-6 p-0">
							<Icons.Edit class="h-3 w-3" />
						</Button>
					{/if}
				</div>
			{/if}
		</div>
		
		<!-- Divider -->
		<hr class="border-border mt-4 mb-1">
		
		<!-- Package Details -->
		<div class="mt-5">
			<div class="text-sm text-muted-foreground">
				<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
					<span><strong class="text-foreground">Partner:</strong> 
						{#if isEditingPartner && data.canEdit}
							<form 
								action="?/updateBasicDetails"
								method="POST"
								use:enhance={handlePartnerForm}
								class="inline-flex items-center gap-1"
							>
								<input type="hidden" name="name" value={data.package.name} />
								<input type="hidden" name="description" value={data.package.description || ''} />
								<input type="hidden" name="monthlyPriceCents" value={data.package.monthlyPriceCents || ''} />
								<input type="hidden" name="currency" value={data.package.currency || 'USD'} />
								<input type="hidden" name="relatedCampaignProfileId" value={data.package.relatedCampaignProfileId || ''} />
								<input type="hidden" name="isActive" value={data.package.isActive} />
								<Form.Field name="partnerEntityId" form={partnerForm} class="inline-block">
									<EntityPicker 
										options={data.partners || []}
										name="partnerEntityId" 
										label=""
										placeholder="Select partner..."
										clearable={true}
										bind:value={$partnerFormData.partnerEntityId}
										class="w-48"
									/>
								</Form.Field>
								<button type="submit" class="p-1 hover:bg-gray-100 rounded" title="Save">
									<Icons.Check class="h-3 w-3 text-green-600" />
								</button>
								<button type="button" onclick={() => handleCancel('partner')} class="p-1 hover:bg-gray-100 rounded" title="Cancel">
									<Icons.X class="h-3 w-3 text-red-600" />
								</button>
							</form>
						{:else}
							<span class="text-gray-600">
								{data.package.partnerName || 'Available to all partners'}
							</span>
							{#if data.canEdit}
								<button class="ml-1 p-0.5 hover:bg-gray-100 rounded" onclick={() => handleEdit('partner')} title="Edit partner">
									<Icons.Edit class="h-3 w-3 text-gray-500" />
								</button>
							{/if}
						{/if}
					</span>
					<span class="hidden sm:inline">•</span>
					<span><strong class="text-foreground">Monthly Price:</strong> 
						{#if isEditingPrice && data.canEdit}
							<form 
								action="?/updateBasicDetails"
								method="POST"
								use:enhance={handlePriceForm}
								class="inline-flex items-center gap-1"
							>
								<input type="hidden" name="name" value={data.package.name} />
								<input type="hidden" name="description" value={data.package.description || ''} />
								<input type="hidden" name="partnerEntityId" value={data.package.partnerEntityId || ''} />
								<input type="hidden" name="relatedCampaignProfileId" value={data.package.relatedCampaignProfileId || ''} />
								<input type="hidden" name="isActive" value={data.package.isActive} />
								<div class="flex items-center gap-1">
									<Input 
										type="number" 
										bind:value={priceInDollars} 
										placeholder="200" 
										class="w-20 h-6 text-xs"
									/>
									<Select.Root type="single" bind:value={currency}>
										<Select.Trigger class="w-20 h-6 text-xs">
											{currencyOptions.find(c => c.id === currency)?.name || 'USD'}
										</Select.Trigger>
										<Select.Content>
											{#each currencyOptions as currencyOption}
												<Select.Item value={currencyOption.id} label={currencyOption.name}>
													{currencyOption.name}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
									<input type="hidden" name="monthlyPriceCents" bind:value={monthlyPriceCents} />
									<input type="hidden" name="currency" bind:value={currency} />
								</div>
								<button type="submit" class="p-1 hover:bg-gray-100 rounded" title="Save">
									<Icons.Check class="h-3 w-3 text-green-600" />
								</button>
								<button type="button" onclick={() => handleCancel('price')} class="p-1 hover:bg-gray-100 rounded" title="Cancel">
									<Icons.X class="h-3 w-3 text-red-600" />
								</button>
							</form>
						{:else}
							<span class="text-gray-600">
								{formatCurrency(data.package.monthlyPriceCents, data.package.currency)}
							</span>
							{#if data.canEdit}
								<button class="ml-1 p-0.5 hover:bg-gray-100 rounded" onclick={() => handleEdit('price')} title="Edit price">
									<Icons.Edit class="h-3 w-3 text-gray-500" />
								</button>
							{/if}
						{/if}
					</span>
					<span class="hidden sm:inline">•</span>
					<span><strong class="text-foreground">Campaign Profile:</strong> 
						{#if isEditingCampaignProfile && data.canEdit}
							<form 
								action="?/updateBasicDetails"
								method="POST"
								use:enhance={handleCampaignProfileForm}
								class="inline-flex items-center gap-1"
							>
								<input type="hidden" name="name" value={data.package.name} />
								<input type="hidden" name="description" value={data.package.description || ''} />
								<input type="hidden" name="partnerEntityId" value={data.package.partnerEntityId || ''} />
								<input type="hidden" name="monthlyPriceCents" value={data.package.monthlyPriceCents || ''} />
								<input type="hidden" name="currency" value={data.package.currency || 'USD'} />
								<input type="hidden" name="isActive" value={data.package.isActive} />
								<Form.Field name="relatedCampaignProfileId" form={campaignProfileForm} class="inline-block">
									<EntityPicker 
										options={data.campaignProfiles || []}
										name="relatedCampaignProfileId" 
										label=""
										placeholder="Select campaign profile..."
										clearable={false}
										bind:value={$campaignProfileFormData.relatedCampaignProfileId}
										class="w-48"
									/>
								</Form.Field>
								<button type="submit" class="p-1 hover:bg-gray-100 rounded" title="Save">
									<Icons.Check class="h-3 w-3 text-green-600" />
								</button>
								<button type="button" onclick={() => handleCancel('campaignProfile')} class="p-1 hover:bg-gray-100 rounded" title="Cancel">
									<Icons.X class="h-3 w-3 text-red-600" />
								</button>
							</form>
						{:else}
							<span class="text-gray-600">
								{data.package.campaignProfileName || 'Not specified'}
							</span>
							{#if data.canEdit}
								<button class="ml-1 p-0.5 hover:bg-gray-100 rounded" onclick={() => handleEdit('campaignProfile')} title="Edit campaign profile">
									<Icons.Edit class="h-3 w-3 text-gray-500" />
								</button>
							{/if}
						{/if}
					</span>
					<span class="hidden sm:inline">•</span>
					<span><strong class="text-foreground">Status:</strong> 
						{#if isEditingStatus && data.canEdit}
							<form 
								action="?/updateField"
								method="POST"
								use:enhance={handleStatusForm}
								class="inline-flex items-center gap-1"
							>
								<input type="hidden" name="field" value="isActive" />
								<Select.Root type="single" bind:value={isActive}>
									<Select.Trigger class="w-20 h-6 text-xs">
										{isActive ? 'Active' : 'Inactive'}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value={true} label="Active">Active</Select.Item>
										<Select.Item value={false} label="Inactive">Inactive</Select.Item>
									</Select.Content>
								</Select.Root>
								<input type="hidden" name="value" bind:value={isActive} />
								<button type="submit" class="p-1 hover:bg-gray-100 rounded" title="Save">
									<Icons.Check class="h-3 w-3 text-green-600" />
								</button>
								<button type="button" onclick={() => handleCancel('status')} class="p-1 hover:bg-gray-100 rounded" title="Cancel">
									<Icons.X class="h-3 w-3 text-red-600" />
								</button>
							</form>
						{:else}
							<span class="text-gray-600">
								{data.package.isActive ? 'Active' : 'Inactive'}
							</span>
							{#if data.canEdit}
								<button class="ml-1 p-0.5 hover:bg-gray-100 rounded" onclick={() => handleEdit('status')} title="Edit status">
									<Icons.Edit class="h-3 w-3 text-gray-500" />
								</button>
							{/if}
						{/if}
					</span>
				</div>
			</div>
		</div>

		<!-- Divider -->
		<hr class="border-border mt-4 mb-1">
	</div>

	<!-- Full Width Layout -->
	<div class="space-y-4">
		<!-- Package Scope Items -->
		<Card>
			<CardHeader>
				<div class="flex items-center gap-2">
					<CardTitle class="text-lg">Package Scope & Process</CardTitle>
					{#if data.canEdit && !isEditingServiceItems}
						<Button
							variant="ghost"
							size="sm"
							class="h-6 w-6 p-0"
							onclick={startEditingServiceItems}
							title="Edit Service Items"
						>
							<Icons.Edit class="h-3 w-3" />
						</Button>
					{/if}
				</div>
			</CardHeader>
			<CardContent class="space-y-3">
				{#if isEditingServiceItems}
					<!-- Editing Mode -->
					<form action="?/updateServiceItems" method="POST" use:enhance={() => {
						return async ({ result, update }) => {
							if (result && result.type === 'success') {
								isEditingServiceItems = false;
								await invalidateAll();
							}
							await update();
						};
					}}>
						<div class="space-y-4">
							<!-- Existing items (editable) -->
							{#each editingServiceItems as item, index}
								<div class="flex items-end gap-2">
									<div class="flex-1">
										<label class="text-xs text-muted-foreground mb-1 block">Service Item</label>
										<Form.Field name="serviceItem_{index}" form={serviceItemsForm}>
											<EntityPicker
												bind:value={item.serviceItemId}
												options={data.availableServiceItems?.filter(option => {
													// Filter out items already selected in other rows
													const selectedIds = [
														...editingServiceItems.filter((_, i) => i !== index).map(si => si.serviceItemId),
														...newServiceItems.map(si => si.serviceItemId)
													].filter(id => id > 0);
													return !selectedIds.includes(option.id);
												}) || []}
												name="serviceItem_{index}"
												label=""
												placeholder="Select service item..."
												class="h-9 -mb-px"
												onchange={() => {
													const selectedItem = data.availableServiceItems?.find(si => si.id === item.serviceItemId);
													if (selectedItem) {
														item.serviceItemName = selectedItem.name;
														item.isPartnerSpecific = selectedItem.isPartnerSpecific;
														item.monthlyValueCents = selectedItem.recommendedPriceCents || 0;
													}
												}}
											/>
										</Form.Field>
									</div>
									<div class="flex-none w-16">
										<label class="text-xs text-muted-foreground mb-1 block">Qty</label>
										<Input
											type="number"
											bind:value={item.quantity}
											placeholder="1"
											min="1"
											class="h-9"
										/>
									</div>
									{#if data.package.type !== 'one_time'}
										<div class="flex-none w-24">
											<label class="text-xs text-muted-foreground mb-1 block">Frequency</label>
											<Select.Root type="single" bind:value={item.frequency}>
												<Select.Trigger class="h-9">
													{item.frequency || 'Monthly'}
												</Select.Trigger>
												<Select.Content>
													{#each getFrequencyOptions(data.package.type) as option}
														<Select.Item value={option.value} label={option.label}>
															{option.label}
														</Select.Item>
													{/each}
												</Select.Content>
											</Select.Root>
										</div>
									{/if}
									<div class="flex-none w-20">
										<label class="text-xs text-muted-foreground mb-1 block">Value</label>
										<Input
											type="number"
											bind:value={item.monthlyValueCents}
											placeholder="0"
											min="0"
											class="h-9"
										/>
									</div>
									{#if editingServiceItems.length > 1}
										<div class="flex-none">
											<label class="text-xs text-muted-foreground mb-1 block">Order</label>
											<div class="flex gap-1">
												{#if index > 0}
													<Button
														type="button"
														variant="outline"
														size="sm"
														class="h-9 w-9 p-0"
														onclick={() => moveServiceItemUp(index)}
														title="Move up"
													>
														<Icons.ChevronUp class="h-4 w-4" />
													</Button>
												{/if}
												{#if index < editingServiceItems.length - 1}
													<Button
														type="button"
														variant="outline"
														size="sm"
														class="h-9 w-9 p-0"
														onclick={() => moveServiceItemDown(index)}
														title="Move down"
													>
														<Icons.ChevronDown class="h-4 w-4" />
													</Button>
												{/if}
											</div>
										</div>
									{/if}
									<Button
										type="button"
										variant="outline"
										size="sm"
										class="h-9 w-9 p-0"
										onclick={() => removeExistingItem(index)}
									>
										<Icons.X class="h-4 w-4" />
									</Button>
								</div>
							{/each}
							
							<!-- New items -->
							{#each newServiceItems as item, index}
								<div class="flex items-end gap-2">
									<div class="flex-1">
										<label class="text-xs text-muted-foreground mb-1 block">Service Item</label>
										<Form.Field name="newServiceItem_{index}" form={serviceItemsForm}>
											<EntityPicker
												bind:value={item.serviceItemId}
												options={data.availableServiceItems?.filter(option => {
													// Filter out items already selected in other rows
													const selectedIds = [
														...editingServiceItems.map(si => si.serviceItemId),
														...newServiceItems.filter((_, i) => i !== index).map(si => si.serviceItemId)
													].filter(id => id > 0);
													return !selectedIds.includes(option.id);
												}) || []}
												name="newServiceItem_{index}"
												label=""
												placeholder="Select service item..."
												class="h-9 -mb-px"
												onchange={() => {
													const selectedItem = data.availableServiceItems?.find(si => si.id === item.serviceItemId);
													if (selectedItem) {
														item.serviceItemName = selectedItem.name;
														item.isPartnerSpecific = selectedItem.isPartnerSpecific;
														item.monthlyValueCents = Math.round((selectedItem.recommendedPriceCents || 0) / 100);
													}
												}}
											/>
										</Form.Field>
									</div>
									<div class="flex-none w-16">
										<label class="text-xs text-muted-foreground mb-1 block">Qty</label>
										<Input
											type="number"
											bind:value={item.quantity}
											placeholder="1"
											min="1"
											class="h-9"
										/>
									</div>
									{#if data.package.type !== 'one_time'}
										<div class="flex-none w-24">
											<label class="text-xs text-muted-foreground mb-1 block">Frequency</label>
											<Select.Root type="single" bind:value={item.frequency}>
												<Select.Trigger class="h-9">
													{item.frequency || 'Monthly'}
												</Select.Trigger>
												<Select.Content>
													{#each getFrequencyOptions(data.package.type) as option}
														<Select.Item value={option.value} label={option.label}>
															{option.label}
														</Select.Item>
													{/each}
												</Select.Content>
											</Select.Root>
										</div>
									{/if}
									<div class="flex-none w-20">
										<label class="text-xs text-muted-foreground mb-1 block">Value</label>
										<Input
											type="number"
											bind:value={item.monthlyValueCents}
											placeholder="0"
											min="0"
											class="h-9"
										/>
									</div>
									{#if newServiceItems.length > 1}
										<div class="flex-none">
											<label class="text-xs text-muted-foreground mb-1 block">Order</label>
											<div class="flex gap-1">
												<Button
													type="button"
													variant="outline"
													size="sm"
													class="h-9 w-9 p-0"
													onclick={() => moveNewServiceItemUp(index)}
													disabled={index === 0}
													title="Move up"
												>
													<Icons.ChevronUp class="h-4 w-4" />
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													class="h-9 w-9 p-0"
													onclick={() => moveNewServiceItemDown(index)}
													disabled={index === newServiceItems.length - 1}
													title="Move down"
												>
													<Icons.ChevronDown class="h-4 w-4" />
												</Button>
											</div>
										</div>
									{/if}
									<Button
										type="button"
										variant="outline"
										size="sm"
										class="h-9 w-9 p-0"
										onclick={() => removeNewItem(index)}
									>
										<Icons.X class="h-4 w-4" />
									</Button>
								</div>
							{/each}
							
							<div class="flex justify-end">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={addNewServiceItem}
								>
									<Icons.Plus class="mr-2 h-4 w-4" />
									Add New Item
								</Button>
							</div>
							
							<div class="flex justify-end gap-2 pt-1 border-t">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={cancelEditingServiceItems}
								>
									Cancel
								</Button>
								<Button type="submit" size="sm">
									Save
								</Button>
							</div>
						</div>
						
						<!-- Hidden inputs for form submission -->
						<input type="hidden" name="updatedItems" value={JSON.stringify(editingServiceItems)} />
						<input type="hidden" name="newItems" value={JSON.stringify(newServiceItems)} />
					</form>
				{:else}
					<!-- Read-only Mode -->
					<div class="space-y-2 text-sm">
						{#if data.packageServiceItems && data.packageServiceItems.length > 0}
							{#each data.packageServiceItems as item}
								<div class="flex items-center">
									<span class="text-muted-foreground font-medium">{item.serviceItemName}{#if item.isPartnerSpecific}*{/if}</span>
									<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
									{#if data.package.type === 'one_time'}
										<span>{item.quantity || 1} (${calculateMonthlyValue((item.quantity || 1) * (item.monthlyValueCents || 0), 'one-time')} {data.package.currency || 'USD'})</span>
									{:else}
										<span>{item.quantity || 1} / {item.frequency || 'monthly'} (${calculateMonthlyValue((item.quantity || 1) * (item.monthlyValueCents || 0), item.frequency || 'monthly')}/mo)</span>
									{/if}
								</div>
							{/each}
						{:else}
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">Scope</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span>No Service Items for Package</span>
							</div>
						{/if}
						
						<!-- Total Value -->
						{#if data.packageServiceItems && data.packageServiceItems.length > 0}
							<div class="mt-3 pt-3 border-t border-border">
								<div class="text-right text-sm font-medium">
									{#if data.package.type === 'one_time'}
										Total Value: ${data.packageServiceItems.reduce((total, item) => {
											const itemValue = (item.quantity || 1) * (item.monthlyValueCents || 0);
											return total + calculateMonthlyValue(itemValue, 'one-time');
										}, 0)} {data.package.currency || 'USD'}
									{:else}
										Total Monthly Value: ${data.packageServiceItems.reduce((total, item) => {
											const itemValue = (item.quantity || 1) * (item.monthlyValueCents || 0);
											return total + calculateMonthlyValue(itemValue, item.frequency || 'monthly');
										}, 0)} {data.package.currency || 'USD'}
									{/if}
								</div>
							</div>
						{/if}
					</div>
					
				{/if}
			</CardContent>
		</Card>

		<!-- Specialist Plan Items -->
		<SpecialistPlanItems
			items={data.packageActionItems || []}
			availableOptions={data.availableActionItems || []}
			canEdit={data.canEdit}
			title="Initial Campaign Action Items"
			updateAction="?/updateActionItems"
			onSave={() => invalidateAll()}
		/>
	</div>

	<!-- Full Width Cards -->
	<div class="space-y-6">
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


		<!-- SEO Growth Opportunities -->
		<Card>
			<CardHeader>
				<div class="flex items-center gap-2">
					<CardTitle class="text-lg">SEO Growth Opportunities</CardTitle>
					{#if data.canEdit}
						<button class="p-1 hover:bg-gray-100 rounded" title="Add SEO growth opportunity" onclick={() => triggerSeoGrowthAdd = !triggerSeoGrowthAdd}>
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
					bind:triggerAdd={triggerSeoGrowthAdd}
					onSave={() => saveBulletPointField('seoGrowthOpportunities', seoGrowthOpportunities)}
					hideDescription={true}
					hideTitle={true}
				/>
			</CardContent>
		</Card>

		<!-- Common Challenges (Read-only from Campaign Profile) -->
		<Card>
			<CardHeader>
				<div class="flex items-center gap-2">
					<CardTitle class="text-lg">Common Challenges</CardTitle>
					<span class="text-xs text-muted-foreground">(from campaign profile)</span>
				</div>
			</CardHeader>
			<CardContent>
				<EnhancedBulletPointList
					bind:items={commonChallenges}
					placeholder="No common challenges defined in campaign profile..."
					canEdit={false}
					hideDescription={true}
					hideTitle={true}
				/>
			</CardContent>
		</Card>
	</div>

	<!-- Package Notes - Full Width -->
	<div class="mt-6">
		<NotesStream 
			notes={data.notes || []}
			canEdit={data.canEdit}
			title="Package Notes"
			description="These are notes about this service package."
			placeholder="Add notes about this package..."
			emptyStateTitle="No package notes yet"
			emptyStateDescription="Add the first note about this package to get started"
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
						Activities will appear here when changes are made to this package
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

<!-- Action Item Description Dialog -->
<Dialog.Root bind:open={showActionItemDescription}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Action Item Description</Dialog.Title>
		</Dialog.Header>
		<div class="py-4">
			<p class="text-sm text-muted-foreground whitespace-pre-wrap">{selectedActionItemDescription}</p>
		</div>
		<Dialog.Footer>
			<Button onclick={() => showActionItemDescription = false}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Specialist Time Warning Dialog -->
<Dialog.Root bind:open={showSpecialistTimeWarning}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Remove Specialist Time Service</Dialog.Title>
			<Dialog.Description>
				Removing the Specialist Time service item will also remove all associated specialist plan items ({data.packageActionItems?.length || 0} items). This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showSpecialistTimeWarning = false}>Cancel</Button>
			<Button variant="destructive" onclick={confirmRemoveSpecialistTime}>Remove All</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Toggle Active Status Confirmation Dialog -->
<Dialog.Root bind:open={showToggleActiveDialog}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>{data.package.isActive ? 'Deactivate' : 'Reactivate'} Package</Dialog.Title>
			<Dialog.Description>
				{#if data.package.isActive}
					When you deactivate this package, partners will not be able to see it, and it will not be available for use in new discoveries and proposals.
				{:else}
					When you reactivate this package, it will become visible to partners and available for use in new discoveries and proposals.
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showToggleActiveDialog = false}>Cancel</Button>
			<form action="?/updateField" method="POST" use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						showToggleActiveDialog = false;
						await invalidateAll();
					}
					await update();
				};
			}} class="inline">
				<input type="hidden" name="field" value="isActive" />
				<input type="hidden" name="value" value={!data.package.isActive} />
				<Button type="submit" variant={data.package.isActive ? 'destructive' : 'default'}>
					{data.package.isActive ? 'Deactivate' : 'Reactivate'}
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>