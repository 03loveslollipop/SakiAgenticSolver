# GitHub Actions CI/CD Workflows

This directory contains GitHub Actions workflows for automated testing and deployment of the CTF Automation Platform.

## Workflows

### 1. Backend CI/CD (`backend-deploy.yml`)

**Triggers:**
- Push to `main` branch (backend files changed)
- Pull requests to `main` branch (backend files changed)

**Jobs:**
- **test**: Runs pytest on backend code
- **build**: Builds Docker image and tests it
- **deploy**: Deploys to Northflank (main branch only)

**Required Secrets:**
- `NORTHFLANK_API_TOKEN`
- `NORTHFLANK_PROJECT_ID`
- `NORTHFLANK_BACKEND_SERVICE_ID`
- `BACKEND_URL`

### 2. Frontend CI/CD (`frontend-deploy.yml`)

**Triggers:**
- Push to `main` branch (frontend files changed)
- Pull requests to `main` branch (frontend files changed)

**Jobs:**
- **test**: Runs linter, tests, and builds frontend
- **build**: Builds Docker image and tests it
- **deploy**: Deploys to Northflank (main branch only)

**Required Secrets:**
- `NORTHFLANK_API_TOKEN`
- `NORTHFLANK_PROJECT_ID`
- `NORTHFLANK_FRONTEND_SERVICE_ID`
- `FRONTEND_URL`

### 3. E2E Tests (`e2e-tests.yml`)

**Triggers:**
- Pull requests to `main` branch
- Scheduled (nightly at 2 AM UTC)
- Manual trigger (workflow_dispatch)

**Jobs:**
- **e2e**: Starts backend and frontend, runs Playwright E2E tests

**Required Secrets:**
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`

## Setup Instructions

### 1. Add GitHub Secrets

Go to your repository: **Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:

```
NORTHFLANK_API_TOKEN=<your-northflank-api-token>
NORTHFLANK_PROJECT_ID=<your-project-id>
NORTHFLANK_BACKEND_SERVICE_ID=<backend-service-id>
NORTHFLANK_FRONTEND_SERVICE_ID=<frontend-service-id>
BACKEND_URL=https://ctf-backend-<your-id>.northflank.app
FRONTEND_URL=https://ctf-frontend-<your-id>.northflank.app
AZURE_SUBSCRIPTION_ID=<your-azure-subscription-id>
AZURE_CLIENT_ID=<your-azure-client-id>
AZURE_CLIENT_SECRET=<your-azure-client-secret>
AZURE_TENANT_ID=<your-azure-tenant-id>
```

### 2. Get Northflank API Token

1. Log in to Northflank dashboard
2. Click your profile → **API Tokens**
3. Click **Create new token**
4. Name: `GitHub Actions`
5. Permissions: Select **Deploy** and **Build**
6. Copy the token and add to GitHub secrets

### 3. Get Northflank IDs

After creating your services in Northflank:

1. Go to your project
2. Click on a service
3. The URL will be: `https://app.northflank.com/projects/{PROJECT_ID}/services/{SERVICE_ID}`
4. Copy the IDs and add to GitHub secrets

### 4. Test Workflows

1. Create a feature branch:
   ```bash
   git checkout -b test/ci-cd
   ```

2. Make a small change to trigger the workflow:
   ```bash
   echo "# Test" >> backend/README.md
   git add backend/README.md
   git commit -m "Test CI/CD pipeline"
   git push origin test/ci-cd
   ```

3. Create a pull request and check the Actions tab

4. Merge to main to trigger deployment

## Workflow Behavior

### Pull Requests
- ✅ Run tests
- ✅ Build Docker images
- ❌ Do NOT deploy

### Main Branch
- ✅ Run tests
- ✅ Build Docker images
- ✅ Deploy to Northflank

### E2E Tests
- ✅ Run on all PRs
- ✅ Run nightly
- ✅ Can be triggered manually

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Verify all secrets are set correctly
3. Check Northflank service status
4. Verify API token has correct permissions

### Tests Fail

1. Check test logs in Actions tab
2. Run tests locally to reproduce
3. Fix issues and push again

### Health Check Fails

1. Check backend logs in Northflank
2. Verify MongoDB connection
3. Check environment variables
4. Verify health endpoint is accessible

## Monitoring

- **GitHub Actions**: Check the Actions tab for workflow runs
- **Northflank**: Check service logs and metrics
- **Notifications**: GitHub will email you on workflow failures

## Best Practices

1. **Always create PRs**: Don't push directly to main
2. **Wait for tests**: Don't merge until all checks pass
3. **Review logs**: Check deployment logs after merge
4. **Monitor health**: Verify health checks after deployment
5. **Rollback if needed**: Use Northflank dashboard to rollback failed deployments
