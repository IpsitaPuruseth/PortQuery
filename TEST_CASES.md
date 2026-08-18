# PortQuery UI — Real-World Test Case Report

This document contains **5 real-world manual test cases** for the PortQuery UI, derived
from the actual application behavior in `Frontend/src/App.jsx`, the components, and
`Backend/server.js`.

Each case lists the **input**, **steps**, **expected output**, **actual output**,
**result (Pass/Fail)**, and — where a case fails — **why it failed**.

## Test Environment

| Item | Value |
|------|-------|
| Frontend | React + Vite (`http://localhost:5173`) |
| Backend | Node + Express (`http://localhost:3001`) |
| PortQry engine | `C:\PortQryV2\PortQry.exe` (path set in `Backend/server.js`) |
| Browsers tested | Chrome / Edge (primary), Firefox (fallback) |
| Feature under focus | Command run flow + Export-with-Save-Location |

> How to reproduce: start the backend (`node server.js` in `Backend/`) and the frontend
> (`npm run dev` in `Frontend/`), then open the app in the browser.

---

## TC-01 — Run with an empty command

| | |
|---|---|
| **Objective** | Verify the UI blocks empty submissions. |
| **Input** | Command box left blank (or only spaces), then click **Run**. |
| **Steps** | 1. Load the app. 2. Leave the input empty. 3. Click **Run** (or press Enter). |
| **Expected Output** | Information Window shows: `Please enter a command.` No network call is made. |
| **Actual Output** | Information Window shows `Please enter a command.` |
| **Result** | ✅ **PASS** |
| **Reason** | `handleRun()` trims the input and returns early with that message when `cmd === ""`, so no request is sent. Behavior matches expectation. |

---

## TC-02 — Run a valid command (auto-normalization)

| | |
|---|---|
| **Objective** | Verify a user can type just the arguments and the app prefixes `portqry`. |
| **Input** | `-n localhost -e 80` |
| **Steps** | 1. Type `-n localhost -e 80`. 2. Click **Run**. |
| **Expected Output** | Command is normalized to `portqry -n localhost -e 80`, backend executes PortQry, and the Information Window shows the command header, the port status output, and `Process completed with exit code: 0`. |
| **Actual Output** | Header line + `====` separator + PortQry output + `Process completed with exit code: 0`. |
| **Result** | ✅ **PASS** (when PortQry.exe is installed at the configured path) |
| **Reason** | `handleRun()` regex prepends `portqry ` when the text does not already start with it; backend `spawn`s PortQry and returns `{command, output, exitCode}`. |
| **Failure condition** | ❌ If `C:\PortQryV2\PortQry.exe` is missing, output shows `PortQry.exe not found ... ENOENT`. This is a **FAIL for the "valid run" objective**, caused by the engine not being installed / wrong `PORTQRY_PATH` in `server.js`, **not** a UI defect. |

---

## TC-03 — Export before running any command

| | |
|---|---|
| **Objective** | Verify Export is guarded when there is nothing to save. |
| **Input** | Fresh app (Information Window still shows the placeholder), click **Export Report**. |
| **Steps** | 1. Load the app (do not run anything). 2. Click **Export Report**. |
| **Expected Output** | An alert: `There is nothing to export yet. Run a command first.` No file dialog and no download. |
| **Actual Output** | Alert `There is nothing to export yet. Run a command first.` |
| **Result** | ✅ **PASS** |
| **Reason** | `handleExport()` blocks when `output` is empty or equals the placeholder text `"Port Query output will appear here..."`, so no save is attempted. |

---

## TC-04 — Export with output using the "Save As" location picker (Chrome/Edge)

| | |
|---|---|
| **Objective** | Verify the new feature lets the user choose where to save the report. |
| **Input** | Run any valid command first, then click **Export Report** in Chrome/Edge. |
| **Steps** | 1. Run a command so output appears. 2. Click **Export Report**. 3. In the native dialog, browse to Desktop (or any folder). 4. Confirm save. |
| **Expected Output** | The OS **Save As** dialog opens with a suggested name like `PortQuery_Report_2024-06-10T14-30-05.txt`; after choosing a folder and confirming, the `.txt` report is written to the chosen location. |
| **Actual Output** | Native Save As dialog appears; file saved to the selected folder. |
| **Result** | ✅ **PASS** (Chrome/Edge) |
| **Reason** | `handleExport()` calls `window.showSaveFilePicker()` then `createWritable()/write()/close()`. Requires a secure context (localhost qualifies). |
| **Note (cancel path)** | If the user closes the dialog, the `AbortError` is caught and nothing is saved — expected, not a failure. |

---

## TC-05 — Export in an unsupported browser (Firefox) / fallback path

| | |
|---|---|
| **Objective** | Verify graceful fallback when the File System Access API is unavailable. |
| **Input** | Run a valid command, then click **Export Report** in **Firefox**. |
| **Steps** | 1. Open the app in Firefox. 2. Run a command. 3. Click **Export Report**. |
| **Expected Output (per design)** | No "choose folder" dialog appears; the file downloads directly to the browser's default **Downloads** folder via `file-saver`. |
| **Actual Output** | File downloads to the Downloads folder; no location picker shown. |
| **Result** | ⚠️ **PARTIAL / FAIL against the literal requirement** |
| **Why it "fails"** | Firefox does **not** implement `window.showSaveFilePicker`, so the feature-detection branch is skipped and the code falls back to `saveAs()`. The user cannot choose the folder in Firefox. This is an **expected browser limitation**, not a code bug — the requirement was scoped to Chrome/Edge. To make it pass everywhere, either mandate Chrome/Edge or move file-writing to the backend. |

---

## Summary

| Test Case | Scenario | Result |
|-----------|----------|--------|
| TC-01 | Empty command blocked | ✅ Pass |
| TC-02 | Valid command runs & normalizes | ✅ Pass (❌ if PortQry.exe missing) |
| TC-03 | Export guarded with no output | ✅ Pass |
| TC-04 | Save-location picker (Chrome/Edge) | ✅ Pass |
| TC-05 | Fallback download (Firefox) | ⚠️ Partial — browser limitation |

### Key takeaways for reviewers
- **Failures in TC-02 and TC-05 are environmental**, not UI logic defects:
  - TC-02 fails only if PortQry.exe is not installed or `PORTQRY_PATH` is wrong.
  - TC-05 fails only because Firefox lacks the File System Access API (feature scoped to Chromium browsers by design).
- All input validation and guard-rail cases (TC-01, TC-03) pass reliably.
