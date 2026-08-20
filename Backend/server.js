const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();

// Configuration
const PORT = 3001;
// Path to PortQry.exe. If it is in your system PATH, use 'PortQry.exe'.
// Otherwise set the full path.
const PORTQRY_PATH = 'C:\\PortQryV2\\PortQry.exe';

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'PortQuery Backend is running' });
});

// Main PortQuery execution endpoint
app.post('/api/portquery', (req, res) => {
  const { command } = req.body;

  // Validate command
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Invalid command provided' });
  }

  let trimmedCommand = command.trim();

  // Strip a leading shell path prefix like '.\' or './' (users copy the
  // PowerShell form '.\portqry ...'). The backend already knows the exe path.
  trimmedCommand = trimmedCommand.replace(/^\.[\\/]/, '');

  // Normalize: fix common misspelling and ensure it starts with 'portqry'.
  trimmedCommand = trimmedCommand.replace(/^portquery/i, 'portqry');
  if (!/^portqry(\.exe)?\b/i.test(trimmedCommand)) {
    trimmedCommand = 'portqry ' + trimmedCommand;
  }

  // Parse command arguments (remove 'portqry' prefix, and any stray '.exe' token)
  const argsString = trimmedCommand
    .replace(/^portqry(\.exe)?/i, '')
    .replace(/^\s*\.exe\b/i, '')
    .trim();

  // Split arguments while preserving quoted strings
  const args = argsString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

  // Clean up quotes from arguments
  const cleanedArgs = args.map(arg => arg.replace(/^"|"$/g, ''));

  // Remove interactive mode flag (-i) - it hangs waiting for console input
  const finalArgs = cleanedArgs.filter(arg => arg.toLowerCase() !== '-i');

  // If a log file is requested (-l) but no auto-overwrite flag (-y) is present,
  // add -y. Otherwise PortQry prompts "overwrite? (y/n)" and hangs waiting
  // for keyboard input that never comes from the web UI.
  const hasLogFlag = finalArgs.some(arg => arg.toLowerCase() === '-l');
  const hasYesFlag = finalArgs.some(arg => arg.toLowerCase() === '-y');
  if (hasLogFlag && !hasYesFlag) {
    finalArgs.push('-y');
  }

  const portqryPath = PORTQRY_PATH;

  console.log(`Executing: ${portqryPath} ${finalArgs.join(' ')}`);

  // Spawn PortQry process
  const portqry = spawn(portqryPath, finalArgs, {
    shell: false,
    windowsHide: true
  });

  let output = '';
  let responded = false;

  const sendResponse = (exitCode) => {
    if (responded) return;
    responded = true;
    clearTimeout(watchdog);
    res.json({
      command: `portqry ${finalArgs.join(' ')}`,
      output: output,
      exitCode: exitCode
    });
  };

  // Watchdog: some commands (e.g. -wport/-wpid "wait" modes) run forever and
  // never exit on their own. Kill the process after a timeout and return
  // whatever output was collected so the request never hangs.
  const WATCHDOG_MS = 20000;
  const watchdog = setTimeout(() => {
    output += `\n\n[Notice] Command was stopped after ${WATCHDOG_MS / 1000} seconds.\n`;
    output += `This command runs in a continuous "wait" mode (e.g. -wport/-wpid) and does not exit on its own.\n`;
    try { portqry.kill('SIGKILL'); } catch { /* ignore */ }
    sendResponse(0);
  }, WATCHDOG_MS);

  // Collect stdout
  portqry.stdout.on('data', (data) => {
    output += data.toString();
  });

  // Collect stderr
  portqry.stderr.on('data', (data) => {
    output += data.toString();
  });

  // Handle process error (e.g. executable not found)
  portqry.on('error', (err) => {
    console.error('Process Error:', err.message);

    let errorMessage = `Failed to execute PortQry: ${err.message}\n\n`;
    if (err.code === 'ENOENT') {
      errorMessage += `PortQry.exe not found at: ${portqryPath}\n\n`;
      errorMessage += 'Please ensure PortQryV2 is installed and the PORTQRY_PATH in server.js is correct.\n';
    }

    output += errorMessage;
    sendResponse(-1);
  });

  // When PortQry finishes, send the complete output as JSON
  portqry.on('close', (code) => {
    console.log(`Process exited with code: ${code}`);
    if (!output.trim()) {
      output = `PortQry finished with exit code ${code} but produced no output.\nPlease check your command syntax.`;
    }
    sendResponse(code);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`════════════════════════════════════════════════════════`);
  console.log(`   PortQuery Backend Server`);
  console.log(`════════════════════════════════════════════════════════`);
  console.log(`   Status: Running`);
  console.log(`   Port: ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   PortQry Path: ${PORTQRY_PATH}`);
  console.log(`═══════════════════════════════════════════════════════`);
});

// Handle startup errors clearly (e.g. port already in use)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} is already in use.`);
    console.error(`   Another backend is likely already running.`);
    console.error(`   Free the port by running in PowerShell:`);
    console.error(`   Get-Process node | Stop-Process -Force`);
    console.error(`   then run "node server.js" again.\n`);
  } else {
    console.error(`\n[ERROR] Server failed to start: ${err.message}\n`);
  }
  process.exit(1);
});
