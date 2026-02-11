# Deployment documentation (redacted)

Operational step-by-step deployment instructions have been removed from this file and consolidated into `/docs/DEPLOYMENT.md` (high-level architecture and canonical secret names only). For security reasons, do not keep explicit runbooks, secret values, or step-by-step commands in the public repository; store them in a secure runbook vault.

(If you previously used this file for checklists, please consult `/docs/DEPLOYMENT.md` for canonical variable names and architecture.)
- [ ] Created account at https://app.northflank.com
- [ ] Verified email address
- [ ] Added payment method (if needed)

### ☐ GitHub Repository
- [ ] Code pushed to GitHub
- [ ] Repository is public or private (both work)
- [ ] All tests passing locally

### ☐ Azure Credentials
- [ ] Have Azure subscription ID
- [ ] Have Azure app registration (client ID, secret, tenant ID)
- [ ] Have resource group name
- [ ] Verified credentials work

## Northflank Setup (10 minutes)

### ☐ Create Project
- [ ] Logged in to Northflank
- [ ] Created project: `ctf-automation-platform`
- [ ] Selected region (closest to Azure)
- [ ] **Copied Project ID** from URL

### ☐ Add MongoDB Addon
- [ ] Clicked "Add Addon"
- [ ] Selected MongoDB
- [ ] Chose Development plan (1GB)
- [ ] Named it: `ctf-mongodb`
- [ ] Waited for it to be ready (2-3 min)
- [ ] Verified status is "Running"

### ☐ Create Backend Service
- [ ] Clicked "Add Service" → "Combined Service"
- [ ] Selected "External image"
- [ ] Configured:
  - Name: `ctf-backend`
  - Image: `ghcr.io/<your-username>/<your-repo>/ctf-backend:latest`
  - Port: `8000`
  - Plan: `nf-compute-20` (0.2 vCPU, 512MB)
  - Instances: `1`
- [ ] Added environment variables:
  - `MONGODB_URL` = `${MONGODB_URL}`
  - `AZURE_SUBSCRIPTION_ID` = `<your-value>`
  - `AZURE_CLIENT_ID` = `<your-value>`
  - `AZURE_CLIENT_SECRET` = `<your-value>`
  - `AZURE_TENANT_ID` = `<your-value>`
  - `AZURE_RESOURCE_GROUP` = `ctf-platform-rg`
  - `CORS_ORIGINS` = `http://localhost:3000,http://localhost:5173`
  - `LOG_LEVEL` = `INFO`
- [ ] Configured health check:
  - Path: `/health`
  - Port: `8000`
  - Initial delay: `30s`
- [ ] **Copied Service ID** from URL

### ☐ Add GitHub Container Registry
- [ ] Went to Integrations → Container Registries
- [ ] Clicked "Add Registry"
- [ ] Selected "GitHub Container Registry"
- [ ] Named it: `github-cr`
- [ ] Added GitHub username
- [ ] Created GitHub Personal Access Token:
  - Settings → Developer settings → Personal access tokens
  - Scope: `read:packages`
- [ ] Added token to Northflank
- [ ] **Copied Credentials ID**

### ☐ Get Northflank API Key
- [ ] Clicked profile → API Tokens
- [ ] Created new token: `GitHub Actions Deployment`
- [ ] Selected permissions (all or minimum required)
- [ ] **Copied API Key** (saved securely)

## GitHub Setup (5 minutes)

### ☐ Add GitHub Secrets
Went to repository → Settings → Secrets and variables → Actions

- [ ] Added `NORTHFLANK_API_KEY`
- [ ] Added `NORTHFLANK_PROJECT_ID`
- [ ] Added `NORTHFLANK_SERVICE_ID`
- [ ] Added `NORTHFLANK_CREDENTIALS_ID`
- [ ] Added `AZURE_SUBSCRIPTION_ID`
- [ ] Added `AZURE_CLIENT_ID`
- [ ] Added `AZURE_CLIENT_SECRET`
- [ ] Added `AZURE_TENANT_ID`
- [ ] Added `AZURE_RESOURCE_GROUP`

### ☐ Verify Workflow File
- [ ] Checked `.github/workflows/backend-deploy.yml` exists
- [ ] Reviewed workflow configuration
- [ ] Confirmed it uses `northflank/deploy-to-northflank@v1`

## Vercel Setup (3 minutes)

### ☐ Create Vercel Account
- [ ] Signed up at https://vercel.com
- [ ] Connected GitHub account
- [ ] Authorized repository access

