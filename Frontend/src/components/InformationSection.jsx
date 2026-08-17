function InformationSection({ output }) {
  return (
    <div className="information-section">
      <h3>Information Window</h3>

      <textarea value={output} readOnly></textarea>
    </div>
  );
}

export default InformationSection;
