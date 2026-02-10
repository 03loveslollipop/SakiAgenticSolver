# CTF Challenge Automation Platform

A comprehensive platform for automating CTF (Capture The Flag) challenge solving using AI agents on Azure VMs.

## Overview

This platform automates the process of solving CTF challenges by:
- Creating isolated Azure VMs for each challenge
- Installing and configuring AI agents (Kiro/Copilot)
- Providing real-time terminal access via web interface
- Managing challenge files and agent configurations
- Storing and retrieving writeups for knowledge sharing

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel                               │
│                    Frontend (React)                          │
│                    Global CDN Edge                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Northflank                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │      Backend (FastAPI Monolith)                    │     │
│  │      Single Container - 0.5 vCPU, 1GB RAM          │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │      MongoDB Addon - 1GB Storage                   │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │    Azure VMs     │
                    │  (CTF Solving)   │
                    └──────────────────┘
```

## Features

### Core Functionality
- ✅ **VM Management**: Create, monitor, and delete Azure VMs
- ✅ **Agent Integration**: Support for Kiro and GitHub Copilot agents
- ✅ **Real-time Terminal**: WebSocket-based terminal access
- ✅ **File Management**: Edit AGENT.md, view TOOLS.md, BASE_PROMPT.md
- ✅ **Writeup System**: Store and search challenge writeups
- ✅ **MCP Servers**: Writeup retrieval, documentation, web search

### Technical Features
- ✅ **Automated Testing**: 93 backend tests, E2E tests with Playwright
- ✅ **CI/CD Pipeline**: GitHub Actions for automated deployment
- ✅ **Health Monitoring**: Health checks and logging
- ✅ **Security**: SSH key management, CORS, environment variables
- ✅ **Scalability**: Horizontal and vertical scaling support

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.12)
- **Database**: MongoDB (Motor async driver)
- **Cloud**: Azure SDK for VM management
- **SSH**: Paramiko for remote operations
- **Testing**: pytest, Hypothesis (property-based testing)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Terminal**: xterm.js
- **HTTP Client**: Axios
- **Testing**: Jest, Playwright (E2E)

### Infrastructure
- **Backend Hosting**: Northflank (containerized)
- **Frontend Hosting**: Vercel (global CDN)
- **Database**: MongoDB (Northflank addon)
- **CI/CD**: GitHub Actions

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.12+
- Azure subscription with credentials
- Northflank account (for deployment)
- Vercel account (for deployment)

### Local Development

1. **Clone repository**
   ```bash
   git clone <your-repo-url>
   cd ctf-automation-platform
   ```

2. **Backend setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your credentials
   uvicorn main:app --reload
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with backend URL
   npm run dev
   ```

4. **Access application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Deployment

See deployment guides:
- **Quick Start**: `QUICK_START_DEPLOYMENT.md` (30 minutes)
- **Detailed Guide**: `.kiro/specs/ctf-automation-platform/deployment.md`
- **Vercel Setup**: `VERCEL_DEPLOYMENT.md`
- **Architecture Analysis**: `MICROSERVICES_ANALYSIS.md`

## Project Structure

```
.
├── backend/                    # FastAPI backend
│   ├── services/              # Business logic services
│   ├── models/                # Pydantic models
│   ├── database/              # MongoDB connection
│   ├── main.py                # Application entry point
│   ├── Dockerfile             # Backend container
│   └── requirements.txt       # Python dependencies
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── services/          # API client
│   │   └── types/             # TypeScript types
│   ├── Dockerfile             # Frontend container (optional)
│   ├── vercel.json            # Vercel configuration
│   └── package.json           # Node dependencies
├── .github/
│   └── workflows/             # CI/CD workflows
├── .kiro/
│   └── specs/                 # Feature specifications
└── docs/                      # Additional documentation
```

## API Endpoints

### Sessions
- `POST /api/sessions` - Create new VM session
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/{id}` - Get session details
- `DELETE /api/sessions/{id}` - Delete session

### Terminal
- `WS /api/sessions/{id}/terminal` - WebSocket terminal

### Files
- `GET /api/sessions/{id}/ssh` - Get SSH connection info
- `GET /api/sessions/{id}/ssh-key` - Download SSH key
- `GET /api/sessions/{id}/agent-md` - Get AGENT.md content
- `PUT /api/sessions/{id}/agent-md` - Update AGENT.md
- `GET /api/sessions/{id}/tools-md` - Get TOOLS.md content
- `GET /api/sessions/{id}/base-prompt` - Get BASE_PROMPT.md
- `GET /api/sessions/{id}/changelog` - Get changelog.md
- `GET /api/sessions/{id}/discoveries` - Get discoveries.md

### Writeups
- `POST /api/sessions/{id}/writeup` - Upload writeup
- `GET /api/writeups` - List all writeups
- `GET /api/writeups/{id}` - Get specific writeup
- `GET /api/writeups/search` - Search writeups

## Testing

### Backend Tests
```bash
cd backend
pytest -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

### E2E Tests
```bash
cd frontend
npm run test:e2e
```

## Cost

### Development
- Backend (Northflank): $20/mo
- MongoDB (Northflank): $10/mo
- Frontend (Vercel): $0/mo (free tier)
- **Total**: ~$30/mo

### Production
- Backend (Northflank): $40/mo
- MongoDB (Northflank): $20/mo
- Frontend (Vercel): $20/mo (Pro tier)
- **Total**: ~$80/mo

## Documentation

- **Deployment Guide**: `.kiro/specs/ctf-automation-platform/deployment.md`
- **Requirements**: `.kiro/specs/ctf-automation-platform/requirements.md`
- **Design**: `.kiro/specs/ctf-automation-platform/design.md`
- **Tasks**: `.kiro/specs/ctf-automation-platform/tasks.md`
- **Quick Start**: `QUICK_START_DEPLOYMENT.md`
- **Vercel Guide**: `VERCEL_DEPLOYMENT.md`
- **Architecture Analysis**: `MICROSERVICES_ANALYSIS.md`

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `pytest` (backend) and `npm test` (frontend)
4. Create a pull request
5. Wait for CI/CD checks to pass

## License

[Your License Here]

## Support

For issues or questions:
- Check documentation in `.kiro/specs/`
- Review deployment guides
- Check GitHub Actions logs
- Review Northflank/Vercel dashboards

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2026-02-09
