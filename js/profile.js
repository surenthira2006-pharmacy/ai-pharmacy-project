document.addEventListener("DOMContentLoaded", () => {
  const PROFILE_KEY = "pharmacyProfile";
  const forms = document.querySelectorAll("form");
  const profileForm = forms[0];
  const passwordForm = forms[1];
  const [nameInput, emailInput, phoneInput, pharmacyInput] = profileForm.querySelectorAll("input");
  const addressInput = profileForm.querySelector("textarea");

  function loadProfile() {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    if (!saved) return;
    nameInput.value = saved.fullName || nameInput.value;
    emailInput.value = saved.email || emailInput.value;
    phoneInput.value = saved.phone || phoneInput.value;
    pharmacyInput.value = saved.pharmacyName || pharmacyInput.value;
    addressInput.value = saved.address || addressInput.value;
  }

  profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {
      fullName: nameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      pharmacyName: pharmacyInput.value.trim(),
      address: addressInput.value.trim()
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    showMsg(profileForm, "Profile saved.", true);
  });

  passwordForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const [current, next, confirmPw] = passwordForm.querySelectorAll("input");
    if (current.value !== PHARMACIST_CREDENTIALS.password) {
      showMsg(passwordForm, "Current password is incorrect.", false);
      return;
    }
    if (!next.value || next.value !== confirmPw.value) {
      showMsg(passwordForm, "New password and confirmation do not match.", false);
      return;
    }
    // Demo only: updates the in-memory credential for this session.
    PHARMACIST_CREDENTIALS.password = next.value;
    passwordForm.reset();
    showMsg(passwordForm, "Password updated for this session.", true);
  });

  function showMsg(form, text, ok) {
    let msg = form.querySelector(".form-msg");
    if (!msg) {
      msg = document.createElement("p");
      msg.className = "form-msg";
      form.appendChild(msg);
    }
    msg.textContent = text;
    msg.className = "form-msg " + (ok ? "ok" : "err");
  }

  // Account settings buttons
  const settingsButtons = document.querySelectorAll(".section:last-of-type button");
  settingsButtons[0]?.addEventListener("click", () => alert("Notification settings are a placeholder in this demo."));
  settingsButtons[1]?.addEventListener("click", () => {
    const data = { profile: JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"), medicines: getMedicines() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my_pharmacy_data.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  loadProfile();
});
