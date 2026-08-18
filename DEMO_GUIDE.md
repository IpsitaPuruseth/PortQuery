# PortQuery UI — Demo Presentation Guide

> **Purpose:** This is your complete script and reference for presenting the PortQuery
> project to your manager. Read top to bottom. Everything you need to say, show, and
> answer is here.

---

## 0. Before You Start (Pre-Demo Checklist)

- [ ] **Backend running** → in `Backend/` run: `node server.js` (listens on port **3001**)
- [ ] **Frontend running** → in `Frontend/` run: `npm run dev` (opens on port **5173**)
- [ ] Use **Chrome or Edge** (needed for the live Save As dialog)
- [ ] Run one command before the audience arrives to confirm PortQry.exe works
- [ ] Open these tabs: `App.jsx`, `server.js`, `TEST_CASES.md`, this guide
- [ ] Memorize 3 numbers: Frontend **5173**, Backend **3001**, PortQry path **C:\PortQryV2\PortQry.exe**

---

## 1. Introduction (What & Why) — say this first

> "Good morning. Today I'll demo the **PortQuery UI** I built.
>
> **The problem:** PortQry is a Microsoft command-line tool that network engineers use to
> check if TCP/UDP ports are open, closed, or filtered. It's powerful but command-line
> only — not friendly for everyday users.
>
> **My solution:** a **web-based UI** that lets anyone run PortQry from a browser, view the
> results clearly, and export a report to any folder they choose.
>
> It's built in **three layers**: a React frontend, a Node/Express backend, and the actual
> PortQry.exe engine."

---

## 2. Architecture Diagram

Explain this slowly — it answers "where does the response come from?"

```
+-------------------------------------------------------------+
|                        USER'S BROWSER                       |
|                                                             |
|   +-----------------------------------------------------+   |
|   |            React Frontend (Vite, :5173)             |   |
|   |                                                     |   |
|   |   CommandSection   -> input box + Run / Tips        |   |
|   |   InformationSection -> read-only output window     |   |
|   |   ButtonSection    -> Export Report / Clear         |   |
|   +-----------------------------------------------------+   |
|                        |         ^                          |
|         (1) POST /api/portquery  |  (4) JSON response       |
|            fetch() in App.jsx    |     {command,output,     |
|                        v         |          exitCode}       |
+------------------------|---------|--------------------------+
						 |         |
						 v         |
+-------------------------------------------------------------+
|            Node + Express Backend (server.js, :3001)        |
|                                                             |
|   - Validates & normalizes the command                     |
|   - Strips unsafe flags (-i), auto-adds -y for log files   |
|   - (2) spawn("PortQry.exe", args)  shell:false            |
|   - Collects stdout / stderr + exit code                   |
|   - Watchdog timeout (20s) so it never hangs               |
+-------------------------------------------------------------+
						 |         ^
	   (2) run process   |         |  (3) output + exit code
						 v         |
+-------------------------------------------------------------+
|             PortQry.exe  (C:\PortQryV2\PortQry.exe)         |
|          The real Microsoft port-scanning engine            |
+-------------------------------------------------------------+
```

**Data flow in one sentence each:**
1. User clicks **Run** → React sends the command to the backend via `fetch`.
2. Backend runs the **real PortQry.exe** using Node's `spawn`.
3. PortQry returns its output and an exit code to the backend.
4. Backend sends it back as **JSON**, and React displays it in the Information Window.

> **Key line to say:** "The browser never runs the tool directly — it can't, for security
> reasons. The backend is the bridge between the web page and the Windows tool."

---

## 3. Technology Choices (Why this, not that)

| Layer | Technology | Why I chose it |
|-------|-----------|----------------|
| Frontend | **React + Vite** | Component-based UI, simple state for input/output, Vite gives instant hot-reload |
| Backend | **Node + Express** | Lightweight, and Node's `spawn` cleanly runs and streams a system process |
| Process exec | **`spawn` (not `exec`)** | `spawn` streams output and avoids shell string injection (`shell:false`) |
| Export | **File System Access API** | Only browser-approved way to let the user pick a save folder |
| Fallback | **file-saver** | Graceful download for browsers without the new API |

