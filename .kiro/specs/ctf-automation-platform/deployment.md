# Deployment Guide: Northflank with GitHub Actions CI/CD

## Overview

This document describes the deployment strategy for the CTF Challenge Automation Platform using Northflank as the hosting platform with GitHub Actions for continuous integration and deployment.

## Architecture

### Deployment Components

1. **Backend Service** (Northflank)
   - Python FastAPI application (monolithic)
   - 0.5 vCPU, 1GB RAM (recommended for 4 users + 6 VMs)
   - Auto-scaling enabled
   - Health checks configured

2. **MongoDB Addon** (Northflank)
   - Integrated MongoDB service
   - 1GB storage (expandable to 5GB)
   - Automatic backups
   - Connection string auto-injected

3. **Frontend Service** (Vercel) ✅ **RECOMMENDED**
   - React/TypeScript application
   - Global CDN edge network
   - Automatic HTTPS and preview deployments
   - Zero configuration deployment
   - **Cost**: Free tier (100GB bandwidth) or $20/mo Pro
   - **Alternative**: Northflank ($10-20/mo, single region)

4. **CI/CD Pipeline** (GitHub Actions)
   - Automated testing on pull requests
   - Automated deployment on main branch merge
   - Backend deployment to Northflank
   - Frontend deployment to Vercel (automatic)

## Northflank Setup

### Prerequisites

