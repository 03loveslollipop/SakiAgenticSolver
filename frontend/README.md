# CTF Challenge Automation Platform - Frontend

React + TypeScript frontend for the CTF Challenge Automation Platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and set:
- `VITE_DEV=true` for local development (uses http://localhost:8000)
- `VITE_DEV=false` for production (uses https://api.saki.02labs.me)

## Development

Run the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

**Note**: Make sure `VITE_DEV=true` is set in your `.env` file to connect to your local backend.

## Building

Build for production:
```bash
npm run build
```

**Note**: For production builds, ensure `VITE_DEV=false` or remove the variable entirely. The build will automatically use the production API URL (https://api.saki.02labs.me).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_DEV` | Development mode flag. Set to `true` for local dev, `false` for production | `false` |
| `VITE_API_BASE_URL` | Optional API URL override. Only used when `VITE_DEV=false` | `https://api.saki.02labs.me` |

### Examples

**Local Development**:
```bash
VITE_DEV=true
```

**Production**:
```bash
VITE_DEV=false
# or simply omit the variable
```

**Custom API URL**:
```bash
VITE_DEV=false
VITE_API_BASE_URL=https://custom-api.example.com
```

## Testing

Run tests:
```bash
npm test
```

## Tech Stack

- React 18
- TypeScript
- Vite
- xterm.js for terminal emulation
- Axios for API calls
- React Router for navigation
- Jest & React Testing Library for testing
- fast-check for property-based testing
