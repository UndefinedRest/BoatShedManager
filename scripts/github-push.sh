#!/bin/bash

# GitHub Push Helper Script
# Helps push the LMRC deployment code to GitHub

set -e

echo "=== LMRC GitHub Push Helper ==="
echo ""

# Configuration
REPO_URL="https://github.com/YOUR_USERNAME/lmrc-pi-deployment.git"
BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d ".git" ]; then
    echo -e "${RED}Error: Must run from lmrc-pi-deployment directory${NC}"
    exit 1
fi

# Check if repository URL has been updated
if [[ "$REPO_URL" == *"YOUR_USERNAME"* ]]; then
    echo -e "${RED}ERROR: Please update REPO_URL in this script!${NC}"
    echo ""
    echo "Edit this file and replace YOUR_USERNAME with your GitHub username:"
    echo "  nano $0"
    echo ""
    echo "Change:"
    echo "  REPO_URL=\"https://github.com/YOUR_USERNAME/lmrc-pi-deployment.git\""
    echo "To:"
    echo "  REPO_URL=\"https://github.com/your-actual-username/lmrc-pi-deployment.git\""
    exit 1
fi

# Show current status
echo "Repository URL: $REPO_URL"
echo "Branch: $BRANCH"
echo ""

# Check git status
echo "Checking git status..."
git status --short

# Check if there are uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
    echo ""
    read -p "Commit them now? [Y/n]: " commit_now

    if [[ "$commit_now" =~ ^[Yy]$ ]] || [[ -z "$commit_now" ]]; then
        git add .
        read -p "Enter commit message: " commit_msg
        git commit -m "$commit_msg"
        echo -e "${GREEN}✓ Changes committed${NC}"
    else
        echo -e "${YELLOW}Proceeding with uncommitted changes...${NC}"
    fi
fi

# Check if remote exists
if git remote | grep -q "^origin$"; then
    CURRENT_URL=$(git remote get-url origin)
    echo ""
    echo "Remote 'origin' already exists:"
    echo "  Current: $CURRENT_URL"
    echo "  New:     $REPO_URL"

    if [ "$CURRENT_URL" != "$REPO_URL" ]; then
        echo ""
        read -p "Update remote URL? [Y/n]: " update_remote
        if [[ "$update_remote" =~ ^[Yy]$ ]] || [[ -z "$update_remote" ]]; then
            git remote set-url origin "$REPO_URL"
            echo -e "${GREEN}✓ Remote URL updated${NC}"
        fi
    fi
else
    echo ""
    echo "Adding remote 'origin'..."
    git remote add origin "$REPO_URL"
    echo -e "${GREEN}✓ Remote added${NC}"
fi

# Rename branch to main if needed
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo ""
    echo "Renaming branch from '$CURRENT_BRANCH' to '$BRANCH'..."
    git branch -M "$BRANCH"
    echo -e "${GREEN}✓ Branch renamed${NC}"
fi

# Show what will be pushed
echo ""
echo "Ready to push:"
COMMIT_COUNT=$(git rev-list --count HEAD)
echo "  Commits: $COMMIT_COUNT"
echo "  Files:   $(git ls-files | wc -l)"
echo "  To:      $REPO_URL"
echo ""

read -p "Push to GitHub now? [Y/n]: " do_push

if [[ "$do_push" =~ ^[Yy]$ ]] || [[ -z "$do_push" ]]; then
    echo ""
    echo "Pushing to GitHub..."

    # Push with upstream tracking
    if git push -u origin "$BRANCH"; then
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  ✓ Successfully pushed to GitHub!         ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
        echo ""
        echo "Repository URL:"
        echo "  ${REPO_URL%.git}"
        echo ""
        echo "Next steps:"
        echo "  1. Visit the repository URL above"
        echo "  2. Verify all files are there"
        echo "  3. Create a v1.0.1 release (optional)"
        echo "  4. Add collaborators (optional)"
        echo ""
    else
        echo ""
        echo -e "${RED}✗ Push failed${NC}"
        echo ""
        echo "Possible reasons:"
        echo "  - Authentication failed (need token or SSH key)"
        echo "  - Repository doesn't exist yet"
        echo "  - No permission to push"
        echo ""
        echo "See GITHUB_SETUP.md for help"
        exit 1
    fi
else
    echo ""
    echo "Push cancelled"
    echo "Run this script again when ready"
fi

echo ""
echo "=== Done ==="
