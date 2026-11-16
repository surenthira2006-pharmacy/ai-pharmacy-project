/* =========================================================
   STORE.JS — Shared medicine data layer (browser localStorage)
   No backend/database is used in this project version, so all
   pharmacist pages read and write the same localStorage key.
   Swap these functions for real API calls later if you add a
   server + database.
   ========================================================= */

const MED_KEY = "pharmacy_medicines";
const ACTIVITY_KEY = "pharmacy_activity";
const LOW_STOCK_THRESHOLD = 30;   // quantity below this = "Low Stock"
const NEAR_EXPIRY_DAYS = 30;      // days-left below this = "Near Expiry"

function getMedicines() {
  const raw = localStorage.getItem(MED_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveMedicines(list) {
  localStorage.setItem(MED_KEY, JSON.stringify(list));
}

// Real activity log — used to make the Dashboard's "Recent Activity" table
// reflect what actually happened, instead of showing static demo text.
function logActivity(action) {
  const list = getActivity();
  list.unshift({ date: new Date().toISOString(), action });
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list.slice(0, 20))); // keep last 20
}

function getActivity() {
  const raw = localStorage.getItem(ACTIVITY_KEY);
  return raw ? JSON.parse(raw) : [];
}

function addMedicine(med) {
  const list = getMedicines();
  med.id = Date.now();
  list.push(med);
  saveMedicines(list);
  return list;
}

// Add many medicines at once (used by the Inventory page's Bulk Import box).
// Each gets a unique id even when added within the same millisecond.
function addMedicines(newMeds) {
  const list = getMedicines();
  const base = Date.now();
  newMeds.forEach((med, i) => {
    med.id = base + i;
    list.push(med);
  });
  saveMedicines(list);
  return list;
}

function updateMedicine(id, updates) {
  const list = getMedicines().map(m => (m.id === id ? { ...m, ...updates } : m));
  saveMedicines(list);
  return list;
}

function deleteMedicine(id) {
  const list = getMedicines().filter(m => m.id !== id);
  saveMedicines(list);
  return list;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

function expiryStatus(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return { label: "Unknown", cls: "" };
  if (d < 0) return { label: "Expired", cls: "danger" };
  if (d <= NEAR_EXPIRY_DAYS) return { label: "Near Expiry", cls: "warning" };
  return { label: "Safe", cls: "safe" };
}

function stockStatus(qty) {
  return Number(qty) < LOW_STOCK_THRESHOLD
    ? { label: "Low Stock", cls: "low" }
    : { label: "Available", cls: "available" };
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Seed some sample data the first time the app is opened, so every
// page has something to display straight away (matches the demo
// medicines already shown in the original static mockup pages).
function seedIfEmpty() {
  if (getMedicines().length > 0) return;
  const today = new Date();
  const iso = (daysFromNow) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().slice(0, 10);
  };
  saveMedicines([
    { id: 1, name: "Paracetamol", description: "Pain reliever and fever reducer", uses: "Fever, mild to moderate pain", price: 20, quantity: 120, prescriptionRequired: "No", batchNumber: "PAR101", expiryDate: iso(45) },
    { id: 2, name: "Dolo 650", description: "Paracetamol 650mg tablet", uses: "Fever, headache, body pain", price: 30, quantity: 18, prescriptionRequired: "No", batchNumber: "DOL202", expiryDate: iso(70) },
    { id: 3, name: "Amoxicillin", description: "Broad-spectrum antibiotic", uses: "Bacterial infections (as prescribed)", price: 80, quantity: 45, prescriptionRequired: "Yes", batchNumber: "AMX303", expiryDate: iso(200) },
    { id: 4, name: "Crocin", description: "Paracetamol based fever/pain relief", uses: "Fever, pain", price: 25, quantity: 15, prescriptionRequired: "No", batchNumber: "CRO303", expiryDate: iso(4) },
    { id: 5, name: "Vitamin C", description: "Immunity supplement", uses: "Immunity support, common cold", price: 50, quantity: 60, prescriptionRequired: "No", batchNumber: "VIT404", expiryDate: iso(-15) }
  ]);
}

document.addEventListener("DOMContentLoaded", seedIfEmpty);
