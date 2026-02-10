# Deployment Checklist

Use this checklist to ensure your deployment is set up correctly.

## Pre-Deployment

- [ ] Azure credentials are ready
  - [ ] Subscription ID
  - [ ] Client ID
  - [ ] Client Secret
  - [ ] Tenant ID
  - [ ] Resource group created in Azure

- [ ] GitHub repository is set up
  - [ ] Code is pushed to main branch
  - [ ] All tests pass locally

- [ ] Northflank account created
  - [ ] Account verified
  - [ ] Payment method added (if needed)

## Northflank Setup

- [ ] Project created
  - [ ] Name: `ctf-automation-platform`
  - [ ] Region selected

- [ ] MongoDB addon created
  - [ ] Name: `ctf-mongodb`
  - [ ] Plan: Development (1GB) or Production (5GB)
  - [ ] Status: Running
  - [ ] Connection string available

- [ ] Backend service created
  - [ ] Name: `ctf-backend`
  - [ ] Connected to GitHub repo
  - [ ] Branch: `main`
  - [ ] Build directory: `backend`
  - [ ] Dockerfile path: `backend/Dockerfile`
  - [ ] Port: `8000`
  - [ ] Resources: 0.5 vCPU, 1GB RAM (minimum)
  - [ ] Health check configured: `/health`

- [ ] Backend environment variables set
  - [ ] `MONGODB_URL` (auto-injected)
  - [ ] `AZURE_SUBSCRIPTION_ID`
  - [ ] `AZURE_CLIENT_ID`
  - [ ] `AZURE_CLIENT_SECRET`
  - [ ] `AZURE_TENANT_ID`
  - [ ] `AZURE_RESOURCE_GROUP`
  - [ ] `CORS_ORIGINS`
  - [ ] `LOG_LEVEL`

- [ ] Frontend service created
  - [ ] Name: `ctf-frontend`
  - [ ] Connected to GitHub repo
  - [ ] Branch: `main`
  - [ ] Build directory: `frontend`
  - [ ] Dockerfile path: `frontend/Dockerfile`
  - [ ] Port: `80`
  - [ ] Resources: 0.2 vCPU, 512MB RAM (minimum)
  - [ ] Health check configured: `/health`

- [ ] Frontend environment variables set
  - [ ] `VITE_API_URL` (backend URL)

- [ ] Service URLs copied
  - [ ] Backend URL: `https://ctf-backend-______.northflank.app`
  - [ ] Frontend URL: `https://ctf-frontend-______.northflank.app`

## GitHub Actions Setup

- [ ] Northflank API token created
  - [ ] Permissions: Deploy, Build
  - [ ] Token copied

- [ ] Northflank IDs collected
  - [ ] Project ID
  - [ ] Backend service ID
  - [ ] Frontend service ID

- [ ] GitHub secrets added
  - [ ] `NORTHFLANK_API_TOKEN`
  - [ ] `NORTHFLANK_PROJECT_ID`
  - [ ] `NORTHFLANK_BACKEND_SERVICE_ID`
  - [ ] `NORTHFLANK_FRONTEND_SERVICE_ID`
  - [ ] `BACKEND_URL`
  - [ ] `FRONTEND_URL`
  - [ ] `AZURE_SUBSCRIPTION_ID`
  - [ ] `AZURE_CLIENT_ID`
  - [ ] `AZURE_CLIENT_SECRET`
  - [ ] `AZURE_TENANT_ID`

## Testing

- [ ] Backend health check passes
  - [ ] `curl https://your-backend-url/health`
  - [ ] Response: `{"status": "healthy", "database": "connected"}`

- [ ] Frontend loads
  - [ ] Open frontend URL in browser
  - [ ] Dashboard displays correctly
  - [ ] No console errors

- [ ] GitHub Actions workflows run
  - [ ] Create test PR
  - [ ] Workflows trigger automatically
  - [ ] All checks pass

- [ ] Deployment works
  - [ ] Merge PR to main
  - [ ] Deployment workflows trigger
  - [ ] Services update successfully

## Functional Testing

- [ ] Create test session
  - [ ] Fill in VM creation form
  - [ ] Submit form
  - [ ] Session appears in list

- [ ] VM creation works
  - [ ] Azure VM is created
  - [ ] Session status updates to "running"
  - [ ] VM IP is displayed

- [ ] Terminal connection works
  - [ ] Terminal loads
  - [ ] Can type commands
  - [ ] Commands execute

- [ ] Session deletion works
  - [ ] Delete session
  - [ ] Azure VM is deleted
  - [ ] Session removed from list

## Monitoring Setup

- [ ] Northflank alerts configured
  - [ ] High CPU usage alert
  - [ ] High memory usage alert
  - [ ] Failed health check alert
  - [ ] Error rate alert

- [ ] GitHub notifications enabled
  - [ ] Workflow failure notifications
  - [ ] Email notifications configured

## Documentation

- [ ] Team members have access
  - [ ] Northflank project access
  - [ ] GitHub repository access
  - [ ] Azure resource group access

- [ ] Documentation reviewed
  - [ ] Deployment guide
  - [ ] Quick start guide
  - [ ] Workflow README
  - [ ] Troubleshooting guide

## Post-Deployment

- [ ] Monitor for 24 hours
  - [ ] Check logs regularly
  - [ ] Monitor resource usage
  - [ ] Test all features

- [ ] Performance optimization
  - [ ] Review response times
  - [ ] Check database queries
  - [ ] Optimize if needed

- [ ] Security review
  - [ ] Verify CORS settings
  - [ ] Check environment variables
  - [ ] Review access controls

- [ ] Backup strategy
  - [ ] MongoDB backups enabled
  - [ ] Backup schedule configured
  - [ ] Restore procedure tested

## Optional Enhancements

- [ ] Custom domain configured
  - [ ] DNS records added
  - [ ] SSL certificate configured
  - [ ] Domain verified

- [ ] Horizontal scaling enabled
  - [ ] Multiple backend replicas
  - [ ] Load balancing configured

- [ ] Monitoring tools integrated
  - [ ] Application monitoring (e.g., Sentry)
  - [ ] Log aggregation (e.g., Logtail)
  - [ ] Uptime monitoring (e.g., UptimeRobot)

---

**Date Completed**: _______________

**Deployed By**: _______________

**Notes**: _______________
