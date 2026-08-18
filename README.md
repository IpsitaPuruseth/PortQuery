# PortQuery UI Application

A modern web-based interface for Microsoft PortQryV2 that runs commands through a backend and displays the results in the browser.

## 📋 Overview

This application provides a user-friendly interface to run PortQuery commands and view the results in real-time, exactly as they appear in CMD.

## 🏗️ Architecture

- **Frontend**: React + Vite (modern UI)
- **Backend**: Node.js + Express (executes PortQryV2.exe via `spawn`)
- **Communication**: HTTP request/response — the frontend sends the command as JSON (POST `/api/portquery`) and the backend returns the output and exit code as JSON

## ⚙️ Prerequisites

1. **Node.js** (v14 or higher)
2. **PortQryV2** installed on Windows
   - Download: [Microsoft PortQry v2.0](https://www.microsoft.com/en-us/download/details.aspx?id=17148)

## 🚀 Quick Start

### Step 1: Install Backend Dependencies

```bash
cd PortQueryProject/Backend
npm install
```

### Step 2: Configure PortQry Path

Set your PortQry installation path in `Backend/server.js` via the `PORTQRY_PATH` constant:

```js
const PORTQRY_PATH = 'C:\\PortQryV2\\PortQry.exe';
```

### Step 3: Start Backend Server

```bash
cd PortQueryProject/Backend
npm start
```

Server will run at `http://localhost:3001`

### Step 4: Start Frontend Application

Open a new terminal:

```bash
cd PortQueryProject/Frontend
npm install
npm run dev
```

Frontend will run at `http://localhost:5173` (or the port shown in terminal)

### Step 5: Use the Application

1. Open your browser to the frontend URL
2. Enter a PortQry command (e.g., `portqry -n localhost -e 80`)
3. Click "Run"
4. View the output and exit code returned from PortQryV2

## 📝 Example Commands

```bash
# Check TCP port 80 on localhost
portqry -n localhost -e 80

# Check UDP port 53 on a DNS server
portqry -n 8.8.8.8 -e 53 -p udp

# Check multiple ports
portqry -n google.com -r 80:443

# Check specific service
portqry -n 192.168.1.1 -e 445
```

## 🛠️ Troubleshooting

### Backend Issues

**PortQry not found:**
- Verify PortQryV2 is installed
- Check `PORTQRY_PATH` in `Backend/.env`
- Test by running `PortQry.exe` in CMD

**Port 3001 already in use:**
- Change the `PORT` constant in `Backend/server.js`
- Update `API_URL` in `Frontend/src/App.jsx` to match

### Frontend Issues

**Cannot connect to backend:**
- Ensure backend server is running
- Check backend console for errors
- Verify `API_URL` in `App.jsx` matches backend port

**CORS errors:**
- CORS is pre-configured in the backend
- Ensure you're accessing frontend via the Vite dev server URL

## 📁 Project Structure

```
PortQueryProject/
├── Backend/
│   ├── server.js           # Express server that runs PortQry via spawn
│   ├── package.json        # Backend dependencies
│   ├── .env                # Configuration (PortQry path, port)
│   └── README.md           # Backend documentation
│
└── Frontend/
	├── src/
	│   ├── App.jsx         # Main component with API integration
	│   ├── components/     # UI components
	│   └── main.jsx        # Entry point
	├── package.json        # Frontend dependencies
	└── vite.config.js      # Vite configuration
```

## 🔒 Security

- All commands are validated to start with "portqry"
- Command injection prevention implemented
- Only authorized PortQry commands are executed

## 🎯 Features

✅ Runs PortQry commands and displays the output with exit code  
✅ Export report with a native "Save As" dialog to choose the save location (Chrome/Edge), with a download fallback  
✅ Loading states and error handling (30s request timeout)  
✅ PortQuery tips and documentation  
✅ Clear functionality to reset the view  
✅ Responsive UI with Tailwind CSS  

## 📦 Dependencies

### Backend
- express: Web server
- cors: Cross-origin support

### Frontend
- react: UI framework
- vite: Build tool
- tailwindcss: Styling

## 🤝 Contributing

This is a custom internal tool. For issues or improvements, contact the development team.

## 📄 License

ISC
