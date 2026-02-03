function useClipCrud() {
  const { storage, showStatus, formatDate, createId, normalizeContent } =
    window.clipBoardCore;

  let refs = null;
  let editingId = null;
  let dragSourceId = null;

  async function renderList() {
    const items = await storage.get();
    refs.clipList.innerHTML = "";

    if (!items.length) {
      refs.emptyState.style.display = "block";
      refs.clipList.appendChild(refs.emptyState);
      return;
    }

    refs.emptyState.style.display = "none";

    items.forEach((item) => {
      const clipEl = document.createElement("article");
      clipEl.className = "clip";
      clipEl.setAttribute("draggable", "true");
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
          showStatus("Texto copiado!", "success");
        } catch (error) {
          showStatus("Não foi possível copiar.", "error");
        }
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn small danger";
      removeBtn.textContent = "Remover";
      removeBtn.addEventListener("click", async () => {
        const updated = (await storage.get()).filter(
          (clip) => clip.id !== item.id
        );
        await storage.set(updated);
        renderList();
        showStatus("Clip removido.", "success");
      });

      actionsEl.append(copyBtn, editBtn, removeBtn);
      metaEl.append(dateEl, actionsEl);
      clipEl.append(contentEl, metaEl);

      clipEl.addEventListener("dragstart", (event) => {
        dragSourceId = item.id;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
        clipEl.classList.add("dragging");
      });

      clipEl.addEventListener("dragend", () => {
        clipEl.classList.remove("dragging");
        dragSourceId = null;
        document.querySelectorAll(".clip.drag-over").forEach((el) => {
          el.classList.remove("drag-over");
        });
      });

      clipEl.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        clipEl.classList.add("drag-over");
      });

      clipEl.addEventListener("dragleave", () => {
        clipEl.classList.remove("drag-over");
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
        createdAt: new Date().toISOString()
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
    openComposerForNew
  };
}

window.clipCrud = useClipCrud();
