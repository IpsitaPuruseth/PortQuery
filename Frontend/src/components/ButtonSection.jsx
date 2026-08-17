function ButtonSection({ handleClear, handleExport, isRunning }) {
  return (
    <div className="bottom-buttons">
      <button onClick={handleExport} disabled={isRunning}>Export Report</button>

      <button onClick={handleClear} disabled={isRunning}>Clear</button>
    </div>
  );
}

export default ButtonSection;
