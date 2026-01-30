# LMRC Raspberry Pi Deployment System

A deployment management system for running LMRC applications on Raspberry Pi devices at the boatshed.

> 📚 **Complete Production Deployment Guide**
>
> For the full deployment guide with detailed instructions, see:
> - **[Production Setup Guide](../docs/deployment/production-setup.md)** - Complete deployment instructions
> - **[Troubleshooting Guide](../docs/deployment/troubleshooting.md)** - Common issues and solutions
> - **[Architecture Overview](../docs/architecture/overview.md)** - System architecture
> - **[Solution Documentation](../docs/)** - All LMRC documentation

## Overview

This system allows non-technical staff to easily configure which application runs on each Raspberry Pi:
- **Boat Booking Viewer** - 7-day booking calendar
- **Digital Noticeboard** - Club news, events, photos, and weather

Each Pi runs one application, selected at first boot, with automatic startup on subsequent reboots.

## Features

- **Simple Selection**: Numbered menu (1-2) for choosing which app to run
- **Persistent Configuration**: Set once, runs forever
- **Resource Efficient**: Only active app's services and background jobs run
- **Centralized Credentials**: Shared RevSport authentication
- **Easy Switching**: Simple command to change applications
- **Production Ready**: Systemd-based service management with auto-restart

## Quick Start

### Prerequisites

- Raspberry Pi 4 or 5 (4GB+ RAM recommended)
- Raspberry Pi OS (64-bit, Bookworm)
- Internet connection
- LMRC RevSport credentials

### Installation

1. **Clone this repository**
   ```bash
   cd /opt/lmrc
   sudo git clone https://github.com/UndefinedRest/lmrc-pi-deployment.git deployment
   ```

2. **Run the installer**
   ```bash
   cd deployment
   sudo chmod +x scripts/*.sh
   sudo ./scripts/install.sh
   ```

   The installer will:
   - Install Node.js 20+ and Chromium
   - Create directory structure and system user
   - Clone both applications from GitHub
   - Install systemd services
   - Auto-detect desktop user for kiosk configuration

3. **Configure credentials**
   ```bash
   sudo nano /opt/lmrc/shared/config/credentials.env
   ```

   **Required for both apps:**
   ```env
   REVSPORT_USERNAME=your_username
   REVSPORT_PASSWORD=your_password
   REVSPORT_BASE_URL=https://www.lakemacquarierowingclub.org.au
   ```

   **Required for Noticeboard (weather display):**
   ```env
   # Get a free API key from https://openweathermap.org/api
   OPENWEATHERMAP_API_KEY=your_api_key_here
   ```

   Save: **Ctrl+X**, **Y**, **Enter**

4. **Select application**
   ```bash
   sudo /opt/lmrc/shared/scripts/select-app.sh
   # Choose which app (1 or 2)
   # Reboot when prompted
   ```

**Note**: The kiosk loads `http://localhost:3000` which serves the production TV display (index.html). The old debug page has been removed.

## Directory Structure

```
/opt/lmrc/
├── deployment/              # This repository
│   ├── scripts/            # Management scripts
│   ├── systemd/            # Service files
│   ├── config/             # Configuration templates
│   └── docs/               # Documentation
├── shared/                  # Created by installer
│   ├── config/
│   │   ├── device-config.json
│   │   └── credentials.env
│   ├── scripts/            # Copied from deployment/scripts
│   └── logs/
├── booking-viewer/          # Booking Viewer app
└── noticeboard/             # Noticeboard app
```

## Management

### Check Status

```bash
/opt/lmrc/shared/scripts/status.sh
```

Shows current app, service status, and device information.

### Switch Applications

```bash
sudo /opt/lmrc/shared/scripts/switch-app.sh
```

Switches to the other application and prompts to reboot.

### View Logs

```bash
# Current app logs
sudo journalctl -u lmrc-booking-viewer -f
# or
sudo journalctl -u lmrc-noticeboard -f

# All LMRC services
sudo journalctl -u lmrc-* -f

# Log files
tail -f /opt/lmrc/shared/logs/booking-viewer.log
tail -f /opt/lmrc/shared/logs/noticeboard.log
```

### Restart Service

```bash
sudo systemctl restart lmrc-booking-viewer
# or
sudo systemctl restart lmrc-noticeboard
```

## How It Works

1. **Boot Time**: `lmrc-launcher.service` starts
2. **Check Configuration**: Reads `activeApp` from `device-config.json`
3. **First Boot**: If no app selected, runs interactive selector
4. **Start Application**: Starts the selected app's systemd service
5. **Background Jobs**: Configures cron jobs if needed (Noticeboard scraper)
6. **Kiosk Mode**: `lmrc-kiosk.service` launches Chromium in fullscreen

## Configuration

### Device Configuration

Located at `/opt/lmrc/shared/config/device-config.json`

```json
{
  "activeApp": "booking-viewer",  // or "noticeboard"
  "device": {
    "id": "rpi-boatshed-01",
    "name": "Boatshed Display 01"
  }
}
```

### Shared Credentials

Located at `/opt/lmrc/shared/config/credentials.env`

Both applications use this file for RevSport authentication.

## Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status lmrc-booking-viewer
sudo systemctl status lmrc-noticeboard

# View recent logs
sudo journalctl -u lmrc-* --since "10 minutes ago"
```

### Display Shows Black Screen

```bash
# Check kiosk service
sudo systemctl status lmrc-kiosk

# Restart kiosk
sudo systemctl restart lmrc-kiosk
```

### Wrong Application Running

```bash
# Check current configuration
/opt/lmrc/shared/scripts/status.sh

# Switch to correct app
sudo /opt/lmrc/shared/scripts/switch-app.sh
```

### Application Not Responding

```bash
# Check if port 3000 is accessible
curl http://localhost:3000

# Check credentials
cat /opt/lmrc/shared/config/credentials.env
```

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for detailed troubleshooting guide.

## Documentation

- [Architecture Details](docs/ARCHITECTURE.md) - Complete system architecture
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Step-by-step deployment instructions

## Maintenance

### Regular Tasks

**Weekly**: Verify displays are functioning

**Monthly**:
- Review logs
- Check disk space: `df -h`
- Verify credentials still valid

**Quarterly**:
- Update system: `sudo apt update && sudo apt upgrade`
- Test application switching

### Updating Applications

```bash
cd /opt/lmrc/booking-viewer  # or noticeboard
sudo -u lmrc git pull
sudo -u lmrc npm install
sudo -u lmrc npm run build
sudo systemctl restart lmrc-booking-viewer  # or lmrc-noticeboard
```

## Security

- Dedicated `lmrc` user with limited privileges
- Service files include security hardening
- Credentials in restricted-access file (600 permissions)
- No sudo access required for normal operation

## Contributing

1. Test changes on a development Pi first
2. Update documentation if changing behavior
3. Ensure scripts remain non-technical-user friendly
4. Follow existing patterns for consistency

## Support

For issues or questions:
1. Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. Review logs: `sudo journalctl -u lmrc-*`
3. Contact club technical committee

## License

MIT License - Built for Lake Macquarie Rowing Club

## Version

**1.0.0** - Initial release
