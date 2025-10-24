<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Icons } from '$lib/icons';
	import type { Package } from './columns.ts';
	import { preloadData, pushState } from '$app/navigation';

	let { package: pkg }: { package: Package } = $props();

	async function duplicatePackage(event: Event) {
		event.preventDefault();
		event.stopPropagation();
		
		// Preload the new page data with duplicate parameter
		const result = await preloadData(`/team/ops/packages/new?duplicate=${pkg.id}`);
		if (result.type === 'loaded' && result.data) {
			pushState(`/team/ops/packages/new?duplicate=${pkg.id}`, { 
				duplicateData: result.data 
			});
		}
	}

	function formatCurrency(cents: number | null, currency: string | null): string {
		if (!cents) return '';
		const amount = Math.round(cents / 100);
		const currencySymbol = currency === 'USD' ? '$' : currency || '$';
		return ` - ${currencySymbol}${amount}`;
	}
</script>

<Card.Root class="h-full">
	<Card.Header class="pb-3 pt-4">
		<div class="flex items-start justify-between">
			<Card.Title class="text-lg font-semibold flex-1">
				<a href="/team/ops/packages/{pkg.id}" class="text-primary hover:underline {pkg.isActive ? '' : 'line-through'}">
					{pkg.name}{formatCurrency(pkg.monthlyPriceCents, pkg.currency)}
				</a>
			</Card.Title>
			<Button 
				variant="ghost" 
				size="sm" 
				onclick={duplicatePackage}
				class="h-6 w-6 p-0 shrink-0"
				title="Duplicate package"
			>
				<Icons.Copy class="h-3 w-3" />
			</Button>
		</div>
		<Card.Description class="text-sm text-muted-foreground -mt-1">
			{#if pkg.campaignProfileName && pkg.partnerName}
				{pkg.type === 'ongoing' ? 'Ongoing' : pkg.type === 'one_time' ? 'One Time' : ''}
				<a href="/team/ops/campaign-profiles/{pkg.relatedCampaignProfileId}" class="hover:underline">
					{pkg.campaignProfileName}
				</a>
				package for
				<a href="/team/partners/{pkg.partnerEntityId}" class="hover:underline">
					{pkg.partnerName}
				</a>
			{:else if pkg.campaignProfileName}
				{pkg.type === 'ongoing' ? 'Ongoing' : pkg.type === 'one_time' ? 'One Time' : ''}
				<a href="/team/ops/campaign-profiles/{pkg.relatedCampaignProfileId}" class="hover:underline">
					{pkg.campaignProfileName}
				</a>
				package
			{:else if pkg.partnerName}
				{pkg.type === 'ongoing' ? 'Ongoing' : pkg.type === 'one_time' ? 'One Time' : ''} Package for
				<a href="/team/partners/{pkg.partnerEntityId}" class="hover:underline">
					{pkg.partnerName}
				</a>
			{:else}
				{pkg.type === 'ongoing' ? 'Ongoing' : pkg.type === 'one_time' ? 'One Time' : ''} Package
			{/if}
		</Card.Description>
	</Card.Header>
	{#if pkg.packageServiceItems && pkg.packageServiceItems.length > 0}
		<hr class="border-border mx-6 mt-2 mb-4" />
		<Card.Content class="pt-0">
			<div class="mb-3 text-base font-bold text-primary">Package Includes:</div>
			<div class="space-y-1 text-sm">
				{#each pkg.packageServiceItems as item}
					<div class="flex items-center">
						<span class="text-foreground font-medium">{item.serviceItemName}{#if item.isPartnerSpecific}*{/if}</span>
						<div class="border-muted-foreground/50 mx-2 h-2 flex-1 overflow-hidden border-b border-dotted"></div>
						<span class="text-foreground">{item.quantity || 1} / {item.frequency || 'monthly'}</span>
					</div>
				{/each}
			</div>
		</Card.Content>
	{/if}
</Card.Root>