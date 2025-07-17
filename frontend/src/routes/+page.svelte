<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';

    // This onMount call is at the top-level of the script, which is correct.
	onMount(() => {
		console.log('UI Foundation is ready!');
	});
</script>

<div class="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background p-4">
	<h1 class="text-2xl font-bold">AI App Builder</h1>
	<p class="text-muted-foreground">UI Foundation successfully configured with shadcn-svelte.</p>
	<div class="flex gap-2">
		<Button>Primary Button</Button>
		<Button variant="secondary">Secondary</Button>
		<Button variant="destructive">Destructive</Button>
	</div>
</div>