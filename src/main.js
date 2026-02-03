const clipInput = document.getElementById("clipInput");
const addBtn = document.getElementById("addBtn");
const cancelBtn = document.getElementById("cancelBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const fileInput = document.getElementById("fileInput");
const clipList = document.getElementById("clipList");
const emptyState = document.getElementById("emptyState");
const menuBtn = document.getElementById("menuBtn");
const menuDropdown = document.getElementById("menuDropdown");
const composer = document.getElementById("composer");
const fabAdd = document.getElementById("fabAdd");
const searchInput = document.getElementById("searchInput");
const favoritesToggle = document.getElementById("favoritesToggle");

window.clipCrud.init({
  clipInput,
  addBtn,
  cancelBtn,
  clipList,
  emptyState,
  composer
});

window.clipImportExport.init({
  exportBtn,
  importBtn,
  fileInput,
  onMenuClose: () => menuDropdown.setAttribute("hidden", "")
});

menuBtn.addEventListener("click", () => {
  const isHidden = menuDropdown.hasAttribute("hidden");
  if (isHidden) {
    menuDropdown.removeAttribute("hidden");
  } else {
    menuDropdown.setAttribute("hidden", "");
  }
});

document.addEventListener("click", (event) => {
  if (!menuDropdown.contains(event.target) && event.target !== menuBtn) {
    menuDropdown.setAttribute("hidden", "");
  }
});

fabAdd.addEventListener("click", () => {
  window.clipCrud.openComposerForNew();
  menuDropdown.setAttribute("hidden", "");
});

searchInput.addEventListener("input", (event) => {
  window.clipCrud.setFilters({ search: event.target.value });
});

favoritesToggle.addEventListener("click", () => {
  const isPressed = favoritesToggle.getAttribute("aria-pressed") === "true";
  favoritesToggle.setAttribute("aria-pressed", String(!isPressed));
  window.clipCrud.setFilters({ favoritesOnly: !isPressed });
});

menuDropdown.setAttribute("hidden", "");
