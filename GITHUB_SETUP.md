# GitHub Repository Setup Guide

This guide will help you create a GitHub repository and push the LMRC deployment code.

---

## Option 1: Quick Setup (Recommended)

### Step 1: Create Repository on GitHub

1. **Go to GitHub**: https://github.com/new
2. **Repository name**: `lmrc-pi-deployment`
3. **Description**: `Deployment management system for LMRC Raspberry Pi applications`
4. **Visibility**:
   - Choose **Private** (recommended for club-internal code)
   - Or **Public** (if you want to share with other rowing clubs)
5. **DO NOT initialize with**:
   - ❌ Don't add README
   - ❌ Don't add .gitignore
   - ❌ Don't add license
   - (We already have these files)
6. Click **Create repository**

### Step 2: Push Code

GitHub will show you commands. Use these:

```bash
cd c:\dev\Projects\LMRC\lmrc-pi-deployment

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/lmrc-pi-deployment.git

# Rename branch to main (if needed)
git branch -M main

# Push code
git push -u origin main
```

**Done!** Your code is now on GitHub.

---

## Option 2: Using the Helper Script

We've created a helper script for you.

### Step 1: Edit the Push Script

```bash
cd c:\dev\Projects\LMRC\lmrc-pi-deployment
nano scripts/github-push.sh
```

Update the repository URL with your GitHub username:
```bash
REPO_URL="https://github.com/YOUR_USERNAME/lmrc-pi-deployment.git"
```

### Step 2: Run the Script

```bash
chmod +x scripts/github-push.sh
./scripts/github-push.sh
```

The script will:
- Check git status
- Add remote if needed
- Push all branches and tags
- Verify push succeeded

---

## Option 3: SSH Setup (More Secure)

If you prefer SSH authentication:

### Step 1: Generate SSH Key (if you don't have one)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location
# Set a passphrase (recommended)
```

### Step 2: Add SSH Key to GitHub

```bash
# Copy your public key
cat ~/.ssh/id_ed25519.pub
# Copy the output
```

1. Go to GitHub → Settings → SSH and GPG keys
2. Click "New SSH key"
3. Paste your public key
4. Click "Add SSH key"

### Step 3: Push Using SSH

```bash
cd c:\dev\Projects\LMRC\lmrc-pi-deployment

# Add remote using SSH
git remote add origin git@github.com:YOUR_USERNAME/lmrc-pi-deployment.git

# Push
git push -u origin main
```

---

## Verification

After pushing, verify on GitHub:

1. Go to: `https://github.com/YOUR_USERNAME/lmrc-pi-deployment`
2. Check that you see:
   - ✅ All files (29 files)
   - ✅ README.md displays on homepage
   - ✅ 6 commits in history
   - ✅ All folders (scripts, systemd, config, docs)

---

## Setting Up Collaborators

If you want to give access to other club members:

1. Go to repository → Settings → Collaborators
2. Click "Add people"
3. Enter their GitHub username or email
4. Choose permission level:
   - **Read**: Can view and clone
   - **Write**: Can push changes
   - **Admin**: Full control

---

## Creating a Release

To create v1.0.1 release:

```bash
cd c:\dev\Projects\LMRC\lmrc-pi-deployment

# Create and push tag
git tag -a v1.0.1 -m "Version 1.0.1 - Critical fixes, ready for testing"
git push origin v1.0.1
```

Then on GitHub:
1. Go to repository → Releases
2. Click "Create a new release"
3. Choose tag: v1.0.1
4. Release title: `v1.0.1 - Ready for Testing`
5. Description: Copy from CHANGELOG.md
6. Attach files (optional): Pre-configured SD card image (after testing)
7. Click "Publish release"

---

## Cloning on Raspberry Pi

Once on GitHub, you can clone directly to Pi:

```bash
# On Raspberry Pi
cd /opt/lmrc
sudo git clone https://github.com/YOUR_USERNAME/lmrc-pi-deployment.git deployment
cd deployment
sudo ./scripts/install.sh
```

Or with SSH:
```bash
git clone git@github.com:YOUR_USERNAME/lmrc-pi-deployment.git deployment
```

---

## Branch Protection (Optional)

To protect the main branch from accidental changes:

1. Go to repository → Settings → Branches
2. Click "Add rule"
3. Branch name pattern: `main`
4. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass
5. Save changes

Now changes require pull requests instead of direct pushes.

---

## GitHub Actions (Future Enhancement)

You could add automated testing with GitHub Actions:

Create `.github/workflows/validate.yml`:
```yaml
name: Validate Scripts
on: [push, pull_request]
jobs:
  shellcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run ShellCheck
        uses: ludeeus/action-shellcheck@master
        with:
          scandir: './scripts'
```

This would automatically check bash script quality on every push.

---

## Common Issues

### Issue: Authentication Failed

**Solution**: Use personal access token instead of password
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo` (full control)
4. Copy token and use as password when pushing

### Issue: Remote Already Exists

```bash
# Remove existing remote
git remote remove origin

# Add new one
git remote add origin https://github.com/YOUR_USERNAME/lmrc-pi-deployment.git

# Push
git push -u origin main
```

### Issue: Divergent Branches

```bash
# Force push (only if you're sure)
git push -u origin main --force

# Or fetch and merge first
git pull origin main --rebase
git push -u origin main
```

---

## Updating Repository Information

After creating the GitHub repo, update these files:

### README.md
```bash
nano README.md
```

Add at the top:
```markdown
## GitHub Repository

**Repository**: https://github.com/YOUR_USERNAME/lmrc-pi-deployment
**Issues**: https://github.com/YOUR_USERNAME/lmrc-pi-deployment/issues
**Releases**: https://github.com/YOUR_USERNAME/lmrc-pi-deployment/releases
```

### DEPLOYMENT_GUIDE.md
Update clone commands with actual repository URL.

---

## Next Steps

After pushing to GitHub:

1. ✅ Verify all files uploaded
2. ✅ Create v1.0.1 release
3. ✅ Update README with GitHub links
4. ✅ Add collaborators if needed
5. ✅ Set up branch protection (optional)
6. ✅ Star your own repository!
7. ✅ Begin hardware testing

---

**Need Help?**

- GitHub Docs: https://docs.github.com
- Git Basics: https://git-scm.com/book/en/v2

---

**Created**: 2025-10-28
**Last Updated**: 2025-10-28
