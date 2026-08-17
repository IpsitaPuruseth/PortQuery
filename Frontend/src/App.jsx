import { useState } from "react";
import { saveAs } from "file-saver";
import CommandSection from "./components/CommandSection";
import InformationSection from "./components/InformationSection";
import ButtonSection from "./components/ButtonSection";

import "./App.css";

// Backend API URL - adjust if your backend runs on a different port
const API_URL = "http://localhost:3001";

// Full PortQry v2.0 help text shown in the output area when "Port Query Tips" is clicked
const PORT_QUERY_TIPS = `PortQry is a command-line utility that you can use to help troubleshoot TCP/IP connectivity issues.

This utility reports the port status of target TCP and User Datagram Protocol (UDP) ports on a local computer or on a remote computer.

Port status reporting :

PortQry reports the status of a port in one of the following ways:

	• LISTENING This response indicates that a process is listening on the target port.

PortQry received a response from the target port.

	• NOT LISTENING This response indicates that no process is listening on the target port.

PortQry received one of the following Internet Control Message Protocol (ICMP) messages from the target port:

	• Destination unreachable

	• Port unreachable

	• FILTERED This response indicates that the target port is being filtered.

PortQry did not receive a response from the target port. A process may or may not be listening on the target port.

By default, PortQry queries a TCP port three times before it returns a response of FILTERED and queries a UDP port one time before it returns a response of FILTERED.

PortQry version 2.0

Displays the state of TCP and UDP ports


Command line mode:  portqry -n name_to_query [-options]

Interactive mode:   portqry -i [-n name_to_query] [-options]

Local Mode:         portqry -local | -wpid pid| -wport port [-options]

Command line mode:

portqry -n name_to_query [-p protocol] [-e || -r || -o endpoint(s)] [-q]

		[-l logfile] [-sp source_port] [-sl] [-cn SNMP community name]

Command line mode options explained:

	-n [name_to_query] IP address or name of system to query

	-p [protocol] TCP or UDP or BOTH (default is TCP)

	-e [endpoint] single port to query (valid range: 1-65535)

	-r [end point range] range of ports to query (start:end)

	-o [end point order] range of ports to query in an order (x,y,z)

	-l [logfile] name of text log file to create

	-y overwrites existing text log file without prompting

	-sp [source port] initial source port to use for query

	-sl 'slow link delay' waits longer for UDP replies from remote systems

	-nr by-passes default IP address-to-name resolution

			ignored unless an IP address is specified after -n

	-cn specifies SNMP community name for query

			ignored unless querying an SNMP port

			must be delimited with !

	-q 'quiet' operation runs with no output

		   returns 0 if port is listening

		   returns 1 if port is not listening

		   returns 2 if port is listening or filtered

Notes:  PortQry runs on Windows 2000 and later systems

		Defaults: TCP, port 80, no log file, slow link delay off

		Hit Ctrl-c to terminate prematurely

examples:

portqry -n myserver.com -e 25

portqry -n 10.0.0.1 -e 53 -p UDP -i

portqry -n host1.dev.reskit.com -r 21:445

portqry -n 10.0.0.1 -o 25,445,1024 -p both -sp 53

portqry -n host2 -cn !my community name! -e 161 -p udp


Interactive Mode:

Used as an alternative to command line mode

portqry -i [-options]

For help with Interactive mode options:

		- run portqry.exe

		- then type 'help' <enter>

example:

portqry -i -n server1 -e 135 -p both


Local Mode:

Local Mode used to get detailed data on local system's ports

portqry -local | -wpid pid | -wport port [-wt seconds] [-l logfile] [-v]

Local mode options explained:

	-local enumerates local port usage, port to process mapping,

		   service port usage, and lists loaded modules

	-wport [port_number] watches specified port

		   reports when port's connection status changes

	-wpid [process_ID] watches specified process ID (PID)

		  reports when PID's connection status changes

	-wt [seconds] watch time option

		specifies how often to check for status changes

		valid range: 1 - 1200 seconds

		default value is 60 seconds

	-l [logfile] name of text log file to create

	-v requests verbose output

Notes:  PortQry runs on Windows 2000 and later systems

		For best results run in context of local administrator

		Port to process mapping may not be available on all systems

		Hit Ctrl-c to terminate prematurely

examples:

portqry -local

portqry -local -l logfile.txt -v

portqry -wpid 1272 -wt 5 -l logfile.txt -y -v

portqry -wport 53 -l dnslog.txt`;

