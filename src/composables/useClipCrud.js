function useClipCrud() {
  const { storage, showStatus, formatDate, createId, normalizeContent } =
    window.clipBoardCore;

  let refs = null;
  let editingId = null;
  let dragSourceId = null;
  let dragOverTimer = null;
  let searchTerm = "";
  let filterMode = "all";

  function applyFilters(items) {
    let filtered = items;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
        item.content.toLowerCase().includes(term)
      );
    }

    if (filterMode === "favorites") {
      filtered = filtered.filter((item) => item.favorite);
    }

    if (filterMode === "mostCopied") {
      filtered = filtered.filter((item) => (item.copyCount || 0) > 0);
      filtered = filtered
        .slice()
        .sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0));
    }

    return filtered;
  }

  async function renderList() {
    const items = await storage.get();
    const visibleItems = applyFilters(items);
    refs.clipList.innerHTML = "";

    if (!items.length) {
      refs.emptyState.style.display = "block";
      refs.clipList.appendChild(refs.emptyState);
      return;
    }

    if (!visibleItems.length) {
      refs.emptyState.style.display = "block";
      refs.emptyState.innerHTML = "Nenhum clip encontrado para o filtro atual.";
      refs.clipList.appendChild(refs.emptyState);
      return;
    }

    refs.emptyState.style.display = "none";
    refs.emptyState.innerHTML = "Nenhum clip salvo ainda.<br>Importe sua lista ou crie um novo!";

    visibleItems.forEach((item) => {
      const clipEl = document.createElement("article");
      clipEl.className = "clip";
      const enableDragAndDrop = filterMode !== "mostCopied";
      clipEl.setAttribute("draggable", String(enableDragAndDrop));
      clipEl.dataset.clipId = item.id;

      const contentEl = document.createElement("div");
      contentEl.className = "clip-content";
      contentEl.textContent = item.content;

      const metaEl = document.createElement("div");
      metaEl.className = "clip-meta";

      const dateEl = document.createElement("span");
      dateEl.textContent = formatDate(item.createdAt);

      const actionsEl = document.createElement("div");
      actionsEl.className = "clip-actions";

      const favoriteBtn = document.createElement("button");
      favoriteBtn.className = "btn small ghost favorite-btn";
      favoriteBtn.type = "button";
      favoriteBtn.setAttribute("aria-pressed", String(Boolean(item.favorite)));
      favoriteBtn.title = item.favorite ? "Desfavoritar" : "Favoritar";
      favoriteBtn.textContent = item.favorite ? "★" : "☆";
      favoriteBtn.addEventListener("click", async () => {
        const updated = (await storage.get()).map((clip) =>
          clip.id === item.id
            ? { ...clip, favorite: !clip.favorite }
            : clip
        );
        await storage.set(updated);
        renderList();
      });

      const editBtn = document.createElement("button");
      editBtn.className = "btn small ghost";
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", () => {
        editingId = item.id;
        refs.clipInput.value = item.content;
        refs.addBtn.textContent = "Salvar";
        refs.composer.hidden = false;
        refs.clipInput.focus();
      });

      const copyBtn = document.createElement("button");
      copyBtn.className = "btn small";
      copyBtn.textContent = "Copiar";
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(item.content);
          const updated = (await storage.get()).map((clip) =>
            clip.id === item.id
              ? { ...clip, copyCount: (clip.copyCount || 0) + 1 }
              : clip
          );
          await storage.set(updated);
          if (filterMode === "mostCopied") {
            renderList();
          }
          showStatus("Texto copiado!", "success");
        } catch (error) {
          showStatus("Não foi possível copiar.", "error");
        }
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn small danger";
      removeBtn.textContent = "Remover";
      removeBtn.addEventListener("click", async () => {
        const confirmed = window.confirm("Remover este clip?");
        if (!confirmed) return;
        const updated = (await storage.get()).filter(
          (clip) => clip.id !== item.id
        );
        await storage.set(updated);
        renderList();
        showStatus("Clip removido.", "success");
      });

      actionsEl.append(favoriteBtn, copyBtn, editBtn, removeBtn);
      metaEl.append(dateEl, actionsEl);
      clipEl.append(contentEl, metaEl);

      if (enableDragAndDrop) {
        clipEl.addEventListener("dragstart", (event) => {
          dragSourceId = item.id;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", item.id);
          clipEl.classList.add("dragging");
          refs.clipList.classList.add("dragging-list");
        });

        clipEl.addEventListener("dragend", () => {
          clipEl.classList.remove("dragging");
          dragSourceId = null;
          refs.clipList.classList.remove("dragging-list");
          document.querySelectorAll(".clip.drag-over").forEach((el) => {
            el.classList.remove("drag-over");
          });
        });

        clipEl.addEventListener("dragenter", (event) => {
          event.preventDefault();
          if (dragOverTimer) {
            clearTimeout(dragOverTimer);
            dragOverTimer = null;
          }
          clipEl.classList.add("drag-over");
        });

        clipEl.addEventListener("dragover", (event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          clipEl.classList.add("drag-over");
        });

        clipEl.addEventListener("dragleave", () => {
          if (dragOverTimer) clearTimeout(dragOverTimer);
          dragOverTimer = setTimeout(() => {
            clipEl.classList.remove("drag-over");
          }, 60);
        });

        clipEl.addEventListener("drop", async (event) => {
          event.preventDefault();
          clipEl.classList.remove("drag-over");
          const sourceId = dragSourceId || event.dataTransfer.getData("text/plain");
          const targetId = item.id;
          if (!sourceId || sourceId === targetId) return;

          const reordered = await reorderItems(sourceId, targetId);
          await storage.set(reordered);
          renderList();
        });
      }

      refs.clipList.appendChild(clipEl);
    });
  }

  async function reorderItems(sourceId, targetId) {
    const items = await storage.get();
    const sourceIndex = items.findIndex((item) => item.id === sourceId);
    const targetIndex = items.findIndex((item) => item.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return items;

    const updated = [...items];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);
    return updated;
  }

  async function addClip() {
    const rawContent = refs.clipInput.value;
    const content = rawContent.trim();
    if (!content) {
      showStatus("Digite algum texto antes de adicionar.", "error");
      return;
    }

    const items = await storage.get();
    const normalized = normalizeContent(content);
    if (editingId) {
      const duplicated = items.some(
        (item) => item.id !== editingId && normalizeContent(item.content) === normalized
      );
      if (duplicated) {
        showStatus("Esse texto já está salvo.", "error");
        return;
      }

      const updated = items.map((item) =>
        item.id === editingId
          ? { ...item, content, updatedAt: new Date().toISOString() }
          : item
      );
      await storage.set(updated);
      showStatus("Clip atualizado!", "success");
    } else {
      const exists = items.some((item) => normalizeContent(item.content) === normalized);
      if (exists) {
        showStatus("Esse texto já está salvo.", "error");
        return;
      }

      const newItem = {
        id: createId(),
        content,
        createdAt: new Date().toISOString(),
        favorite: false,
        copyCount: 0
      };

      items.unshift(newItem);
      await storage.set(items);
      showStatus("Clip salvo!", "success");
    }

    refs.clipInput.value = "";
    editingId = null;
    refs.addBtn.textContent = "Salvar";
    refs.composer.hidden = true;
    renderList();
  }

  function openComposerForNew() {
    editingId = null;
    refs.clipInput.value = "";
    refs.addBtn.textContent = "Salvar";
    refs.composer.hidden = false;
    refs.clipInput.focus();
  }

  function setFilters({ search, filterMode: filterModeNext }) {
    if (typeof search === "string") {
      searchTerm = search.trim();
    }
    if (typeof filterModeNext === "string") {
      filterMode = filterModeNext;
    }
    renderList();
  }

  function bindEvents() {
    refs.addBtn.addEventListener("click", addClip);
    refs.cancelBtn.addEventListener("click", () => {
      refs.clipInput.value = "";
      editingId = null;
      refs.composer.hidden = true;
      refs.addBtn.textContent = "Salvar";
    });
    refs.clipInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        addClip();
      }
    });
  }

  function init(domRefs) {
    refs = domRefs;
    bindEvents();
    renderList();
  }

  return {
    init,
    renderList,
    openComposerForNew,
    setFilters
  };
}

window.clipCrud = useClipCrud();
