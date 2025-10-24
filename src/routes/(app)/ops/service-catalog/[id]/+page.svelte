<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Icons } from '$lib/icons';
	import { goto } from '$app/navigation';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { enhance } from '$app/forms';
	import NotesStream from '$lib/components/notes-stream.svelte';
	import EntityPicker from '$lib/components/entity-picker.svelte';
	import FormField from '$lib/components/ui/form/form-field.svelte';
	import MinimalActivityLog from '$lib/components/minimal-activity-log.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { z } from 'zod/v4';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import * as Dialog from '$lib/components/ui/dialog';

	let { data } = $props();

	let deleteDialogOpen = $state(false);

	// Editing states for fields
	let isEditingDescription = $state(false);
	let isEditingStatus = $state(false);
	let isEditingPartner = $state(false);
	let isEditingServiceLabel = $state(false);
	let isEditingType = $state(false);
	let isEditingSop = $state(false);
	let editServiceDetails = $state(false);
	let editDeliveryProcess = $state(false);
	let editPricingInfo = $state(false);

	// Local state for field values
	let description = $state(data.serviceItem.description || '');

	// Service details form setup
	const serviceDetailsSchema = z.object({
		name: z.string().min(1, 'Name is required'),
		serviceCategoryId: z.number().nullable(),
		serviceLabel: z.string().nullable(),
		partnerEntityId: z.number().nullable(),
	});
	const serviceDetailsForm = superForm({
		name: data.serviceItem.name,
		serviceCategoryId: data.serviceItem.serviceCategoryId,
		serviceLabel: data.serviceItem.serviceLabel,
		partnerEntityId: data.serviceItem.partnerEntityId
	}, { validators: zod4Client(serviceDetailsSchema) });
	const { form: serviceDetailsFormData } = serviceDetailsForm;

	// Delivery process form setup
	const deliveryProcessSchema = z.object({
		showWork: z.boolean(),
		workProofType: z.string().nullable(),
		workProofExample: z.string().nullable(),
		sopUrl: z.string().nullable(),
		inStream: z.boolean(),
	});
	const deliveryProcessForm = superForm({
		showWork: data.serviceItem.showWork || false,
		workProofType: data.serviceItem.workProofType,
		workProofExample: data.serviceItem.workProofExample,
		sopUrl: data.serviceItem.sopUrl,
		inStream: data.serviceItem.inStream || false
	}, { validators: zod4Client(deliveryProcessSchema) });
	const { form: deliveryProcessFormData } = deliveryProcessForm;

	// Pricing info form setup
	const pricingInfoSchema = z.object({
		uom: z.enum(['page', 'blog_post', 'guest_post', 'referring_domain', 'hour', 'cycle', 'outcome'], {
			message: 'Required'
		}),
		minPricingUsd: z.number().nullable().optional(),
		estCogsUsd: z.number().nullable().optional(),
		estTimeHours: z.number().min(0).max(999),
		estTimeMinutes: z.number().min(0).max(59),
	});
	const pricingInfoForm = superForm({
		uom: data.serviceItem.uom,
		minPricingUsd: data.serviceItem.minPricingUsdCents ? data.serviceItem.minPricingUsdCents / 100 : null,
		estCogsUsd: data.serviceItem.estCogsUsdCents ? data.serviceItem.estCogsUsdCents / 100 : null,
		estTimeHours: data.serviceItem.estTimeMinutes ? Math.floor(data.serviceItem.estTimeMinutes / 60) : 0,
		estTimeMinutes: data.serviceItem.estTimeMinutes ? data.serviceItem.estTimeMinutes % 60 : 0,
	}, {
		validators: zod4Client(pricingInfoSchema),
		validationMethod: 'submit-only',
		scrollToError: 'smooth'
	});
	const { form: pricingInfoFormData, errors: pricingInfoErrors, enhance: pricingInfoEnhance } = pricingInfoForm;


	// Partner form setup
	const partnerSchema = z.object({
		partnerEntityId: z.number().nullable(),
	});
	const partnerForm = superForm({ partnerEntityId: data.serviceItem.partnerEntityId }, { validators: zod4Client(partnerSchema) });
	const { form: partnerFormData } = partnerForm;

	// SOP form setup

	// Service label form setup
	const serviceLabelSchema = z.object({
		serviceLabel: z.string().trim().min(1, 'Service label is required').nullable(),
	});
	const serviceLabelForm = superForm({ serviceLabel: data.serviceItem.serviceLabel }, { validators: zod4Client(serviceLabelSchema) });
	const { form: serviceLabelFormData } = serviceLabelForm;

	// Type form setup
	const typeSchema = z.object({
		type: z.enum(['ongoing', 'one_time']),
	});
	const typeForm = superForm({ type: data.serviceItem.type }, { validators: zod4Client(typeSchema) });
	const { form: typeFormData } = typeForm;

	// Function to format description for display based on service label
	function formatDescriptionForDisplay(description: string | null, serviceLabel: string | null): string {
		if (!description) return '<span class="text-gray-500 text-sm">No description available yet. Click to add a detailed description of this scope item.</span>';
		
		if (serviceLabel === 'da20_guest_posts') {
			return `<em>Num (#)</em> <span class="text-primary text-lg font-medium">${description}</span> <em>per frequency</em>`;
		}
		
		if (serviceLabel === 'premium_link_building') {
			return `<em>Num (#)</em> <span class="text-primary text-lg font-medium">${description}</span> <em>per frequency</em>`;
		}
		
		if (serviceLabel === 'blog_posts') {
			return `<em>Num (#)</em> <span class="text-primary text-lg font-medium">${description}</span> <em>per frequency</em>`;
		}
		
		if (serviceLabel === 'specialist_time') {
			return `<em>Num (#) hours of</em> <span class="text-primary text-lg font-medium">${description}</span> <em>per frequency</em>`;
		}
		
		if (serviceLabel === 'gbp_posts') {
			return `<em>Num (#)</em> <span class="text-primary text-lg font-medium">${description}</span> <em>per frequency</em>`;
		}
		
		if (serviceLabel === 'geo_pages') {
			return `<em>Num (#)</em> <span class="text-primary text-lg font-medium">${description}</span> <em>per frequency</em>`;
		}
		
		if (serviceLabel === 'access_to_dashboard') {
			return `<em>Frequency</em> <span class="text-primary text-lg font-medium">${description}</span>`;
		}
		
		// Default format - make description bigger and colored
		return `<span class="text-primary text-lg font-medium">${description}</span>`;
	}

	// Status options
	const statusOptions = [
		{ id: 'true', name: 'Yes' },
		{ id: 'false', name: 'No' }
	];

	// Type options
	const typeOptions = [
		{ id: 'ongoing', name: 'Ongoing' },
		{ id: 'one_time', name: 'One Time' }
	];


	// Service label options based on category (matching the form structure)
	const serviceLabelOptions = {
		campaign_reviews: [
			{ id: 'strategic_campaign_review', name: 'Strategic Campaign Review' },
			{ id: 'junior_campaign_review', name: 'Junior Campaign Review' }
		],
		team_time: [
			{ id: 'campaign_management_time', name: 'Campaign Management Time' },
			{ id: 'specialist_time', name: 'Specialist Time' },
			{ id: 'strategist_time', name: 'Strategist Time' },
			{ id: 'seo_time', name: 'SEO Time' }
		],
		link_building: [
			{ id: 'da20_guest_posts', name: 'DA20+ Guest Posts' },
			{ id: 'premium_link_building', name: 'Premium Link Building' }
		],
		content_creation: [
			{ id: 'blog_posts', name: 'Blog Posts' },
			{ id: 'geo_pages', name: 'Geo Pages' },
			{ id: 'service_pages', name: 'Service Pages' }
		],
		hosting: [
			{ id: 'basic_hosting', name: 'Basic Hosting' },
			{ id: 'speed_optimized_hosting', name: 'Speed Optimized Hosting' }
		],
		technical: [
			{ id: 'crawl_maintenance', name: 'Crawl Maintenance' },
			{ id: 'ongoing_page_speed_support', name: 'Ongoing Page Speed Support' },
			{ id: 'wordpress_maintenance', name: 'WordPress Maintenance' }
		],
		local_seo: [
			{ id: 'gbp_posts', name: 'GBP Posts' },
			{ id: 'local_citations', name: 'Local Citations' },
			{ id: 'advanced_gbp', name: 'Advanced GBP' }
		],
		reporting: [
			{ id: 'access_to_dashboard', name: 'Access to Dashboard' },
			{ id: 'external_reporting', name: 'External Reporting' }
		]
	};

	// Get available service labels for current category
	const availableServiceLabels = $derived(
		data.serviceItem.serviceCategory ? serviceLabelOptions[data.serviceItem.serviceCategory] || [] : []
	);


	// Currency options
	const currencyOptions = [
		{ id: 'USD', name: 'USD' },
		{ id: 'CAD', name: 'CAD' },
		{ id: 'EUR', name: 'EUR' },
		{ id: 'GBP', name: 'GBP' }
	];

	// Work proof type options
	const workProofTypeOptions = [
		{ value: 'published_asset', label: 'Published Asset' },
		{ value: 'google_sheet', label: 'Google Sheet' },
		{ value: 'plan_update', label: 'Plan Update' },
		{ value: 'summary_notes', label: 'Summary Notes' },
		{ value: 'performance_report', label: 'Performance Report' },
		{ value: 'third_party_report', label: 'Third Party Report' }
	];

	// Unit of measure options
	const uomOptions = [
		{ value: 'page', label: 'Page' },
		{ value: 'blog_post', label: 'Blog Post' },
		{ value: 'guest_post', label: 'Guest Post' },
		{ value: 'referring_domain', label: 'Referring Domain' },
		{ value: 'hour', label: 'Hour' },
		{ value: 'cycle', label: 'Cycle' },
		{ value: 'outcome', label: 'Outcome' }
	];

	function goBack() {
		goto('/team/ops/service-catalog');
	}

	// Service details editing functions
	function startEditingServiceDetails() {
		// Reset form data to current values when starting to edit
		$serviceDetailsFormData.name = data.serviceItem.name;
		$serviceDetailsFormData.serviceCategoryId = data.serviceItem.serviceCategoryId;
		$serviceDetailsFormData.serviceLabel = data.serviceItem.serviceLabel;
		$serviceDetailsFormData.partnerEntityId = data.serviceItem.partnerEntityId;
		editServiceDetails = true;
	}

	function cancelEditingServiceDetails() {
		// Reset to original values
		$serviceDetailsFormData.name = data.serviceItem.name;
		$serviceDetailsFormData.serviceCategoryId = data.serviceItem.serviceCategoryId;
		$serviceDetailsFormData.serviceLabel = data.serviceItem.serviceLabel;
		$serviceDetailsFormData.partnerEntityId = data.serviceItem.partnerEntityId;
		editServiceDetails = false;
	}

	// Delivery process editing functions
	function startEditingDeliveryProcess() {
		// Reset form data to current values when starting to edit
		$deliveryProcessFormData.showWork = data.serviceItem.showWork || false;
		$deliveryProcessFormData.workProofType = data.serviceItem.workProofType;
		$deliveryProcessFormData.workProofExample = data.serviceItem.workProofExample;
		$deliveryProcessFormData.sopUrl = data.serviceItem.sopUrl;
		$deliveryProcessFormData.inStream = data.serviceItem.inStream || false;
		editDeliveryProcess = true;
	}

	function cancelEditingDeliveryProcess() {
		// Reset to original values
		$deliveryProcessFormData.showWork = data.serviceItem.showWork || false;
		$deliveryProcessFormData.workProofType = data.serviceItem.workProofType;
		$deliveryProcessFormData.workProofExample = data.serviceItem.workProofExample;
		$deliveryProcessFormData.sopUrl = data.serviceItem.sopUrl;
		$deliveryProcessFormData.inStream = data.serviceItem.inStream || false;
		editDeliveryProcess = false;
	}

	// Pricing info editing functions
	function startEditingPricingInfo() {
		// Reset form data to current values when starting to edit
		$pricingInfoFormData.uom = data.serviceItem.uom;
		$pricingInfoFormData.minPricingUsd = data.serviceItem.minPricingUsdCents ? data.serviceItem.minPricingUsdCents / 100 : null;
		$pricingInfoFormData.estCogsUsd = data.serviceItem.estCogsUsdCents ? data.serviceItem.estCogsUsdCents / 100 : null;
		$pricingInfoFormData.estTimeHours = data.serviceItem.estTimeMinutes ? Math.floor(data.serviceItem.estTimeMinutes / 60) : 0;
		$pricingInfoFormData.estTimeMinutes = data.serviceItem.estTimeMinutes ? data.serviceItem.estTimeMinutes % 60 : 0;
		editPricingInfo = true;
	}

	function cancelEditingPricingInfo() {
		// Reset to original values
		$pricingInfoFormData.uom = data.serviceItem.uom;
		$pricingInfoFormData.minPricingUsd = data.serviceItem.minPricingUsdCents ? data.serviceItem.minPricingUsdCents / 100 : null;
		$pricingInfoFormData.estCogsUsd = data.serviceItem.estCogsUsdCents ? data.serviceItem.estCogsUsdCents / 100 : null;
		$pricingInfoFormData.estTimeHours = data.serviceItem.estTimeMinutes ? Math.floor(data.serviceItem.estTimeMinutes / 60) : 0;
		$pricingInfoFormData.estTimeMinutes = data.serviceItem.estTimeMinutes ? data.serviceItem.estTimeMinutes % 60 : 0;
		editPricingInfo = false;
	}

	// Field editing functions
	function handleEditDescription() {
		isEditingDescription = true;
	}

	function handleCancelDescription() {
		description = data.serviceItem.description || '';
		isEditingDescription = false;
	}

	// Status editing functions
	function handleStatusEdit() {
		isEditingStatus = true;
	}

	function handleStatusCancel() {
		isEditingStatus = false;
	}



	// Partner editing functions
	function handlePartnerEdit() {
		// Reset form data to current value when starting to edit
		$partnerFormData.partnerEntityId = data.serviceItem.partnerEntityId || null;
		isEditingPartner = true;
	}

	function handlePartnerCancel() {
		// Reset to original value
		$partnerFormData.partnerEntityId = data.serviceItem.partnerEntityId || null;
		isEditingPartner = false;
	}

	const handlePartnerForm = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				isEditingPartner = false;
			}
			await update();
		};
	};


	// Service label editing functions
	function handleServiceLabelEdit() {
		// Reset form data to current value when starting to edit
		$serviceLabelFormData.serviceLabel = data.serviceItem.serviceLabel || null;
		isEditingServiceLabel = true;
	}

	function handleServiceLabelCancel() {
		// Reset to original value
		$serviceLabelFormData.serviceLabel = data.serviceItem.serviceLabel || null;
		isEditingServiceLabel = false;
	}

	const handleServiceLabelForm = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				isEditingServiceLabel = false;
			}
			await update();
		};
	};

	// Type editing functions
	function handleTypeEdit() {
		$typeFormData.type = data.serviceItem.type || 'ongoing';
		isEditingType = true;
	}

	function handleTypeCancel() {
		$typeFormData.type = data.serviceItem.type || 'ongoing';
		isEditingType = false;
	}

	const handleTypeForm = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				isEditingType = false;
			}
			await update();
		};
	};


	// Format time for display
	function formatTime(totalMinutes: number | null): string {
		if (!totalMinutes || totalMinutes <= 0) return 'Not set';
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		return hours > 0 && minutes > 0 ? `${hours}H ${minutes}M` : 
		       hours > 0 ? `${hours}H` : 
		       minutes > 0 ? `${minutes}M` : 'Not set';
	}

	// Format currency helper
	function formatCurrency(cents: number | null, currency: string = 'USD'): string {
		if (!cents) return 'Not set';
		const amount = (cents / 100).toFixed(2);
		return `$${amount} (${currency})`;
	}

	// Format service category for display
	function formatServiceCategory(category: string | null): string {
		if (!category) return 'Not categorized';
		return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
	}

	// Format service label for display
	function formatServiceLabel(label: string | null): string {
		if (!label) return 'No specific label';
		return label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
	}

	// Format date to "Sep 13, 2025" format
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Format unit of measure for display
	function formatUom(uom: string | null): string {
		if (!uom) return 'Not specified';
		const option = uomOptions.find(opt => opt.value === uom);
		return option ? option.label : uom;
	}
