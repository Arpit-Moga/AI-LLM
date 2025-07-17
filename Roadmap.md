Phase 1: Backend Setup & "Hello World" Endpoint
1. Objective

This phase establishes the foundational server-side components of the AI application builder. The goal is to create a functional FastAPI backend, configure it with the necessary dependencies, connect it to a Supabase project for future database and authentication needs, and expose a single, unsecured "hello world" endpoint. This serves as a verifiable baseline for all subsequent development.
2. Prerequisites

    You have a free GitHub account.

    You have a free Supabase account.

    You have a free Render account.

    Python 3.11 or later is installed on your local development machine.

    pip (Python package installer) is installed and updated.

3. Implementation Steps
Step 1: Create a Supabase Project

    Navigate to the Supabase dashboard.

    Click "New project".

    Choose your organization.

    Enter a Project name (e.g., ai-app-builder).

    Generate a secure Database Password and save it securely.

    Select a Region closest to your expected user base.

    Click "Create new project".

    Once the project is provisioned, navigate to Project Settings (the gear icon).

    Go to the API section.

    Find your Project URL and the anon public key. Keep this page open. You will need these values for your backend configuration.

Step 2: Set Up the Local Python Environment

    Create a new project directory on your local machine:

    mkdir ai-app-builder-backend
    cd ai-app-builder-backend

    Create a Python virtual environment:

    python3 -m venv venv

    Activate the virtual environment:

        macOS/Linux: source venv/bin/activate

        Windows: .\venv\Scripts\activate

    Create a requirements.txt file with the following content. These are the exact versions required for compatibility.

    # File: requirements.txt
    fastapi==0.111.0
    uvicorn[standard]==0.29.0
    python-dotenv==1.0.1
    supabase-py==2.4.2
    pydantic==2.7.1
    pydantic-settings==2.2.1
    google-generativeai==0.5.4

    Install the dependencies:

    pip install -r requirements.txt

Step 3: Create the FastAPI Application

    Create a file named .env in the project root. This file should never be committed to Git. Populate it with your Supabase credentials from Step 1.

    # File: .env
    SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_PUBLIC_KEY"
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY" # We will get this later, add the variable now.

    Create a file named main.py with the following code:

    # File: main.py
    import os
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from dotenv import load_dotenv
    from supabase import create_client, Client

    # Load environment variables from .env file
    load_dotenv()

    # Initialize FastAPI app
    app = FastAPI()

    # --- CORS (Cross-Origin Resource Sharing) ---
    # This is crucial for allowing the frontend (on a different domain)
    # to communicate with this backend.
    # For development, we allow all origins. For production, you should
    # restrict this to your frontend's domain.
    origins = ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Supabase Client Initialization ---
    # Although not used in this phase, we initialize it to ensure
    # the connection configuration is correct from the start.
    try:
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_ANON_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL or Key not found in environment variables.")

        supabase: Client = create_client(supabase_url, supabase_key)
        print("Successfully connected to Supabase.")
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        supabase = None


    # --- API Endpoints ---
    @app.get("/")
    def read_root():
        """
        Root endpoint to verify the server is running.
        """
        return {"message": "AI App Builder Backend is running!"}

    @app.get("/api/hello")
    def hello_world():
        """
        A simple, unsecured endpoint to test API functionality.
        """
        return {"message": "Hello from the Backend!"}

    # --- Uvicorn Server ---
    # This allows running the app directly with `python main.py` for local dev.
    if __name__ == "__main__":
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)

Step 4: Local Testing & Validation

    Run the application locally from your terminal:

    uvicorn main:app --reload

    The --reload flag will automatically restart the server when you make code changes.

    You should see output indicating the server is running on http://127.0.0.1:8000.

    Open your web browser and navigate to http://127.0.0.1:8000. You should see:

    {"message":"AI App Builder Backend is running!"}

    Navigate to http://127.0.0.1:8000/api/hello. You should see:

    {"message":"Hello from the Backend!"}

    Check your terminal. You should see the "Successfully connected to Supabase." message printed, confirming your .env configuration is correct.

