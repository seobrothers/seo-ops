<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';

	let { data } = $props();
</script>

<div class="flex w-full flex-col items-center justify-center gap-8 py-8 lg:min-h-[600px]">
	<h1 class="max-w-80 scroll-m-20 font-serif text-4xl font-bold tracking-tight lg:text-5xl">
		<img src="/favicon.svg" alt="Four Sons Logo" /> Four Sons
	</h1>
	<p class="max-w-96 text-center text-2xl">Welcome to the Stack.</p>
	{#if data.user}
		<h2 class="text-2xl font-bold">
			Hello {data.user.given_name}
			{data.user.family_name}
		</h2>
		<Button href="/dashboard" class="w-48">Visit Your Dashboard</Button>
		<Button href="/api/auth/logout" class="w-48">Sign Out</Button>
	{:else}
		<Button href="/api/auth/login" class="w-48">Sign In</Button>
	{/if}
</div>
