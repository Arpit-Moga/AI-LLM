# File: backend/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from the .env file in the project root.
load_dotenv()

# Initialize the FastAPI application.
app = FastAPI()

# --- CORS (Cross-Origin Resource Sharing) ---
# This is crucial for allowing the frontend (running on a different port/domain)
# to communicate with this backend. For local development, we allow all origins ("*").
# For production, this should be restricted to the frontend's actual domain.
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Supabase Client Initialization ---
# As per the roadmap, we initialize this early to validate credentials,
# even though it's not used by an endpoint in this phase.
supabase: Client | None = None
try:
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("Warning: Supabase URL or Key not found in environment variables. Supabase client not initialized.")
    else:
        supabase = create_client(supabase_url, supabase_key)
        print("Successfully connected to Supabase.")
except Exception as e:
    print(f"Error connecting to Supabase: {e}")


# --- API Endpoints ---
@app.get("/")
def read_root():
    """
    Root endpoint to provide a simple health check.
    """
    return {"message": "AI App Builder Backend is running!"}


@app.get("/api/hello")
def hello_world():
    """
    A simple, unsecured endpoint to verify API functionality and CORS setup.
    """
    return {"message": "Hello from the Backend!"}


# --- Uvicorn Server Entrypoint ---
# This allows running the app directly using `python main.py` for local development.
# However, for development with auto-reload, `uvicorn main:app --reload` is preferred.
if __name__ == "__main__":
    import uvicorn
    # The host '0.0.0.0' makes the server accessible from your local network.
    uvicorn.run(app, host="0.0.0.0", port=8000)