### ☐ Import Project
- [ ] Clicked "Add New" → "Project"
- [ ] Selected GitHub repository
- [ ] Configured:
  - Framework: Vite (auto-detected)
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Output directory: `dist`

### ☐ Add Environment Variable
- [ ] Added `VITE_API_URL` = `https://temp.com` (temporary)
- [ ] Set for: Production, Preview, Development

### ☐ Deploy
- [ ] Clicked "Deploy"
- [ ] Waited for build (2-3 min)
- [ ] **Copied Vercel URL**
- [ ] Verified deployment successful

## Initial Deployment (2 minutes)

### ☐ Commit and Push
```bash
git add .
git commit -m "Deploy with official Northflank action"
git push origin main
```

### ☐ Monitor Deployment
- [ ] Went to GitHub → Actions tab
- [ ] Watched workflow run
- [ ] Verified all steps passed:
  - [ ] Tests passed
  - [ ] Docker image built
  - [ ] Image pushed to ghcr.io
  - [ ] Deployed to Northflank

### ☐ Check Northflank
- [ ] Went to Northflank dashboard
- [ ] Checked service status
- [ ] Verified deployment successful
- [ ] Checked logs for errors

## Post-Deployment Configuration

### ☐ Get Backend URL
- [ ] Found service in Northflank dashboard
- [ ] **Copied backend URL**: `https://ctf-backend-xxx.northflank.app`

### ☐ Update Vercel Environment Variable
- [ ] Went to Vercel → Project → Settings → Environment Variables
- [ ] Updated `VITE_API_URL` to backend URL
- [ ] Saved changes
- [ ] Went to Deployments → Redeployed latest

### ☐ Update Backend CORS
- [ ] Went to Northflank → Service → Environment Variables
- [ ] Updated `CORS_ORIGINS` to Vercel URL
- [ ] Saved (service auto-redeployed)
- [ ] Waited for redeploy to complete

## Verification

### ☐ Test Backend
```bash
curl https://ctf-backend-xxx.northflank.app/health
```
- [ ] Received response: `{"status": "healthy", "database": "connected"}`

### ☐ Test Frontend
- [ ] Opened Vercel URL in browser
- [ ] Saw CTF Automation Platform dashboard
- [ ] No console errors in DevTools

### ☐ Test Full Flow
- [ ] Clicked "Create New VM"
- [ ] Filled in form with test data
- [ ] Submitted form
- [ ] Session appeared in dashboard
- [ ] VM creation started (or completed)

## Monitoring Setup

### ☐ GitHub Actions
- [ ] Enabled email notifications for workflow failures
- [ ] Bookmarked Actions tab

### ☐ Northflank
- [ ] Set up alerts for:
  - [ ] High CPU usage
  - [ ] High memory usage
  - [ ] Failed health checks
  - [ ] Deployment failures

### ☐ Vercel
- [ ] Enabled deployment notifications
- [ ] Checked analytics (if Pro plan)

## Documentation

### ☐ Team Documentation
- [ ] Shared backend URL with team
- [ ] Shared frontend URL with team
- [ ] Documented deployment process
- [ ] Added credentials to team password manager

### ☐ Runbook
- [ ] Documented how to deploy
- [ ] Documented how to rollback
- [ ] Documented common issues
- [ ] Documented who to contact

## Optional Enhancements

### ☐ Custom Domain
- [ ] Configured custom domain in Vercel
- [ ] Updated DNS records
- [ ] Verified SSL certificate

### ☐ Scaling
- [ ] Reviewed resource usage
- [ ] Adjusted CPU/memory if needed
- [ ] Enabled auto-scaling (if needed)

### ☐ Backups
- [ ] Enabled MongoDB backups in Northflank
- [ ] Tested restore procedure
- [ ] Documented backup schedule

### ☐ Monitoring
- [ ] Set up application monitoring (e.g., Sentry)
- [ ] Set up log aggregation
- [ ] Set up uptime monitoring

## Completion

- [ ] All services deployed and running
- [ ] All tests passing
- [ ] All URLs documented
- [ ] Team notified
- [ ] Monitoring configured

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Backend URL**: _______________

**Frontend URL**: _______________

**Notes**: _______________

---

**Status**: ☐ Not Started | ☐ In Progress | ☐ Complete

**Total Time**: ~20 minutes

**Cost**: ~$20/month (0.2 vCPU)
