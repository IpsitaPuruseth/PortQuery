# Builds and launches the PortQuery C# backend as Administrator.
# Running elevated lets PortQry Local Mode commands (-local, -wport, -wpid)
# perform port-to-process mapping, which requires admin rights.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host 'Building PortQueryBackend...' -ForegroundColor Cyan
dotnet build "$root\PortQueryBackend.csproj" -c Debug | Out-Host

$exe = Join-Path $root 'bin\Debug\net8.0\PortQueryBackend.exe'
if (-not (Test-Path $exe)) {
	throw "Build output not found: $exe"
}

Write-Host 'Launching backend as Administrator (accept the UAC prompt)...' -ForegroundColor Cyan
# Start the elevated process; UAC will prompt. The new window keeps running the server.
Start-Process -FilePath $exe -Verb RunAs