---

## 4. Live Demo (Show it working)

Do these one by one and narrate each:

1. **Run a command**
   - Type: `-n localhost -e 80` → click **Run**.
   - Say: *"I only typed the arguments. The app auto-prefixes `portqry`, so users don't have to remember the exact syntax."*
   - Point at the output: command header, results, and `Process completed with exit code: 0`.

2. **Port Query Tips**
   - Click **Port Query Tips** → shows the full PortQry help reference built into the UI.

3. **Export Report (my highlight feature)**
   - Click **Export Report** → the **native Save As dialog** opens → save to Desktop.
   - Say: *"This is the feature I added — the user chooses exactly where to save the report."*

4. **Clear**
   - Click **Clear** → resets input and output.

5. **Error handling (optional, impressive)**
   - Stop the backend, click Run → UI shows a clear "backend not running" message with a 30s timeout. Restart backend after.

---

## 5. Deep Dive — The Export / Save-Location Feature (what I built)

> "The requirement was: when the user exports, they should be able to choose where to save —
> Desktop, C drive, or any folder."

**The core concept (say this — it shows depth):**
> "A browser runs in a **security sandbox**. It cannot freely write to arbitrary locations
> like the C drive — that would be a security risk. So I used the **File System Access API**,
> specifically `window.showSaveFilePicker()`, which opens the **native OS Save dialog**.
> That is the only browser-approved way to let the user choose a folder."

**How it works in code (`App.jsx`, `handleExport()`):**
1. Build the report text (title, timestamp, command, output).
2. Wrap it in a `Blob`.
3. Feature-detect: `if (window.showSaveFilePicker)` →
   - open the native dialog, get a file handle,
   - `createWritable()` → `write(blob)` → `close()`.
4. If unsupported (Firefox/Safari) → **fall back** to `saveAs()` (normal download).
5. If the user cancels the dialog → catch `AbortError` and do nothing.

**Why this and not alternatives:**
| Option | Verdict |
|--------|---------|
| `showSaveFilePicker` (chosen) | Real native folder picker — matches the requirement |
| Plain download (`file-saver` only) | Always goes to Downloads — no location choice |
| Custom modal + backend writes file | Would save on the *server* machine, not the user's — wrong target |

---

## 6. Testing — Real-World Test Cases

Open `TEST_CASES.md` and summarize:

> "I wrote 5 real-world test cases covering the main user journeys."

| Test | Scenario | Result |
|------|----------|--------|
| TC-01 | Run with empty command → blocked | Pass |
| TC-02 | Valid command runs & auto-normalizes | Pass (fails only if PortQry.exe missing) |
| TC-03 | Export before running → guarded alert | Pass |
| TC-04 | Save-location picker (Chrome/Edge) | Pass |
| TC-05 | Firefox fallback download | Partial (browser limitation) |

**When asked "why did tests fail?" — answer confidently:**
> "The two non-passing cases are **environmental, not code bugs**:
> - **TC-02** only fails if PortQry.exe isn't installed or the path is wrong.
> - **TC-05** 'fails' in Firefox because Firefox doesn't support the File System Access API.
>   That's a known browser limitation — the feature was scoped to Chrome/Edge, with a safe
>   fallback for others."

> This distinction — **defect vs. limitation** — is the key point that shows understanding.

---

## 7. Robustness & Safety (mention briefly — earns credibility)

- **No shell injection:** backend uses `spawn` with `shell:false`.
- **No hangs:** interactive `-i` flag is stripped; `-y` auto-added for log files.
- **Watchdog:** backend kills long "wait mode" commands after 20s.
- **Frontend timeout:** requests abort after 30s and show a helpful message.
- **Graceful export:** feature detection + fallback, cancel handled cleanly.

---

## 8. Challenges & Learnings

- Learned the **browser security sandbox** and why file/system access is restricted.
- Learned **feature detection & graceful degradation** instead of assuming browser support.
- Handled **process-hang risks** with watchdog and abort timeouts.
- Learned to **normalize user input** so the tool is forgiving of typos and formats.

