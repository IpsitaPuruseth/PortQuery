using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;

var builder = WebApplication.CreateBuilder(args);

// ── Configuration ──────────────────────────────────────────────────────────
// Port the server listens on (mirrors PORT=3001 in the Node backend).
int port = builder.Configuration.GetValue<int?>("PortQuery:Port") ?? 3001;

// Bind Kestrel to http://localhost:3001 to match the original Express server.
builder.WebHost.UseUrls($"http://localhost:{port}");

// Enable permissive CORS (equivalent to app.use(cors()) in Express).
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseCors();

// Path to PortQry.exe. Resolution order: PORTQRY_PATH env var → config → default.
// Matches the Node backend which used 'C:\\PortQryV2\\PortQry.exe'.
string PortQryPath()
{
    var envPath = Environment.GetEnvironmentVariable("PORTQRY_PATH");
    if (!string.IsNullOrWhiteSpace(envPath))
        return envPath;

    var configPath = app.Configuration["PortQuery:PortQryPath"];
    if (!string.IsNullOrWhiteSpace(configPath))
        return configPath;

    return @"C:\PortQryV2\PortQry.exe";
}

// ── Health check endpoint ──────────────────────────────────────────────────
app.MapGet("/api/health", () =>
    Results.Json(new { status = "OK", message = "PortQuery Backend is running" }));

