import os
import json
from typing import List, Dict
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

# --- Pydantic Models ---
# CORRECTED: This now matches the structure the frontend actually sends.
class ChatMessage(BaseModel):
    sender: str  # 'user' or 'agent'
    text: str

class ChatRequest(BaseModel):
    prompt: str
    chatHistory: List[ChatMessage]
    currentWorkingDirectory: str
    fileSystemTree: str
    terminalOutput: str

# --- Load environment variables and configure Gemini API ---
load_dotenv()
try:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables.")
    genai.configure(api_key=api_key)
except ValueError as e:
    print(f"Warning: {e}")

# --- FastAPI App Initialization ---
app = FastAPI()
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Gemini Model Initialization ---
model = None
try:
    model = genai.GenerativeModel('gemini-2.5-flash')
    print("✅ Gemini model initialized successfully.")
except Exception as e:
    print(f"❌ Error initializing Gemini model: {e}")

# --- The New, Context-Aware System Prompt ---
SYSTEM_PROMPT_TEMPLATE = """
You are an expert web developer agent. Your goal is to help the user build and modify a web application based on their requests by executing commands in a sandboxed Node.js environment.

Your response MUST ALWAYS be a single, valid JSON object. Do not add any text or markdown formatting like ```json before or after the object.

You have four tools available:
1.  {{"action": "cd", "path": "<directory_name>"}} - Change the current working directory.
2.  {{"action": "command", "payload": "<command_to_run>"}} - Run a terminal command.
3.  {{"action": "file", "path": "<file_path>", "content": "<file_content>"}} - Write to a file.
4.  {{"action": "chat", "payload": "<message_to_user>"}} - Respond with a chat message.

--- CONTEXT ---
This information is provided on every turn to help you decide on the next best action.

Current Directory:
{currentWorkingDirectory}

File System Listing in Current Directory (`ls -l`):
{fileSystemTree}

Output from the Last Executed Command:
{terminalOutput}

Conversation History:
{chatHistory}
--- END OF CONTEXT ---

--- YOUR TASK ---
Based on the user's latest prompt and ALL of the context provided above, choose the single most logical next action from your available tools.

**CRITICAL THINKING RULES:**
1.  **Examine the Last Command's Output:** This is your most important piece of context. If a command just finished and printed instructions (e.g., "Now run: cd my-app"), your next action should probably follow those instructions.
2.  **Be Proactive:** If you just created a project in a new directory (e.g., `my-app`), the next logical step is ALWAYS to `cd` into that directory. Do not wait for the user to tell you. Take the initiative.
3.  **Check Your Location:** Before running `npm install` or `npm run dev`, ensure you are in the correct project directory by checking the "Current Directory" context. These commands will fail if run from the root ('/').
4.  **One Step at a Time:** Decompose complex tasks into a sequence of single actions.
"""

def format_chat_history(history: List[ChatMessage]) -> str:
    if not history:
        return "No history yet."
    # CORRECTED: Use sender and text attributes
    return "\n".join([f"{msg.sender}: {msg.text}" for msg in history])

@app.get("/")
def read_root():
    return {"message": "AI App Builder Backend is running!"}

@app.post("/api/chat")
async def chat_handler(request: ChatRequest):
    if not model:
        raise HTTPException(status_code=500, detail="Gemini model not initialized. Check API Key.")

    # --- LOGGING STEP 1: Request Received ---
    print("\n---  RECEIVED REQUEST ---")
    try:
        print(f"✅ Pydantic model validation successful.")
        print(f"Prompt: {request.prompt}")
        print(f"CWD: {request.currentWorkingDirectory}")
    except Exception as e:
        print(f"❌ ERROR: Pydantic validation FAILED: {e}")
        raise HTTPException(status_code=422, detail="Invalid request body structure.")
    print("------------------------\n")

    try:
        full_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            currentWorkingDirectory=request.currentWorkingDirectory,
            fileSystemTree=request.fileSystemTree or "Not available.",
            terminalOutput=request.terminalOutput or "No previous command output.",
            chatHistory=format_chat_history(request.chatHistory)
        )

        # --- LOGGING STEP 2: Sending to Gemini ---
        print("--- SENDING TO GEMINI ---")
        # print(f"Full Prompt:\n{full_prompt}") # Uncomment for very detailed debugging
        print("-------------------------\n")

        response = await model.generate_content_async(full_prompt)
        cleaned_response_text = response.text.strip().replace('```json', '').replace('```', '').strip()

        # --- LOGGING STEP 3: Received from Gemini ---
        print("--- RECEIVED FROM GEMINI ---")
        print(f"Raw Text: {response.text}")
        print(f"Cleaned Text: {cleaned_response_text}")
        print("--------------------------\n")

        try:
            json.loads(cleaned_response_text)
        except json.JSONDecodeError as e:
            print(f"❌ ERROR: Gemini response is not valid JSON: {e}")
            raise HTTPException(status_code=500, detail="Invalid JSON response from AI model.")

        # --- LOGGING STEP 4: Sending Response to Frontend ---
        print("--- SENDING TO FRONTEND ---")
        print("✅ Successfully processed request.")
        print("---------------------------\n")
        return {"response": json.loads(cleaned_response_text)}

    except Exception as e:
        # --- LOGGING STEP 5: Catch-All Error ---
        print(f"❌❌❌ UNEXPECTED ERROR in chat_handler: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")