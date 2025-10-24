import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table';
import TextCell from '$lib/components/ui/cell/text-cell.svelte';
import LinkCell from '$lib/components/ui/cell/link-cell.svelte';

// Helper function to format currency
function formatCurrency(cents: number | null, currency: string | null): string {
	if (!cents) return '-';
	const amount = cents / 100;
	const currencySymbol = currency === 'USD' ? '$' : currency || '$';
	return `${currencySymbol}${amount.toFixed(2)}`;
}

// Helper function to format date with user name
function formatUpdateInfo(date: string, userName: string | null): string {
	const dateObj = new Date(date);
	const formattedDate = dateObj.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
	const formattedTime = dateObj.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit'
	});
	return userName ? `${formattedDate} at ${formattedTime}\nby ${userName}` : `${formattedDate} at ${formattedTime}`;
}

export type Package = {
	id: number;
	name: string;
	monthlyPriceCents: number | null;
	currency: string | null;
	partnerEntityId: number | null;
	partnerName: string | null;
	relatedCampaignProfileId: number | null;
	campaignProfileName: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	updatedByName: string | null;
	type: 'ongoing' | 'one_time' | null;
	outcome: string | null;
	packageServiceItems?: Array<{
		id: number;
		serviceItemId: number;
		serviceItemName: string;
		serviceLabel: string | null;
		quantity: number | null;
		frequency: string | null;
		monthlyValueCents: number | null;
		isPartnerSpecific: boolean;
		createdAt: string;
	}>;
};

export const createColumns = (): ColumnDef<Package>[] => [
	{
		accessorKey: 'partnerName',
		header: 'Partner',
		meta: {
			headerClass: 'w-48'
		},
		cell: ({ row }) => {
			const partnerName = row.getValue('partnerName') as string | null;
			const partnerEntityId = row.original.partnerEntityId;
			
			if (!partnerName || !partnerEntityId) {
				return renderComponent(TextCell, { value: '-' });
			}
			
			return renderComponent(LinkCell, {
				href: `/team/partners/${partnerEntityId}`,
				label: partnerName
			});
		}
	},
	{
		accessorKey: 'name',
		header: 'Package Name',
		meta: {
			headerClass: 'w-64'
		},
		cell: ({ row }) => {
			const name = row.getValue('name') as string;
			const packageId = row.original.id;

			return renderComponent(LinkCell, {
				label: name,
				href: `/team/ops/packages/${packageId}`
			});
		}
	},
	{
		accessorKey: 'monthlyPriceCents',
		header: 'Monthly Price',
		meta: {
			headerClass: 'w-32'
		},
		cell: ({ row }) => {
			const priceCents = row.getValue('monthlyPriceCents') as number | null;
			const currency = row.original.currency;
			return renderComponent(TextCell, { value: formatCurrency(priceCents, currency) });
		}
	},
	{
		accessorKey: 'campaignProfileName',
		header: 'For Campaign Profile',
		meta: {
			headerClass: 'w-48'
		},
		cell: ({ row }) => {
			const profileName = row.getValue('campaignProfileName') as string | null;
			const profileId = row.original.relatedCampaignProfileId;
			
			if (!profileName || !profileId) {
				return renderComponent(TextCell, { value: '-' });
			}
			
			return renderComponent(LinkCell, {
				href: `/team/ops/campaign-profiles/${profileId}`,
				label: profileName
			});
		}
	},
	{
		accessorKey: 'updatedAt',
		header: 'Last Updated',
		meta: {
			headerClass: 'w-48'
		},
		cell: ({ row }) => {
			const updatedAt = row.getValue('updatedAt') as string;
			const updatedByName = row.original.updatedByName;
			
			return renderComponent(TextCell, { 
				value: formatUpdateInfo(updatedAt, updatedByName),
				class: 'whitespace-pre-line text-sm'
			});
		}
	}
];