# @lmrc/config

Shared configuration library for LMRC applications.

## Features

- Type-safe configuration schemas using Zod
- Configuration file management (load/save/validate)
- Session management utilities
- Default profile templates

## Installation

```bash
npm install @lmrc/config
```

## Usage

### Load and Validate Configuration

```typescript
import { ConfigManager } from '@lmrc/config';

const manager = new ConfigManager('/path/to/config/club-profile.json');

// Load and validate
const config = await manager.load();

console.log(config.club.name); // "Lake Macquarie Rowing Club"
console.log(config.sessions); // Array of sessions
```

### Update Sessions

```typescript
// Add a new session
await manager.addSession({
  id: 'PM',
  name: 'Afternoon',
  startTime: '16:00',
  endTime: '18:00',
  daysOfWeek: [1, 2, 3, 4, 5],
  color: '#f97316',
  priority: 3,
});

// Update an existing session
await manager.updateSession('AM1', {
  startTime: '06:00',
  endTime: '07:00',
});

// Remove a session
await manager.removeSession('PM');
```

### Create Default Profile

```typescript
import { createDefaultProfile } from '@lmrc/config';

const profile = createDefaultProfile('lmrc', 'Lake Macquarie Rowing Club');

await manager.save(profile);
```

### Validate Session Times

```typescript
import { validateSessionTimes, type Session } from '@lmrc/config';

const session: Session = {
  id: 'AM',
  name: 'Morning',
  startTime: '06:30',
  endTime: '08:30',
  daysOfWeek: [1, 2, 3, 4, 5],
};

if (validateSessionTimes(session)) {
  console.log('Session times are valid');
}
```

## Configuration Schema

### ClubProfile

```typescript
{
  version: string;              // "1.0.0"
  club: {
    id: string;                 // "lmrc"
    name: string;               // "Lake Macquarie Rowing Club"
    shortName: string;          // "LMRC"
    timezone: string;           // "Australia/Sydney"
  };
  branding: {
    logoUrl: string;            // URL to club logo
    primaryColor: string;       // Hex color "#1e40af"
    secondaryColor: string;     // Hex color "#0ea5e9"
  };
  sessions: Session[];          // Array of session configs
  revSport: {
    baseUrl: string;            // RevSport integration URL
  };
}
```

### Session

```typescript
{
  id: string;                   // "AM1", "AM2", "SAT"
  name: string;                 // "Early Morning"
  startTime: string;            // "06:30" (HH:MM format)
  endTime: string;              // "07:30" (HH:MM format)
  daysOfWeek: number[];         // [1,2,3,4,5] (0=Sunday, 6=Saturday)
  color?: string;               // "#60a5fa" (optional)
  priority?: number;            // Display order (optional)
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## License

MIT
