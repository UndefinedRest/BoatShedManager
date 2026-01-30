---
name: Bug Report
about: Report a bug or issue with the deployment system
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description

A clear and concise description of what the bug is.

## Environment

- **Raspberry Pi Model**: (e.g., Pi 4 4GB, Pi 5 8GB)
- **Raspberry Pi OS Version**: (e.g., Bookworm 64-bit)
- **Deployment Version**: (run `cat /opt/lmrc/deployment/VERSION`)
- **Active Application**: (Booking Viewer or Noticeboard)

## Steps to Reproduce

1. Go to '...'
2. Run command '...'
3. See error

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Logs

```bash
# Paste relevant logs here
sudo journalctl -u lmrc-* -n 50
```

## Screenshots

If applicable, add screenshots to help explain your problem.

## Additional Context

Add any other context about the problem here.
