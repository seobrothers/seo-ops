<script lang="ts">
	let { data } = $props();
</script>

<main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
	<h1 class="font-serif text-2xl font-bold">User Dashboard</h1>

	<div class="rounded-lg border p-4">
		<h2 class="text-lg font-semibold mb-4">Database Connection Test</h2>

		{#if data.error}
			<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
				Error: {data.error}
			</div>
		{:else if data.users?.length > 0}
			<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
				✅ Successfully connected to Supabase!
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each data.users as user}
							<tr>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.age || 'N/A'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
				No users found in the database.
			</div>
		{/if}
	</div>
</main>
