# Contributing to LMRC Raspberry Pi Deployment System

Thank you for considering contributing to the LMRC deployment system!

## Code of Conduct

This project is for Lake Macquarie Rowing Club and contributors should:
- Be respectful and constructive
- Focus on what is best for the club
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Use the bug report template when creating issues. Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Pi model, OS version)
- Relevant logs

### Suggesting Enhancements

Use the feature request template. Explain:
- The problem it solves
- Your proposed solution
- Why it would be useful for the club

### Hardware Testing

Use the hardware test report template. We especially need:
- Testing on different Pi models (Pi 4 vs Pi 5)
- Testing on different OS versions
- Long-term stability testing
- Edge case testing (network failures, power loss, etc.)

## Development Process

### Setting Up Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/lmrc-pi-deployment.git
   cd lmrc-pi-deployment
   ```

3. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Making Changes

1. **Test on Actual Hardware**: All changes must be tested on a Raspberry Pi
2. **Follow Bash Best Practices**:
   - Use `set -e` at the top of scripts
   - Quote variables: `"$VARIABLE"`
   - Use `[[ ]]` for conditionals
   - Add error handling
   - Include helpful echo statements

3. **Update Documentation**: If your change affects usage, update:
   - README.md
   - Relevant docs in docs/
   - CHANGELOG.md

4. **Maintain Security**:
   - No hardcoded credentials
   - Maintain file permissions (600 for credentials, 755 for scripts)
   - Keep systemd security hardening

### Submitting Changes

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Brief description of changes"
   ```

2. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request**:
   - Use the PR template
   - Reference any related issues
   - Describe testing performed
   - Add screenshots if relevant

### Pull Request Review Process

1. Maintainers will review your PR
2. May request changes or testing
3. Once approved, will be merged to main
4. Will be included in next release

## Coding Standards

### Bash Scripts

```bash
#!/bin/bash
set -e  # Exit on error

# Use descriptive variable names
CONFIG_FILE="/path/to/config"

# Quote variables
if [ -f "$CONFIG_FILE" ]; then
    echo "Config found"
fi

# Use functions for reusable code
check_service() {
    local service=$1
    systemctl is-active --quiet "$service"
}

# Provide user feedback
echo "Starting process..."
# Do work
echo "✓ Process complete"
```

### Documentation

- Use clear, concise language
- Include examples
- Keep table of contents updated
- Use proper markdown formatting

### Git Commits

Format:
```
Brief summary (50 chars or less)

More detailed explanation if needed. Wrap at 72 characters.
Explain what and why, not how.

- Bullet points are okay
- Use present tense ("Add feature" not "Added feature")
```

## Project Structure

```
lmrc-pi-deployment/
├── scripts/          # Management scripts
├── systemd/          # Service files
├── config/           # Templates
├── docs/             # Documentation
├── .github/          # GitHub templates
└── README.md         # Main documentation
```

## Testing Checklist

Before submitting PR:

- [ ] Tested on Raspberry Pi 4 or 5
- [ ] Ran install.sh successfully
- [ ] Ran test-installation.sh - all checks pass
- [ ] Both applications work (Booking Viewer and Noticeboard)
- [ ] Application switching works
- [ ] Health check passes
- [ ] No errors in logs
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

## Questions?

- Check existing issues and documentation first
- Ask in issue comments
- Contact club technical committee

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.

---

Thank you for helping improve the LMRC deployment system! 🚣
