/* Utilitários compartilhados do painel administrativo. */
(function () {
  "use strict";

  const APP_TIMEZONE = "America/Sao_Paulo";

  async function apiFetch(url, options = {}) {
    const { redirectOn401 = true, ...rest } = options;
    const response = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(rest.headers || {}) },
      ...rest,
    });

    if (response.status === 401 && redirectOn401) {
      window.location.href = "/admin/login";
      throw new Error("Não autenticado.");
    }

    let payload = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    if (!response.ok) {
      const error = new Error(
        (payload && payload.message) || "Não foi possível concluir a operação."
      );
      error.status = response.status;
      error.code = payload && payload.error;
      error.details = payload && payload.details;
      throw error;
    }

    return payload;
  }

  function formatDateTime(iso) {
    if (!iso) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: APP_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  function toDateInput(iso) {
    if (!iso) return "";
    const parts = zonedParts(new Date(iso));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function toTimeInput(iso) {
    if (!iso) return "";
    const parts = zonedParts(new Date(iso));
    return `${parts.hour}:${parts.minute}`;
  }

  function zonedParts(date) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const map = {};
    for (const part of formatter.formatToParts(date)) {
      if (part.type !== "literal") map[part.type] = part.value;
    }
    return map;
  }

  function formatPeriod(startIso, endIso) {
    if (!startIso || !endIso) return "";
    return `${formatDateTime(startIso)} até ${formatDateTime(endIso)}`;
  }

  const STATUS_LABELS = {
    scheduled: { label: "Programada", className: "text-bg-primary" },
    ongoing: { label: "Em andamento", className: "text-bg-success" },
    finished: { label: "Encerrada", className: "text-bg-secondary" },
    inactive: { label: "Inativa", className: "text-bg-warning" },
  };

  function statusBadge(status) {
    const info = STATUS_LABELS[status] || { label: status, className: "text-bg-light" };
    return `<span class="badge ${info.className}">${info.label}</span>`;
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showAlert(container, type, message) {
    if (!container) return;
    container.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>`;
  }

  async function loadSession() {
    const payload = await apiFetch("/api/auth/me");
    document.querySelectorAll("[data-user-name]").forEach((el) => {
      el.textContent = payload.user.name || payload.user.email;
    });
    return payload.user;
  }

  function publicUrl(id) {
    return `${window.location.origin}/api/maintenance/${id}`;
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      // segue para o fallback abaixo
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch (error) {
      return false;
    }
  }

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      // Silencioso: o objetivo é apenas encerrar a sessão.
    }
    window.location.href = "/admin/login";
  }

  window.AdminApp = {
    APP_TIMEZONE,
    apiFetch,
    formatDateTime,
    toDateInput,
    toTimeInput,
    formatPeriod,
    statusBadge,
    escapeHtml,
    showAlert,
    loadSession,
    publicUrl,
    copyText,
    logout,
  };
})();
