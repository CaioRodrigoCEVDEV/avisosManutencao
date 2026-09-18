(function () {
  "use strict";

  const { apiFetch, toDateInput, toTimeInput, showAlert, loadSession, logout } = window.AdminApp;
  const alertBox = document.getElementById("page-alert");
  const form = document.getElementById("maintenance-form");
  const saveButton = document.getElementById("save-button");
  const fields = {
    title: document.getElementById("title"),
    startDate: document.getElementById("startDate"),
    startTime: document.getElementById("startTime"),
    endDate: document.getElementById("endDate"),
    endTime: document.getElementById("endTime"),
    message: document.getElementById("message"),
    active: document.getElementById("active"),
  };

  const pathMatch = window.location.pathname.match(/\/admin\/maintenance\/([^/]+)\/edit/);
  const editingId = pathMatch ? pathMatch[1] : null;

  document.getElementById("logout-button").addEventListener("click", logout);

  function updatePreview() {
    document.getElementById("preview-title").textContent = fields.title.value || "-";

    let period = "-";
    if (fields.startDate.value && fields.startTime.value) {
      const startLabel = `${fields.startDate.value.split("-").reverse().join("/")} ${fields.startTime.value}`;
      if (fields.endDate.value && fields.endTime.value) {
        const endLabel = `${fields.endDate.value.split("-").reverse().join("/")} ${fields.endTime.value}`;
        period = `${startLabel} até ${endLabel}`;
      } else {
        period = startLabel;
      }
    }
    document.getElementById("preview-period").textContent = period;
    document.getElementById("preview-message").textContent = fields.message.value || "";
  }

  Object.values(fields).forEach((field) => {
    field.addEventListener("input", updatePreview);
    field.addEventListener("change", updatePreview);
  });

  async function loadRecord() {
    if (!editingId) return;
    document.getElementById("form-title").textContent = "Editar manutenção";
    const record = await apiFetch(`/api/admin/maintenance/${editingId}`);
    fields.title.value = record.title;
    fields.message.value = record.message;
    fields.startDate.value = toDateInput(record.startAt);
    fields.startTime.value = toTimeInput(record.startAt);
    fields.endDate.value = toDateInput(record.endAt);
    fields.endTime.value = toTimeInput(record.endAt);
    fields.active.checked = record.active;
    updatePreview();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    alertBox.innerHTML = "";

    if (
      !fields.title.value.trim() ||
      !fields.startDate.value ||
      !fields.startTime.value ||
      !fields.endDate.value ||
      !fields.endTime.value ||
      !fields.message.value.trim()
    ) {
      showAlert(alertBox, "warning", "Preencha todos os campos obrigatórios.");
      return;
    }

    const payload = {
      title: fields.title.value.trim(),
      message: fields.message.value,
      active: fields.active.checked,
      startDate: fields.startDate.value,
      startTime: fields.startTime.value,
      endDate: fields.endDate.value,
      endTime: fields.endTime.value,
    };

    saveButton.disabled = true;
    saveButton.textContent = "Salvando...";

    try {
      if (editingId) {
        await apiFetch(`/api/admin/maintenance/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/maintenance", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      window.location.href = "/admin/maintenance";
    } catch (error) {
      const detailMessage =
        error.details && Array.isArray(error.details)
          ? error.details.map((d) => d.message).join(" ")
          : "";
      showAlert(alertBox, "danger", `${error.message} ${detailMessage}`.trim());
      saveButton.disabled = false;
      saveButton.textContent = "Salvar manutenção";
    }
  });

  (async () => {
    await loadSession();
    if (editingId) {
      try {
        await loadRecord();
      } catch (error) {
        showAlert(alertBox, "danger", error.message || "Falha ao carregar a manutenção.");
      }
    } else {
      updatePreview();
    }
  })();
})();
