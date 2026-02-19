function useClipCrud() {
  const { storage, uiStateStorage, showStatus, formatDate, createId, normalizeContent } =
    window.clipBoardCore;

  let refs = null;
  let editingId = null;
  let dragSourceId = null;
  let dragOverTimer = null;
  let searchTerm = "";
  let filterMode = "all";
  let selectedTagFilters = new Set();
  let tagFilterMatchMode = "any";
  let selectedTags = new Set();
  let availableTags = [];

  function normalizeTagFilterMatchMode(mode) {
    return mode === "all" ? "all" : "any";
  }

  function normalizeFilterMode(mode) {
    return ["all", "favorites", "tag"].includes(mode) ? mode : "all";
  }

  async function persistFilters() {
    await uiStateStorage.set({
      searchTerm,
      filterMode,
      tagFilters: Array.from(selectedTagFilters),
      tagFilterMatchMode
    });
  }

  async function restoreFilters() {
    const saved = await uiStateStorage.get();
    if (!saved || typeof saved !== "object") return;

    if (typeof saved.searchTerm === "string") {
      searchTerm = saved.searchTerm;
    }
    if (typeof saved.filterMode === "string") {
      filterMode = normalizeFilterMode(saved.filterMode);
    }
    if (typeof saved.tagFilterMatchMode === "string") {
      tagFilterMatchMode = normalizeTagFilterMatchMode(saved.tagFilterMatchMode);
    }
    if (Array.isArray(saved.tagFilters)) {
      selectedTagFilters = new Set(
        saved.tagFilters
          .map((tag) => normalizeTag(tag).toLowerCase())
          .filter(Boolean)
      );
      return;
    }
    if (typeof saved.tagFilter === "string") {
      const normalizedLegacyTag = normalizeTag(saved.tagFilter).toLowerCase();
      selectedTagFilters = normalizedLegacyTag && normalizedLegacyTag !== "__all__"
        ? new Set([normalizedLegacyTag])
        : new Set();
    }
  }

  function syncFilterControls() {
    if (refs?.searchInput) {
      refs.searchInput.value = searchTerm;
    }
    if (refs?.filterSelect) {
      refs.filterSelect.value = filterMode;
    }
    if (refs?.tagMatchSelect) {
      refs.tagMatchSelect.value = normalizeTagFilterMatchMode(tagFilterMatchMode);
    }
  }

  function normalizeTag(tag) {
    return String(tag || "").trim().replace(/\s+/g, " ");
  }

  function extractTagsFromItems(items) {
    const byKey = new Map();
    items.forEach((item) => {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      tags.forEach((tag) => {
        const normalized = normalizeTag(tag);
        if (!normalized) return;
        const key = normalized.toLowerCase();
        if (!byKey.has(key)) {
          byKey.set(key, normalized);
        }
      });
    });

    return Array.from(byKey.values()).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" })
    );
  }

  async function refreshAvailableTags() {
    const items = await storage.get();
    availableTags = extractTagsFromItems(items);
  }

  function renderTagOptions() {
    if (!refs?.tagOptions) return;

    refs.tagOptions.innerHTML = "";

    if (!availableTags.length) {
      const emptyTags = document.createElement("span");
      emptyTags.className = "tag-empty";
      emptyTags.textContent = "Nenhuma tag criada ainda.";
      refs.tagOptions.appendChild(emptyTags);
      return;
    }

    availableTags.forEach((tag) => {
      const tagWrap = document.createElement("div");
      tagWrap.className = "tag-chip-wrap";

      const tagBtn = document.createElement("button");
      tagBtn.type = "button";
      tagBtn.className = "tag-chip";
      const isSelected = selectedTags.has(tag.toLowerCase());
      if (isSelected) {
        tagBtn.classList.add("selected");
      }
      tagBtn.setAttribute("aria-pressed", String(isSelected));
      tagBtn.textContent = tag;

      tagBtn.addEventListener("click", () => {
        const key = tag.toLowerCase();
        if (selectedTags.has(key)) {
          selectedTags.delete(key);
        } else {
          selectedTags.add(key);
        }
        renderTagOptions();
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "tag-chip-remove";
      removeBtn.textContent = "×";
      removeBtn.title = `Remover tag ${tag}`;
      removeBtn.setAttribute("aria-label", `Remover tag ${tag}`);
      removeBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        await removeTagEverywhere(tag);
      });

      tagWrap.append(tagBtn, removeBtn);
      refs.tagOptions.appendChild(tagWrap);
    });
  }

  function addTag() {
    const normalized = normalizeTag(refs.tagInput?.value);

    if (!normalized) {
      showStatus("Digite um nome de tag para adicionar.", "error");
      return;
    }

    const key = normalized.toLowerCase();
    const existingIndex = availableTags.findIndex(
      (tag) => tag.toLowerCase() === key
    );

    if (existingIndex === -1) {
      availableTags.push(normalized);
      availableTags.sort((a, b) =>
        a.localeCompare(b, "pt-BR", { sensitivity: "base" })
      );
    }

    selectedTags.add(key);
    refs.tagInput.value = "";
    renderTagOptions();
  }

  function getSelectedTagValues() {
    return availableTags.filter((tag) => selectedTags.has(tag.toLowerCase()));
  }

  async function removeTagEverywhere(tag) {
    const normalized = normalizeTag(tag);
    if (!normalized) return;

    const confirmed = window.confirm(
      `Remover a tag "${normalized}" de todos os clips associados?`
    );
    if (!confirmed) return;

    const key = normalized.toLowerCase();
    const items = await storage.get();

    const updated = items.map((item) => {
      const itemTags = Array.isArray(item.tags) ? item.tags : [];
      if (!itemTags.length) return item;

      const nextTags = itemTags.filter(
        (itemTag) => normalizeTag(itemTag).toLowerCase() !== key
      );

      if (nextTags.length === itemTags.length) {
        return item;
      }

      return { ...item, tags: nextTags };
    });

    await storage.set(updated);

    selectedTags.delete(key);
    selectedTagFilters.delete(key);
    availableTags = extractTagsFromItems(updated);

    await persistFilters();
    renderTagOptions();
    renderTagFilterOptions();
    syncTagFilterVisibility();
    renderList();
    showStatus(`Tag "${normalized}" removida.`, "success");
  }

  function renderTagFilterOptions() {
    if (!refs?.tagFilterOptions) return;

    refs.tagFilterOptions.innerHTML = "";

    const validKeys = new Set(availableTags.map((tag) => tag.toLowerCase()));
    selectedTagFilters = new Set(
      Array.from(selectedTagFilters).filter((key) => validKeys.has(key))
    );

    if (!availableTags.length) {
      const emptyTags = document.createElement("span");
      emptyTags.className = "tag-empty";
      emptyTags.textContent = "Nenhuma tag disponível para filtrar.";
      refs.tagFilterOptions.appendChild(emptyTags);
      return;
    }

    availableTags.forEach((tag) => {
      const key = tag.toLowerCase();
      const tagWrap = document.createElement("div");
      tagWrap.className = "tag-chip-wrap";

      const tagBtn = document.createElement("button");
      tagBtn.type = "button";
      tagBtn.className = "tag-chip";
      const isSelected = selectedTagFilters.has(key);
      if (isSelected) {
        tagBtn.classList.add("selected");
      }
      tagBtn.setAttribute("aria-pressed", String(isSelected));
      tagBtn.textContent = tag;

      tagBtn.addEventListener("click", async () => {
        if (selectedTagFilters.has(key)) {
          selectedTagFilters.delete(key);
        } else {
          selectedTagFilters.add(key);
        }
        renderTagFilterOptions();
        await persistFilters();
        renderList();
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "tag-chip-remove";
      removeBtn.textContent = "×";
      removeBtn.title = `Remover tag ${tag}`;
      removeBtn.setAttribute("aria-label", `Remover tag ${tag}`);
      removeBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        await removeTagEverywhere(tag);
      });

      tagWrap.append(tagBtn, removeBtn);
      refs.tagFilterOptions.appendChild(tagWrap);
    });

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "tag-clear-btn";
    clearBtn.textContent = "Limpar tags";
    clearBtn.disabled = selectedTagFilters.size === 0;
    clearBtn.addEventListener("click", async () => {
      if (!selectedTagFilters.size) return;
      selectedTagFilters = new Set();
      renderTagFilterOptions();
      await persistFilters();
      renderList();
    });
    refs.tagFilterOptions.appendChild(clearBtn);
  }

  function syncTagFilterVisibility() {
    if (!refs?.tagFilterOptions) return;
    if (filterMode === "tag") {
      if (refs?.tagMatchSelect) {
        refs.tagMatchSelect.removeAttribute("hidden");
      }
      refs.tagFilterOptions.removeAttribute("hidden");
      return;
    }
    if (refs?.tagMatchSelect) {
      refs.tagMatchSelect.setAttribute("hidden", "");
    }
    refs.tagFilterOptions.setAttribute("hidden", "");
  }

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

    if (filterMode === "tag" && selectedTagFilters.size) {
      filtered = filtered.filter((item) => {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        const itemTagKeys = new Set(tags.map((tag) => normalizeTag(tag).toLowerCase()));
        if (tagFilterMatchMode === "all") {
          return Array.from(selectedTagFilters).every((key) => itemTagKeys.has(key));
        }
        return Array.from(selectedTagFilters).some((key) => itemTagKeys.has(key));
      });
    }

    return filtered;
  }

  async function renderList() {
    const items = await storage.get();
    availableTags = extractTagsFromItems(items);
    renderTagFilterOptions();
    syncTagFilterVisibility();
    if (refs && !refs.composer.hidden) {
      renderTagOptions();
    }
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
      const enableDragAndDrop = true;
      clipEl.setAttribute("draggable", "true");
      clipEl.dataset.clipId = item.id;

      const contentEl = document.createElement("div");
      contentEl.className = "clip-content";
      contentEl.textContent = item.content;

      if (Array.isArray(item.tags) && item.tags.length) {
        const tagsEl = document.createElement("div");
        tagsEl.className = "clip-tags";

        item.tags.forEach((tag) => {
          const tagEl = document.createElement("span");
          tagEl.className = "clip-tag";
          tagEl.textContent = tag;
          tagsEl.appendChild(tagEl);
        });

        clipEl.append(contentEl, tagsEl);
      } else {
        clipEl.appendChild(contentEl);
      }

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
        selectedTags = new Set(
          (Array.isArray(item.tags) ? item.tags : []).map((tag) =>
            normalizeTag(tag).toLowerCase()
          )
        );
        refs.addBtn.textContent = "Salvar";
        refs.composer.hidden = false;
        renderTagOptions();
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
      clipEl.append(metaEl);

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
    const tags = getSelectedTagValues();
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
          ? { ...item, content, tags, updatedAt: new Date().toISOString() }
          : item
      );
      await storage.set(updated);
      availableTags = extractTagsFromItems(updated);
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
        tags,
        createdAt: new Date().toISOString(),
        favorite: false
      };

      items.unshift(newItem);
      await storage.set(items);
      availableTags = extractTagsFromItems(items);
      showStatus("Clip salvo!", "success");
    }

    refs.clipInput.value = "";
    refs.tagInput.value = "";
    selectedTags = new Set();
    editingId = null;
    refs.addBtn.textContent = "Salvar";
    refs.composer.hidden = true;
    renderTagOptions();
    renderList();
  }

  async function openComposerForNew() {
    editingId = null;
    refs.clipInput.value = "";
    refs.tagInput.value = "";
    selectedTags = new Set();
    await refreshAvailableTags();
    renderTagOptions();
    refs.addBtn.textContent = "Salvar";
    refs.composer.hidden = false;
    refs.clipInput.focus();
  }

  async function setFilters({ search, filterMode: filterModeNext, tagFilter: tagFilterNext, tagFilters, tagFilterMatchMode: tagFilterMatchModeNext }) {
    if (typeof search === "string") {
      searchTerm = search.trim();
    }
    if (typeof filterModeNext === "string") {
      filterMode = normalizeFilterMode(filterModeNext);
    }
    if (Array.isArray(tagFilters)) {
      selectedTagFilters = new Set(
        tagFilters.map((tag) => normalizeTag(tag).toLowerCase()).filter(Boolean)
      );
    }
    if (typeof tagFilterNext === "string") {
      const normalizedLegacyTag = normalizeTag(tagFilterNext).toLowerCase();
      selectedTagFilters = normalizedLegacyTag && normalizedLegacyTag !== "__all__"
        ? new Set([normalizedLegacyTag])
        : new Set();
    }
    if (typeof tagFilterMatchModeNext === "string") {
      tagFilterMatchMode = normalizeTagFilterMatchMode(tagFilterMatchModeNext);
    }
    syncTagFilterVisibility();
    syncFilterControls();
    await persistFilters();
    renderList();
  }

  function bindEvents() {
    refs.addBtn.addEventListener("click", addClip);
    refs.addTagBtn.addEventListener("click", addTag);
    refs.cancelBtn.addEventListener("click", () => {
      refs.clipInput.value = "";
      refs.tagInput.value = "";
      selectedTags = new Set();
      renderTagOptions();
      editingId = null;
      refs.composer.hidden = true;
      refs.addBtn.textContent = "Salvar";
    });
    refs.tagInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addTag();
      }
    });
    refs.clipInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        addClip();
      }
    });
  }

  async function init(domRefs) {
    refs = domRefs;
    await restoreFilters();
    await refreshAvailableTags();
    renderTagOptions();
    renderTagFilterOptions();
    syncTagFilterVisibility();
    syncFilterControls();
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
