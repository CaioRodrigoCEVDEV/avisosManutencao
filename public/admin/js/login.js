(function () {
  "use strict";

  const { apiFetch, showAlert } = window.AdminApp;
  const form = document.getElementById("login-form");
  const alertBox = document.getElementById("login-alert");
  const submitButton = document.getElementById("login-submit");

  apiFetch("/api/auth/me", { redirectOn401: false })
    .then(() => {
      window.location.href = "/admin";
    })
    .catch(() => {
      /* não autenticado: permanece na tela de login */
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    alertBox.innerHTML = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      showAlert(alertBox, "warning", "Informe email e senha.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Entrando...";

    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        redirectOn401: false,
        body: JSON.stringify({ email, password }),
      });
      window.location.href = "/admin";
    } catch (error) {
      showAlert(alertBox, "danger", "Email ou senha inválidos.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Entrar";
    }
  });
})();
