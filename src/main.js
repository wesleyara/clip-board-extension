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
const filterSelect = document.getElementById("filterSelect");
const tagMatchSelect = document.getElementById("tagMatchSelect");
const tagFilterOptions = document.getElementById("tagFilterOptions");
const tagInput = document.getElementById("tagInput");
const addTagBtn = document.getElementById("addTagBtn");
const tagOptions = document.getElementById("tagOptions");
const helpBtn = document.getElementById("helpBtn");
const helpPanel = document.getElementById("helpPanel");
const helpCloseBtn = document.getElementById("helpCloseBtn");

window.clipBoardCore.setButtonIcon(menuBtn, "more", "Abrir menu");
window.clipBoardCore.setButtonIcon(fabAdd, "plus", "Novo clip");
window.clipBoardCore.setButtonIcon(addBtn, "check", "Salvar");
window.clipBoardCore.setButtonIcon(cancelBtn, "x", "Cancelar");
window.clipBoardCore.setButtonIcon(addTagBtn, "plus", "Adicionar tag");
window.clipBoardCore.setButtonIcon(exportBtn, "download", "Exportar");
exportBtn.insertAdjacentHTML("beforeend", "<span>Exportar</span>");
window.clipBoardCore.setButtonIcon(importBtn, "upload", "Importar");
importBtn.insertAdjacentHTML("beforeend", "<span>Importar</span>");
window.clipBoardCore.setButtonIcon(helpBtn, "help", "Ajuda");
helpBtn.insertAdjacentHTML("beforeend", "<span>Ajuda</span>");
window.clipBoardCore.setButtonIcon(helpCloseBtn, "x", "Fechar ajuda");

window.clipCrud.init({
  clipInput,
  addBtn,
  cancelBtn,
  clipList,
  emptyState,
  composer,
  searchInput,
  filterSelect,
  tagMatchSelect,
  tagFilterOptions,
  tagInput,
  addTagBtn,
  tagOptions
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
  if (!menuDropdown.contains(event.target) && !menuBtn.contains(event.target)) {
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

filterSelect.addEventListener("change", (event) => {
  window.clipCrud.setFilters({ filterMode: event.target.value });
});

tagMatchSelect.addEventListener("change", (event) => {
  window.clipCrud.setFilters({ tagFilterMatchMode: event.target.value });
});

function openHelp() {
  menuDropdown.setAttribute("hidden", "");
  helpPanel.removeAttribute("hidden");
  helpCloseBtn.focus();
}

function closeHelp() {
  helpPanel.setAttribute("hidden", "");
  menuBtn.focus();
}

helpBtn.addEventListener("click", openHelp);
helpCloseBtn.addEventListener("click", closeHelp);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !helpPanel.hasAttribute("hidden")) {
    closeHelp();
  }
});

menuDropdown.setAttribute("hidden", "");
