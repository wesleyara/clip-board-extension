const STORAGE_KEY = "clipBoardItems";

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

window.clipBoardCore = {
  storage,
  showStatus,
  formatDate,
  createId,
  normalizeContent
};
