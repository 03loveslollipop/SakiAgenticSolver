# Scripts

This directory contains utility scripts for the CTF Automation Platform.

## upload-secrets.sh

Uploads Vercel secrets to GitHub for frontend deployment.

**Note**: Backend deployment is handled by Northflank pipelines and doesn't require GitHub secrets.

### Prerequisites

- [GitHub CLI (gh)](https://cli.github.com/) installed
- Authenticated with GitHub CLI (`gh auth login`)
- Vercel account with a project created

### Usage

```bash
./scripts/upload-secrets.sh
```

The script will prompt you for:
- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID
- `VITE_API_URL`: Your backend URL (from Northflank)

### Getting Vercel Credentials

1. **VERCEL_TOKEN**:
   - Go to https://vercel.com/account/tokens
   - Click "Create Token"
   - Name: `GitHub Actions`
   - Scope: Full Account
   - Copy the token

2. **VERCEL_ORG_ID** and **VERCEL_PROJECT_ID**:
   - Go to your Vercel project settings
   - Scroll to "Project ID" section
   - Copy both IDs

3. **VITE_API_URL**:
   - Get your backend URL from Northflank
   - Format: `https://your-service.code.run`

### Backend Environment Variables

Backend environment variables are configured directly in Northflank:

1. Go to your Northflank service
2. Click **Environment** tab
3. Add variables:
   - `AZURE_SUBSCRIPTION_ID`: Your Azure subscription ID
   - `AZURE_CLIENT_ID`: Your Azure client ID
   - `AZURE_CLIENT_SECRET`: Your Azure client secret
   - `AZURE_TENANT_ID`: Your Azure tenant ID
   - `AZURE_RESOURCE_GROUP`: `ctf-platform-rg`
   - `CORS_ORIGINS`: Your frontend URL (e.g., `https://your-app.vercel.app`)
   - `LOG_LEVEL`: `INFO`
   
**Note**: MongoDB variables (MONGO_SRV, USERNAME, PASSWORD, DATABASE) are automatically
synced from the MongoDB addon when you link it to your service. The backend code
automatically detects and uses these variables.

### Verifying Secrets

After running the script, verify secrets were uploaded:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Verify these secrets exist:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `VITE_API_URL`

### Troubleshooting

**GitHub CLI not installed**:
```bash
# macOS
brew install gh

# Windows
winget install GitHub.cli

# Linux
# See: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
```

**Not authenticated**:
```bash
gh auth login
```

**Secrets not showing up**:
- Wait a few seconds and refresh the page
- Check you're in the correct repository
- Verify you have admin access to the repository
