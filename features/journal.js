// ============================================
// JOURNAL MODULE (Upgraded)
// - Boxed 2-column layout: Today (edit) + History (browse)
// - Autosave while typing (debounced)
// - Search + filters (7 / 30 / all time)
// - Clickable history list
// - Past entries read-only
// ============================================

let journalData = {};
let journalView = {
  selectedDate: null,
  filterRange: "30", // "7" | "30" | "all"
  search: "",
  autosaveTimer: null,
  lastSavedAt: null
};

// ---------- Init / Save ----------
function initJournalData() {
  const saved = localStorage.getItem("journalData");
  if (saved) {
    try {
      journalData = JSON.parse(saved) || {};
    } catch {
      journalData = {};
    }
  }
}

function saveJournalData() {
  localStorage.setItem("journalData", JSON.stringify(journalData));
  journalView.lastSavedAt = new Date();
  updateJournalSaveStatus();
}

// ---------- Dates ----------
function getJournalDateString(date) {
  const d = date || new Date();
  return d.toISOString().split("T")[0];
}

function formatJournalDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// ---------- Word count ----------
function countWords(text) {
  if (!text || text.trim() === "") return 0;
  return text.trim().split(/\s+/).length;
}

// ---------- Entry helpers ----------
function getEmptyEntry() {
  return {
    wins: ["", "", ""],
    gratitude: ["", "", ""],
    affirmations: ["", "", "", "", ""],
    entry: ""
  };
}

function getEntry(dateStr) {
  return journalData[dateStr] || getEmptyEntry();
}

function isEntryNonEmpty(entry) {
  if (!entry) return false;
  const hasWins = Array.isArray(entry.wins) && entry.wins.some(Boolean);
  const hasGrat = Array.isArray(entry.gratitude) && entry.gratitude.some(Boolean);
  const hasAff = Array.isArray(entry.affirmations) && entry.affirmations.some(Boolean);
  const hasText = !!(entry.entry && entry.entry.trim());
  return hasWins || hasGrat || hasAff || hasText;
}

