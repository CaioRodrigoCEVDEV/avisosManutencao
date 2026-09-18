(function () {
  "use strict";

  const { apiFetch, formatDateTime, formatPeriod, statusBadge, escapeHtml, showAlert, loadSession, logout } =
    window.AdminApp;
  const alertBox = document.getElementById("page-alert");

  document.getElementById("logout-button").addEventListener("click", logout);

  function renderCurrent(current) {
    const valueEl = document.getElementById("current-value");
    const periodEl = document.getElementById("current-period");
    if (!current) {
      valueEl.textContent = "Nenhuma manutenção em andamento.";
      periodEl.textContent = "";
      return;
    }
    valueEl.textContent = current.title;
    periodEl.textContent = formatPeriod(current.startAt, current.endAt);
  }

  function renderNext(next) {
    const valueEl = document.getElementById("next-value");
    const periodEl = document.getElementById("next-period");
    if (!next) {
      valueEl.textContent = "Nenhuma manutenção programada.";
      periodEl.textContent = "";
      return;
    }
    valueEl.textContent = next.title;
    periodEl.textContent = formatPeriod(next.startAt, next.endAt);
  }

  function renderRecent(items) {
    const body = document.getElementById("recent-body");
    if (!items || items.length === 0) {
      body.innerHTML =
        '<tr><td colspan="4" class="text-center text-muted py-4">Nenhuma manutenção cadastrada.</td></tr>';
      return;
    }
    body.innerHTML = items
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.title)}</td>
          <td>${formatDateTime(item.startAt)}</td>
          <td>${formatDateTime(item.endAt)}</td>
          <td>${statusBadge(item.status)}</td>
        </tr>`
      )
      .join("");
  }

  async function load() {
    try {
      await loadSession();
      const data = await apiFetch("/api/admin/dashboard");
      renderCurrent(data.current);
      renderNext(data.next);
      document.getElementById("total-value").textContent = String(data.total);
      renderRecent(data.recent);
    } catch (error) {
      showAlert(alertBox, "danger", error.message || "Falha ao carregar o dashboard.");
    }
  }

  load();
})();
