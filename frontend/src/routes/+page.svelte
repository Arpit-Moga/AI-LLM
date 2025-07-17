<script lang="ts">
	import { onMount } from 'svelte';
	import { bootWebContainer, statusStore } from '$lib/webcontainer';
	import type { WebContainer } from '@webcontainer/api';
	import type { Terminal } from 'xterm';
	import type { FitAddon } from 'xterm-addon-fit';
	import 'xterm/css/xterm.css';

	let webContainerInstance: WebContainer | null = null;
	let terminalEl: HTMLElement;
	let terminal: Terminal;
	let fitAddon: FitAddon;

	let commandToRun = 'npm create vite@latest my-vite-app -- --template react';

	statusStore.subscribe((status) => {
		if (terminal) {
			terminal.writeln(`\r\n\n[System] WebContainer status: ${status.toUpperCase()}`);
		}
	});
	const wcStore = import('$lib/webcontainer').then((m) => m.webContainerStore);
	wcStore.then((store) =>
		store.subscribe((instance) => {
			webContainerInstance = instance;
		})
	);

	onMount(async () => {
		const { Terminal } = await import('xterm');
		const { FitAddon } = await import('xterm-addon-fit');

		terminal = new Terminal({
			convertEol: true,
			cursorBlink: true
		});
		fitAddon = new FitAddon();
		terminal.loadAddon(fitAddon);
		terminal.open(terminalEl);
		fitAddon.fit();

		terminal.writeln('Welcome to the AI App Builder Terminal!');
		terminal.writeln('Click "Boot WebContainer" to start the sandboxed environment.');
	});

	async function handleBootClick() {
		await bootWebContainer();
	}

	async function handleRunCommand() {
		if (!webContainerInstance) {
			terminal.writeln('\r\n[System] Please boot the WebContainer first.');
			return;
		}

		terminal.writeln(`\r\n\n[System] Running command: ${commandToRun}`);

		const [cmd, ...args] = commandToRun.split(' ');
		const process = await webContainerInstance.spawn(cmd, args);

		// --- NEW: Get a writer for the process's stdin ---
		const writer = process.input.getWriter();

		// --- NEW: Pipe terminal input to the process stdin ---
		// The `onData` event fires whenever the user types in the terminal.
		const onDataDisposable = terminal.onData((data) => {
			writer.write(data);
		});

		// Pipe process output to the terminal (this is the same as before)
		process.output.pipeTo(
			new WritableStream({
				write(data) {
					terminal.write(data);
				}
			})
		);

		const exitCode = await process.exit;

		// --- NEW: Clean up the onData listener ---
		// It's good practice to dispose of the listener when the process exits
		// to prevent memory leaks.
		onDataDisposable.dispose();

		terminal.writeln(`\r\n[System] Process exited with code: ${exitCode}`);

		if (exitCode === 0) {
			await listFiles(webContainerInstance, '/');
		}
	}

	async function listFiles(instance: WebContainer, path: string) {
		terminal.writeln(`\r\n\n[System] Listing files in ${path}...`);
		const files = await instance.fs.readdir(path, { withFileTypes: true });
		for (const file of files) {
			const type = file.isDirectory() ? 'dir' : 'file';
			terminal.writeln(`  [${type}] ${file.name}`);
		}
	}
</script>

<main
	style="font-family: sans-serif; padding: 1rem; display: flex; flex-direction: column; height: 100vh; box-sizing: border-box;"
>
	<h1>WebContainer Control</h1>
	<div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
		<button on:click={handleBootClick} disabled={$statusStore !== 'idle'}>
			Boot WebContainer
		</button>
		<input type="text" bind:value={commandToRun} style="flex-grow: 1; padding: 0.5rem;" />
		<button on:click={handleRunCommand} disabled={$statusStore !== 'ready'}> Run Command </button>
		<p>Status: <strong>{$statusStore.toUpperCase()}</strong></p>
	</div>

	<div
		id="terminal-container"
		style="flex-grow: 1; border: 1px solid #ccc; padding: 5px; background-color: #000; overflow: hidden;"
	>
		<div bind:this={terminalEl} style="width: 100%; height: 100%;"></div>
	</div>
</main>

<style>
	:global(body, html) {
		margin: 0;
		padding: 0;
		height: 100%;
	}
</style>