// ── Main PortQuery execution endpoint ──────────────────────────────────────
app.MapPost("/api/portquery", async (HttpContext http) =>
{
    // Parse request body { command }.
    PortQueryRequest? body;
    try
    {
        body = await http.Request.ReadFromJsonAsync<PortQueryRequest>();
    }
    catch
    {
        body = null;
    }

    var command = body?.Command;

    // Validate command.
    if (string.IsNullOrWhiteSpace(command))
    {
        return Results.Json(new { error = "Invalid command provided" }, statusCode: 400);
    }

    var trimmedCommand = command.Trim();

    // Strip a leading shell path prefix like '.\' or './' (users copy the
    // PowerShell form '.\portqry ...'). The backend already knows the exe path.
    trimmedCommand = Regex.Replace(trimmedCommand, @"^\.[\\/]", "");

    // Normalize: fix common misspelling and ensure it starts with 'portqry'.
    trimmedCommand = Regex.Replace(trimmedCommand, "^portquery", "portqry", RegexOptions.IgnoreCase);
    if (!Regex.IsMatch(trimmedCommand, @"^portqry(\.exe)?\b", RegexOptions.IgnoreCase))
    {
        trimmedCommand = "portqry " + trimmedCommand;
    }

    // Parse command arguments (remove 'portqry' prefix, and any stray '.exe' token)
    var argsString = trimmedCommand;
    argsString = Regex.Replace(argsString, @"^portqry(\.exe)?", "", RegexOptions.IgnoreCase);
    argsString = Regex.Replace(argsString, @"^\s*\.exe\b", "", RegexOptions.IgnoreCase);
    argsString = argsString.Trim();

    // Split arguments while preserving quoted strings.
    var args = Regex.Matches(argsString, "(?:[^\\s\"]+|\"[^\"]*\")+")
                    .Select(m => m.Value)
                    .ToList();

    // Clean up quotes from arguments.
    var cleanedArgs = args.Select(a => Regex.Replace(a, "^\"|\"$", "")).ToList();

    // Remove interactive mode flag (-i) - it hangs waiting for console input.
    var finalArgs = cleanedArgs.Where(a => !string.Equals(a, "-i", StringComparison.OrdinalIgnoreCase)).ToList();

    // If a log file is requested (-l) but no auto-overwrite flag (-y) is present,
    // add -y. Otherwise PortQry prompts "overwrite? (y/n)" and hangs waiting
    // for keyboard input that never comes from the web UI.
    var hasLogFlag = finalArgs.Any(a => string.Equals(a, "-l", StringComparison.OrdinalIgnoreCase));
    var hasYesFlag = finalArgs.Any(a => string.Equals(a, "-y", StringComparison.OrdinalIgnoreCase));
    if (hasLogFlag && !hasYesFlag)
    {
        finalArgs.Add("-y");
    }

    var portqryPath = PortQryPath();
    var echoedCommand = "portqry " + string.Join(" ", finalArgs);

    Console.WriteLine($"Executing: {portqryPath} {string.Join(" ", finalArgs)}");

    var output = new StringBuilder();
    var tcs = new TaskCompletionSource<int>();
    var responded = 0; // guard against double-completion (mirrors `responded` flag)

    void SendResponse(int exitCode)
    {
        if (Interlocked.Exchange(ref responded, 1) == 1) return;
        tcs.TrySetResult(exitCode);
    }

    // Configure the process (shell:false equivalent — direct exe launch, no shell).
    var psi = new ProcessStartInfo
    {
        FileName = portqryPath,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        UseShellExecute = false,
        CreateNoWindow = true
    };
    foreach (var arg in finalArgs)
    {
        psi.ArgumentList.Add(arg);
    }

    var process = new Process { StartInfo = psi, EnableRaisingEvents = true };

    process.OutputDataReceived += (_, e) =>
    {
        if (e.Data != null) output.AppendLine(e.Data);
    };
    process.ErrorDataReceived += (_, e) =>
    {
        if (e.Data != null) output.AppendLine(e.Data);
    };

    // When PortQry finishes, complete with the exit code.
    process.Exited += (_, _) =>
    {
        Console.WriteLine($"Process exited with code: {process.ExitCode}");
        if (output.ToString().Trim().Length == 0)
        {
            output.Append($"PortQry finished with exit code {process.ExitCode} but produced no output.\nPlease check your command syntax.");
        }
        SendResponse(process.ExitCode);
    };

    // Watchdog: some commands (e.g. -wport/-wpid "wait" modes) run forever and
    // never exit on their own. Kill the process after a timeout and return
    // whatever output was collected so the request never hangs.
    const int WatchdogMs = 20000;
    var watchdog = new CancellationTokenSource();
    _ = Task.Delay(WatchdogMs, watchdog.Token).ContinueWith(t =>
    {
        if (t.IsCanceled) return;
        output.Append($"\n\n[Notice] Command was stopped after {WatchdogMs / 1000} seconds.\n");
        output.Append("This command runs in a continuous \"wait\" mode (e.g. -wport/-wpid) and does not exit on its own.\n");
        try { if (!process.HasExited) process.Kill(true); } catch { /* ignore */ }
        SendResponse(0);
    }, TaskScheduler.Default);

    try
    {
        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
    }
    catch (Exception err)
    {
        // Handle process error (e.g. executable not found).
        Console.Error.WriteLine($"Process Error: {err.Message}");

        var errorMessage = $"Failed to execute PortQry: {err.Message}\n\n";
        if (err is System.ComponentModel.Win32Exception)
        {
            errorMessage += $"PortQry.exe not found at: {portqryPath}\n\n";
            errorMessage += "Please ensure PortQryV2 is installed and the PORTQRY_PATH is correct.\n";
        }

        output.Append(errorMessage);
        SendResponse(-1);
    }

    var exitCode = await tcs.Task;
    watchdog.Cancel();
    try { process.Dispose(); } catch { /* ignore */ }

    return Results.Json(new
    {
        command = echoedCommand,
        output = output.ToString(),
        exitCode
    });
});

// ── Start server ───────────────────────────────────────────────────────────
var line = new string('═', 55);
Console.WriteLine(line);
Console.WriteLine("   PortQuery Backend Server (C# / .NET)");
Console.WriteLine(line);
Console.WriteLine("   Status: Running");
Console.WriteLine($"   Port: {port}");
Console.WriteLine($"   URL: http://localhost:{port}");
Console.WriteLine($"   PortQry Path: {PortQryPath()}");
Console.WriteLine(line);

app.Run();

// Request DTO for the /api/portquery endpoint.
record PortQueryRequest(string? Command);
