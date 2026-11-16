document.addEventListener("DOMContentLoaded", () => {
  const meds = getMedicines();

  // Small helper to keep medicine names safe inside HTML
  const esc = (t) => {
    const d = document.createElement("div");
    d.textContent = t == null ? "" : t;
    return d.innerHTML;
  };

  // ===== Summary cards =====
  const cardValues = document.querySelectorAll(".cards .card h2");
  cardValues[0].textContent = meds.length;
  cardValues[1].textContent = meds.reduce((s, m) => s + Number(m.quantity || 0), 0);
  cardValues[2].textContent = meds.filter(m => expiryStatus(m.expiryDate).label === "Near Expiry").length;
  cardValues[3].textContent = meds.filter(m => stockStatus(m.quantity).label === "Low Stock").length;

  // ===== Report data (used by tables, PDF and Excel) =====
  const inventoryRows = meds.map(m => [
    m.name,
    Number(m.quantity),
    stockStatus(m.quantity).label
  ]);

  const expiryRows = meds
    .filter(m => ["Near Expiry", "Expired"].includes(expiryStatus(m.expiryDate).label))
    .map(m => [m.name, formatDate(m.expiryDate), expiryStatus(m.expiryDate).label]);

  const predictionRows = meds
    .filter(m => stockStatus(m.quantity).label === "Low Stock")
    .map(m => {
      const qty = Number(m.quantity);
      const predicted = Math.round(qty * 1.5) + 20;
      const need = predicted - qty;
      return [m.name, qty, predicted, need > 40 ? "Urgent Reorder" : "Order " + need + " More"];
    });

  // ===== Tables on the page =====
  const tables = document.querySelectorAll(".section table");

  tables[0].innerHTML = `
    <tr><th>Medicine</th><th>Stock</th><th>Status</th></tr>
    ${inventoryRows.map(r =>
      `<tr><td>${esc(r[0])}</td><td>${r[1]}</td><td style="color:${r[2] === "Low Stock" ? "red" : "green"};">${r[2]}</td></tr>`
    ).join("") || `<tr><td colspan="3">No data yet.</td></tr>`}
  `;

  tables[1].innerHTML = `
    <tr><th>Medicine</th><th>Expiry Date</th><th>Status</th></tr>
    ${expiryRows.map(r =>
      `<tr><td>${esc(r[0])}</td><td>${r[1]}</td><td style="color:${r[2] === "Expired" ? "red" : "orange"};">${r[2]}</td></tr>`
    ).join("") || `<tr><td colspan="3">Nothing near expiry.</td></tr>`}
  `;

  tables[2].innerHTML = `
    <tr><th>Medicine</th><th>Current Stock</th><th>Predicted Demand</th><th>Recommendation</th></tr>
    ${predictionRows.map(r =>
      `<tr><td>${esc(r[0])}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`
    ).join("") || `<tr><td colspan="4">No reorders needed right now.</td></tr>`}
  `;

  // ===== Export: real PDF =====
  function downloadPDF() {
    if (!window.jspdf) {          // library load aagala-na print dialog open aagum
      window.print();
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Smart Pharmacy Report", 14, 15);
    doc.setFontSize(10);
    doc.text("Generated on: " + formatDate(new Date().toISOString().slice(0, 10)), 14, 22);

    const sections = [
      ["Inventory Report", ["Medicine", "Stock", "Status"], inventoryRows],
      ["Expiry Report", ["Medicine", "Expiry Date", "Status"], expiryRows],
      ["AI Stock Prediction Report", ["Medicine", "Current Stock", "Predicted Demand", "Recommendation"], predictionRows]
    ];

    let y = 30;
    sections.forEach(([title, head, body]) => {
      doc.setFontSize(12);
      doc.text(title, 14, y);
      doc.autoTable({
        startY: y + 3,
        head: [head],
        body: body.length ? body : [["No data available"]],
        theme: "grid",
        headStyles: { fillColor: [30, 136, 229] }
      });
      y = doc.lastAutoTable.finalY + 12;
      if (y > 260) { doc.addPage(); y = 20; }
    });

    doc.save("Smart_Pharmacy_Report.pdf");
  }

  // ===== Export: real Excel (.xlsx) =====
  function downloadExcel() {
    if (!window.XLSX) {           // library load aagala-na CSV download aagum
      downloadCSV();
      return;
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,
      XLSX.utils.aoa_to_sheet([["Medicine", "Stock", "Status"], ...inventoryRows]), "Inventory");
    XLSX.utils.book_append_sheet(wb,
      XLSX.utils.aoa_to_sheet([["Medicine", "Expiry Date", "Status"], ...expiryRows]), "Expiry");
    XLSX.utils.book_append_sheet(wb,
      XLSX.utils.aoa_to_sheet([["Medicine", "Current Stock", "Predicted Demand", "Recommendation"], ...predictionRows]), "Prediction");
    XLSX.writeFile(wb, "Smart_Pharmacy_Report.xlsx");
  }

  // CSV fallback
  function downloadCSV() {
    const header = ["Medicine", "Stock", "Status", "Expiry Date"];
    const rows = meds.map(m => [m.name, m.quantity, stockStatus(m.quantity).label, formatDate(m.expiryDate)]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pharmacy_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===== Buttons =====
  const buttons = document.querySelectorAll(".section button");
  const pdfBtn = buttons[0], excelBtn = buttons[1], printBtn = buttons[2];

  pdfBtn?.addEventListener("click", downloadPDF);
  excelBtn?.addEventListener("click", downloadExcel);
  printBtn?.addEventListener("click", () => window.print());
});