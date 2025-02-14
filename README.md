# XCord Project

## Project Structure

```
xcord/
├── frontend/           # Frontend application
│   ├── css/           # Stylesheets
│   ├── js/            # JavaScript files
│   └── index.html     # Main HTML file
├── services/          # Backend services
│   ├── index.js       # Main server file
│   └── package.json   # Backend dependencies
├── docs/             # Project documentation
└── memory-bank/      # Memory bank files
```

## Setup Instructions

### Frontend Setup
1. Open `frontend/index.html` in a web browser
2. For development, you can use any local server

### Backend Setup
1. Navigate to the services directory:
   ```bash
   cd services
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your configuration

4. Start the server:
   ```bash
   npm run dev    # Development mode
   npm start     # Production mode
   ```

## Development

- Frontend is accessible at `frontend/index.html`
- Backend API runs on `http://localhost:3000`
- API health check: `http://localhost:3000/api/health`

## Documentation

Refer to the `docs` directory for detailed documentation about:
- Project Overview
- Architecture
- Development Guide
- Testing Strategy
- Deployment Guide
- Improvement Suggestions
