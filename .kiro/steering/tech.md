# Technology Stack & Build System

## Backend Technology Stack
- **Framework**: FastAPI 0.109.0 (Python 3.12)
- **Database**: MongoDB with Motor async driver
- **Cloud Integration**: Azure SDK for VM management
- **SSH Operations**: Paramiko for remote connections
- **Testing**: pytest, Hypothesis (property-based testing)
- **Authentication**: JWT tokens with PyJWT
- **Email**: aiosmtplib for async SMTP operations
- **Validation**: Pydantic 2.5.3 for data validation

## Frontend Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Terminal**: xterm.js for web terminal
- **HTTP Client**: Axios
- **State Management**: React hooks and context
- **Styling**: CSS modules or styled-components
- **Testing**: Jest, Playwright (E2E)

## Infrastructure
- **Backend Hosting**: Northflank (containerized, 0.5 vCPU, 1GB RAM)
- **Frontend Hosting**: Vercel (global CDN)
- **Database**: MongoDB (Northflank addon, 1GB storage)
- **Compute**: Azure VMs for challenge solving
- **CI/CD**: GitHub Actions

## Development Commands

### Backend Commands
```bash
# Setup virtual environment
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload

# Run tests
pytest -v
pytest --cov=backend tests/  # with coverage

# Run specific test file
pytest backend/test_user_manager.py -v

# Run property-based tests
pytest -k "property" -v

# Type checking
mypy backend/
```

### Frontend Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
npm run test:e2e  # E2E tests with Playwright

# Lint code
npm run lint

# Type checking
npm run type-check
```

## Environment Variables

### Backend (.env)
```
# MongoDB
MONGODB_URL=mongodb+srv://...
DATABASE_NAME=ctf_platform

# Azure
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_SUBSCRIPTION_ID=...
AZURE_RESOURCE_GROUP=ctf-platform-rg

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=...
SMTP_FROM_NAME=...

# JWT
JWT_SECRET_KEY=...
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## Docker Commands
```bash
# Backend Docker
docker build -t ctf-backend -f backend/Dockerfile .
docker run -p 8000:8000 --env-file backend/.env ctf-backend

# Frontend Docker (optional)
docker build -t ctf-frontend -f frontend/Dockerfile .
docker run -p 3000:3000 ctf-frontend
```

## Testing Guidelines

### Backend Testing
- Use `pytest` with `pytest-asyncio` for async tests
- Property-based tests use `hypothesis` library
- Mock external services (Azure, SMTP) in unit tests
- Integration tests should use test database
- Follow AAA pattern: Arrange, Act, Assert

### Frontend Testing
- Unit tests with Jest and React Testing Library
- E2E tests with Playwright
- Test user interactions and API calls
- Mock API responses for isolated testing

## Code Quality
- **Python**: Use black for formatting, isort for imports
- **TypeScript**: Use ESLint and Prettier
- **Commit messages**: Follow conventional commits
- **Documentation**: Include docstrings for all public functions
- **Error handling**: Use proper exception hierarchy
- **Logging**: Structured logging with appropriate levels

## Deployment Commands
```bash
# Deploy to Northflank (backend)
nf deploy

# Deploy to Vercel (frontend)
vercel --prod

# Run database migrations
python backend/migrate_user_locale.py

# Create admin user
python backend/create_admin.py admin@example.com
```

## Monitoring & Debugging
- Check health endpoint: `GET /health`
- Debug MongoDB config: `GET /debug/mongodb-config`
- Send test email: `POST /debug/send-test-email`
- View logs in Northflank dashboard
- Monitor Azure VM costs and usage