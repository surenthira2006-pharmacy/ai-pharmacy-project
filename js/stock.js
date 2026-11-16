document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("stockForm");
  const nameInput = document.getElementById("medicineName");
  const currentInput = document.getElementById("currentStock");
  const addInput = document.getElementById("newStock");

  // Autofill "current stock" when a known medicine name is typed.
  nameInput.addEventListener("change", () => {
    const med = getMedicines().find(m => m.name.toLowerCase() === nameInput.value.trim().toLowerCase());
    currentInput.value = med ? med.quantity : "";
  });

  function renderCards(list) {
    const cards = document.querySelectorAll(".cards .card h2");
    cards[0].textContent = list.reduce((s, m) => s + Number(m.quantity || 0), 0);
    cards[1].textContent = list.filter(m => stockStatus(m.quantity).label === "Low Stock").length;
    cards[2].textContent = list.filter(m => stockStatus(m.quantity).label === "Available").length;
    // "Pending Orders" (4th card) stays as a placeholder figure — no ordering workflow in this demo.
  }

  function renderStockTable() {
    const list = getMedicines();
    renderCards(list);

    const stockTable = document.querySelectorAll(".section table")[0];
    const rows = list.map(m => {
      const st = stockStatus(m.quantity);
      const color = st.label === "Low Stock" ? "red" : "green";
      return `<tr><td>${m.name}</td><td>${m.quantity}</td><td>${LOW_STOCK_THRESHOLD}</td><td style="color:${color};">${st.label}</td></tr>`;
    }).join("") || `<tr><td colspan="4">No medicines in inventory yet. Add some from the Inventory page.</td></tr>`;
    stockTable.innerHTML = `<tr><th>Medicine</th><th>Current Stock</th><th>Minimum Stock</th><th>Status</th></tr>${rows}`;

    // Simple heuristic AI prediction: assume demand ≈ 1.5x current stock for low-stock items.
    const predictionTable = document.querySelectorAll(".section table")[1];
    const lowStockMeds = list.filter(m => stockStatus(m.quantity).label === "Low Stock");
    const predRows = lowStockMeds.map(m => {
      const predicted = Math.round(m.quantity * 1.5) + 20;
      return `<tr><td>${m.name}</td><td>${m.quantity}</td><td>${predicted}</td><td>${predicted - m.quantity > 40 ? "Urgent Reorder" : "Order " + (predicted - m.quantity) + " More"}</td></tr>`;
    }).join("") || `<tr><td colspan="4">No medicines currently need reordering.</td></tr>`;
    predictionTable.innerHTML = `<tr><th>Medicine</th><th>Current Stock</th><th>Predicted Demand</th><th>Recommendation</th></tr>${predRows}`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const addQty = parseInt(addInput.value, 10) || 0;
    const list = getMedicines();
    const med = list.find(m => m.name.toLowerCase() === name.toLowerCase());

    if (!med) {
      alert(`"${name}" was not found in inventory. Add it first on the Medicine Inventory page.`);
      return;
    }

    updateMedicine(med.id, { quantity: Number(med.quantity) + addQty });
    logActivity(`Stock updated: ${med.name} +${addQty} units`);
    form.reset();
    renderStockTable();
  });

  renderStockTable();
});
