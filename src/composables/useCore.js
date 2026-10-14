const STORAGE_KEY = "clipBoardItems";
const UI_STATE_KEY = "clipBoardUiState";

const statusEl = document.getElementById("status");

const storage = {
  async get() {
    if (chrome?.storage?.local) {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      return result[STORAGE_KEY] || [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  },
  async set(items) {
    if (chrome?.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY]: items });
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
};

const uiStateStorage = {
  async get() {
    if (chrome?.storage?.local) {
      const result = await chrome.storage.local.get(UI_STATE_KEY);
      return result[UI_STATE_KEY] || {};
    }
    const raw = localStorage.getItem(UI_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  },
  async set(state) {
    if (chrome?.storage?.local) {
      await chrome.storage.local.set({ [UI_STATE_KEY]: state });
      return;
    }
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(state));
  }
};

function showStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = "status" + (type ? ` ${type}` : "");
  if (message) {
    setTimeout(() => {
      if (statusEl.textContent === message) {
        statusEl.textContent = "";
        statusEl.className = "status";
      }
    }, 2500);
  }
}

function formatDate(dateIso) {
  const date = new Date(dateIso);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createId() {
  return `clip_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeContent(content) {
  return content.trim().replace(/\s+/g, " ");
}

const VARIABLE_PATTERN = /\{\{\s*([\p{L}\p{N}_]+)\s*\}\}/gu;

function extractVariables(text) {
  const names = [];
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

function fillVariables(text, values) {
  return text.replace(VARIABLE_PATTERN, (_, name) => values[name] ?? "");
}

const ICON_PATHS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8l-6.2 3.3L7 14.2 2 9.3l6.9-1Z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  eraser:'<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>'
};

function iconSvg(name) {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}

function setButtonIcon(button, name, label) {
  button.innerHTML = iconSvg(name);
  button.title = label;
  button.setAttribute("aria-label", label);
}

window.clipBoardCore = {
  storage,
  uiStateStorage,
  showStatus,
  formatDate,
  createId,
  normalizeContent,
  extractVariables,
  fillVariables,
  iconSvg,
  setButtonIcon
};
