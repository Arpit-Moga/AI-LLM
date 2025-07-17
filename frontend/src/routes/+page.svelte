<script lang="ts">
	import { onMount } from 'svelte';

	// The URL of the backend. For local dev, this is the address of our FastAPI server.
	const BACKEND_URL = 'http://127.0.0.1:8000';

	let backendMessage: string = 'Connecting to backend...';
	let errorMessage: string | null = null;

	// onMount ensures this code only runs on the client-side (in the browser)
	// after the component has been rendered to the DOM.
	onMount(async () => {
		try {
			const response = await fetch(`${BACKEND_URL}/api/hello`);

			if (!response.ok) {
				// Handle HTTP errors like 404 or 500
				throw new Error(`Network response was not ok: ${response.statusText}`);
			}

			const data = await response.json();
			backendMessage = data.message;
		} catch (error: any) {
			console.error('Failed to fetch from backend:', error);
			errorMessage = `Failed to connect to backend. Is it running? Details: ${error.message}`;
			backendMessage = 'Connection failed.';
		}
	});
</script>

<main style="font-family: sans-serif; padding: 2rem;">
	<h1 style="color: #333;">AI App Builder Frontend</h1>
	<p>This is the SvelteKit Control Plane.</p>

	<div
		style="margin-top: 2rem; padding: 1rem; border: 1px solid #ccc; border-radius: 8px; background-color: #f9f9f9;"
	>
		<h2 style="margin-top: 0;">Backend Connection Test</h2>
		<p>
			<strong>Status:</strong>
			<span style={errorMessage ? 'color: red;' : 'color: green;'}>
				{backendMessage}
			</span>
		</p>
		{#if errorMessage}
			<p
				style="color: red; font-family: monospace; background-color: #fdd; padding: 0.5rem; border-radius: 4px;"
			>
				{errorMessage}
			</p>
		{/if}
	</div>
</main>