4. Common Pitfalls & Solutions

    Error: ModuleNotFoundError: No module named 'fastapi'

        Cause: The Python dependencies were not installed correctly, or you are not running the command from within the activated virtual environment.

        Solution: Ensure your terminal prompt shows (venv). If not, reactivate it using source venv/bin/activate. Then, run pip install -r requirements.txt again.

    Error: Error connecting to Supabase: ValueError: Supabase URL or Key not found...

        Cause: The .env file is missing, named incorrectly, or the variable names do not exactly match SUPABASE_URL and SUPABASE_ANON_KEY.

        Solution: Verify the .env file exists in the project root. Double-check that the variable names are spelled correctly and that you have saved the file.

    Error: uvicorn: command not found

        Cause: The virtual environment is not active.

        Solution: Run source venv/bin/activate before trying to run the uvicorn command.

5. Success Metrics

    The FastAPI server runs without crashing when you execute uvicorn main:app --reload.

    The browser successfully displays the JSON response from both the / and /api/hello endpoints.

    The terminal output includes the message "Successfully connected to Supabase."

    The project structure is correct and all required files (main.py, requirements.txt, .env) are in place.

This concludes Phase 1. The backend is now a stable, verifiable foundation ready for the next phase: building the frontend and establishing communication.



Phase 2: Frontend Setup & Backend Communication
1. Objective

This phase focuses on creating the user-facing Control Plane using SvelteKit. The goal is to build a minimal user interface, establish communication with the FastAPI backend created in Phase 1, and configure the necessary server headers to prepare for the WebContainer integration in the next phase. The outcome will be a functional webpage that can successfully fetch data from the backend.
2. Prerequisites

    You have successfully completed all steps in Phase 1.

    The FastAPI backend from Phase 1 is running locally on http://127.0.0.1:8000.

    You have a Vercel account linked to your GitHub account.

    Node.js (version 18 or later) and npm are installed on your local machine.

3. Implementation Steps
Step 1: Scaffold the SvelteKit Frontend

    Open a new terminal (do not close the terminal running the backend). Navigate to a directory outside of your backend project.

    Run the SvelteKit scaffolding command:

    npm create svelte@latest ai-app-builder-frontend

    You will be prompted with several options. Choose the following configuration:

        Which Svelte app template? > Skeleton project

        Add type checking with TypeScript? > Yes, using TypeScript syntax

        Select additional options to add? > (Press space to select none, then enter)

    Navigate into the newly created project directory:

    cd ai-app-builder-frontend

    Install the project dependencies:

    npm install

Step 2: Configure Cross-Origin Isolation Headers

WebContainers require specific Cross-Origin-Opener-Policy (COOP) and Cross-Origin-Embedder-Policy (COEP) headers to function. We will configure them now for both local development and production deployment.

    For Local Development: Open the svelte.config.js file and add a server configuration block to the kit config to set the required headers.

    // File: svelte.config.js
    import adapter from '@sveltejs/adapter-auto';
    import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

    /** @type {import('@sveltejs/kit').Config} */
    const config = {
        preprocess: vitePreprocess(),
        kit: {
            adapter: adapter(),
            // Add this server configuration
            server: {
                headers: {
                    'Cross-Origin-Opener-Policy': 'same-origin',
                    'Cross-Origin-Embedder-Policy': 'require-corp',
                },
            },
        }
    };

    export default config;

    For Production (Vercel): Create a new file named vercel.json in the root of your frontend project. This tells Vercel to apply these headers to your deployed application.

    // File: vercel.json
    {
      "headers": [
        {
          "source": "/(.*)",
          "headers": [
            {
              "key": "Cross-Origin-Opener-Policy",
              "value": "same-origin"
            },
            {
              "key": "Cross-Origin-Embedder-Policy",
              "value": "require-corp"
            }
          ]
        }
      ]
    }

