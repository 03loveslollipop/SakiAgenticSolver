# Project Organization & Folder Structure

## Repository Root Structure
```
.
├── backend/                    # FastAPI backend application
├── frontend/                   # React frontend application
├── docs/                       # Project documentation
├── .kiro/                      # Kiro configuration and specs
│   ├── specs/                  # Feature specifications
│   └── steering/               # Steering documents (this file)
├── .github/                    # GitHub Actions workflows
├── scripts/                    # Deployment and utility scripts
├── old/                        # Legacy code and archives
└── root configuration files   # .env, README.md, etc.
```

## Backend Structure (`backend/`)
```
backend/
├── services/                   # Business logic services
│   ├── user_manager.py        # User management
│   ├── session_manager.py     # VM session management
│   ├── ssh_key_manager.py     # SSH key generation/storage
│   ├── azure_vm_manager.py    # Azure VM operations
│   ├── vm_setup_service.py    # VM setup and configuration
│   ├── email_service.py       # Email sending
│   └── writeup_manager.py     # Writeup storage/retrieval
├── models/                     # Data models and schemas
│   ├── schemas.py             # Pydantic models
│   ├── user.py                # User data model
│   └── session.py             # Session data model
├── database/                   # Database layer
│   ├── mongodb.py             # MongoDB connection
│   └── __init__.py            # Database exports
├── routes/                     # API route definitions
│   ├── auth.py                # Authentication routes
│   ├── users.py               # User management routes
│   └── __init__.py
├── email_templates/           # Email templates
│   ├── welcome_en.html        # English welcome email
│   └── welcome_ja.html        # Japanese welcome email
├── docs/                      # Backend documentation
├── __pycache__/               # Python cache (ignored)
├── .pytest_cache/             # Test cache (ignored)
├── venv/                      # Virtual environment (ignored)
├── main.py                    # FastAPI application entry point
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Container configuration
├── README.md                  # Backend README
└── test_*.py                  # Test files (93+ tests)
```

## Frontend Structure (`frontend/`)
```
frontend/
├── src/                       # Source code
│   ├── components/            # React components
│   │   ├── SessionList/       # Session listing
│   │   ├── Terminal/          # Web terminal
│   │   ├── FileEditor/        # File editing
│   │   └── common/            # Shared components
│   ├── services/              # API clients
│   │   ├── api.ts             # HTTP API client
│   │   └── websocket.ts       # WebSocket client
│   ├── types/                 # TypeScript types
│   │   ├── session.ts         # Session types
│   │   └── user.ts            # User types
│   ├── utils/                 # Utility functions
│   ├── App.tsx                # Main application
│   └── main.tsx               # Entry point
├── public/                    # Static assets
├── tests/                     # Test files
├── package.json               # Node dependencies
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript config
├── vercel.json                # Vercel deployment
└── Dockerfile                 # Frontend container
```

## Kiro Specifications (`.kiro/specs/`)
```
.kiro/specs/
├── ctf-automation-platform/   # Main platform spec
│   ├── requirements.md        # Feature requirements
│   ├── design.md             # Technical design
│   └── tasks.md              # Implementation tasks
├── frontend-ui-8bit-redesign/ # UI redesign spec
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
└── platform-enhancements/     # Platform improvements
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

## Documentation Structure (`docs/`)
```
docs/
├── DEPLOYMENT.md              # Deployment architecture
├── AUTHENTICATION.md          # Auth system overview
├── MONGODB.md                 # Database design
├── MICROSERVICES_ANALYSIS.md  # Architecture analysis
└── API_REFERENCE.md           # API documentation
```

## Code Organization Principles

### Backend Architecture
1. **Service Layer Pattern**: Business logic in services/, data access in database/
2. **Dependency Injection**: Services receive dependencies via constructor
3. **Async-First**: All I/O operations use async/await
4. **Error Handling**: Structured exceptions with proper logging
5. **Validation**: Pydantic models for all API inputs/outputs

### Frontend Architecture
1. **Component-Based**: Reusable React components with clear interfaces
2. **Type Safety**: TypeScript for all source files
3. **State Management**: React hooks and context for state
4. **API Abstraction**: Services layer for API communication
5. **Responsive Design**: Mobile-first approach

### File Naming Conventions
- **Python**: snake_case for files and functions, PascalCase for classes
- **TypeScript**: camelCase for variables/functions, PascalCase for components/interfaces
- **Tests**: `test_*.py` for Python, `*.test.tsx` for TypeScript
- **Configuration**: `.env.*` for environment files

### Import Organization
```python
# Python imports (backend)
# 1. Standard library
# 2. Third-party packages
# 3. Local modules
import os
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel

from services.user_manager import UserManager
from models.schemas import UserCreate
```

```typescript
// TypeScript imports (frontend)
// 1. React and core libraries
// 2. Third-party packages
// 3. Local modules
import React, { useState } from 'react';
import axios from 'axios';

import { Session } from '../types/session';
import { api } from '../services/api';
```

## Module Dependencies

### Backend Dependencies
- `main.py` → `services/`, `models/`, `database/`, `routes/`
- `services/` → `models/`, `database/`
- `routes/` → `services/`, `models/`
- `database/` → (external: motor, pymongo)

### Frontend Dependencies
- `App.tsx` → `components/`, `services/`, `types/`
- `components/` → `services/`, `types/`, `utils/`
- `services/` → `types/`

## Testing Structure
- **Unit Tests**: Test individual functions/classes
- **Integration Tests**: Test service interactions
- **Property Tests**: Test invariants with hypothesis
- **E2E Tests**: Test complete user flows with Playwright

## Deployment Artifacts
- **Backend**: Single container with all dependencies
- **Frontend**: Static build deployed to CDN
- **Database**: Managed MongoDB instance
- **Secrets**: Environment variables in deployment platform

## Development Workflow
1. Create/update spec in `.kiro/specs/`
2. Implement backend changes with tests
3. Implement frontend changes with tests
4. Run full test suite
5. Deploy to staging environment
6. Verify functionality
7. Deploy to production