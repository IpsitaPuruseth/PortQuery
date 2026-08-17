function CommandSection({ command, setCommand, handleRun, handleTips, isRunning }) {
  return (
    <div className="command-section">
      <h3>Command Line Arguments</h3>

      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="Enter PortQry command..."
        disabled={isRunning}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isRunning) {
            handleRun();
          }
        }}
      />

      <div className="button-row">
        <button onClick={handleTips} disabled={isRunning}>Port Query Tips</button>

        <button onClick={handleRun} disabled={isRunning}>
          {isRunning ? "Running..." : "Run"}
        </button>
      </div>
    </div>
  );
}

export default CommandSection;