function App() {
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("Port Query output will appear here...");
  const [isRunning, setIsRunning] = useState(false);

  async function handleRun() {
    let cmd = command.trim();

    if (cmd === "") {
      setOutput("Please enter a command.");
      return;
    }

    // Normalize the command so it always starts with "portqry".
    // Accepts: "portqry ...", "portqry.exe ...", "portquery ...",
    // or just the arguments like "-n localhost -e 80".
    cmd = cmd.replace(/^portquery/i, "portqry"); // common misspelling
    if (!/^portqry(\.exe)?\b/i.test(cmd)) {
      cmd = "portqry " + cmd;
    }

    setIsRunning(true);
    setOutput("Running command...\n");

    // Safety timeout so the UI can never hang forever on "Running..."
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${API_URL}/api/portquery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: cmd }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setOutput(`Error: ${data.error || 'Failed to execute command'}\n\nPlease ensure the backend server is running.`);
        return;
      }

      // Read the full JSON response and display it in the textarea
      const data = await response.json();

      let result = `${data.command}\n`;
      result += `${"=".repeat(60)}\n\n`;
      result += data.output;
      result += `\n${"=".repeat(60)}\n`;
      result += `Process completed with exit code: ${data.exitCode}\n`;

      setOutput(result);

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error executing command:', error);

      if (error.name === 'AbortError') {
        setOutput(
          `Request timed out after 30 seconds.\n\n` +
          `The backend did not respond. Please ensure:\n` +
          `1. The backend server is running (node server.js in the Backend folder)\n` +
          `2. It is reachable at ${API_URL}\n`
        );
      } else {
        setOutput(
          `Failed to connect to backend server.\n\n` +
          `Error: ${error.message}\n\n` +
          `Please ensure:\n` +
          `1. The backend server is running (node server.js in Backend folder)\n` +
          `2. The server is accessible at ${API_URL}\n`
        );
      }
    } finally {
      clearTimeout(timeoutId);
      setIsRunning(false);
    }
  }

  function handleClear() {
    setCommand("");
    setOutput("Port Query output will appear here...");
  }

  function handleTips() {
    setOutput(PORT_QUERY_TIPS);
  }

  async function handleExport() {
    // Don't export the placeholder/help text or when there's nothing to save
    if (
      !output ||
      output.trim() === "" ||
      output === "Port Query output will appear here..."
    ) {
      alert("There is nothing to export yet. Run a command first.");
      return;
    }

    // Build the report contents
    const timestamp = new Date().toLocaleString();
    const reportContent =
      `PortQuery Report\n` +
      `${"=".repeat(60)}\n` +
      `Generated: ${timestamp}\n` +
      `Command:   ${command || "(from last run)"}\n` +
      `${"=".repeat(60)}\n\n` +
      output;

    // Create a downloadable text file in the browser
    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });

    // File name with date/time, e.g. PortQuery_Report_2024-06-10_14-30-05.txt
    const fileStamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const fileName = `PortQuery_Report_${fileStamp}.txt`;

    // If the browser supports the File System Access API (Chrome/Edge), show a
    // native "Save As" dialog so the user can pick the folder (Desktop, C drive,
    // any folder) and file name before saving.
    if (typeof window.showSaveFilePicker === "function") {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "Text file",
              accept: { "text/plain": [".txt"] },
            },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        // User cancelled the dialog: nothing to do.
        if (err && err.name === "AbortError") {
          return;
        }
        // Any other error: fall back to the standard download below.
        console.error("Save dialog failed, falling back to download:", err);
      }
    }

    // Fallback for browsers without the File System Access API (e.g. Firefox/
    // Safari): trigger a normal download using file-saver.
    saveAs(blob, fileName);
  }

  return (
    <div className="container">
      <CommandSection
        command={command}
        setCommand={setCommand}
        handleRun={handleRun}
        handleTips={handleTips}
        isRunning={isRunning}
      />

      <InformationSection output={output} />

      <ButtonSection handleClear={handleClear} handleExport={handleExport} isRunning={isRunning} />
    </div>
  );
}

export default App;
