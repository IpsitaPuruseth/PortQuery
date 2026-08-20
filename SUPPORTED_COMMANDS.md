# PortQuery — Supported Commands

All commands are entered in the web UI as `portqry ...`. The backend automatically
resolves the PortQry executable path, so you do **not** need to type `.\` or a full path.

---

## 1. Network Port Queries (no admin required)

Check whether a port is open on a target machine or server.

| Command | What it does |
|---------|-------------|
| `portqry -n 8.8.8.8 -e 53` | Query a single port (TCP by default) on a host |
| `portqry -n 8.8.8.8 -p tcp -e 53` | Query a port over TCP |
| `portqry -n 8.8.8.8 -p udp -e 53` | Query a port over UDP |
| `portqry -n 8.8.8.8 -p both -e 53` | Query over both TCP and UDP |
| `portqry -n microsoft.com -r 80:443` | Query a range of ports (80 through 443) |
| `portqry -n 10.0.0.1 -o 25,80,443` | Query a specific list of ports |
| `portqry -n 8.8.8.8 -e 53 -sp 1024` | Query using a specific source port |
| `portqry -n 1.1.1.1 -p udp -e 53 -sl` | Slow-link mode — waits longer for UDP replies |

**Possible results:** `LISTENING` (open), `NOT LISTENING` (closed),
`LISTENING or FILTERED` (open or firewalled).

---

## 2. Logging Options (no admin required)

| Command | What it does |
|---------|-------------|
| `portqry -n 8.8.8.8 -e 53 -l result.txt` | Saves output to a log file |
| `portqry -n 8.8.8.8 -e 53 -l result.txt -y` | Log file, overwrite without prompting |

> The app auto-adds `-y` when you use `-l`, so it never hangs asking "overwrite? (y/n)".

---

## 3. Local Mode (requires backend running as Administrator)

These inspect your own machine's ports and processes.

| Command | What it does |
|---------|-------------|
| `portqry -local` | Lists local port usage and port-to-process mapping |
| `portqry -wport 53` | Watches a port and reports status changes |
| `portqry -wpid 1234` | Watches a process ID and its connections |

> **Admin required.** Without elevation PortQry reports
> *"Port to process mapping is not supported on this system."*
> Run the backend with `run-admin.ps1` (in `BackendCSharp/`) to enable these.
>
> `-wport` / `-wpid` run continuously, so the app stops them after 20 seconds
> and returns the collected output.

---

## Notes

1. Network queries work out of the box — no special setup.
2. Local Mode commands need admin rights.
3. The `-i` (interactive) flag is ignored — it would hang waiting for console input
   that the web UI cannot provide.
4. Use a real host/IP. Placeholder names like `server1` fail with
   "Failed to resolve" (exit code 99).

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Port is LISTENING (success) |
| `1` | Port is NOT LISTENING |
| `2` | LISTENING or FILTERED |
| `99` | Error — host couldn't be resolved/reached |
