document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("medicineForm");
  const searchInput = document.getElementById("medicineSearch");
  const tableBody = document.getElementById("medicineTableBody");
  let editingId = null;

  function renderCards(list) {
    document.getElementById("totalMedicines").textContent = list.length;
    document.getElementById("totalQuantity").textContent = list.reduce((s, m) => s + Number(m.quantity || 0), 0);
    document.getElementById("lowStock").textContent = list.filter(m => stockStatus(m.quantity).label === "Low Stock").length;
    document.getElementById("nearExpiry").textContent = list.filter(m => expiryStatus(m.expiryDate).label === "Near Expiry").length;
  }

  function renderTable(filterText = "") {
    const all = getMedicines();
    renderCards(all);

    const filtered = filterText
      ? all.filter(m => m.name.toLowerCase().includes(filterText.toLowerCase()))
      : all;

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="10">No medicine data available yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map(m => {
      const est = expiryStatus(m.expiryDate);
      return `
        <tr>
          <td>${m.id}</td>
          <td>${m.name}</td>
          <td>${m.description || "-"}</td>
          <td>${m.uses || "-"}</td>
          <td>₹${Number(m.price).toFixed(2)}</td>
          <td>${m.quantity}</td>
          <td>${m.prescriptionRequired}</td>
          <td>${m.batchNumber}</td>
          <td>${formatDate(m.expiryDate)}</td>
          <td><span class="badge ${est.cls}">${est.label}</span></td>
        </tr>
        <tr>
          <td colspan="10" class="row-actions" style="text-align:right;padding-top:0;">
            <button class="edit-btn" data-id="${m.id}"><i class="fa-solid fa-pen"></i> Edit</button>
            <button class="delete-btn" data-id="${m.id}"><i class="fa-solid fa-trash"></i> Delete</button>
          </td>
        </tr>`;
    }).join("");

    tableBody.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => startEdit(Number(btn.dataset.id)));
    });
    tableBody.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (confirm("Delete this medicine from inventory?")) {
          deleteMedicine(Number(btn.dataset.id));
          renderTable(searchInput.value);
        }
      });
    });
  }

  function startEdit(id) {
    const med = getMedicines().find(m => m.id === id);
    if (!med) return;
    editingId = id;
    document.getElementById("medicineName").value = med.name;
    document.getElementById("description").value = med.description;
    document.getElementById("uses").value = med.uses;
    document.getElementById("price").value = med.price;
    document.getElementById("quantity").value = med.quantity;
    document.getElementById("prescriptionRequired").value = med.prescriptionRequired;
    document.getElementById("batchNumber").value = med.batchNumber;
    document.getElementById("expiryDate").value = med.expiryDate;
    form.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update Medicine';
    form.scrollIntoView({ behavior: "smooth" });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const med = {
      name: document.getElementById("medicineName").value.trim(),
      description: document.getElementById("description").value.trim(),
      uses: document.getElementById("uses").value.trim(),
      price: parseFloat(document.getElementById("price").value),
      quantity: parseInt(document.getElementById("quantity").value, 10),
      prescriptionRequired: document.getElementById("prescriptionRequired").value,
      batchNumber: document.getElementById("batchNumber").value.trim(),
      expiryDate: document.getElementById("expiryDate").value
    };

    if (editingId) {
      updateMedicine(editingId, med);
      editingId = null;
      form.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Medicine';
    } else {
      addMedicine(med);
    }
    form.reset();
    renderTable(searchInput.value);
  });

  searchInput.addEventListener("input", () => renderTable(searchInput.value));

  // Bulk import: paste a JSON array of medicines and add them all at once.
  const bulkBtn = document.getElementById("bulkImportBtn");
  const bulkInput = document.getElementById("bulkImportInput");
  const bulkMsg = document.getElementById("bulkImportMsg");

  bulkBtn.addEventListener("click", () => {
    let parsed;
    try {
      parsed = JSON.parse(bulkInput.value);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array [ ... ]");
    } catch (err) {
      bulkMsg.textContent = "Couldn't read that JSON: " + err.message;
      bulkMsg.className = "form-msg err";
      return;
    }

    const required = ["name", "price", "quantity", "prescriptionRequired", "batchNumber", "expiryDate"];
    const invalidIndex = parsed.findIndex(m => required.some(field => m[field] === undefined || m[field] === ""));
    if (invalidIndex !== -1) {
      bulkMsg.textContent = `Entry #${invalidIndex + 1} is missing a required field (name/price/quantity/prescriptionRequired/batchNumber/expiryDate).`;
      bulkMsg.className = "form-msg err";
      return;
    }

    addMedicines(parsed.map(m => ({
      name: m.name,
      description: m.description || "",
      uses: m.uses || "",
      price: parseFloat(m.price),
      quantity: parseInt(m.quantity, 10),
      prescriptionRequired: m.prescriptionRequired,
      batchNumber: m.batchNumber,
      expiryDate: m.expiryDate
    })));

    bulkMsg.textContent = `Imported ${parsed.length} medicines successfully.`;
    bulkMsg.className = "form-msg ok";
    bulkInput.value = "";
    renderTable(searchInput.value);
  });

  renderTable();
});