// ---------- Stats ----------
function calculateJournalStats() {
  const dates = Object.keys(journalData);
  let totalWords = 0;

  dates.forEach((dateStr) => {
    const entry = journalData[dateStr];
    if (entry && entry.entry) totalWords += countWords(entry.entry);
  });

  // streak: consecutive days back from today where ANY field has content
  let currentStreak = 0;
  const today = new Date();
  const check = new Date(today);

  while (true) {
    const key = getJournalDateString(check);
    const entry = journalData[key];
    if (entry && isEntryNonEmpty(entry)) {
      currentStreak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    totalEntries: dates.length,
    currentStreak,
    totalWords
  };
}

// ---------- History list filtering ----------
function getFilteredHistoryDates() {
  const allDates = Object.keys(journalData).sort().reverse(); // newest first
  const today = new Date();

  let allowed = allDates;

  if (journalView.filterRange !== "all") {
    const days = parseInt(journalView.filterRange, 10);
    const min = new Date(today);
    min.setDate(min.getDate() - (days - 1));
    const minKey = getJournalDateString(min);

    allowed = allDates.filter((d) => d >= minKey);
  }

  const q = (journalView.search || "").trim().toLowerCase();
  if (!q) return allowed;

  // search across entry text + wins/gratitude/affirmations
  return allowed.filter((dateStr) => {
    const e = journalData[dateStr];
    if (!e) return false;

    const blob = [
      ...(e.wins || []),
      ...(e.gratitude || []),
      ...(e.affirmations || []),
      e.entry || ""
    ]
      .join(" ")
      .toLowerCase();

    return blob.includes(q) || dateStr.includes(q);
  });
}

// ---------- Autosave ----------
function journalDebouncedSave(fn) {
  clearTimeout(journalView.autosaveTimer);
  journalView.autosaveTimer = setTimeout(() => {
    fn();
    saveJournalData();
  }, 250);
}

function updateJournalSaveStatus() {
  const el = document.getElementById("journalSaveStatus");
  if (!el) return;

  if (!journalView.lastSavedAt) {
    el.textContent = "Not saved yet";
    el.style.color = "#9CA3AF";
    return;
  }

  const t = journalView.lastSavedAt;
  const hh = t.getHours() % 12 || 12;
  const mm = String(t.getMinutes()).padStart(2, "0");
  const ampm = t.getHours() >= 12 ? "PM" : "AM";

  el.textContent = `Saved ${hh}:${mm} ${ampm}`;
  el.style.color = "rgba(255,255,255,0.75)";
}

// ---------- Save field (always saves for TODAY) ----------
function saveJournalField(field, index, value) {
  const today = getJournalDateString(new Date());

  if (!journalData[today]) journalData[today] = getEmptyEntry();

  if (index !== null && index !== undefined) {
    if (!Array.isArray(journalData[today][field])) journalData[today][field] = [];
    journalData[today][field][index] = value;
  } else {
    journalData[today][field] = value;
  }

  // Save status + stats update (debounced)
  journalDebouncedSave(() => {});
}

// ---------- UI actions ----------
function journalSetFilter(range) {
  journalView.filterRange = range;
  renderJournalPage();
}

function journalSetSearch(value) {
  journalView.search = value;
  renderJournalPage();
}

function journalSelectDate(dateStr) {
  journalView.selectedDate = dateStr;
  renderJournalPage();
}

// ---------- Render ----------
function renderJournalPage() {
  const container = document.getElementById("journalContainer");
  if (!container) return;

  const today = getJournalDateString(new Date());
  if (!journalView.selectedDate) journalView.selectedDate = today;

  const isToday = journalView.selectedDate === today;
  const selectedEntry = getEntry(journalView.selectedDate);

  // Ensure today entry exists so typing always works
  if (!journalData[today]) journalData[today] = getEmptyEntry();

  const stats = calculateJournalStats();
  const historyDates = getFilteredHistoryDates();

  // Layout shell
  let html = `
    <div style="display:flex; gap:18px; align-items:flex-start; flex-wrap:wrap;">
      
      <!-- LEFT: Today / Editor -->
      <div style="flex:1; min-width:340px;">
        <div style="
          border-radius:16px;
          border:1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
          padding:16px;
          margin-bottom:16px;
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <div>
              <div style="font-weight:900; color:white; font-size:1.15rem;">📝 Journal</div>
              <div style="color:#9CA3AF; margin-top:4px;">
                ${isToday ? "Today (editable)" : `Viewing: ${formatJournalDateLabel(journalView.selectedDate)} (read-only)`}
              </div>
            </div>
            <div style="text-align:right;">
              <div id="journalSaveStatus" style="font-weight:800; color:rgba(255,255,255,0.75);">Not saved yet</div>
              <div style="color:#9CA3AF; font-size:0.85em;">Autosave is ON</div>
            </div>
          </div>
        </div>

        <!-- Daily Wins -->
        <div class="journal-section" style="border-radius:16px;">
          <div class="section-title">🏆 Daily Wins</div>
          ${[0,1,2].map(i => `
            <input
              type="text"
              class="journal-input"
              placeholder="Win #${i+1}"
              value="${(selectedEntry.wins && selectedEntry.wins[i]) ? selectedEntry.wins[i].replace(/"/g, "&quot;") : ""}"
              ${isToday ? "" : "disabled"}
              oninput="saveJournalField('wins', ${i}, this.value)"
            >
          `).join("")}
        </div>

        <!-- Gratitude -->
        <div class="journal-section" style="border-radius:16px;">
          <div class="section-title">🙏 Gratitude</div>
          ${[0,1,2].map(i => `
            <input
              type="text"
              class="journal-input"
              placeholder="Grateful for #${i+1}"
              value="${(selectedEntry.gratitude && selectedEntry.gratitude[i]) ? selectedEntry.gratitude[i].replace(/"/g, "&quot;") : ""}"
              ${isToday ? "" : "disabled"}
              oninput="saveJournalField('gratitude', ${i}, this.value)"
            >
          `).join("")}
        </div>

        <!-- Affirmations -->
        <div class="journal-section" style="border-radius:16px;">
          <div class="section-title">✨ I AM Affirmations</div>
          ${[0,1,2,3,4].map(i => `
            <input
              type="text"
              class="journal-input"
              placeholder="I AM..."
              value="${(selectedEntry.affirmations && selectedEntry.affirmations[i]) ? selectedEntry.affirmations[i].replace(/"/g, "&quot;") : ""}"
              ${isToday ? "" : "disabled"}
              oninput="saveJournalField('affirmations', ${i}, this.value)"
            >
          `).join("")}
        </div>

        <!-- Free Entry -->
        <div class="journal-section" style="border-radius:16px;">
          <div class="section-title">🧠 Journal Entry</div>
          <textarea
            class="journal-input journal-textarea"
            placeholder="Write your thoughts for today..."
            ${isToday ? "" : "disabled"}
            oninput="saveJournalField('entry', null, this.value); document.getElementById('journalWordCount').textContent = countWords(this.value);"
          >${selectedEntry.entry || ""}</textarea>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <div style="color:#9CA3AF; font-size:0.85em;">
              Word count: <span id="journalWordCount">${countWords(selectedEntry.entry || "")}</span>
            </div>
            <div style="color:#9CA3AF; font-size:0.85em;">
              Tip: 3 sentences is enough.
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="journal-section" style="border-radius:16px;">
          <div class="section-title">📊 Journal Stats</div>
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            ${`
              <div style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 12px; text-align: center; border:1px solid rgba(255,255,255,0.10);">
                <div style="font-size: 2em; color: white; font-weight: 900;">${stats.totalEntries}</div>
                <div style="color: #9CA3AF; font-size: 0.85em;">Total Entries</div>
              </div>
              <div style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 12px; text-align: center; border:1px solid rgba(255,255,255,0.10);">
                <div style="font-size: 2em; color: white; font-weight: 900;">${stats.currentStreak}</div>
                <div style="color: #9CA3AF; font-size: 0.85em;">Day Streak</div>
              </div>
              <div style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 12px; text-align: center; border:1px solid rgba(255,255,255,0.10);">
                <div style="font-size: 2em; color: white; font-weight: 900;">${stats.totalWords}</div>
                <div style="color: #9CA3AF; font-size: 0.85em;">Total Words</div>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- RIGHT: History -->
      <div style="width:360px; min-width:320px;">
        <div style="
          border-radius:16px;
          border:1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
          padding:16px;
          margin-bottom:16px;
        ">
          <div style="font-weight:900; color:white; font-size:1.05rem;">📅 History</div>

          <div style="display:flex; gap:8px; margin-top:12px;">
            <button onclick="journalSetFilter('7')" style="${journalView.filterRange==='7' ? journalActiveBtnStyle() : journalBtnStyle()}">7 days</button>
            <button onclick="journalSetFilter('30')" style="${journalView.filterRange==='30' ? journalActiveBtnStyle() : journalBtnStyle()}">30 days</button>
            <button onclick="journalSetFilter('all')" style="${journalView.filterRange==='all' ? journalActiveBtnStyle() : journalBtnStyle()}">All</button>
          </div>

          <input
            type="text"
            value="${(journalView.search || "").replace(/"/g, "&quot;")}"
            oninput="journalSetSearch(this.value)"
            placeholder="Search past entries..."
            style="margin-top:12px; width:100%; padding:10px; border-radius:10px; background: rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:white;"
          />

          <div style="margin-top:12px; max-height:520px; overflow:auto; display:flex; flex-direction:column; gap:8px;">
            ${historyDates.length ? historyDates.map(d => {
              const active = (d === journalView.selectedDate);
              const label = (d === today) ? "Today" : formatJournalDateLabel(d);
              const e = journalData[d];
              const preview = (e?.entry || e?.wins?.find(Boolean) || e?.gratitude?.find(Boolean) || e?.affirmations?.find(Boolean) || "").toString().trim();
              const previewShort = preview.length > 48 ? preview.slice(0, 48) + "…" : preview;

              return `
                <button
                  onclick="journalSelectDate('${d}')"
                  style="
                    text-align:left;
                    padding:12px;
                    border-radius:14px;
                    border:1px solid ${active ? "rgba(236,72,153,0.45)" : "rgba(255,255,255,0.10)"};
                    background:${active ? "linear-gradient(135deg, rgba(236,72,153,0.16), rgba(99,102,241,0.10))" : "rgba(255,255,255,0.04)"};
                    color:white;
                    cursor:pointer;
                  "
                  title="${label}"
                >
                  <div style="font-weight:900;">${label}</div>
                  <div style="color:#9CA3AF; font-size:0.85em; margin-top:4px;">${previewShort || "—"}</div>
                </button>
              `;
            }).join("") : `
              <div style="color:#9CA3AF; text-align:center; padding:18px;">
                No entries found for this filter/search.
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Update save status display
  updateJournalSaveStatus();

  // If viewing past entry, show a subtle note (kept from your original)
  if (!isToday) {
    const note = document.createElement("div");
    note.className = "past-entry-note";
    note.style.cssText =
      "background: rgba(251, 191, 36, 0.16); border: 1px solid rgba(251, 191, 36, 0.35); padding: 12px; border-radius: 12px; margin-top: 14px; color: #FCD34D; text-align: center;";
    note.textContent = "📖 Viewing past entry (read-only)";
    container.prepend(note);
  }
}

// ---------- Button styles (inline helpers) ----------
function journalBtnStyle() {
  return `
    flex:1;
    padding:10px 10px;
    border-radius:12px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.9);
    cursor: pointer;
    font-weight: 900;
  `;
}

function journalActiveBtnStyle() {
  return `
    flex:1;
    padding:10px 10px;
    border-radius:12px;
    background: linear-gradient(135deg, rgba(236,72,153,0.22), rgba(99,102,241,0.14));
    border: 1px solid rgba(236,72,153,0.38);
    color: white;
    cursor: pointer;
    font-weight: 900;
  `;
}
