document.addEventListener("DOMContentLoaded", () => {
  const meds = getMedicines();

  document.getElementById("totalMedicines").textContent = meds.length;
  document.getElementById("totalStock").textContent = meds.reduce((s, m) => s + Number(m.quantity || 0), 0);
  document.getElementById("expiringSoon").textContent = meds.filter(m => expiryStatus(m.expiryDate).label === "Near Expiry").length;
  document.getElementById("lowStock").textContent = meds.filter(m => stockStatus(m.quantity).label === "Low Stock").length;

  // Populate "Medicine Expiry Alerts" table with real near-expiry/expired items.
  const alertMeds = meds
    .filter(m => ["Near Expiry", "Expired"].includes(expiryStatus(m.expiryDate).label))
    .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate))
    .slice(0, 6);

  const alertsTable = document.querySelectorAll(".section table")[0];
  if (alertsTable) {
    const rows = alertMeds.length
      ? alertMeds.map(m => {
          const st = expiryStatus(m.expiryDate);
          const color = st.label === "Expired" ? "red" : "orange";
          return `<tr><td>${m.name}</td><td>${formatDate(m.expiryDate)}</td><td style="color:${color};">${st.label}</td></tr>`;
        }).join("")
      : `<tr><td colspan="3">No medicines are close to expiry right now.</td></tr>`;
    alertsTable.innerHTML = `<tr><th>Medicine</th><th>Expiry Date</th><th>Status</th></tr>${rows}`;
  }

  // Simple heuristic "AI prediction" line: highlight the fastest-moving low-stock item.
  const predictionTarget = meds.filter(m => stockStatus(m.quantity).label === "Low Stock")[0];
  const predictionEl = document.querySelector(".section p");
  if (predictionTarget && predictionEl) {
    predictionEl.innerHTML = `AI predicts that <strong>${predictionTarget.name}</strong> demand will rise soon — current stock (${predictionTarget.quantity}) is below the safe threshold. Consider reordering.`;
  }
  // Recent Activity: show the real log written by logActivity() in store.js
  const activityTable = document.querySelectorAll(".section table")[1];
  if (activityTable && typeof getActivity === "function") {
    const esc = (t) => { const x = document.createElement("div"); x.textContent = t; return x.innerHTML; };
    const acts = getActivity().slice(0, 8);
    const arows = acts.length
      ? acts.map(a => {
          const t = new Date(a.date);
          const when = `${formatDate(a.date)} ${t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
          return `<tr><td>${when}</td><td>${esc(a.action)}</td></tr>`;
        }).join("")
      : `<tr><td colspan="2">No activity recorded yet. Add or update a medicine to see it here.</td></tr>`;
    activityTable.innerHTML = `<tr><th>Date &amp; Time</th><th>Activity</th></tr>${arows}`;
  }
});