Step 3: Create the UI and Fetch Data from the Backend

    Open the main page file located at src/routes/+page.svelte.

    Replace its entire content with the following code. This code creates a simple UI and fetches the "Hello World" message from the backend when the page loads.

    <!-- File: src/routes/+page.svelte -->
    <script lang="ts">
        import { onMount } from 'svelte';

        // The URL of the backend. For local dev, this is localhost:8000.
        // When deployed, you will need to change this to your Render URL.
        const BACKEND_URL = 'http://127.0.0.1:8000';

        let backendMessage: string = 'Connecting to backend...';
        let errorMessage: string | null = null;

        onMount(async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/hello`);

                if (!response.ok) {
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

        <div style="margin-top: 2rem; padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">
            <h2 style="margin-top: 0;">Backend Connection Test</h2>
            <p>
                <strong>Status:</strong>
                <span style={errorMessage ? 'color: red;' : 'color: green;'}>
                    {backendMessage}
                </span>
            </p>
            {#if errorMessage}
                <p style="color: red; font-family: monospace; background-color: #fdd; padding: 0.5rem; border-radius: 4px;">
                    {errorMessage}
                </p>
            {/if}
        </div>
    </main>

4. Local Testing & Validation

    In your frontend project's terminal, start the SvelteKit development server:

    npm run dev

    Open your web browser and navigate to the URL provided (usually http://localhost:5173).

    You should see the "AI App Builder Frontend" page.

    The "Backend Connection Test" box should display: Status: Hello from the Backend!

    To verify the headers are set correctly, open your browser's developer tools, go to the "Network" tab, refresh the page, select the localhost request, and inspect the "Response Headers". You should see cross-origin-embedder-policy: require-corp and cross-origin-opener-policy: same-origin.

5. Common Pitfalls & Solutions

    Error: The status shows "Connection failed." and a CORS error appears in the browser console.

        Cause: The FastAPI backend is not configured correctly to allow requests from the frontend's origin.

        Solution: Ensure the CORSMiddleware in your main.py from Phase 1 is configured with allow_origins=["*"] or includes the specific SvelteKit dev server origin (e.g., http://localhost:5173). Make sure the backend server is running.

    Error: The status shows "Connection failed." with a "Failed to fetch" message.

        Cause: The backend server is not running, or the BACKEND_URL in +page.svelte is incorrect.

        Solution: Ensure the FastAPI server from Phase 1 is running in its terminal. Verify the URL and port match exactly.

    Error: ReferenceError: fetch is not defined during server-side rendering.

        Cause: The fetch call is being made on the server during SSR, where the BACKEND_URL might be localhost.

        Solution: The provided code correctly uses onMount, which ensures the fetch call only runs on the client-side (in the browser), avoiding this issue. Stick to this pattern.

6. Success Metrics

    The SvelteKit application runs without errors using npm run dev.

    The webpage correctly displays the "Hello from the Backend!" message fetched from the live FastAPI server.

    The Cross-Origin isolation headers are correctly set and visible in the browser's network inspector.

    The project structure is correct, including the vercel.json configuration file.

This concludes Phase 2. You now have a functional frontend that successfully communicates with the backend and is correctly configured for the next critical phase: integrating the WebContainer.


Phase 3: WebContainer Integration & Project Scaffolding
1. Objective

This phase integrates the core execution technology, StackBlitz WebContainers, into the SvelteKit frontend. The goal is to boot a WebContainer, provide a UI to run a terminal command within it, and successfully scaffold a new web application (e.g., a Vite React app) based on that command. This demonstrates the agent's foundational ability to manipulate a sandboxed development environment.
2. Prerequisites

    You have successfully completed all steps in Phase 2.

    The SvelteKit frontend from Phase 2 is running locally.

    The FastAPI backend from Phase 1 is running locally.

3. Implementation Steps
Step 1: Install WebContainer and Terminal Dependencies

    In your ai-app-builder-frontend project terminal, install the necessary packages:

    npm install @webcontainer/api xterm xterm-addon-fit

        @webcontainer/api: The core library for interacting with WebContainers.

        xterm: A library for rendering a full-featured terminal in the browser.

        xterm-addon-fit: A helper for making the xterm instance fit its container element.

Step 2: Create a WebContainer Service

To manage the WebContainer's lifecycle and state, we'll create a dedicated TypeScript file.

    Create a new directory src/lib.

    Inside src/lib, create a file named webcontainer.ts.

    Populate webcontainer.ts with the following code. This service will handle booting the container and exposing its instance.

    // File: src/lib/webcontainer.ts
    import { WebContainer } from '@webcontainer/api';
    import { writable } from 'svelte/store';

    // A Svelte store to hold the WebContainer instance.
    export const webContainerStore = writable<WebContainer | null>(null);

    // A store to track the boot status.
    export const statusStore = writable<'idle' | 'booting' | 'ready' | 'error'>('idle');

    let webContainerInstance: WebContainer;

    /**
     * Boots the WebContainer instance. This should only be called once.
     */
    export async function bootWebContainer() {
        if (webContainerInstance) {
            return;
        }
        statusStore.set('booting');
        try {
            webContainerInstance = await WebContainer.boot();
            webContainerStore.set(webContainerInstance);
            statusStore.set('ready');
        } catch (error) {
            console.error('WebContainer boot failed:', error);
            statusStore.set('error');
        }
    }

Step 3: Update the UI to Manage and Interact with the WebContainer

Now, we'll modify the main page to include a terminal display, a button to boot the container, and an input to run a command.

    Replace the entire content of src/routes/+page.svelte with the following code:

    <!-- File: src/routes/+page.svelte -->
    <script lang="ts">
        import { onMount } from 'svelte';
        import { bootWebContainer, statusStore } from '$lib/webcontainer';
        import type { WebContainer } from '@webcontainer/api';
        import { Terminal } from 'xterm';
        import 'xterm/css/xterm.css';
        import { FitAddon } from 'xterm-addon-fit';

        let webContainerInstance: WebContainer;
        let terminalEl: HTMLElement;
        let terminal: Terminal;
        const fitAddon = new FitAddon();

        let commandToRun = 'npm create vite@latest my-vite-app -- --template react';

        // Subscribe to the stores
        statusStore.subscribe(status => {
            if (terminal) {
                terminal.writeln(`\r\n\n[System] WebContainer status: ${status.toUpperCase()}`);
            }
        });

        onMount(() => {
            // Initialize the xterm.js terminal
            terminal = new Terminal({
                convertEol: true,
                cursorBlink: true,
            });
            terminal.loadAddon(fitAddon);
            terminal.open(terminalEl);
            fitAddon.fit();

            terminal.writeln('Welcome to the AI App Builder Terminal!');
            terminal.writeln('Click "Boot WebContainer" to start the environment.');
        });

        async function handleBootClick() {
            if ($statusStore !== 'idle') return;
            await bootWebContainer();
        }

        async function handleRunCommand() {
            if ($statusStore !== 'ready') {
                terminal.writeln('\r\n[System] Please boot the WebContainer first.');
                return;
            }

            const wc = await import('$lib/webcontainer').then(m => m.webContainerStore);
            const instance = $wc; // Get the instance from the store
            if (!instance) {
                terminal.writeln('\r\n[System] WebContainer instance not available.');
                return;
            }

            terminal.writeln(`\r\n\n[System] Running command: ${commandToRun}`);

            // Split command into executable and args
            const [cmd, ...args] = commandToRun.split(' ');
            const process = await instance.spawn(cmd, args);

            // Stream process output to the terminal
            process.output.pipeTo(
                new WritableStream({
                    write(data) {
                        terminal.write(data);
                    },
                })
            );

            const exitCode = await process.exit;
            terminal.writeln(`\r\n[System] Process exited with code: ${exitCode}`);

            // After command, list files to see the result
            if (exitCode === 0) {
                await listFiles(instance, '/');
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

    <main style="font-family: sans-serif; padding: 1rem; display: flex; flex-direction: column; height: 100vh;">
        <h1>WebContainer Control</h1>
        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
            <button on:click={handleBootClick} disabled={$statusStore !== 'idle'}>
                Boot WebContainer
            </button>
            <input type="text" bind:value={commandToRun} style="flex-grow: 1; padding: 0.5rem;" />
            <button on:click={handleRunCommand} disabled={$statusStore !== 'ready'}>
                Run Command
            </button>
            <p>Status: <strong>{$statusStore.toUpperCase()}</strong></p>
        </div>

        <div id="terminal-container" style="flex-grow: 1; border: 1px solid #ccc; padding: 5px; background-color: #000;">
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

4. Local Testing & Validation

    Ensure your SvelteKit dev server is running (npm run dev).

    Refresh your browser tab (http://localhost:5173). You should see the new UI with a terminal.

    Click the "Boot WebContainer" button.

        The status should change to BOOTING, then to READY.

        The terminal will log these status changes. This may take several seconds on the first run.

    Once the status is READY, click the "Run Command" button.

        The terminal will display the output of the npm create vite command, including the interactive prompts being answered automatically.

        This will take some time as it downloads and sets up the project inside the container.

    After the command finishes (exits with code 0), the listFiles function will run.

    You should see a file listing in the terminal that includes my-vite-app, confirming the project was created in the WebContainer's virtual file system.

5. Common Pitfalls & Solutions

    Error: SharedArrayBuffer is not defined in the browser console.

        Cause: The COOP/COEP headers are not being set correctly by the development server.

        Solution: Double-check that your svelte.config.js file has the server.headers configuration as specified in Phase 2. Stop and restart the SvelteKit dev server (npm run dev) after making changes.

    Error: WebContainer boot hangs or fails with a network error.

        Cause: A firewall, VPN, or browser extension is blocking the service workers or network requests that WebContainers rely on.

        Solution: Try disabling VPNs or browser extensions (especially ad-blockers) and try again. Ensure your network connection is stable.

    Error: The terminal does not fit its container.

        Cause: The fitAddon.fit() method was not called or the container element was not ready.

        Solution: The provided code calls fit() inside onMount after the terminal is opened. This is the correct pattern. You can also call fitAddon.fit() again if the window is resized.

6. Success Metrics

    The WebContainer boots successfully, and the UI status updates to "READY".

    The xterm.js terminal renders correctly on the page.

    Running the scaffolding command executes inside the container and streams its output to the terminal.

    After the command completes, a file listing confirms that the new project directory (my-vite-app) has been created inside the WebContainer's file system.

This concludes Phase 3. The application now has a live, sandboxed execution environment. The foundation is laid for the final phase: creating the full agentic loop where the LLM can write code and execute commands.


Phase 4: Core Agentic Loop - Code Generation & Live Preview
1. Objective

This final phase implements the complete, end-to-end agentic loop. The user will interact with a chat interface. Their prompts will be sent to the backend, which will use Gemini to generate structured code and commands. These actions will be executed by the WebContainer, and the resulting live application will be displayed in a preview <iframe>. This phase brings all previous components together into a functional AI app builder.
2. Prerequisites

    You have successfully completed all steps in Phase 3.

    You have a Google Gemini API Key. You can get one from Google AI Studio.

    The SvelteKit frontend and FastAPI backend are running locally.

3. Implementation Steps
Step 1: Enhance the Backend for Gemini Integration

We will add a new endpoint to the FastAPI backend to handle the chat logic and interact with the Gemini API.

    Update .env: Add your Gemini API key to the .env file in your ai-app-builder-backend project.

    # File: .env (in backend project)
    SUPABASE_URL="..."
    SUPABASE_ANON_KEY="..."
    GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"

    Modify main.py: Replace the content of main.py with the following. This adds a /api/chat endpoint and the logic to call Gemini.

    # File: main.py (in backend project)
    import os
    import google.generativeai as genai
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from dotenv import load_dotenv
    from pydantic import BaseModel

    # --- Models for data validation ---
    class ChatRequest(BaseModel):
        prompt: str
        # In a real app, you'd send file content and history here
        # For this phase, we'll keep it simple.

    # --- Load environment variables and configure API ---
    load_dotenv()
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

    # --- Initialize FastAPI app ---
    app = FastAPI()

    origins = ["*"] # Allow all for development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Gemini Model Initialization ---
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        print("Successfully initialized Gemini model.")
    except Exception as e:
        print(f"Error initializing Gemini model: {e}")
        model = None

    # --- System Prompt for the Agent ---
    # This is a simplified system prompt. A real one would be much more detailed.
    SYSTEM_PROMPT = """
    You are an expert web developer agent. Your goal is to help the user build a web application.
    You can respond with a terminal command to run or a file to write.
    Your response MUST be in a structured JSON format.

    Choose ONE of the following actions:
    1.  To run a command: {"action": "command", "payload": "npm install react"}
    2.  To write a file: {"action": "file", "path": "src/index.js", "content": "console.log('hello')"}
    3.  To give a text response: {"action": "chat", "payload": "I have finished the task."}

    Example:
    User: "Create a react app"
    You: {"action": "command", "payload": "npm create vite@latest my-app -- --template react"}

    User: "Write a simple hello world index.html file"
    You: {"action": "file", "path": "index.html", "content": "<h1>Hello World</h1>"}
    """

    @app.get("/")
    def read_root():
        return {"message": "AI App Builder Backend is running!"}

    @app.post("/api/chat")
    async def chat_handler(request: ChatRequest):
        if not model:
            raise HTTPException(status_code=500, detail="Gemini model not initialized.")

        print(f"Received prompt: {request.prompt}")

        try:
            # Construct the full prompt for the model
            full_prompt = f"{SYSTEM_PROMPT}\n\nUser: {request.prompt}"

            response = await model.generate_content_async(full_prompt)

            # The response from Gemini is often wrapped in markdown ```json ... ```
            # We need to clean it to parse the JSON.
            cleaned_response = response.text.strip().replace('```json', '').replace('```', '').strip()

            print(f"Gemini raw response: {response.text}")
            print(f"Cleaned response for parsing: {cleaned_response}")

            # Return the cleaned, structured JSON string to the frontend
            return {"response": cleaned_response}

        except Exception as e:
            print(f"Error during Gemini API call: {e}")
            raise HTTPException(status_code=500, detail=str(e))


    Restart the Backend: Stop your FastAPI server and restart it with uvicorn main:app --reload to apply the changes.

Step 2: Build the Full Frontend UI

Replace the content of src/routes/+page.svelte in your frontend project with this final version. It includes a chat interface, file explorer, and the preview iframe.

<!-- File: src/routes/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { bootWebContainer } from '$lib/webcontainer';
    import type { WebContainer, FileSystemTree } from '@webcontainer/api';
    import { Terminal } from 'xterm';
    import 'xterm/css/xterm.css';

    // --- State Management ---
    let webContainerInstance: WebContainer | null = null;
    let terminal: Terminal;
    let terminalEl: HTMLElement;
    let previewUrl = 'about:blank';
    let fileTree: FileSystemTree = {};
    let activeFileContent = '';
    let status: 'idle' | 'booting' | 'ready' | 'busy' = 'idle';

    interface Message {
        sender: 'user' | 'agent';
        text: string;
    }
    let messages: Message[] = [];
    let currentInput = '';

    // --- Lifecycle & Initialization ---
    onMount(() => {
        terminal = new Terminal({ convertEol: true, rows: 10 });
        terminal.open(terminalEl);
        bootWebContainer().then(async () => {
            const wc = await import('$lib/webcontainer').then(m => m.webContainerStore);
            wc.subscribe(instance => {
                if (instance) {
                    webContainerInstance = instance;
                    status = 'ready';
                    terminal.writeln('[System] WebContainer Ready.');
                    // Listen for server readiness to update the preview
                    instance.on('server-ready', (port, url) => {
                        previewUrl = url;
                        terminal.writeln(`[System] Server is ready at ${url}`);
                    });
                }
            });
        });
    });

    // --- Core Agent Logic ---
    async function sendMessage() {
        if (!currentInput.trim() || status !== 'ready') return;
        messages = [...messages, { sender: 'user', text: currentInput }];
        const userPrompt = currentInput;
        currentInput = '';
        status = 'busy';

        try {
            const response = await fetch('http://127.0.0.1:8000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userPrompt })
            });
            if (!response.ok) throw new Error('Backend request failed');

            const data = await response.json();
            const agentResponse = JSON.parse(data.response);

            messages = [...messages, { sender: 'agent', text: `Action: ${agentResponse.action}` }];
            await executeAgentAction(agentResponse);
        } catch (error: any) {
            terminal.writeln(`\r\n[Error] ${error.message}`);
            messages = [...messages, { sender: 'agent', text: `Error: ${error.message}` }];
        } finally {
            status = 'ready';
            await refreshFileTree();
        }
    }

    async function executeAgentAction(response: { action: string; [key: string]: any }) {
        if (!webContainerInstance) return;
        const { action, payload, path, content } = response;

        switch (action) {
            case 'chat':
                messages = [...messages, { sender: 'agent', text: payload }];
                break;
            case 'command':
                terminal.writeln(`\r\n\n$ ${payload}`);
                const [cmd, ...args] = payload.split(' ');
                const process = await webContainerInstance.spawn(cmd, args);
                process.output.pipeTo(new WritableStream({ write: data => terminal.write(data) }));
                await process.exit;
                terminal.writeln(`\r\n[System] Command finished.`);
                break;
            case 'file':
                await webContainerInstance.fs.writeFile(path, content);
                terminal.writeln(`\r\n[System] Wrote file: ${path}`);
                break;
            default:
                terminal.writeln(`\r\n[Error] Unknown agent action: ${action}`);
        }
    }

    // --- UI Helpers ---
    async function refreshFileTree() {
        if (!webContainerInstance) return;
        fileTree = await webContainerInstance.fs.readdir('/', { recursive: true, withFileTypes: true });
    }

    async function viewFile(path: string) {
        if (!webContainerInstance) return;
        const content = await webContainerInstance.fs.readFile(path, 'utf-8');
        activeFileContent = content;
    }
</script>

<main>
    <div class="sidebar">
        <h2>File Explorer</h2>
        <button on:click={refreshFileTree} disabled={status !== 'ready'}>Refresh</button>
        <pre>{JSON.stringify(fileTree, null, 2)}</pre>
        <!-- A real file tree would be a recursive component -->
    </div>
    <div class="main-content">
        <div class="editor-preview">
            <div class="editor">
                <h2>Editor</h2>
                <textarea readonly>{activeFileContent}</textarea>
            </div>
            <div class="preview">
                <h2>Live Preview</h2>
                <iframe src={previewUrl} title="Live Preview"></iframe>
            </div>
        </div>
        <div class="terminal-chat">
            <div class="terminal-container">
                <h2>Terminal</h2>
                <div bind:this={terminalEl} class="terminal"></div>
            </div>
            <div class="chat-container">
                <h2>Chat</h2>
                <div class="messages">
                    {#each messages as msg}
                        <div class="message {msg.sender}">
                            <strong>{msg.sender}:</strong> {msg.text}
                        </div>
                    {/each}
                </div>
                <div class="input-area">
                    <input type="text" bind:value={currentInput} on:keydown={e => e.key === 'Enter' && sendMessage()} placeholder="Type your request..." disabled={status !== 'ready'}/>
                    <button on:click={sendMessage} disabled={status !== 'ready'}>Send</button>
                </div>
            </div>
        </div>
    </div>
</main>

<style>
    main { display: flex; height: 100vh; width: 100vw; font-family: sans-serif; }
    .sidebar { width: 20%; border-right: 1px solid #ccc; padding: 1rem; overflow-y: auto; }
    .main-content { width: 80%; display: flex; flex-direction: column; }
    .editor-preview, .terminal-chat { display: flex; flex: 1; }
    .editor, .preview, .terminal-container, .chat-container { flex: 1; border: 1px solid #eee; padding: 1rem; display: flex; flex-direction: column; }
    textarea { width: 100%; height: 90%; resize: none; font-family: monospace; }
    iframe { width: 100%; height: 90%; border: none; }
    .terminal { flex-grow: 1; background-color: #000; padding: 5px; }
    .messages { flex-grow: 1; overflow-y: auto; }
    .message { margin-bottom: 0.5rem; }
    .message.user { color: blue; }
    .message.agent { color: green; }
    .input-area { display: flex; }
    input { flex-grow: 1; }
    :global(body, html) { margin: 0; padding: 0; }
</style>

4. Local Testing & Validation

    Ensure both your backend and frontend servers are running. Refresh the browser.

    The full UI with chat, terminal, file explorer, and preview should appear. The terminal should show "WebContainer Ready."

    Test Case 1: File Creation

        In the chat input, type: Create an index.html file that says "Hello Agent" and press Enter.

        Expected: The agent should respond with a file action. The terminal will log that the file was written. Click "Refresh" in the file explorer. You should see index.html.

    Test Case 2: Scaffolding and Live Preview

        In the chat, type: scaffold a new vite react app.

        Expected: The agent should respond with a command action. The terminal will show the output of npm create vite.... This will take a moment.

        After it finishes, type: cd my-vite-app && npm install.

        Expected: The agent runs the commands.

        Finally, type: npm run dev.

        Expected: The agent runs the dev server. The terminal will show the server starting. The server-ready event will fire, and the Live Preview iframe will update to show the Vite React starter page.

5. Common Pitfalls & Solutions

    Error: JSON.parse error on the frontend.

        Cause: Gemini's response was not valid JSON, or it was not cleaned properly on the backend.

        Solution: The backend code includes a cleaning step to remove markdown backticks. Check the backend console logs (Cleaned response for parsing) to see what the frontend is receiving. You may need to improve the cleaning logic or make the system prompt even more strict about the JSON format.

    Error: The preview iframe shows "refused to connect".

        Cause: The URL provided by the server-ready event might be localhost, which the iframe cannot access due to security policies. WebContainer URLs are special (e.g., https://...-....webcontainer.io).

        Solution: The @webcontainer/api handles this automatically. Ensure you are using the url from the server-ready event directly. Also, verify your COOP/COEP headers are still correctly configured.

    Error: 429 Too Many Requests from the backend.

        Cause: You have exceeded the free tier limit for the Gemini API.

        Solution: Wait a minute and try again. For a production app, you would need to implement rate-limiting on the backend and upgrade to a paid Google AI plan.

6. Success Metrics

    Sending a chat message successfully triggers a call to the backend and the Gemini API.

    The agent correctly generates a structured JSON action (file or command).

    The frontend correctly parses and executes the agent's action within the WebContainer.

    Running a dev server command (npm run dev) results in the live application being displayed correctly in the preview iframe.

    The entire loop—from user prompt to live preview—is functional.

This concludes the implementation roadmap. You have built a functional prototype of an AI-powered application builder with a core agentic loop and live preview capabilities.