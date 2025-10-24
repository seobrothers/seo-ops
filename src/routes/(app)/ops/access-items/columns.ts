import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table';
import LinkCell from '$lib/components/ui/cell/link-cell.svelte';
import UsernameEmailCell from '$lib/components/ui/cell/username-email-cell.svelte';

export type AccessItem = {
	id: number;
	username: string;
	email: string | null;
	accessItemOwner: 'partner' | 'internal';
	inLastpass: boolean;
	tfaType: string | null;
	tfaTypeValue: string | null;
	tfaContactId: number | null;
	tfaContactName: string | null;
	tfaSource: string | null;
	partnerEntityId: number | null;
	partnerEntityName: string | null;
	updatedAt: string;
};

export const createColumns = (onView: (id: number) => void): ColumnDef<AccessItem>[] => [
	{
		accessorKey: 'username',
		header: 'Username / Email',
		meta: {
			headerClass: 'w-64'
		},
		cell: ({ row }) => {
			return renderComponent(UsernameEmailCell, {
				username: row.original.username,
				email: row.original.email,
				id: row.original.id,
				onclick: () => onView(row.original.id)
			});
		}
	},
	{
		accessorKey: 'inLastpass',
		header: 'LastPass',
		meta: {
			headerClass: 'w-24'
		},
		cell: ({ row }) => {
			const inLastpass = row.getValue('inLastpass') as boolean;
			return inLastpass ? 'Yes' : 'No';
		}
	},
	{
		accessorKey: 'partnerEntityName',
		header: 'Partner',
		meta: {
			headerClass: 'w-48'
		},
		cell: ({ row }) => {
			return renderComponent(LinkCell, {
				label: row.original.partnerEntityName,
				href: row.original.partnerEntityId ? `/team/partners/${row.original.partnerEntityId}` : undefined,
				fallback: '-'
			});
		}
	},
	{
		accessorKey: 'tfaType',
		header: '2FA Type',
		meta: {
			headerClass: 'w-32'
		},
		cell: ({ row }) => {
			const tfaType = row.getValue('tfaType') as string | null;
			return tfaType ? tfaType.charAt(0).toUpperCase() + tfaType.slice(1) : '-';
		}
	},
	{
		accessorKey: 'tfaContactName',
		header: '2FA Contact',
		meta: {
			headerClass: 'w-48'
		},
		cell: ({ row }) => {
			return renderComponent(LinkCell, {
				label: row.original.tfaContactName,
				href: row.original.tfaContactId ? `/team/partners/${row.original.tfaContactId}` : undefined,
				fallback: '-'
			});
		}
	}
];