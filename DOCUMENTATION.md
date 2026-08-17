# PortQuery Application — Complete Documentation

> A web-based interface for Microsoft **PortQryV2** that runs real port-query commands and shows the exact CMD output in a browser UI.

---

## Table of Contents
1. [Overview](#1-overview)
2. [Why We Need a Backend](#2-why-we-need-a-backend)
3. [Folder Structure](#3-folder-structure)
4. [Architecture Diagram](#4-architecture-diagram)
5. [Numbered Process Flow](#5-numbered-process-flow)
6. [The Three Layers Explained](#6-the-three-layers-explained)
7. [What is `async / await`?](#7-what-is-async--await)
8. [API Routes (`/api/health`, `/api/portquery`)](#8-api-routes)
9. [server.js — Line/Block Explanation](#9-serverjs--block-by-block)
10. [App.jsx — Line/Block Explanation](#10-appjsx--block-by-block)
11. [What is an API + How to Explain It](#11-what-is-an-api--how-to-explain-it)
12. [Where & What Data We Send (Data Flow)](#12-where--what-data-we-send-data-flow)
13. [Export Report Feature (Download as TXT)](#13-export-report-feature-download-as-txt)
14. [How to Run](#14-how-to-run)
15. [Troubleshooting](#15-troubleshooting)
16. [Glossary](#16-glossary)

---

## 1. Overview

**PortQuery** lets a user type a `portqry` command into a web page, runs the **real** `PortQry.exe` on the Windows machine, and displays the exact output — the same result you would see in CMD.

| Layer | Technology | Runs at |
|-------|-----------|---------|
| Frontend | React + Vite | http://localhost:5173 |
| Backend | Node.js + Express | http://localhost:3001 |
| Tool | PortQryV2 (PortQry.exe) | C:\PortQryV2\PortQry.exe |

---

## 2. Why We Need a Backend

A **web browser cannot run programs** on your computer (a security restriction called "sandboxing"). So the browser cannot launch `PortQry.exe` directly.

The **backend** is a small server that IS allowed to run programs. It acts as a secure **bridge**:

```
Browser  →  (asks)  →  Backend  →  (runs)  →  PortQry.exe
Browser  ←  (shows) ←  Backend  ←  (output) ← PortQry.exe
```

**Answer to "do we need a backend?" → YES**, because only a program running outside the browser can execute the real tool.

---

## 3. Folder Structure

```
PortQueryProject/
│
├── Backend/                      # The Node.js + Express server
│   ├── server.js                 # Main server: runs PortQry.exe, returns output
│   ├── package.json              # Backend dependencies (express, cors)
│   ├── package-lock.json
│   └── .gitignore
│
├── Frontend/                     # The React + Vite web UI
│   ├── index.html                # HTML entry page
│   ├── vite.config.js            # Vite build config
│   ├── package.json              # Frontend dependencies (react, vite, tailwind)
│   └── src/
│       ├── main.jsx              # React entry point (renders <App />)
│       ├── App.jsx               # Main logic: state, handleRun, fetch to backend
│       ├── App.css               # Styles
│       └── components/
│           ├── CommandSection.jsx       # Input box + Run/Tips buttons
│           ├── InformationSection.jsx   # Output textarea
│           ├── ButtonSection.jsx        # Clear / Export buttons
│           └── PortQueryTips.jsx        # (legacy tips modal, unused)
│
└── DOCUMENTATION.md              # This file
```

---

## 4. Architecture Diagram

```
						  YOUR COMPUTER
 ┌──────────────────────────────────────────────────────────────────┐
 │                                                                    │
 │   BROWSER (http://localhost:5173)                                  │
 │   ┌────────────────────────────────────────┐                      │
 │   │  React UI (App.jsx)                     │                      │
 │   │  [ portqry -n localhost -e 80 ]  (1)    │                      │
 │   │  [ Run ] ──► handleRun()         (2)    │                      │
 │   │  ▲                                      │                      │
 │   │  │ (9) setOutput(result)                │                      │
 │   │  Information Window (textarea)          │                      │
 │   └──────────┬──────────────────▲───────────┘                     │
 │              │ (3) fetch POST    │ (8) JSON response               │
 │              ▼                   │                                 │
 │   BACKEND (http://localhost:3001)│                                 │
 │   ┌──────────────────────────────┴──────────┐                     │
 │   │  Node.js + Express (server.js)           │                     │
 │   │  (4) validate/normalize command          │                     │
 │   │  (5) spawn PortQry.exe ───────────────┐  │                     │
 │   │  (7) collect output, build JSON  ◄────┤  │                     │
 │   └───────────────────────────────────────┼──┘                    │
 │                                            │ (6) runs & prints     │
 │   ┌────────────────────────────────────┐  │                       │
 │   │  C:\PortQryV2\PortQry.exe           │◄─┘                       │
 │   │  queries the port, prints result    │                          │
 │   └─────────────────────────────────────┘                         │
 └────────────────────────────────────────────────────────────────────┘
```

---

## 5. Numbered Process Flow

| # | Step | Where | What happens |
|---|------|-------|--------------|
| 1 | Type command | Frontend (CommandSection) | User types `portqry -n localhost -e 80` |
| 2 | Click **Run** | Frontend (App.jsx) | `handleRun()` fires |
| 3 | Send request | Frontend → Backend | `fetch()` POSTs the command as JSON to `/api/portquery` |
| 4 | Receive & clean | Backend (server.js) | Express reads and normalizes the command |
| 5 | Run the tool | Backend | `spawn()` launches the real PortQry.exe |
| 6 | Tool executes | PortQry.exe | Queries the port, prints results |
| 7 | Capture output | Backend | Node collects PortQry's stdout/stderr |
| 8 | Send response | Backend → Frontend | Express returns JSON `{ command, output, exitCode }` |
| 9 | Show result | Frontend | `setOutput()` displays it in the textarea |

---

## 6. The Three Layers Explained

### Layer 1 — Frontend (React + Vite)
The **user interface** running in the browser. Handles typing, buttons, and displaying output. Sends the command to the backend with `fetch()`.

Key files: `App.jsx` (brain), `CommandSection.jsx` (input), `InformationSection.jsx` (output).

### Layer 2 — Backend (Node.js + Express)
- **Node.js** = lets JavaScript run outside the browser (directly on the machine). This is what makes running `PortQry.exe` possible.
- **Express** = a library that makes Node easy to use as a web server ("when a request comes to this URL, do this").

The 3 backend libraries:
| Library | Purpose |
|---------|---------|
| express | Creates the web server / routes |
| cors | Lets the browser (5173) call the backend (3001) |
| child_process (`spawn`) | Actually launches PortQry.exe (built into Node) |

### Layer 3 — PortQry.exe
Microsoft's actual tool. Node runs it exactly like CMD would, which is why the UI output matches CMD exactly.

---

## 7. What is `async / await`?

Some tasks take time (like a network request). We don't want the page to **freeze** while waiting. `async/await` lets the app wait in the background and continue when the result arrives.

| Keyword | Meaning |
|---------|---------|
| `async` | "This function has slow tasks and is allowed to wait." |
| `await` | "Pause here until this slow task finishes, then continue with the result." |

**Coffee analogy:**
```js
async function getCoffee() {
  const coffee = await orderCoffee(); // wait until ready
  drink(coffee);                      // runs only AFTER coffee is ready
}
```

**In our code:**
```js
async function handleRun() {
  const response = await fetch(...);   // wait for backend reply
  const data = await response.json();  // wait to read reply
  setOutput(result);                   // now show it
}
```
Rule: `await` can only be used inside an `async` function.

---

## 8. API Routes

Routes (endpoints) are **URLs on the backend** — each is a "door" that runs specific code.

### `/api/health` — "Are you alive?" (GET)
```js
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'PortQuery Backend is running' });
});
```
A quick check that the server is running. Visiting it returns `{ status: "OK" }`. A **GET** request = just asking for info.

### `/api/portquery` — "Run PortQry" (POST)
```js
app.post('/api/portquery', (req, res) => {
  const { command } = req.body;
  // ... spawn PortQry.exe, collect output ...
  res.json({ output, exitCode });
});
```
The main door. The frontend **POSTs** the command here. A **POST** request = sending data to be processed.

| | GET (`/api/health`) | POST (`/api/portquery`) |
|---|---|---|
| Purpose | Ask for info | Send data to process |
| Sends data? | No | Yes (the command) |

`/api/` is just a naming convention meaning "these URLs are for programs, not humans browsing."

---

## 9. server.js — Block by Block

### A. Imports
```js
const express = require('express');            // web server library
const { spawn } = require('child_process');    // run external programs
const cors = require('cors');                  // allow browser to connect
```

### B. App + settings
```js
const app = express();
const PORT = 3001;                             // door number
const PORTQRY_PATH = 'C:\\PortQryV2\\PortQry.exe';  // \\ = one backslash
```

### C. Middleware (runs on every request)
```js
app.use(cors());          // add "browser allowed" permission
app.use(express.json());  // auto-read JSON body into req.body
```

### D. Health route
```js
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'PortQuery Backend is running' });
});
```
`req` = incoming request, `res` = response we send back.

### E. Main route start
```js
app.post('/api/portquery', (req, res) => {
  const { command } = req.body;   // pull command from the JSON sent
```

### F. Validate
```js
if (!command || typeof command !== 'string') {
  return res.status(400).json({ error: 'Invalid command provided' });
}
```
Reject empty/non-text input with error 400 (Bad Request).

### G. Normalize
```js
let trimmedCommand = command.trim();
trimmedCommand = trimmedCommand.replace(/^portquery/i, 'portqry'); // fix typo
if (!/^portqry(\.exe)?\b/i.test(trimmedCommand)) {
  trimmedCommand = 'portqry ' + trimmedCommand;  // ensure it starts with portqry
}
```

### H. Turn text into an argument list
```js
const argsString = trimmedCommand
  .replace(/^portqry(\.exe)?/i, '')
  .replace(/^\s*\.exe\b/i, '')
  .trim();
const args = argsString.match(/(?:[^\s"]+|"[^"]*")+/g) || []; // split into list
const cleanedArgs = args.map(arg => arg.replace(/^"|"$/g, '')); // strip quotes
const finalArgs = cleanedArgs.filter(arg => arg.toLowerCase() !== '-i'); // drop -i
```
`spawn` needs arguments as a list, e.g. `['-n', 'localhost', '-e', '80']`.

### I. Run the real tool (most important line)
```js
const portqry = spawn(portqryPath, finalArgs, {
  shell: false,
  windowsHide: true      // don't pop up a console window
});
```

### J. Prepare to collect output
```js
let output = '';
let responded = false;   // guard so we never reply twice
const sendResponse = (exitCode) => {
  if (responded) return;
  responded = true;
  res.json({ command: `portqry ${finalArgs.join(' ')}`, output, exitCode });
};
```

### K. Capture printed output
```js
portqry.stdout.on('data', (data) => { output += data.toString(); }); // normal output
portqry.stderr.on('data', (data) => { output += data.toString(); }); // error output
```

### L. Handle "couldn't start"
```js
portqry.on('error', (err) => {
  // err.code === 'ENOENT' means file not found
  output += `Failed to execute PortQry: ${err.message}`;
  sendResponse(-1);
});
```

### M. Handle "finished"
```js
portqry.on('close', (code) => {
  if (!output.trim()) output = `PortQry finished with code ${code} but no output.`;
  sendResponse(code);   // NOW send everything back
});
```

### N. Start listening
```js
app.listen(PORT, () => {
  console.log('Status: Running');  // open port 3001 and wait for requests
});
```

---

## 10. App.jsx — Block by Block

### A. State (the app's memory)
```js
const [command, setCommand] = useState("");     // input box text
const [output, setOutput] = useState("...");     // textarea text
const [isRunning, setIsRunning] = useState(false); // loading flag
```
`useState` returns `[value, setterFunction]`. Calling a setter re-draws the screen.

### B. handleRun starts
```js
async function handleRun() {
  let cmd = command.trim();
  if (cmd === "") { setOutput("Please enter a command."); return; }
```

### C. Normalize (same idea as backend)
```js
cmd = cmd.replace(/^portquery/i, "portqry");
if (!/^portqry(\.exe)?\b/i.test(cmd)) { cmd = "portqry " + cmd; }
```

### D. Loading state
```js
setIsRunning(true);
setOutput("Running command...\n");
```

### E. Send request to backend
```js
try {
  const response = await fetch(`${API_URL}/api/portquery`, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ command: cmd }),  // JS object -> JSON text
  });
```

### F. Read the reply
```js
  const data = await response.json();          // parse JSON reply
  if (!response.ok) { setOutput(`Error: ${data.error}`); return; }
```

### G. Format and display
```js
  let result = `${data.command}\n`;
  result += `${"=".repeat(60)}\n\n`;
  result += data.output;
  result += `\n${"=".repeat(60)}\n`;
  result += `Process completed with exit code: ${data.exitCode}\n`;
  setOutput(result);                            // show on screen
```

### H. Handle failure
```js
} catch (error) {
  setOutput(`Failed to connect to backend server...`);
} finally {
  setIsRunning(false);   // always re-enable buttons
}
```

### I. Helpers
```js
function handleClear() { setCommand(""); setOutput("Port Query output..."); }
function handleTips()  { setOutput(PORT_QUERY_TIPS); }  // dump help text
```

### J. The UI (JSX)
```jsx
return (
  <div className="container">
	<CommandSection command={command} setCommand={setCommand}
					handleRun={handleRun} handleTips={handleTips}
					isRunning={isRunning} />
	<InformationSection output={output} />
	<ButtonSection handleClear={handleClear} isRunning={isRunning} />
  </div>
);
```
Data/functions are passed to child components via **props** (`name={value}`). When `output` changes, React auto-redraws `InformationSection`.

---

## 11. What is an API + How to Explain It

**API = Application Programming Interface** — a contract that lets two programs talk to
each other. It defines *"send me this, and I'll send you back that."*

In this app, the **frontend** and **backend** are two separate programs. The API is the
agreed set of "doors" (endpoints) they use to communicate.

### The APIs in this project

| Endpoint | Method | Use |
|----------|--------|-----|
| `/api/health` | GET | Check if the backend is alive |
| `/api/portquery` | POST | Send a command → run PortQry.exe → return output |

### The 3 parts of an API call

| Part | In this project |
|------|-----------------|
| Endpoint (URL) | `http://localhost:3001/api/portquery` |
| Method | `POST` (sending data) or `GET` (asking for data) |
| Data format | JSON — `{ "command": "..." }` in, `{ "output": "..." }` out |

### What to say if asked "What is the API and how is it used?"

> "An API is the set of endpoints my backend exposes so the frontend can talk to it.
> When the user clicks Run, my frontend uses `fetch()` to call the `/api/portquery`
> endpoint with a POST request, sending the command as JSON. The backend runs the real
> PortQry.exe and returns the output as JSON, which the frontend displays."

### Why use an API instead of doing it directly?

> "Because the browser can't run programs for security reasons. The API is the bridge —
> the frontend asks the backend to run PortQry on its behalf and gets the result back.
> It also keeps frontend and backend independent."

### Analogy — a restaurant menu

> An API is like a menu. It defines what you can order and how. You (frontend) don't go
> into the kitchen — you order from the menu, and the kitchen (backend) prepares it and
> brings it back. You only need to know the menu, not how the kitchen works.

---

## 12. Where & What Data We Send (Data Flow)

### WHERE we send data — in `App.jsx` (inside `handleRun`)

```javascript
const response = await fetch(`${API_URL}/api/portquery`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ command: cmd }),   // <-- the data we send
});
```

| Part | Value | Meaning |
|------|-------|---------|
| Where to | `http://localhost:3001/api/portquery` | The backend's address |
| How | `method: 'POST'` | We're sending data |
| Format label | `'Content-Type': 'application/json'` | "This data is JSON" |
| The data | `JSON.stringify({ command: cmd })` | The command as JSON text |

### WHAT data we send

Just one field — the command the user typed:

```json
{ "command": "portqry -n localhost -e 80" }
```

### Why `JSON.stringify()`?

Data can only travel as **text**. `{ command: cmd }` is a JS object, so we convert it:

```
{ command: "portqry -n localhost -e 80" }   <- JS object (can't send)
        |  JSON.stringify(...)
        v
'{"command":"portqry -n localhost -e 80"}'  <- JSON text (can send)
```

- `JSON.stringify()` = object → text (when **sending**)
- `response.json()`   = text → object (when **receiving**)

### WHERE the data arrives — in `server.js`

```javascript
app.use(express.json());            // unpacks JSON body into req.body

app.post('/api/portquery', (req, res) => {
  const { command } = req.body;     // <-- we RECEIVE the data here
});
```

The `command` sent from the frontend becomes `req.body.command` on the backend.

### The full round trip (TWO transfers)

| Direction | Code | Data (JSON) |
|-----------|------|-------------|
| Send (frontend → backend) | `body: JSON.stringify({ command: cmd })` | `{ "command": "portqry -n localhost -e 80" }` |
| Receive (backend → frontend) | `res.json({ command, output, exitCode })` | `{ "command": "...", "output": "TCP port 80 : NOT LISTENING", "exitCode": 1 }` |

```
FRONTEND (App.jsx)                          BACKEND (server.js)
cmd = "portqry -n localhost -e 80"
  |
  |  POST '{"command":"portqry -n localhost -e 80"}'
  v  to http://localhost:3001/api/portquery
                                 ----> app.use(express.json())  (unpacks)
                                            |
                                            v
                                       const { command } = req.body;
```

### One-line summary

> "In `App.jsx`, inside `handleRun`, we send data with `fetch()` as a POST request to
> `http://localhost:3001/api/portquery`. The data is a JSON object
> `{ command: "portqry -n localhost -e 80" }` created with `JSON.stringify()`. The backend
> receives it as `req.body.command`, runs it, and returns the output as JSON."

---

## 13. Export Report Feature (Download as TXT)

**Goal:** When the user clicks **Export Report**, save whatever is shown in the output box
as a `.txt` file — done entirely in the browser, no backend needed.

### The big idea
The browser can create a file **in memory** and trigger a download using JavaScript.
We take the output text, wrap it in a **Blob** (a file-like object), and auto-click a
hidden download link.

### The code (`handleExport` in App.jsx), step by step

**Step 1 — Is there anything to save?**
```javascript
if (!output || output.trim() === "" || output === "Port Query output will appear here...") {
  alert("There is nothing to export yet. Run a command first.");
  return;
}
```
If the box is empty or shows the placeholder, warn and stop (don't make an empty file).

**Step 2 — Build the file's text**
```javascript
const timestamp = new Date().toLocaleString();
const reportContent =
  `PortQuery Report\n` +
  `${"=".repeat(60)}\n` +
  `Generated: ${timestamp}\n` +
  `Command:   ${command || "(from last run)"}\n` +
  `${"=".repeat(60)}\n\n` +
  output;
```
Adds a header (title, date/time, command) then the full output.

**Step 3 — Turn the text into a file (Blob)**
```javascript
const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
const url = URL.createObjectURL(blob);
```
- `Blob` = the text packed into a file shape held in memory.
- `type: "text/plain"` = makes it a `.txt` file.
- `URL.createObjectURL` = a temporary address so it can be downloaded.

**Step 4 — Make a unique filename**
```javascript
const fileStamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const fileName = `PortQuery_Report_${fileStamp}.txt`;
```
Uses the date/time so files don't overwrite each other. `:` and `.` are replaced with `-`
because Windows filenames can't contain colons.
Example: `PortQuery_Report_2024-06-10T14-30-05.txt`

**Step 5 — Trigger the download (the trick)**
```javascript
const link = document.createElement("a"); // hidden link
link.href = url;                           // point at our file
link.download = fileName;                  // force download (not open)
document.body.appendChild(link);
link.click();                              // auto-click it
```
Creates an invisible download link and clicks it with code, so the file downloads without
the user seeing the link.

**Step 6 — Clean up**
```javascript
document.body.removeChild(link);  // remove hidden link
URL.revokeObjectURL(url);         // free the temporary file from memory
```

### Why no backend is needed
The output is already in the browser — we don't need the server. The browser's `Blob` and
download-link features handle file creation on their own. The backend is only needed to
*run PortQry.exe*, which the browser can't do.

### One-line summary
> "Export grabs the text on the page, adds a header, wraps it in a Blob (in-memory file),
> makes a hidden download link, auto-clicks it to save a `.txt`, then cleans up — fully in
> the browser."

### Analogy — photocopying a page
1. Check the page isn't blank (Step 1)
2. Write what goes on it (Step 2)
3. Put paper in the copier (Step 3)
4. Label the copy (Step 4)
5. Press the copy button (Step 5)
6. Clean up the copier (Step 6)

---

## 14. How to Run

### Prerequisites
- Node.js installed
- PortQryV2 installed at `C:\PortQryV2\PortQry.exe`

### Step 1 — Start the Backend
```powershell
cd "PortQueryProject\Backend"
npm install        # first time only
node server.js
```
You should see: `Status: Running` on `http://localhost:3001`.

### Step 2 — Start the Frontend (new terminal)
```powershell
cd "PortQueryProject\Frontend"
npm install        # first time only
npm run dev
```
Opens at `http://localhost:5173`.

### Step 3 — Use it
Type a command and click **Run**:
```
portqry -n localhost -e 80
portqry -n 8.8.8.8 -e 53 -p UDP
portqry -n google.com -e 443
```

> Node does NOT auto-reload. After editing `server.js`, press Ctrl+C and run `node server.js` again (or use `nodemon server.js`).

---

## 15. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Cannot find module 'X'` | Dependency not installed | Run `npm install` in that folder |
| `PortQry.exe not found (ENOENT)` | Wrong path | Fix `PORTQRY_PATH` in server.js |
| `Failed to connect / Failed to fetch` | Backend not running | Start `node server.js`; check port 3001 |
| `Invalid command` | Old code / wrong prefix | Restart backend + hard refresh browser (Ctrl+Shift+R) |
| `Failed to resolve name to IP` (code 99) | Target host doesn't exist | Use a real host like `localhost` |
| Changes not taking effect | Node not restarted | Ctrl+C then `node server.js` |

---

## 16. Glossary

| Term | Meaning |
|------|---------|
| **Frontend** | The part the user sees (runs in the browser) |
| **Backend** | The server program that does the work behind the scenes |
| **Node.js** | Runs JavaScript outside the browser, on the machine |
| **Express** | A Node library for building web servers/routes |
| **Route / Endpoint** | A URL on the server that runs specific code |
| **GET** | A request that asks for information |
| **POST** | A request that sends data to be processed |
| **fetch()** | Browser function to send an HTTP request |
| **JSON** | A text format for sending structured data |
| **CORS** | Permission for a browser to call a different port/origin |
| **spawn** | Node function that launches an external program |
| **stdout / stderr** | A program's normal output / error output |
| **exit code** | A number a program returns (0 = success) |
| **async / await** | Wait for slow tasks without freezing the app |
| **props** | Data passed from a parent React component to a child |
| **state (useState)** | Values React remembers and re-draws when they change |

---

*End of documentation.*
