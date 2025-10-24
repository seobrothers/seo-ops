import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent, renderSortableHeader } from '$lib/components/ui/data-table';
import LinkCell from '$lib/components/ui/cell/link-cell.svelte';
import { preloadData, pushState, goto } from '$app/navigation';

export type Permission = {
	id: number;
	name: string | null;
	permissionKey: string;
	permissionState: string;
	serviceItemId: number | null;
	serviceItemName: string | null;
	serviceCategoryId: number | null;
	serviceCategoryDisplayName: string | null;
	campaignProfileId: number | null;
	campaignProfileName: string | null;
	partnerEntityId: number | null;
	partnerName: string | null;
	updatedByName: string | null;
	createdAt: string;
	updatedAt: string;
};

// Helper function to format permission state
const formatPermissionState = (state: string): string => {
	const stateMap: Record<string, string> = {
		'allowed': 'Allowed',
		'allowed_with_approval': 'Allowed With Approval',
		'not_allowed': 'Not Allowed'
	};
	return stateMap[state] || state;
};

export const createColumns = (): ColumnDef<Permission>[] => [
	{
		accessorKey: 'name',
		header: renderSortableHeader('Name'),
		meta: {
			headerClass: 'p-0 w-48'
		},
		cell: ({ row }) => {
			const name = row.getValue('name') as string | null;
			const id = row.original.id;
			return renderComponent(LinkCell, {
				label: name,
				onclick: async () => {
					const href = `/team/ops/permissions/${id}/edit`;
					const result = await preloadData(href);
					if (result.type === 'loaded' && result.status === 200) {
						pushState(href, { editData: result.data });
					} else {
						goto(href);
					}
				}
			});
		},
		enableSorting: true,
	},
	{
		accessorKey: 'serviceCategoryDisplayName',
		header: renderSortableHeader('Scope Category'),
		meta: {
			headerClass: 'p-0 w-48'
		},
		cell: ({ row }) => {
			const categoryName = row.getValue('serviceCategoryDisplayName') as string | null;
			return categoryName || '—';
		},
		enableSorting: true,
	},
	{
		accessorKey: 'campaignProfileName',
		header: renderSortableHeader('Campaign Profile'),
		meta: {
			headerClass: 'p-0 w-48'
		},
		cell: ({ row }) => {
			const profileName = row.getValue('campaignProfileName') as string | null;
			return profileName || '—';
		},
		enableSorting: true,
	},
	{
		accessorKey: 'permissionState',
		header: renderSortableHeader('State'),
		meta: {
			headerClass: 'p-0 w-40'
		},
		cell: ({ row }) => {
			const state = row.getValue('permissionState') as string;
			return formatPermissionState(state);
		},
		enableSorting: true,
	},
	{
		accessorKey: 'partnerName',
		header: renderSortableHeader('Partner'),
		meta: {
			headerClass: 'p-0 w-48'
		},
		cell: ({ row }) => {
			const partnerName = row.getValue('partnerName') as string | null;
			return partnerName || '—';
		},
		enableSorting: true,
	}
];