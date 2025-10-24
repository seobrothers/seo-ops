import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table';
import LinkCell from '$lib/components/ui/cell/link-cell.svelte';
import LastUpdatedDisplayCell from '$lib/components/ui/cell/last-updated-display-cell.svelte';

export type ServiceCategory = {
	id: number;
	key: string;
	displayName: string;
	description: string | null;
	isActive: boolean;
	updatedAt: string;
	updatedByName: string | null;
};

export const createColumns = (onEdit: (id: number) => void): ColumnDef<ServiceCategory>[] => [
	{
		accessorKey: 'displayName',
		header: 'Category',
		meta: {
			headerClass: 'w-64'
		},
		cell: ({ row }) => {
			const displayName = row.getValue('displayName') as string;
			return renderComponent(LinkCell, {
				label: displayName,
				onclick: () => onEdit(row.original.id)
			});
		}
	},
	{
		accessorKey: 'key',
		header: 'Key',
		meta: {
			headerClass: 'w-48'
		},
		cell: ({ row }) => {
			const key = row.getValue('key') as string;
			return key;
		}
	},
	{
		accessorKey: 'description',
		header: 'Description',
		meta: {
			headerClass: 'w-96'
		},
		cell: ({ row }) => {
			const description = row.getValue('description') as string | null;
			return description || '-';
		}
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