1. Northflank account (sign up at https://northflank.com)
2. GitHub repository with your code
3. Azure credentials for VM management

### Step 1: Create Northflank Project

1. Log in to Northflank dashboard
2. Click "Create Project"
3. Name: `ctf-automation-platform`
4. Select region (closest to your Azure region)

### Step 2: Add MongoDB Addon

1. In your project, click "Add Addon"
2. Select "MongoDB"
3. Choose plan:
   - Development: 1GB storage (~$10/mo)
   - Production: 5GB storage (~$20/mo)
4. Name: `ctf-mongodb`
5. Click "Create Addon"
6. Note: Connection string will be auto-injected as `MONGODB_URL`

### Step 3: Create Backend Service

1. Click "Add Service"
2. Select "Combined Service" (build + run)
3. Connect GitHub repository
4. Configure:
   - **Name**: `ctf-backend`
   - **Branch**: `main`
   - **Build Directory**: `backend`
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Port**: `8000`

5. **Resources**:
   - CPU: 0.5 vCPU
   - Memory: 1GB RAM
   - Replicas: 1 (can scale to 2-3 for high availability)

6. **Environment Variables**:
   ```
   MONGODB_URL=${MONGODB_URL}  # Auto-injected from addon
   AZURE_SUBSCRIPTION_ID=<your-azure-subscription-id>
   AZURE_CLIENT_ID=<your-azure-client-id>
   AZURE_CLIENT_SECRET=<your-azure-client-secret>
   AZURE_TENANT_ID=<your-azure-tenant-id>
   CORS_ORIGINS=https://your-frontend-url.com
   ```

7. **Health Check**:
   - Path: `/health`
   - Port: `8000`
   - Initial Delay: 30s
   - Period: 10s

8. Click "Create Service"

### Step 4: Deploy Frontend to Vercel (Recommended)

**Why Vercel?**
- Global CDN for better performance
- Free tier with 100GB bandwidth
- Automatic preview deployments for PRs
- Zero configuration
- $10-20/month cheaper than Northflank

**Setup:**

1. Go to https://vercel.com and sign up with GitHub
2. Click **Add New** → **Project**
3. Select your GitHub repository
4. Configure:
   - **Framework**: Vite (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variable:
   - `VITE_API_URL`: Your Northflank backend URL
6. Click **Deploy**
7. Copy your Vercel URL (e.g., `https://your-project.vercel.app`)
8. Update backend CORS in Northflank:
   ```
   CORS_ORIGINS=https://your-project.vercel.app
   ```

**See `VERCEL_DEPLOYMENT.md` for detailed instructions.**

## GitHub Actions CI/CD Setup

### Workflow Files

Create `.github/workflows/` directory with the following workflows:

#### 1. Backend CI/CD (`backend-deploy.yml`)

Triggers on:
- Pull requests to `main` (run tests only)
- Push to `main` (run tests + deploy)

Steps:
1. Run backend tests (pytest)
2. Build Docker image
3. Deploy to Northflank (on main branch only)

#### 2. Frontend CI/CD (`frontend-deploy.yml`)

Triggers on:
- Pull requests to `main` (run tests only)
- Push to `main` (run tests + deploy)

Steps:
1. Run frontend tests (npm test)
2. Build production bundle
3. Deploy to Northflank or Vercel

#### 3. E2E Tests (`e2e-tests.yml`)

Triggers on:
- Pull requests to `main`
- Scheduled (nightly)

Steps:
1. Start backend and frontend services
2. Run Playwright E2E tests
3. Upload test results and screenshots

### GitHub Secrets

Add these secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

Required secrets:
```
NORTHFLANK_API_TOKEN=<your-northflank-api-token>
NORTHFLANK_PROJECT_ID=<your-project-id>
NORTHFLANK_BACKEND_SERVICE_ID=<backend-service-id>
NORTHFLANK_FRONTEND_SERVICE_ID=<frontend-service-id>
AZURE_SUBSCRIPTION_ID=<your-azure-subscription-id>
AZURE_CLIENT_ID=<your-azure-client-id>
AZURE_CLIENT_SECRET=<your-azure-client-secret>
AZURE_TENANT_ID=<your-azure-tenant-id>
MONGODB_URL=<mongodb-connection-string>
```

To get Northflank API token:
1. Go to Northflank dashboard
2. Click your profile → API Tokens
3. Create new token with deployment permissions

## Deployment Process

### Manual Deployment

1. **Backend**:
   ```bash
   # From project root
   cd backend
   docker build -t ctf-backend .
   # Push to Northflank registry or trigger rebuild
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm run build
   # Deploy dist/ folder
   ```

### Automated Deployment (Recommended)

1. **Create feature branch**:
   ```bash
   git checkout -b feature/my-feature
   # Make changes
   git commit -m "Add feature"
   git push origin feature/my-feature
   ```

2. **Create Pull Request**:
   - GitHub Actions runs tests automatically
   - Review test results
   - Request code review

3. **Merge to Main**:
   - After approval, merge PR
   - GitHub Actions automatically:
     - Runs all tests
     - Builds Docker images
     - Deploys to Northflank
     - Runs smoke tests

4. **Monitor Deployment**:
   - Check GitHub Actions logs
   - Check Northflank deployment status
   - Verify health checks pass

## Monitoring and Logging

### Northflank Monitoring

1. **Metrics Dashboard**:
   - CPU usage
   - Memory usage
   - Request rate
   - Response times

2. **Logs**:
   - Real-time log streaming
   - Log search and filtering
   - Export logs for analysis

3. **Alerts**:
   - Set up alerts for:
     - High CPU/memory usage
     - Failed health checks
     - Error rate spikes

### Application Monitoring

1. **Health Check Endpoint**:
   ```python
   @app.get("/health")
   async def health_check():
       return {
           "status": "healthy",
           "database": "connected" if mongo_client else "disconnected",
           "timestamp": datetime.utcnow().isoformat()
       }
   ```

2. **Logging**:
   - All logs go to stdout/stderr
   - Northflank captures and displays logs
   - Use structured logging for better filtering

## Scaling Strategy

### Horizontal Scaling

For increased load (more than 4 concurrent users):

1. **Backend**:
   - Increase replicas: 1 → 2-3
   - Northflank load balances automatically
   - Cost: ~$20/replica

2. **MongoDB**:
   - Upgrade to larger plan
   - 5GB storage: ~$20/mo
   - 10GB storage: ~$40/mo

### Vertical Scaling

For resource-intensive operations:

1. **Backend**:
   - Upgrade to 1 vCPU, 2GB RAM: ~$40/mo
   - Better for complex VM orchestration

## Cost Estimation

### Development Environment (Recommended)
- Backend (0.5 vCPU, 1GB): $20/mo
- MongoDB (1GB): $10/mo
- Frontend (Vercel Free): $0/mo
- **Total**: ~$30/mo

### Production Environment
- Backend (1 vCPU, 2GB): $40/mo
- MongoDB (5GB): $20/mo
- Frontend (Vercel Pro): $20/mo
- **Total**: ~$80/mo

### High Availability
- Backend (2 replicas, 0.5 vCPU each): $40/mo
- MongoDB (5GB): $20/mo
- Frontend (Vercel Pro): $20/mo
- **Total**: ~$80/mo

**Note**: Using Vercel saves $10-20/month vs hosting frontend on Northflank, with better performance.

## Rollback Strategy

### Automatic Rollback

Northflank supports automatic rollback on failed health checks:

1. Enable in service settings
2. Set health check failure threshold
3. Automatic rollback to previous version

### Manual Rollback

1. Go to Northflank dashboard
2. Select service
3. Click "Deployments" tab
4. Select previous successful deployment
5. Click "Redeploy"

### GitHub Actions Rollback

```bash
# Revert commit
git revert <commit-hash>
git push origin main

# Or rollback to specific commit
git reset --hard <commit-hash>
git push --force origin main
```

## Security Best Practices

1. **Environment Variables**:
   - Never commit secrets to Git
   - Use Northflank environment variables
   - Rotate credentials regularly

2. **Network Security**:
   - Enable HTTPS (automatic with Northflank)
   - Configure CORS properly
   - Use private networking for MongoDB

3. **Access Control**:
   - Limit Northflank project access
   - Use GitHub branch protection
   - Require PR reviews before merge

4. **Monitoring**:
   - Set up alerts for suspicious activity
   - Monitor failed authentication attempts
   - Track API usage patterns

## Troubleshooting

### Common Issues

1. **Deployment Fails**:
   - Check GitHub Actions logs
   - Verify Northflank API token
   - Check service IDs are correct

2. **Health Check Fails**:
   - Verify MongoDB connection
   - Check environment variables
   - Review application logs

3. **High Memory Usage**:
   - Check for memory leaks
   - Increase memory allocation
   - Optimize database queries

4. **Slow Response Times**:
   - Check database indexes
   - Enable caching
   - Scale horizontally

## Next Steps

1. ✅ Set up Northflank project and services
2. ✅ Configure MongoDB addon
3. ✅ Add environment variables
4. ✅ Create GitHub Actions workflows
5. ✅ Add GitHub secrets
6. ✅ Test deployment pipeline
7. ✅ Set up monitoring and alerts
8. ✅ Document deployment process for team

## Resources

- [Northflank Documentation](https://northflank.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
