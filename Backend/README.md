# PortQuery Backend Server

This is the backend server for the PortQuery UI application. It executes PortQryV2 commands and returns the output to the frontend as JSON.

## Prerequisites

- **Node.js** (v14 or higher)
- **PortQryV2** installed on your Windows system
  - Download from: [Microsoft PortQry Command Line Port Scanner Version 2.0](https://www.microsoft.com/en-us/download/details.aspx?id=17148)

## Installation

1. Install dependencies:
```bash
npm install
```

## Configuration

### Setting up PortQry Path

Set the `PORTQRY_PATH` constant in `server.js` to point to your PortQry.exe installation:

```js
// If PortQry.exe is in your system PATH, use 'PortQry.exe'.
// Otherwise set the full path.
const PORTQRY_PATH = 'C:\\PortQryV2\\PortQry.exe';
```

### Common PortQry Installation Paths:
- `C:\Program Files\PortQryV2\PortQry.exe`
- `C:\Windows\System32\PortQry.exe`
- `C:\PortQryV2\PortQry.exe`

### Port Configuration

The backend server runs on port `3001` by default. You can change this via the `PORT` constant in `server.js`:

```js
const PORT = 3001;
```

## Running the Server

### Development Mode
```bash
npm start
```
or
```bash
npm run dev
```

The server will start at `http://localhost:3001`

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns server status

### Execute PortQuery Command
- **POST** `/api/portquery`
- Body: `{ "command": "portqry -n localhost -e 80" }`
- Returns: JSON `{ command, output, exitCode }`

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:3001/api/portquery \
  -H "Content-Type: application/json" \
  -d "{\"command\": \"portqry -n localhost -e 80\"}"
```

### Using the Frontend
1. Start the backend server (this folder)
2. Start the frontend application (Frontend folder)
3. Enter a PortQry command in the UI
4. Click "Run" to execute

## Troubleshooting

### Error: "PortQry.exe not found"
- Ensure PortQryV2 is installed on your system
- Check the `PORTQRY_PATH` constant in `server.js`
- Verify the path by running `PortQry.exe` in CMD

### Error: "Port 3001 is already in use"
- Change the `PORT` constant in `server.js` to a different number
- Update the frontend `API_URL` in `Frontend/src/App.jsx` accordingly

### Error: "CORS policy"
- The server already has CORS enabled
- Ensure the frontend is making requests to the correct URL
- Check browser console for detailed error messages

## Security Notes

- The backend validates that all commands start with "portqry"
- Command injection prevention is implemented
- Only validated PortQry commands are executed

## Tech Stack

- **Express.js** - Web server framework
- **cors** - Cross-Origin Resource Sharing middleware
- **child_process** - Node.js module for spawning the PortQry process
