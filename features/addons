// ===============================
// SAFE ADDON SYSTEM (DO NOT TOUCH app.js)
// ===============================

// wait until app.js finishes loading
window.addEventListener("DOMContentLoaded", () => {
  console.log("Addons loaded safely");

  // hook into dashboard without breaking it
  safeInjectDashboard();
});

// ===============================
// SAFE DOM UTILS
// ===============================
function safeFind(id) {
  return document.getElementById(id);
}

function safeCreate(id, parent, html) {
  if (document.getElementById(id)) return;
  const el = document.createElement("div");
  el.id = id;
  el.innerHTML = html;
  parent.appendChild(el);
}

// ===============================
// DASHBOARD EXTENSION (NO BREAKING)
// ===============================
function safeInjectDashboard() {
  const dashboard = safeFind("dashboardPage");
  if (!dashboard) return;

  // Example: add a new AI panel without touching existing features
  safeCreate(
    "aiMindPanel",
    dashboard,
    `
      <div class="habit-section" style="margin-top:12px;">
        <div class="section-title">AI Mind Scan</div>
        <div id="aiMindText" style="color:#E5E7EB;">Analyzing your patterns...</div>
        <button onclick="runMindScan()" style="margin-top:8px;">Scan</button>
      </div>
    `
  );
}

// ===============================
// AI-LIKE LOGIC (LOCAL, SAFE)
// ===============================
function runMindScan() {
  const entries = JSON.parse(localStorage.getItem("journalEntries") || "[]");
  const todos = JSON.parse(localStorage.getItem("todos") || "[]");

  let insight = "No strong patterns detected yet.";

  if (entries.length > 5) {
    insight = "You reflect often. This suggests high self-awareness.";
  }

  if (todos.filter(t => t.done).length / Math.max(todos.length, 1) < 0.4) {
    insight = "Execution gap detected. You start more than you finish.";
  }

  const box = document.getElementById("aiMindText");
  if (box) box.textContent = insight;
}
