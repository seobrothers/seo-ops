import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table';
import LinkCell from '$lib/components/ui/cell/link-cell.svelte';
import LastUpdatedDisplayCell from '$lib/components/ui/cell/last-updated-display-cell.svelte';

// Helper function to format time estimate
function formatTimeEstimate(minutes: number | null): string {
	if (!minutes || minutes === 0) return '-';
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export type PartnerOnboardingTemplate = {
	id: number;
	title: string | null;
	description: string | null;
	primaryParticipant: string | null;
	grouping: string | null;
	estTimeMinutes: number | null;
	sopUrl: string | null;
	sopId: number | null;
	sopTitle: string | null;
	mandatory: boolean;
	decisionPoint: boolean;
	active: boolean;
	updatedByName: string | null;
	createdAt: string;
	updatedAt: string;
};

export const createColumns = (onEdit: (id: number) => void): ColumnDef<PartnerOnboardingTemplate>[] => [
	{
		accessorKey: 'title',
		header: 'Task Title',
		meta: {
			headerClass: 'w-64'
		},
		cell: ({ row }) => {
			const title = row.getValue('title') as string;
			const description = row.original.description;
			return renderComponent(LinkCell, {
				label: title || 'Untitled Action',
				subtext: description,
				onclick: () => onEdit(row.original.id)
			});
		}
	},
	{
		accessorKey: 'estTimeMinutes',
		header: 'Est. Time',
		meta: {
			headerClass: 'w-24'
		},
		cell: ({ row }) => {
			const minutes = row.getValue('estTimeMinutes') as number | null;
			return formatTimeEstimate(minutes);
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