</script>

<svelte:head>
	<title>{data.serviceItem.name} - Scope Item</title>
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
				<h1 class="text-2xl font-bold">
					{data.serviceItem.name}
				</h1>
			</div>
			{#if data.canEdit}
				{#if data.serviceItem.isActive}
					<Button
						variant="ghost"
						size="sm"
						class="text-destructive hover:text-destructive hover:bg-destructive/10"
						onclick={() => deleteDialogOpen = true}
					>
						<Icons.Trash class="h-4 w-4 mr-2" />
						Deactivate
					</Button>
				{:else}
					<Button
						variant="ghost"
						size="sm"
						class="text-green-600 hover:text-green-600 hover:bg-green-50"
						onclick={() => {
							const form = document.createElement('form');
							form.method = 'POST';
							form.action = '?/reactivateItem';
							document.body.appendChild(form);
							form.submit();
						}}
					>
						<Icons.Check class="h-4 w-4 mr-2" />
						Reactivate
					</Button>
				{/if}
			{/if}
		</div>

	</div>

	<!-- Content Layout - 50/50 Split -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left Column (1/2 width) - Service Details, Description, Pricing, Timeline -->
		<div class="space-y-4">
			<!-- Service Details Card -->
			<Card>
				<CardHeader class="flex flex-row items-center justify-between pb-3">
					<CardTitle class="text-lg">Service Details</CardTitle>
					{#if data.canEdit}
						<Button
							variant="ghost"
							size="sm"
							class={['h-6 w-6 p-0', editServiceDetails && 'opacity-0!']}
							onclick={startEditingServiceDetails}
							disabled={editServiceDetails}
						>
							<Icons.Edit class="h-3 w-3" />
						</Button>
					{/if}
				</CardHeader>
				<CardContent>
					{#if editServiceDetails}
						<form
							method="POST"
							action="?/updateServiceDetails"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										editServiceDetails = false;
									}
									await update();
								};
							}}
							class="space-y-4"
						>
							<!-- Service Name -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">Service Name</label>
								<Input
									bind:value={$serviceDetailsFormData.name}
									name="name"
									placeholder="Enter service name..."
									class="w-full"
								/>
							</div>

							<!-- Service Category -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">Service Category</label>
								<Select.Root type="single" bind:value={$serviceDetailsFormData.serviceCategoryId}>
									<Select.Trigger class="w-full">
										{$serviceDetailsFormData.serviceCategoryId
											? (data.serviceCategories?.find(cat => cat.id === $serviceDetailsFormData.serviceCategoryId)?.displayName || 'Unknown')
											: 'Select category...'}
									</Select.Trigger>
									<Select.Content>
										{#each data.serviceCategories || [] as category}
											<Select.Item value={category.id}>{category.displayName}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" name="serviceCategoryId" bind:value={$serviceDetailsFormData.serviceCategoryId} />
							</div>

							<!-- Service Label -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">Service Label</label>
								<Input
									bind:value={$serviceDetailsFormData.serviceLabel}
									name="serviceLabel"
									placeholder="Enter service label..."
									class="w-full"
								/>
							</div>

							<!-- Hidden: Service Scope (always campaign for catalog items) -->
							<input type="hidden" name="serviceScope" value="campaign" />

							<!-- Partner -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">Partner</label>
								<FormField name="partnerEntityId" form={serviceDetailsForm}>
									<EntityPicker
										options={data.partners || []}
										bind:value={$serviceDetailsFormData.partnerEntityId}
										name="partnerEntityId"
										label=""
										placeholder="Select partner..."
										clearable={true}
										class="w-full"
									/>
								</FormField>
							</div>

							<div class="flex justify-end gap-2 pt-2 border-t">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={cancelEditingServiceDetails}
								>
									Cancel
								</Button>
								<Button type="submit" size="sm">
									Save
								</Button>
							</div>
						</form>
					{:else}
						<div class="space-y-3 text-sm">
							<!-- Service Name -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">Service Name</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span class="font-medium">{data.serviceItem.name}</span>
							</div>

							<!-- Service Category -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">Service Category</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span>
									{#if data.serviceItem.serviceCategoryId}
										{data.serviceCategories?.find(cat => cat.id === data.serviceItem.serviceCategoryId)?.displayName || 'Unknown'}
									{:else}
										Not categorized
									{/if}
								</span>
							</div>

							<!-- Service Label -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">Service Label</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span>
									{data.serviceItem.serviceLabel || 'No label set'}
								</span>
							</div>

							<!-- Partner -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">Partner</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span>
									{#if data.serviceItem.partnerName}
										<Button
											variant="link"
											class="h-auto p-0"
											href={`/team/partners/${data.serviceItem.partnerEntityId}`}
										>
											{data.serviceItem.partnerName}
										</Button>
									{:else}
										No Partner Assigned
									{/if}
								</span>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Pricing Information Card -->
			<Card>
				<CardHeader class="flex flex-row items-center justify-between pb-3">
					<CardTitle class="text-lg">Pricing Information</CardTitle>
					{#if data.canEdit}
						<Button
							variant="ghost"
							size="sm"
							class={['h-6 w-6 p-0', editPricingInfo && 'opacity-0!']}
							onclick={startEditingPricingInfo}
							disabled={editPricingInfo}
						>
							<Icons.Edit class="h-3 w-3" />
						</Button>
					{/if}
				</CardHeader>
				<CardContent>
					{#if editPricingInfo}
						<form
							method="POST"
							action="?/updatePricingInfo"
							use:pricingInfoEnhance={{
								onResult: ({ result }) => {
									if (result.type === 'success') {
										editPricingInfo = false;
									}
								}
							}}
							class="space-y-4"
						>
							<!-- Unit of Measure -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">Unit of Measure</label>
								<Select.Root type="single" bind:value={$pricingInfoFormData.uom}>
									<Select.Trigger class={$pricingInfoErrors.uom ? 'border-destructive' : ''}>
										{$pricingInfoFormData.uom ?
											uomOptions.find(opt => opt.value === $pricingInfoFormData.uom)?.label || $pricingInfoFormData.uom
											: 'Select unit of measure...'}
									</Select.Trigger>
									<Select.Content>
										{#each uomOptions as option}
											<Select.Item value={option.value}>{option.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" name="uom" value={$pricingInfoFormData.uom || ''} />
								{#if $pricingInfoErrors.uom}
									<p class="text-sm font-medium text-destructive">{$pricingInfoErrors.uom}</p>
								{/if}
							</div>

							<!-- Estimated Value -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">Estimated Value (USD)</label>
								<Input
									type="number"
									bind:value={$pricingInfoFormData.minPricingUsd}
									name="minPricingUsd"
									placeholder="0.00"
									step="0.01"
									min="0"
									class="w-full"
								/>
							</div>

							<!-- Estimated COGS -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">Estimated COGS (USD)</label>
								<Input
									type="number"
									bind:value={$pricingInfoFormData.estCogsUsd}
									name="estCogsUsd"
									placeholder="0.00"
									step="0.01"
									min="0"
									class="w-full"
								/>
							</div>

							<!-- Estimated Time -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">Estimated Time</label>
								<div class="flex gap-1 items-center">
									<Input
										type="number"
										bind:value={$pricingInfoFormData.estTimeHours}
										name="estTimeHours"
										min="0"
										max="999"
										placeholder="0"
										class="w-16 text-center"
									/>
									<span class="text-xs">h</span>
									<Input
										type="number"
										bind:value={$pricingInfoFormData.estTimeMinutes}
										name="estTimeMinutes"
										min="0"
										max="59"
										placeholder="0"
										class="w-16 text-center"
									/>
									<span class="text-xs">m</span>
								</div>
							</div>

							<div class="flex justify-end gap-2 pt-2 border-t">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={cancelEditingPricingInfo}
								>
									Cancel
								</Button>
								<Button type="submit" size="sm">
									Save
								</Button>
							</div>
						</form>
					{:else}
						<div class="space-y-3 text-sm">
							<!-- Unit of Measure -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">Unit of Measure</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span class="font-medium">
									{formatUom(data.serviceItem.uom)}
								</span>
							</div>

							<!-- Estimated Value -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">Estimated Value (USD)</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span>
									{#if data.serviceItem.minPricingUsdCents}
										{formatCurrency(data.serviceItem.minPricingUsdCents, 'USD')}
									{:else}
										Not set
									{/if}
								</span>
							</div>

							<!-- Estimated COGS -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">Estimated COGS (USD)</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span>
									{#if data.serviceItem.estCogsUsdCents}
										{formatCurrency(data.serviceItem.estCogsUsdCents, 'USD')}
									{:else}
										Not set
									{/if}
								</span>
							</div>

							<!-- Estimated Time -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">Estimated Time</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span class="font-medium">
									{formatTime(data.serviceItem.estTimeMinutes)}
								</span>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>
			<MinimalActivityLog activities={data.activities} title="Activity" />
		</div>

		<!-- Right Column (1/2 width) -->
		<div class="space-y-6">
			<!-- Delivery Process Details Card -->
			<Card>
				<CardHeader class="flex flex-row items-center justify-between pb-3">
					<CardTitle class="text-lg">Delivery Process Details</CardTitle>
					{#if data.canEdit}
						<Button
							variant="ghost"
							size="sm"
							class={['h-6 w-6 p-0', editDeliveryProcess && 'opacity-0!']}
							onclick={startEditingDeliveryProcess}
							disabled={editDeliveryProcess}
						>
							<Icons.Edit class="h-3 w-3" />
						</Button>
					{/if}
				</CardHeader>
				<CardContent>
					{#if editDeliveryProcess}
						<form
							method="POST"
							action="?/updateDeliveryProcess"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										editDeliveryProcess = false;
									}
									await update();
								};
							}}
							class="space-y-4"
						>
							<!-- Need To Show Our Work -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">Need To Show Our Work?</label>
								<label class="flex items-center gap-2">
									<input
										type="checkbox"
										name="showWork"
										bind:checked={$deliveryProcessFormData.showWork}
										class="rounded border-gray-300"
									/>
									<span class="text-sm">Client should see the work performed</span>
								</label>
							</div>

							<!-- Work Display Format -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">Work Display Format</label>
								<Select.Root type="single" bind:value={$deliveryProcessFormData.workProofType}>
									<Select.Trigger>
										{$deliveryProcessFormData.workProofType ?
											workProofTypeOptions.find(opt => opt.value === $deliveryProcessFormData.workProofType)?.label || $deliveryProcessFormData.workProofType
											: 'Select work display format...'}
									</Select.Trigger>
									<Select.Content>
										{#each workProofTypeOptions as option}
											<Select.Item value={option.value}>{option.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" name="workProofType" bind:value={$deliveryProcessFormData.workProofType} />
							</div>

							<!-- Example Work -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">Example Work</label>
								<Input
									bind:value={$deliveryProcessFormData.workProofExample}
									name="workProofExample"
									placeholder="https://example.com/work-sample"
									type="url"
									class="w-full"
								/>
							</div>

							<!-- SOP Document URL -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">SOP Document URL</label>
								<FormField name="sopUrl" form={deliveryProcessForm}>
									<Input
										bind:value={$deliveryProcessFormData.sopUrl}
										name="sopUrl"
										placeholder="https://..."
										class="w-full"
									/>
								</FormField>
							</div>

							<!-- In Stream -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-gray-700">In Stream</label>
								<label class="flex items-center gap-2">
									<input
										type="checkbox"
										name="inStream"
										bind:checked={$deliveryProcessFormData.inStream}
										class="rounded border-gray-300"
									/>
									<span class="text-sm">Task appears in stream</span>
								</label>
							</div>

							<div class="flex gap-2">
								<Button size="sm" type="submit">Save Changes</Button>
								<Button
									size="sm"
									variant="outline"
									type="button"
									onclick={cancelEditingDeliveryProcess}
								>
									Cancel
								</Button>
							</div>
						</form>
					{:else}
						<div class="space-y-3 text-sm">
							<!-- Need To Show Our Work -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">Need To Show Our Work?</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span class="font-medium">
									{data.serviceItem.showWork ? 'Yes' : 'No'}
								</span>
							</div>

							<!-- Work Display Format -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">Work Display Format</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span>
									{data.serviceItem.workProofType ?
										workProofTypeOptions.find(opt => opt.value === data.serviceItem.workProofType)?.label || data.serviceItem.workProofType
										: 'Not specified'}
								</span>
							</div>

							<!-- Example Work -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">Example Work</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span>
									{#if data.serviceItem.workProofExample}
										<a
											href={data.serviceItem.workProofExample}
											target="_blank"
											rel="noopener noreferrer"
											class="text-primary hover:text-primary/80 hover:underline font-medium"
										>
											View Example
										</a>
									{:else}
										Not provided
									{/if}
								</span>
							</div>

							<!-- SOP Document -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">SOP Document</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span>
									{#if data.serviceItem.sopUrl}
										<a
											href={data.serviceItem.sopUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="text-primary hover:text-primary/80 hover:underline font-medium"
										>
											View SOP
										</a>
									{:else}
										No SOP linked
									{/if}
								</span>
							</div>

							<!-- In Stream -->
							<div class="flex items-center">
								<span class="text-muted-foreground font-medium">In Stream</span>
								<div class="border-muted-foreground/50 mx-2 h-3 flex-1 overflow-hidden border-b border-dotted"></div>
								<span class="font-medium">
									{data.serviceItem.inStream ? 'Yes' : 'No'}
								</span>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Notes Stream -->
			<NotesStream 
				notes={data.notes || []}
				canEdit={data.canEdit}
				title="Scope Item Notes"
				description="These are notes about this scope item."
				placeholder="Add notes about this scope item..."
				emptyStateTitle="No scope item notes yet"
				emptyStateDescription="Add the first note about this scope item to get started"
			/>
		</div>
	</div>
</div>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Deactivate Service Item</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to deactivate "{data.serviceItem.name}"? This will hide it from the active service catalog list.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex justify-end gap-3">
			<Button variant="outline" onclick={() => deleteDialogOpen = false}>Cancel</Button>
			<Button
				variant="destructive"
				onclick={() => {
					const form = document.createElement('form');
					form.method = 'POST';
					form.action = '?/deleteItem';
					document.body.appendChild(form);
					form.submit();
				}}
			>
				Deactivate
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>