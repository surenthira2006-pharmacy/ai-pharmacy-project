// Demo credentials (kept in sync with js/auth.js, which the other
// pharmacist pages use to guard access).
const PHARMACIST_CREDENTIALS = {
  username: "admin",
  password: "admin123"
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const toggle = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");
  const errorEl = document.getElementById("loginError");

  // If already logged in, skip straight to the dashboard.
  if (sessionStorage.getItem("pharmacistLoggedIn") === "true") {
    window.location.href = "dashboard.html";
    return;
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      const showing = passwordInput.type === "text";
      passwordInput.type = showing ? "password" : "text";
      toggle.innerHTML = showing
        ? '<i class="fa-solid fa-eye"></i>'
        : '<i class="fa-solid fa-eye-slash"></i>';
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (username === PHARMACIST_CREDENTIALS.username && password === PHARMACIST_CREDENTIALS.password) {
      sessionStorage.setItem("pharmacistLoggedIn", "true");
      window.location.href = "dashboard.html";
    } else {
      errorEl.textContent = "Invalid username or password.";
      errorEl.classList.add("err");
    }
  });

  document.querySelector(".google-btn")?.addEventListener("click", () => {
    errorEl.textContent = "Google sign-in is a placeholder in this demo — please use the form above.";
    errorEl.classList.remove("err");
  });
});
