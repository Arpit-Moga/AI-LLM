<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { bootWebContainer } from '$lib/webcontainer';
	import type { WebContainer, FileSystemTree } from '@webcontainer/api';
	import type { Terminal } from 'xterm';
	import type { FitAddon } from 'xterm-addon-fit';
	import 'xterm/css/xterm.css';

	// --- State Management (no changes) ---
	let webContainerInstance: WebContainer | null = null;
	let terminal: Terminal;
	let fitAddon: FitAddon;
	let terminalEl: HTMLElement;
	let messagesEl: HTMLElement;
	let previewUrl = 'about:blank';
	let activeFileContent = 'Click a file to view its content.';
	let status: 'idle' | 'booting' | 'ready' | 'busy' = 'idle';
	let currentWorkingDirectory = '/';
	let lastTerminalOutput = '';

	interface Message {
		sender: 'user' | 'agent';
		text: string;
		type: 'chat' | 'action';
	}
	let messages: Message[] = [];
	let currentInput = '';

	// --- Lifecycle & Initialization (no changes) ---
	onMount(async () => {
		const { Terminal } = await import('xterm');
		const { FitAddon } = await import('xterm-addon-fit');
		terminal = new Terminal({ convertEol: true, rows: 10, cursorBlink: true });
		fitAddon = new FitAddon();
		terminal.loadAddon(fitAddon);
		terminal.open(terminalEl);
		fitAddon.fit();
		await bootWebContainer();
		const wcStore = await import('$lib/webcontainer').then((m) => m.webContainerStore);
		wcStore.subscribe((instance) => {
			if (instance) {
				webContainerInstance = instance;
				status = 'ready';
				terminal.writeln('[System] WebContainer Ready.');
				instance.on('server-ready', (port, url) => {
					previewUrl = url;
					terminal.writeln(`[System] Server is ready at ${url}`);
				});
			}
		});
	});

	// --- Core Agent Logic (no changes) ---
	async function sendMessage() {
		if (!currentInput.trim() || status !== 'ready' || !webContainerInstance) return;
		const userPrompt = currentInput;
		messages = [...messages, { sender: 'user', text: userPrompt, type: 'chat' }];
		currentInput = '';
		status = 'busy';
		await tick();
		messagesEl.scrollTop = messagesEl.scrollHeight;
		try {
			console.log('%c1. GATHERING CONTEXT', 'color: blue; font-weight: bold;');
			const fileSystemTree = await getFsTree(webContainerInstance, currentWorkingDirectory);
			const contextPayload = {
				prompt: userPrompt,
				chatHistory: messages.map((msg) => ({ sender: msg.sender, text: msg.text })),
				currentWorkingDirectory,
				fileSystemTree,
				terminalOutput: lastTerminalOutput
			};
			console.log('CONTEXT PAYLOAD SENT:', contextPayload);
			console.log('%c2. SENDING REQUEST TO BACKEND', 'color: blue; font-weight: bold;');
			const response = await fetch('http://127.0.0.1:8000/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(contextPayload)
			});
			console.log('RAW RESPONSE FROM BACKEND:', response);
			if (!response.ok) {
				const err = await response.json().catch(() => ({ detail: response.statusText }));
				console.error('❌ BACKEND ERROR:', err);
				throw new Error(err.detail || `HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			console.log('%c3. RECEIVED DATA FROM BACKEND', 'color: green; font-weight: bold;', data);
			const agentResponse = data.response; // ✅ already parsed
			messages = [
				...messages,
				{ sender: 'agent', text: JSON.stringify(agentResponse), type: 'action' }
			];
			await tick();
			messagesEl.scrollTop = messagesEl.scrollHeight;
			await executeAgentAction(agentResponse);
		} catch (error: any) {
			console.error('%c❌ FRONTEND CATCH BLOCK', 'color: red; font-weight: bold;', error);
			messages = [...messages, { sender: 'agent', text: `Error: ${error.message}`, type: 'chat' }];
		} finally {
			status = 'ready';
		}
	}

	// --- executeAgentAction and viewFile (no changes) ---
	async function executeAgentAction(response: { action: string; [key: string]: any }) {
		if (!webContainerInstance) return;
		const { action, payload, path, content } = response;
		lastTerminalOutput = '';
		switch (action) {
			case 'chat':
				messages = [...messages, { sender: 'agent', text: payload, type: 'chat' }];
				break;
			case 'cd':
				currentWorkingDirectory = path;
				terminal.writeln(`\r\n[System] Changed directory to: ${path}`);
				break;
			case 'command':
				terminal.writeln(`\r\n\n$ ${payload}`);
				const [cmd, ...args] = payload.split(' ');
				const process = await webContainerInstance.spawn(cmd, args, {
					cwd: currentWorkingDirectory
				});
				const outputChunks: string[] = [];
				const writer = process.input.getWriter();
				const onDataDisposable = terminal.onData((data) => writer.write(data));
				process.output.pipeTo(
					new WritableStream({
						write(data) {
							outputChunks.push(data);
							terminal.write(data);
						}
					})
				);
				await process.exit;
				onDataDisposable.dispose();
				lastTerminalOutput = outputChunks.join('');
				terminal.writeln(`\r\n[System] Command finished.`);
				break;
			case 'file':
				const fullPath = path.startsWith('/') ? path : `${currentWorkingDirectory}/${path}`.replace('//', '/');
				await webContainerInstance.fs.writeFile(fullPath, content);
				terminal.writeln(`\r\n[System] Wrote file: ${fullPath}`);
				await viewFile(fullPath);
				break;
			default:
				const errorMsg = `[Error] Unknown agent action: ${action}`;
				terminal.writeln(`\r\n${errorMsg}`);
				messages = [...messages, { sender: 'agent', text: errorMsg, type: 'chat' }];
		}
	}

	async function viewFile(path: string) {
		if (!webContainerInstance) return;
		try {
			const fileContent = await webContainerInstance.fs.readFile(path, 'utf-8');
			activeFileContent = fileContent;
		} catch (e) {
			activeFileContent = `Could not read file: ${path}`;
		}
	}

	// --- THE DEFINITIVE FIX IS HERE ---
	async function getFsTree(instance: WebContainer, path: string): Promise<string> {
  const entries = await instance.fs.readdir(path, { withFileTypes: true });
  return entries
    .map(e => `${e.isDirectory() ? 'd' : '-'} ${e.name}`)
    .join('\n');
}
</script>

<main>
	<div class="sidebar">
		<h2>File Explorer</h2>
		<!-- Future: Render actual file tree -->
	</div>
	<div class="main-content">
		<div class="editor-preview">
			<div class="editor">
				<h2>Editor</h2>
				<p><strong>CWD:</strong> {currentWorkingDirectory}</p>
				<textarea readonly>{activeFileContent}</textarea>
			</div>
			<div class="preview">
				<h2>Live Preview</h2>
				<iframe src={previewUrl} title="Live Preview" sandbox="allow-scripts allow-same-origin"></iframe>
			</div>
		</div>
		<div class="terminal-chat">
			<div class="terminal-container">
				<h2>Terminal</h2>
				<div bind:this={terminalEl} class="terminal-instance"></div>
			</div>
			<div class="chat-container">
				<h2>Chat</h2>
				<div class="messages" bind:this={messagesEl}>
					{#each messages as msg}
						<div class="message {msg.sender} {msg.type}">
							<strong>{msg.sender}:</strong> {msg.text}
						</div>
					{/each}
				</div>
				<div class="input-area">
					<input
						type="text"
						bind:value={currentInput}
						on:keydown={(e) => e.key === 'Enter' && sendMessage()}
						placeholder="Type your request..."
						disabled={status !== 'ready'}
					/>
					<button on:click={sendMessage} disabled={status !== 'ready'}>Send</button>
				</div>
			</div>
		</div>
	</div>
</main>

<style>
	:global(body, html) {
		margin: 0;
		padding: 0;
		height: 100vh;
		font-family: sans-serif;
		color: #333;
	}
	main {
		display: flex;
		height: 100vh;
		width: 100vw;
	}
	.sidebar {
		width: 20%;
		border-right: 1px solid #ccc;
		padding: 1rem;
		overflow-y: auto;
		background-color: #f7f7f7;
	}
	.sidebar h2 {
		margin-top: 0;
	}
	.main-content {
		width: 80%;
		display: flex;
		flex-direction: column;
	}
	.editor-preview,
	.terminal-chat {
		display: flex;
		flex: 1;
		min-height: 50%;
	}
	.editor,
	.preview,
	.terminal-container,
	.chat-container {
		flex: 1;
		border: 1px solid #eee;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	textarea {
		width: 100%;
		flex-grow: 1;
		resize: none;
		font-family: monospace;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
	iframe {
		width: 100%;
		height: 100%;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
	.terminal-instance {
		flex-grow: 1;
		background-color: #000;
		padding: 5px;
	}
	.messages {
		flex-grow: 1;
		overflow-y: auto;
		border: 1px solid #ccc;
		padding: 0.5rem;
		background-color: #fff;
		border-radius: 4px;
	}
	.message {
		margin-bottom: 0.5rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}
	.message.user {
		background-color: #e1f5fe;
	}
	.message.agent.chat {
		background-color: #e8f5e9;
	}
	.message.agent.action {
		background-color: #f3e5f5;
		font-family: monospace;
		font-size: 0.9em;
	}
	.input-area {
		display: flex;
		margin-top: 0.5rem;
	}
	input {
		flex-grow: 1;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