---

## 9. Closing

> "To summarize: I built a working PortQry web UI, a secure backend that runs the real tool,
> an export feature that lets users choose where to save, and documented real-world test
> cases. Possible next steps: automated tests with Vitest, optional Firefox support via a
> backend save, and restricting which commands are allowed. Thank you — happy to take
> questions."

---

## 10. Q&A — Be Ready For These

| Question | Your answer |
|----------|-------------|
| Where does the output come from? | The real PortQry.exe, run by the Node backend via `spawn`, returned as JSON. |
| Why a separate backend? Why not run it in the browser? | Browsers can't execute system programs for security. The backend bridges web and OS. |
| Why React? | Component-based, easy input/output state, fast Vite dev reload. |
| Why `spawn` not `exec`? | `spawn` streams output and, with `shell:false`, avoids shell injection. |
| Why normalize the command? | So users can type just the args or misspell `portquery`; both layers fix it to `portqry`. |
| Why File System Access API, not just download? | Download only goes to Downloads. The requirement was to *choose the folder*, which needs the native picker. |
| Why do some tests fail? | Environmental — missing PortQry install or Firefox lacking the API — not logic errors. |
| What if the backend is down? | UI shows a clear error and a 30s timeout message asking the user to start the backend. |
| Is it secure? | Command validated & normalized; `spawn` with `shell:false`; interactive `-i` stripped to prevent hangs. |
| What would you improve? | Automated tests, Firefox support via backend save, and an allow-list of commands. |

---

## Quick Reference Card

| Item | Value |
|------|-------|
| Frontend URL | http://localhost:5173 |
| Backend URL | http://localhost:3001 |
| Backend endpoint | POST /api/portquery |
| Health check | GET /api/health |
| PortQry path | C:\PortQryV2\PortQry.exe |
| Export function | `handleExport()` in `Frontend/src/App.jsx` |
| Run function | `handleRun()` in `Frontend/src/App.jsx` |
| Backend logic | `Backend/server.js` |

**Golden rule:** lead with the *why* (problem -> decision -> result), show it working live,
and be honest about limitations. That's what makes an intern demo stand out.

---

## 11. Simple Concepts Q&A (know these cold)

These are the "simple but tricky" questions. Answer them in plain words.

### What does "packages the command as JSON and sends it over HTTP" mean?
- **JSON** is a simple text format that organizes data as labeled key-value pairs, like an
  addressed envelope: `{ "command": "portqry -n localhost -e 80" }`.
- **HTTP** is the standard language browsers and servers use to talk. The frontend uses
  `fetch()` to send an HTTP POST request: "Here's a command, please run it."
- **One-liner:** "The command is wrapped in a labeled text format (JSON) and sent to the
  backend using HTTP, the normal way web apps communicate."

### Why does the backend auto-add `-y` when `-l` (log file) is used?
- `-l` tells PortQry to **save a log file**.
- If that file already exists, PortQry stops and asks *"overwrite? (y/n)"* and waits for a
  keystroke. On a server there's no keyboard, so it would **freeze forever**.
- `-y` means "**yes, overwrite automatically, don't ask**."
- **One-liner:** "If a user wants a log file, we auto-add the 'yes, overwrite' flag so
  PortQry doesn't freeze asking a question nobody can answer."

### What is `spawn`? Why use it?
- `spawn` is a Node.js function that **starts another program** (here, `PortQry.exe`) and
  lets our backend read its output live.
- We chose `spawn` over `exec` because it **streams output** piece by piece and passes
  arguments **safely as a list** instead of as one shell string.
- **One-liner:** "`spawn` runs PortQry from our code and streams its output back safely."

### What is a "shell"? Why `shell: false`?
- A **shell** is the command interpreter (PowerShell / Command Prompt) that reads text and
  understands special characters like `&`, `|`, `>`.
- With `shell: false`, arguments go **directly to PortQry**, so no one can sneak in a second
  malicious command (e.g., `... & del file`). It **prevents command injection**.
- **One-liner:** "We turn the shell off so no one can inject extra commands - a security choice."

