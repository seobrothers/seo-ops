<script lang="ts" module>
	import type { Identifiable } from '$lib/types';
	type TData = unknown;
	type TValue = unknown;
</script>

<script lang="ts" generics="TData extends Identifiable, TValue">
	import {
		type ColumnDef,
		getCoreRowModel,
		getPaginationRowModel,
		getSortedRowModel,
		type PaginationState,
		type SortingState,
	} from '@tanstack/table-core';
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { setContext } from 'svelte';
	import type { ClassValue } from 'clsx';
	import { cn } from '$lib/utils';
	import { Button } from '../button';

	type DateTableProps<TData, TValue> = {
		columns: ColumnDef<TData, TValue>[];
		data: TData[];
		class?: ClassValue;
		pageSize?: number;
		cellPadding?: string;
		headerPadding?: string;
		noPagination?: boolean;
		headerClass?: string;
		headerFontSize?: string;
		headerFontWeight?: string;
		headerTextColor?: string;
	};

	let { data, columns, class: klass, pageSize = 10, cellPadding = 'p-4', headerPadding = 'px-4', noPagination = false, headerClass, headerFontSize = 'text-xs', headerFontWeight = 'font-medium', headerTextColor }: DateTableProps<TData, TValue> = $props();
	let sorting = $state<SortingState>([]);
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: noPagination ? data.length : pageSize });
	setContext('tableCtx', {
		get sorting() {
			return sorting;
		},
		headerFontSize,
		headerFontWeight,
		headerTextColor
	});

	const table = createSvelteTable({
		get data() {
			return data;
		},
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
		},
		getRowId(r, index) {
			return r.id ? r.id.toString() : index.toString();
		},
		state: {
			get sorting() {
				return sorting;
			},
			get pagination() {
				return pagination;
			},
		},
	});
</script>

<div>
	<div class={cn('rounded-md border', klass)}>
		<Table.Root>
			<Table.Header class={cn("bg-gray-50", headerClass)}>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row>
						{#each headerGroup.headers as header (header.id)}
							<Table.Head
								class={cn(headerFontSize, headerFontWeight, headerTextColor, 'uppercase', headerPadding, header.column.columnDef.meta?.headerClass)}
							>
								{#if !header.isPlaceholder}
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#each table.getRowModel().rows as row (row.id)}
					<Table.Row data-state={row.getIsSelected() && 'selected'}>
						{#each row.getVisibleCells() as cell (cell.id)}
							<Table.Cell class={cn(cellPadding, cell.column.columnDef.meta?.class)}>
								<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
							</Table.Cell>
						{/each}
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={columns.length} class={cn('h-24 text-center', cellPadding)}>No results.</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
	{#if !noPagination}
		<div class="flex items-center justify-end space-x-2 py-4">
			<Button
				variant="outline"
				size="sm"
				onclick={() => table.previousPage()}
				disabled={!table.getCanPreviousPage()}
			>
				Previous
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={() => table.nextPage()}
				disabled={!table.getCanNextPage()}
			>
				Next
			</Button>
		</div>
	{/if}
</div>
