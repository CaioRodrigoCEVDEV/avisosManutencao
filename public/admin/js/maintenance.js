(function () {
  "use strict";

  const {
    apiFetch,
    formatDateTime,
    statusBadge,
    escapeHtml,
    showAlert,
    loadSession,
    publicUrl,
    copyText,
    logout,
  } = window.AdminApp;
  const alertBox = document.getElementById("page-alert");
  const filterSelect = document.getElementById("filter");
  const body = document.getElementById("maintenance-body");

  document.getElementById("logout-button").addEventListener("click", logout);

  function render(items) {
    if (!items || items.length === 0) {
      body.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted py-4">Nenhuma manutenção encontrada.</td></tr>';
      return;
    }

    body.innerHTML = items
      .map((item) => {
        const toggleLabel = item.active ? "Desativar" : "Ativar";
        const toggleClass = item.active ? "btn-outline-secondary" : "btn-outline-success";
        return `<tr>
          <td class="fw-semibold">${escapeHtml(item.title)}</td>
          <td>${formatDateTime(item.startAt)}</td>
          <td>${formatDateTime(item.endAt)}</td>
          <td>${statusBadge(item.status)}</td>
          <td class="text-end table-actions">
            <a class="btn btn-outline-primary" href="/admin/maintenance/${item.id}/edit">Editar</a>
            <button class="btn btn-outline-secondary" data-copy-url-id="${item.id}">URL</button>
            <button
              class="btn ${toggleClass}"
              data-toggle-id="${item.id}"
              data-toggle-active="${item.active ? "false" : "true"}"
            >${toggleLabel}</button>
            <button class="btn btn-outline-danger" data-delete-id="${item.id}">Excluir</button>
          </td>
        </tr>`;
      })
      .join("");

    body.querySelectorAll("[data-toggle-id]").forEach((button) => {
      button.addEventListener("click", () => toggleStatus(button));
    });
    body.querySelectorAll("[data-delete-id]").forEach((button) => {
      button.addEventListener("click", () => remove(button.dataset.deleteId));
    });
    body.querySelectorAll("[data-copy-url-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const url = publicUrl(button.dataset.copyUrlId);
        const ok = await copyText(url);
        showAlert(
          alertBox,
          ok ? "success" : "warning",
          ok ? `URL copiada: ${url}` : "Não foi possível copiar a URL."
        );
      });
    });
  }

  async function load() {
    body.innerHTML =
      '<tr><td colspan="5" class="text-center text-muted py-4">Carregando...</td></tr>';
    try {
      const data = await apiFetch(
        `/api/admin/maintenance?filter=${encodeURIComponent(filterSelect.value)}`
      );
      render(data.items);
    } catch (error) {
      showAlert(alertBox, "danger", error.message || "Falha ao carregar as manutenções.");
    }
  }

  async function toggleStatus(button) {
    const id = button.dataset.toggleId;
    const active = button.dataset.toggleActive === "true";
    button.disabled = true;
    try {
      await apiFetch(`/api/admin/maintenance/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      showAlert(alertBox, "success", active ? "Manutenção ativada." : "Manutenção desativada.");
      await load();
    } catch (error) {
      showAlert(alertBox, "danger", error.message || "Falha ao alterar o status.");
      button.disabled = false;
    }
  }

  async function remove(id) {
    if (!window.confirm("Tem certeza que deseja excluir esta manutenção?")) return;
    try {
      await apiFetch(`/api/admin/maintenance/${id}`, { method: "DELETE" });
      showAlert(alertBox, "success", "Manutenção excluída com sucesso.");
      await load();
    } catch (error) {
      showAlert(alertBox, "danger", error.message || "Falha ao excluir a manutenção.");
    }
  }

  filterSelect.addEventListener("change", load);

  (async () => {
    await loadSession();
    await load();
  })();
})();
