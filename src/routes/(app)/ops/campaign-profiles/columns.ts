import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent, renderSortableHeader } from '$lib/components/ui/data-table';
import LinkCell from '$lib/components/ui/cell/link-cell.svelte';

export type CampaignProfile = {
	id: number;
	name: string;
	short_description: string | null;
	activeCampaignCount: number;
	updatedAt: string;
	updatedByName: string | null;
};

export const createColumns = (): ColumnDef<CampaignProfile>[] => [
	{
		accessorKey: 'name',
		header: 'Name',
		meta: {
			headerClass: 'w-64'
		},
		cell: ({ row }) => {
			const name = row.getValue('name') as string;
			const profileId = row.original.id;
			return renderComponent(LinkCell, {
				label: name,
				href: `/team/ops/campaign-profiles/${profileId}`
			});
		}
	},
	{
		accessorKey: 'activeCampaignCount',
		header: renderSortableHeader('Active Campaigns'),
		enableSorting: true,
		meta: {
			headerClass: 'p-0 w-32'
		},
		cell: ({ row }) => {
			const count = row.getValue('activeCampaignCount') as number;
			return count.toString();
		}
	},
	{
		accessorKey: 'updatedAt',
		header: renderSortableHeader('Last Updated'),
		enableSorting: true,
		meta: {
			headerClass: 'p-0 w-48'
		},
		cell: ({ row }) => {
			const updatedAt = row.getValue('updatedAt') as string;
			const date = new Date(updatedAt);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		}
	}
];