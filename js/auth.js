/* =========================================================
   AUTH.JS — Demo pharmacist login guard
   Include this on every page that only the pharmacist may view
   (dashboard, inventory, stock, expiry, reports, profile).
   The AI Chatbot page and the public landing page do NOT
   include this file, so anyone can open them.

   NOTE: This is a client-side demo for a college project.
   Real deployments must verify logins on a server.
   ========================================================= */

// Demo credentials — change these for your own submission if needed.
const PHARMACIST_CREDENTIALS = {
  username: "admin",
  password: "admin123"
};

function isLoggedIn() {
  return sessionStorage.getItem("pharmacistLoggedIn") === "true";
}

function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

function logout() {
  sessionStorage.removeItem("pharmacistLoggedIn");
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  // Run the guard immediately on every protected page.
  requireLogin();

  // Show the pharmacist's saved name in the header "Admin" badges, if set.
  const profile = JSON.parse(localStorage.getItem("pharmacyProfile") || "null");
  if (profile && profile.fullName) {
    document.querySelectorAll(".header .user, .header span.user").forEach(el => {
      el.innerHTML = `<i class="fa-solid fa-user-circle"></i> ${profile.fullName}`;
    });
  }

  // Wire up any explicit logout button (id="logoutBtn").
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Also clear the session when the sidebar "Logout" link is used.
  document.querySelectorAll('a[href="login.html"]').forEach(link => {
    link.addEventListener("click", () => sessionStorage.removeItem("pharmacistLoggedIn"));
  });
});
