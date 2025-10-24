<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { children } = $props();

	const currentPath = $derived(page.url.pathname);

	function isActiveRoute(itemHref: string): boolean {
		return currentPath === itemHref || currentPath.startsWith(itemHref + '/');
	}
</script>

<div class="flex flex-col min-h-screen">
	<!-- Page Content -->
	<div class="flex-1">
		{@render children()}
	</div>
</div>