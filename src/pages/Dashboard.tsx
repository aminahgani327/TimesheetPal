export default function Dashboard() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "250px 1fr 300px",
        height: "100vh",
      }}
    >
      <div
  style={{
    background: "#1f2937",
    color: "white",
    padding: "20px",
  }}
>
  <h2>TimesheetPal</h2>

  <hr style={{ margin: "20px 0", borderColor: "#374151" }} />

  <p>🏠 Dashboard</p>

  <p>📅 Timesheets</p>

  <p>💬 Chat Assistant</p>

  <p>⚙️ Settings</p>
</div>

      <div style={{ background: "#ffffff", padding: "20px" }}>
        Main Content
      </div>

      <div style={{ background: "#f3f4f6", padding: "20px" }}>
        Status Panel
      </div>
    </div>
  );
}