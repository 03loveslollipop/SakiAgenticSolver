# CTF Challenge Automation Platform - Backend

FastAPI backend for managing Azure VMs for CTF challenge solving.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Linux/Mac: `source venv/bin/activate`

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

Monolith compatibility entrypoint:
```bash
uvicorn main:app --reload
```

Split service entrypoints:
```bash
uvicorn core_service.main:app --reload --port 8000
uvicorn control_service.main:app --reload --port 8001
```

The API will be available at http://localhost:8000

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
