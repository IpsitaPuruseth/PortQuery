# PortQuery Backend (C# / .NET)

This is the C# / ASP.NET Core port of the original Node/Express backend
(`../Backend/server.js`). It is functionally identical — same port, same
endpoints, same request/response shapes, and the same PortQry command handling.
The React frontend requires **no changes**; it keeps calling
`http://localhost:3001`.

## Requirements

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- PortQryV2 installed (default expected path: `C:\PortQryV2\PortQry.exe`)

## Run

```powershell
cd BackendCSharp
dotnet run
```

The server starts on **http://localhost:3001**.

## Configuration

The PortQry executable path is resolved in this order:

1. `PORTQRY_PATH` environment variable
2. `PortQuery:PortQryPath` in `appsettings.json`
3. Fallback: `C:\PortQryV2\PortQry.exe`

The listening port is `PortQuery:Port` in `appsettings.json` (default `3001`).

## Endpoints

### `GET /api/health`
Returns:
```json
{ "status": "OK", "message": "PortQuery Backend is running" }
```

### `POST /api/portquery`
Request body:
```json
{ "command": "portqry -n 8.8.8.8 -p both -e 53" }
```
Response body:
```json
{
  "command": "portqry -n 8.8.8.8 -p both -e 53",
  "output": "TCP port 53 (domain service): LISTENING ...",
  "exitCode": 0
}
```

## Behavior parity with the Node backend

- Permissive CORS (any origin/method/header).
- Strips a leading `.\` or `./` from pasted PowerShell-style commands.
- Fixes the `portquery` → `portqry` misspelling and ensures the `portqry` prefix.
- Preserves quoted arguments when splitting.
- Removes the interactive `-i` flag (which would hang waiting for input).
- Adds `-y` automatically when `-l` (log file) is used without `-y`.
- Launches PortQry directly (no shell) to avoid command injection.
- 20-second watchdog kills long-running "wait" commands (`-wport`/`-wpid`)
  and returns collected output with exit code `0`.
- Returns a friendly message if PortQry produces no output.
- Returns exit code `-1` with guidance if `PortQry.exe` cannot be found.
