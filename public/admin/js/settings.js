(function () {
  "use strict";

  const { apiFetch, showAlert, loadSession, logout } = window.AdminApp;
  const alertBox = document.getElementById("page-alert");
  const form = document.getElementById("password-form");
  const button = document.getElementById("password-button");

  document.getElementById("logout-button").addEventListener("click", logout);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    alertBox.innerHTML = "";

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert(alertBox, "warning", "Preencha todos os campos.");
      return;
    }
    if (newPassword.length < 8) {
      showAlert(alertBox, "warning", "A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert(alertBox, "warning", "A confirmação não corresponde à nova senha.");
      return;
    }

    button.disabled = true;
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      showAlert(alertBox, "success", "Senha alterada com sucesso.");
      form.reset();
    } catch (error) {
      const detailMessage =
        error.details && Array.isArray(error.details)
          ? error.details.map((d) => d.message).join(" ")
          : "";
      showAlert(alertBox, "danger", `${error.message} ${detailMessage}`.trim());
    } finally {
      button.disabled = false;
    }
  });

  (async () => {
    try {
      const user = await loadSession();
      document.getElementById("account-name").textContent = user.name;
      document.getElementById("account-email").textContent = user.email;
    } catch (error) {
      showAlert(alertBox, "danger", error.message || "Falha ao carregar a conta.");
    }
  })();
})();
