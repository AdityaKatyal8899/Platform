import os
import sys
import uvicorn

def main():
    # Set default configuration environment variables for the FastAPI server and SDK
    os.environ.setdefault("PORT", "8000")
    os.environ.setdefault("BASE_URL", "http://localhost:8000")
    
    port = int(os.environ["PORT"])
    
    # Run the Uvicorn ASGI server
    # We run from the backend directory to make sure main.py and database.py are in the python path.
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, backend_dir)
    
    print(f"Starting CoWatch Video Pipeline Backend on http://localhost:{port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

if __name__ == "__main__":
    main()
