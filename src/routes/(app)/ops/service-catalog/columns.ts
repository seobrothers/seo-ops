import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent, renderSortableHeader } from '$lib/components/ui/data-table';
import LinkCell from '$lib/components/ui/cell/link-cell.svelte';
import LastUpdatedDisplayCell from '$lib/components/ui/cell/last-updated-display-cell.svelte';

// Helper function to format enum values for display
function formatEnumValue(value: string | null): string {
	if (!value) return '-';
	return value
		.split('_')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

// Helper function to format price from cents to dollars with currency
function formatPrice(cents: number | null, currency: string | null): string {
	if (!cents || cents === 0) return '-';
	const dollars = cents / 100;
	const currencyCode = currency || 'USD';
	return `$${dollars.toFixed(2)} ${currencyCode}`;
}

// Helper function to format date
function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

export type ServiceItem = {
	id: number;
	name: string;
	serviceCategory: string | null;
	serviceCategoryDisplayName: string | null;
	serviceLabel: string | null;
	description: string | null;
	sopId: number | null;
	sopTitle: string | null;
	sopUrl: string | null;
	partnerEntityId: number | null;
	partnerName: string | null;
	recommendedPriceCents: number | null;
	recommendedPriceCurrency: string | null;
	proposalMode: 'recurring' | 'one_time' | 'both' | 'neither';
	updatedByName: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

export const createColumns = (): ColumnDef<ServiceItem>[] => [
	{
		accessorKey: 'name',
		header: renderSortableHeader('Name'),
		meta: {
			headerClass: 'p-0 w-64'
		},
		cell: ({ row }) => {
			const name = row.getValue('name') as string;
			const id = row.original.id;
			return renderComponent(LinkCell, {
				label: name,
				href: `/team/ops/service-catalog/${id}`
			});
		},
		enableSorting: true,
	},
	{
		accessorKey: 'serviceCategoryDisplayName',
		header: renderSortableHeader('Category'),
		meta: {
			headerClass: 'p-0 w-32'
		},
		cell: ({ row }) => {
			const categoryDisplayName = row.original.serviceCategoryDisplayName;
			return categoryDisplayName || '-';
		},
		enableSorting: true,
	},
	{
		accessorKey: 'sopUrl',
		header: 'SOP',
		meta: {
			headerClass: 'p-0 w-24'
		},
		cell: ({ row }) => {
			const sopUrl = row.original.sopUrl;
			if (!sopUrl) {
				return '-';
			}
			return renderComponent(LinkCell, {
				label: 'View',
				href: sopUrl,
				external: true
			});
		},
		enableSorting: false,
	},
	{
		accessorKey: 'partnerName',
		header: renderSortableHeader('Partner'),
		meta: {
			headerClass: 'p-0 w-40'
		},
		cell: ({ row }) => {
			const partnerName = row.original.partnerName;
			const partnerEntityId = row.original.partnerEntityId;
			return renderComponent(LinkCell, {
				label: partnerName,
				href: partnerEntityId ? `/team/partners/${partnerEntityId}` : undefined,
				fallback: '-'
			});
		},
		enableSorting: true,
	},
	{
		accessorKey: 'updatedAt',
		header: 'Last Updated',
		meta: {
			headerClass: 'w-32'
		},
		cell: ({ row }) => {
			const updatedAt = row.getValue('updatedAt') as string;
			const updatedByName = row.original.updatedByName;
			return renderComponent(LastUpdatedDisplayCell, {
				updatedAt,
				updatedByName
			});
		}
	}
];