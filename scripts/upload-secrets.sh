#!/bin/bash

# Upload GitHub Secrets for Vercel Deployment
# This script uses GitHub CLI (gh) to upload Vercel secrets to your repository
# Usage: ./scripts/upload-vercel-secrets.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== GitHub Secrets Upload Script (Vercel Only) ===${NC}\n"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}Not authenticated with GitHub CLI${NC}"
    echo "Running: gh auth login"
    gh auth login
fi

echo -e "${YELLOW}This script uploads Vercel secrets for frontend deployment.${NC}"
echo -e "${YELLOW}Backend deployment is handled by Northflank pipelines.${NC}\n"

# Prompt for Vercel secrets
echo -e "${GREEN}Enter your Vercel secrets:${NC}\n"

read -p "VERCEL_TOKEN: " VERCEL_TOKEN
read -p "VERCEL_ORG_ID: " VERCEL_ORG_ID
read -p "VERCEL_PROJECT_ID: " VERCEL_PROJECT_ID
read -p "VITE_API_URL (your backend URL): " VITE_API_URL

echo ""

# Upload secrets
if [ -n "$VERCEL_TOKEN" ]; then
    echo -e "${GREEN}📤 Uploading VERCEL_TOKEN${NC}"
    echo "$VERCEL_TOKEN" | gh secret set VERCEL_TOKEN
    echo -e "${GREEN}✅ Successfully uploaded: VERCEL_TOKEN${NC}\n"
fi

if [ -n "$VERCEL_ORG_ID" ]; then
    echo -e "${GREEN}📤 Uploading VERCEL_ORG_ID${NC}"
    echo "$VERCEL_ORG_ID" | gh secret set VERCEL_ORG_ID
    echo -e "${GREEN}✅ Successfully uploaded: VERCEL_ORG_ID${NC}\n"
fi

if [ -n "$VERCEL_PROJECT_ID" ]; then
    echo -e "${GREEN}📤 Uploading VERCEL_PROJECT_ID${NC}"
    echo "$VERCEL_PROJECT_ID" | gh secret set VERCEL_PROJECT_ID
    echo -e "${GREEN}✅ Successfully uploaded: VERCEL_PROJECT_ID${NC}\n"
fi

if [ -n "$VITE_API_URL" ]; then
    echo -e "${GREEN}📤 Uploading VITE_API_URL${NC}"
    echo "$VITE_API_URL" | gh secret set VITE_API_URL
    echo -e "${GREEN}✅ Successfully uploaded: VITE_API_URL${NC}\n"
fi

echo -e "${GREEN}=== Upload Complete ===${NC}"
echo -e "${YELLOW}Note: Verify secrets in GitHub repository settings${NC}"
echo -e "${YELLOW}Go to: Settings → Secrets and variables → Actions${NC}"
echo ""
echo -e "${YELLOW}Backend deployment:${NC}"
echo -e "${YELLOW}  - Configure environment variables directly in Northflank${NC}"
echo -e "${YELLOW}  - Go to your service → Environment tab${NC}"

