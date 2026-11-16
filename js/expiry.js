document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.querySelector(".section input[type='text']");
  const searchBtn = document.querySelector(".section button");
  const notifyBtn = document.querySelectorAll(".section button")[document.querySelectorAll(".section button").length - 1];

  function render(filterText = "") {
    const all = getMedicines();
    const filtered = filterText
      ? all.filter(m => m.name.toLowerCase().includes(filterText.toLowerCase()))
      : all;

    const nearExpiry = filtered
      .filter(m => expiryStatus(m.expiryDate).label === "Near Expiry")
      .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate));
    const expired = filtered
      .filter(m => expiryStatus(m.expiryDate).label === "Expired")
      .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate));

    document.getElementById("totalMedicines").textContent = all.length;
    document.getElementById("nearExpiry").textContent = all.filter(m => expiryStatus(m.expiryDate).label === "Near Expiry").length;
    document.getElementById("expiredMedicines").textContent = all.filter(m => expiryStatus(m.expiryDate).label === "Expired").length;
    document.getElementById("alertsSent").textContent = localStorage.getItem("expiryAlertsSent") || "0";

    const tables = document.querySelectorAll(".section table");

    tables[0].innerHTML = `
      <tr><th>Medicine</th><th>Batch No</th><th>Expiry Date</th><th>Days Left</th><th>Status</th></tr>
      ${nearExpiry.map(m => {
        const d = daysUntil(m.expiryDate);
        return `<tr><td>${m.name}</td><td>${m.batchNumber}</td><td>${formatDate(m.expiryDate)}</td><td>${d}</td><td style="color:${d <= 7 ? "red" : "orange"};">${d <= 7 ? "Urgent" : "Warning"}</td></tr>`;
      }).join("") || `<tr><td colspan="5">No medicines are nearing expiry.</td></tr>`}
    `;

    tables[1].innerHTML = `
      <tr><th>Medicine</th><th>Batch No</th><th>Expiry Date</th><th>Status</th></tr>
      ${expired.map(m => `<tr><td>${m.name}</td><td>${m.batchNumber}</td><td>${formatDate(m.expiryDate)}</td><td style="color:red;">Expired</td></tr>`).join("") || `<tr><td colspan="4">No expired medicines.</td></tr>`}
    `;

    const alertText = document.querySelector(".section:last-of-type p");
    if (alertText) {
      const names = nearExpiry.slice(0, 3).map(m => m.name);
      alertText.innerHTML = names.length
        ? `AI has identified <strong>${names.join("</strong>, <strong>")}</strong> as medicine(s) that require immediate attention due to their upcoming expiry dates.`
        : `No medicines currently need urgent expiry attention.`;
    }
  }

  searchBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    render(searchInput.value);
  });
  searchInput?.addEventListener("keyup", (e) => {
    if (e.key === "Enter") render(searchInput.value);
  });

  notifyBtn?.addEventListener("click", () => {
    const sent = (parseInt(localStorage.getItem("expiryAlertsSent") || "0", 10)) + 1;
    localStorage.setItem("expiryAlertsSent", sent);
    logActivity("Expiry notification sent to pharmacist");
    alert("Expiry notification sent to the pharmacist (demo).");
    render(searchInput.value);
  });

  render();
});