### What ports do we use and why?
| Port | Who uses it | Why |
|------|-------------|-----|
| **5173** | Frontend (React + Vite) | Vite's default dev port; this is what you open in the browser |
| **3001** | Backend (Node + Express) | Chosen in `server.js`; a free local port that won't clash with the frontend |

- A **port** is a numbered "door" a program listens on. Frontend and backend are two
  separate programs, so each needs its own port. Two programs **cannot share one port**.
- **Don't confuse:** 5173/3001 are the doors *our app* uses; the ports PortQry *checks*
  (like 80, 53) are doors on *other* machines we're investigating. Same word, different context.

### Quick cheat-sheet
| Term | Simplest explanation |
|------|---------------------|
| JSON | A labeled text format for sending data, like an addressed envelope |
| HTTP | The standard language browsers and servers use to talk |
| `-y` flag | Auto-answers "yes, overwrite" so PortQry doesn't freeze |
| `spawn` | A Node function that starts another program (PortQry.exe) |
| shell | The command interpreter; we turn it off (`shell:false`) for safety |
| Port | A numbered door a program listens on; 5173 = frontend, 3001 = backend |

---

## 12. Key Functions & Where Things Happen

If your manager asks "where does that happen in your code?", point to the right function.

### Frontend — `Frontend/src/App.jsx`

| Function | What it does | Key details |
|----------|--------------|-------------|
| **`App()`** | The main component that holds all state and ties everything together | Stores 3 state values: `command` (input text), `output` (what's shown), `isRunning` (busy flag) |
| **`handleRun()`** | Runs when the user clicks **Run** | Validates input, normalizes it to start with `portqry`, sends it to the backend with `fetch`, shows the result, and handles errors/timeouts |
| **`handleExport()`** | Runs when the user clicks **Export Report** | Builds the report text, opens the native **Save As** dialog via `showSaveFilePicker`, writes the file, and falls back to a normal download in unsupported browsers |
| **`handleClear()`** | Runs when the user clicks **Clear** | Resets the input box and the output window back to the placeholder |
| **`handleTips()`** | Runs when the user clicks **Port Query Tips** | Shows the full built-in PortQry help text in the output window |

### Frontend — Components (each is a small piece of the UI)

| Component | File | What it shows |
|-----------|------|----------------|
| **`CommandSection`** | `components/CommandSection.jsx` | The input box + **Run** and **Port Query Tips** buttons (also runs on Enter key) |
| **`InformationSection`** | `components/InformationSection.jsx` | The read-only output window (textarea) that displays results |
| **`ButtonSection`** | `components/ButtonSection.jsx` | The **Export Report** and **Clear** buttons |

### Backend — `Backend/server.js`

| Part | What it does | Key details |
|------|--------------|-------------|
| **`app.get('/api/health')`** | Health check | Returns `{status: "OK"}` so you can confirm the backend is running |
| **`app.post('/api/portquery')`** | The main endpoint | Receives the command, validates & normalizes it, strips `-i`, auto-adds `-y`, then runs PortQry |
| **`spawn(...)`** | Runs the real PortQry.exe | Uses `shell:false` for safety; streams the output back |
| **`portqry.stdout / stderr .on('data')`** | Collects output | Appends everything PortQry prints into one `output` string |
| **`sendResponse(exitCode)`** | Sends the reply | Packages `{command, output, exitCode}` as JSON and sends it to the frontend (only once) |
| **`watchdog` (setTimeout 20s)** | Safety timer | Kills commands that never end (like `-wport`) and returns whatever output was collected |
| **`portqry.on('error')`** | Handles failures | If PortQry.exe isn't found (`ENOENT`), returns a clear "not found, check the path" message |

### The 3 questions this section answers
- **"Where do you run the command?"** -> `handleRun()` in `App.jsx` sends it; `app.post('/api/portquery')` in `server.js` runs it.
- **"Where does the save-location feature live?"** -> `handleExport()` in `App.jsx`.
- **"Where do you stop it from hanging?"** -> the `-i` strip, `-y` auto-add, and the 20s `watchdog` in `server.js`, plus the 30s timeout in `handleRun()`.
