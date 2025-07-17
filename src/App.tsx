import React, { useState, useEffect, useRef } from 'react';
import { WebContainer, FileSystemTree } from '@webcontainer/api';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface Message {
  sender: 'user' | 'agent';
  text: string;
  type: 'chat' | 'action';
}

function App() {
  // --- State Management ---
  const [webContainerInstance, setWebContainerInstance] = useState<WebContainer | null>(null);
  const [previewUrl, setPreviewUrl] = useState('about:blank');
  const [activeFileContent, setActiveFileContent] = useState('Click a file to view its content.');
  const [status, setStatus] = useState<'idle' | 'booting' | 'ready' | 'busy'>('idle');
  const [currentWorkingDirectory, setCurrentWorkingDirectory] = useState('/');
  const [lastTerminalOutput, setLastTerminalOutput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');

  // --- Refs ---
  const terminalRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // --- Boot WebContainer ---
  const bootWebContainer = async () => {
    if (webContainerInstance) {
      console.log('WebContainer already booted');
      return;
    }
    
    try {
      setStatus('booting');
      const { WebContainer } = await import('@webcontainer/api');
      const instance = await WebContainer.boot();
      setWebContainerInstance(instance);
      setStatus('ready');
      
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.writeln('[System] WebContainer Ready.');
      }

      instance.on('server-ready', (port, url) => {
        setPreviewUrl(url);
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.writeln(`[System] Server is ready at ${url}`);
        }
      });
    } catch (error) {
      console.error('Failed to boot WebContainer:', error);
      setStatus('idle');
    }
  };

  // --- Initialize Terminal and WebContainer ---
  useEffect(() => {
    let mounted = true;
    
    const initTerminal = async () => {
      if (!terminalRef.current || !mounted) return;
      
      // Wait for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!mounted || !terminalRef.current) return;
      
      const terminal = new Terminal({ convertEol: true, rows: 10, cursorBlink: true });
      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(terminalRef.current);
      
      // Wait a bit before fitting
      setTimeout(() => {
        if (mounted && fitAddon) {
          fitAddon.fit();
        }
      }, 100);
      
      terminalInstanceRef.current = terminal;
      fitAddonRef.current = fitAddon;
    };

    const init = async () => {
      await initTerminal();
      if (mounted) {
        await bootWebContainer();
      }
    };

    init();

    return () => {
      mounted = false;
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
        terminalInstanceRef.current = null;
      }
      if (webContainerInstance) {
        // WebContainer doesn't have a dispose method, just clear the reference
        setWebContainerInstance(null);
      }
    };
  }, []);

  // --- Get File System Tree ---
  const getFsTree = async (instance: WebContainer, path: string): Promise<string> => {
    const entries = await instance.fs.readdir(path, { withFileTypes: true });
    return entries
      .map(e => `${e.isDirectory() ? 'd' : '-'} ${e.name}`)
      .join('\n');
  };

  // --- Send Message to AI ---
  const sendMessage = async () => {
    if (!currentInput.trim() || status !== 'ready' || !webContainerInstance) return;

    const userPrompt = currentInput;
    setMessages(prev => [...prev, { sender: 'user', text: userPrompt, type: 'chat' }]);
    setCurrentInput('');
    setStatus('busy');

    // Auto-scroll messages
    setTimeout(() => {
      if (messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    }, 0);

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

      const agentResponse = data.response;
      setMessages(prev => [...prev, { sender: 'agent', text: JSON.stringify(agentResponse), type: 'action' }]);

      // Auto-scroll messages
      setTimeout(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, 0);

      await executeAgentAction(agentResponse);

    } catch (error: any) {
      console.error('%c❌ FRONTEND CATCH BLOCK', 'color: red; font-weight: bold;', error);
      setMessages(prev => [...prev, { sender: 'agent', text: `Error: ${error.message}`, type: 'chat' }]);
    } finally {
      setStatus('ready');
    }
  };

  // --- Execute Agent Action ---
  const executeAgentAction = async (response: { action: string; [key: string]: any }) => {
    if (!webContainerInstance || !terminalInstanceRef.current) return;

    const { action, payload, path, content } = response;
    setLastTerminalOutput('');

    switch (action) {
      case 'chat':
        setMessages(prev => [...prev, { sender: 'agent', text: payload, type: 'chat' }]);
        break;

      case 'cd':
        setCurrentWorkingDirectory(path);
        terminalInstanceRef.current.writeln(`\r\n[System] Changed directory to: ${path}`);
        break;

      case 'command':
        terminalInstanceRef.current.writeln(`\r\n\n$ ${payload}`);
        const [cmd, ...args] = payload.split(' ');
        const process = await webContainerInstance.spawn(cmd, args, {
          cwd: currentWorkingDirectory
        });

        const outputChunks: string[] = [];
        const writer = process.input.getWriter();
        
        const onDataDisposable = terminalInstanceRef.current.onData((data) => {
          writer.write(data);
        });

        process.output.pipeTo(
          new WritableStream({
            write(data) {
              outputChunks.push(data);
              terminalInstanceRef.current?.write(data);
            }
          })
        );

        await process.exit;
        onDataDisposable.dispose();
        setLastTerminalOutput(outputChunks.join(''));
        terminalInstanceRef.current.writeln(`\r\n[System] Command finished.`);
        break;

      case 'file':
        const fullPath = path.startsWith('/') ? path : `${currentWorkingDirectory}/${path}`.replace('//', '/');
        await webContainerInstance.fs.writeFile(fullPath, content);
        terminalInstanceRef.current.writeln(`\r\n[System] Wrote file: ${fullPath}`);
        await viewFile(fullPath);
        break;

      default:
        const errorMsg = `[Error] Unknown agent action: ${action}`;
        terminalInstanceRef.current.writeln(`\r\n${errorMsg}`);
        setMessages(prev => [...prev, { sender: 'agent', text: errorMsg, type: 'chat' }]);
    }
  };

  // --- View File ---
  const viewFile = async (path: string) => {
    if (!webContainerInstance) return;
    try {
      const fileContent = await webContainerInstance.fs.readFile(path, 'utf-8');
      setActiveFileContent(fileContent);
    } catch (e) {
      setActiveFileContent(`Could not read file: ${path}`);
    }
  };

  // --- Handle Enter Key ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <main style={{ display: 'flex', height: '100vh', width: '100vw', margin: 0, padding: 0, fontFamily: 'sans-serif', color: '#333' }}>
      {/* Sidebar */}
      <div style={{ width: '20%', borderRight: '1px solid #ccc', padding: '1rem', overflowY: 'auto', backgroundColor: '#f7f7f7' }}>
        <h2 style={{ marginTop: 0 }}>File Explorer</h2>
        {/* Future: Render actual file tree */}
      </div>

      {/* Main Content */}
      <div style={{ width: '80%', display: 'flex', flexDirection: 'column' }}>
        {/* Editor and Preview */}
        <div style={{ display: 'flex', flex: 1, minHeight: '50%' }}>
          {/* Editor */}
          <div style={{ flex: 1, border: '1px solid #eee', padding: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2>Editor</h2>
            <p><strong>CWD:</strong> {currentWorkingDirectory}</p>
            <textarea 
              readOnly 
              value={activeFileContent}
              style={{ width: '100%', flexGrow: 1, resize: 'none', fontFamily: 'monospace', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* Preview */}
          <div style={{ flex: 1, border: '1px solid #eee', padding: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2>Live Preview</h2>
            <iframe 
              src={previewUrl} 
              title="Live Preview" 
              sandbox="allow-scripts allow-same-origin"
              style={{ width: '100%', height: '100%', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>

        {/* Terminal and Chat */}
        <div style={{ display: 'flex', flex: 1, minHeight: '50%' }}>
          {/* Terminal */}
          <div style={{ flex: 1, border: '1px solid #eee', padding: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2>Terminal</h2>
            <div 
              ref={terminalRef} 
              style={{ flexGrow: 1, backgroundColor: '#000', padding: '5px' }}
            />
          </div>

          {/* Chat */}
          <div style={{ flex: 1, border: '1px solid #eee', padding: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2>Chat</h2>
            <div 
              ref={messagesRef}
              style={{ flexGrow: 1, overflowY: 'auto', border: '1px solid #ccc', padding: '0.5rem', backgroundColor: '#fff', borderRadius: '4px' }}
            >
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  style={{
                    marginBottom: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: msg.sender === 'user' ? '#e1f5fe' : msg.type === 'chat' ? '#e8f5e9' : '#f3e5f5',
                    fontFamily: msg.type === 'action' ? 'monospace' : 'inherit',
                    fontSize: msg.type === 'action' ? '0.9em' : 'inherit'
                  }}
                >
                  <strong>{msg.sender}:</strong> {msg.text}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', marginTop: '0.5rem' }}>
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your request..."
                disabled={status !== 'ready'}
                style={{ flexGrow: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <button 
                onClick={sendMessage} 
                disabled={status !== 'ready'}
                style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: '4px', cursor: status === 'ready' ? 'pointer' : 'not-allowed' }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;