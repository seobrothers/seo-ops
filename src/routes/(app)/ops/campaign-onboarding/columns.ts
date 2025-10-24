import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table';
import LinkCell from '$lib/components/ui/cell/link-cell.svelte';
import { campaignOnboardingGroupingOptions, primaryParticipantOptions } from '$lib/options';

// Helper function to format time estimate
function formatTimeEstimate(minutes: number | null): string {
	if (!minutes || minutes === 0) return '-';
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

// Helper function to get grouping label
function getGroupingLabel(grouping: string | null): string {
	if (!grouping) return '-';
	return campaignOnboardingGroupingOptions.get(grouping) || grouping;
}

// Helper function to get primary participant label
function getPrimaryParticipantLabel(participant: string | null): string {
	if (!participant) return '-';
	return primaryParticipantOptions.get(participant) || participant;
}

export type CampaignOnboardingTemplate = {
	id: number;
	title: string | null;
	description: string | null;
	primaryParticipant: string | null;
	grouping: string | null;
	estTimeMinutes: number | null;
	sopUrl: string | null;
	sopId: number | null;
	sopTitle: string | null;
	templateCategory: string | null;
	partnerEntityId: number | null;
	partnerName: string | null;
	campaignProfileId: number | null;
	campaignProfileName: string | null;
	serviceCategoryId: number | null;
	serviceCategoryName: string | null;
	mandatory: boolean;
	decisionPoint: boolean;
	active: boolean;
	updatedByName: string | null;
	createdAt: string;
	updatedAt: string;
};

export const createColumns = (onEdit: (id: number) => void): ColumnDef<CampaignOnboardingTemplate>[] => [
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
		accessorKey: 'grouping',
		header: 'Group',
		meta: {
			headerClass: 'w-32'
		},
		cell: ({ row }) => {
			const grouping = row.getValue('grouping') as string | null;
			return getGroupingLabel(grouping);
		}
	},
	{
		accessorKey: 'primaryParticipant',
		header: 'Role',
		meta: {
			headerClass: 'w-40'
		},
		cell: ({ row }) => {
			const participant = row.getValue('primaryParticipant') as string | null;
			return getPrimaryParticipantLabel(participant);
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
		accessorKey: 'campaignProfileName',
		header: 'Profile',
		meta: {
			headerClass: 'w-32'
		},
		cell: ({ row }) => {
			const profileName = row.getValue('campaignProfileName') as string | null;
			return profileName || '-';
		}
	},
	{
		accessorKey: 'serviceCategoryName',
		header: 'Category',
		meta: {
			headerClass: 'w-32'
		},
		cell: ({ row }) => {
			const categoryName = row.getValue('serviceCategoryName') as string | null;
			return categoryName || '-';
		}
	},
	{
		accessorKey: 'partner',
		header: 'Partner',
		meta: {
			headerClass: 'w-40'
		},
		cell: ({ row }) => {
			const partnerName = row.original.partnerName;
			const partnerEntityId = row.original.partnerEntityId;
			return renderComponent(LinkCell, {
				label: partnerName,
				href: partnerEntityId ? `/team/partners/${partnerEntityId}` : undefined,
				fallback: '-'
			});
		}
	}
];
