function useClipTagManager({ storage, showStatus }) {
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

  function renderTagSelection({
    container,
    availableTags,
    selectedKeys,
    onToggle,
    onRemove,
    emptyText
  }) {
    if (!container) return;

    container.innerHTML = "";

    if (!availableTags.length) {
      const emptyTags = document.createElement("span");
      emptyTags.className = "tag-empty";
      emptyTags.textContent = emptyText;
      container.appendChild(emptyTags);
      return;
    }

    availableTags.forEach((tag) => {
      const key = tag.toLowerCase();
      const tagWrap = document.createElement("div");
      tagWrap.className = "tag-chip-wrap";

      const tagBtn = document.createElement("button");
      tagBtn.type = "button";
      tagBtn.className = "tag-chip";
      const isSelected = selectedKeys.has(key);
      if (isSelected) {
        tagBtn.classList.add("selected");
      }
      tagBtn.setAttribute("aria-pressed", String(isSelected));
      tagBtn.textContent = tag;
      tagBtn.addEventListener("click", () => onToggle(tag));

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "tag-chip-remove";
      removeBtn.textContent = "×";
      removeBtn.title = `Remover tag ${tag}`;
      removeBtn.setAttribute("aria-label", `Remover tag ${tag}`);
      removeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        onRemove(tag);
      });

      tagWrap.append(tagBtn, removeBtn);
      container.appendChild(tagWrap);
    });
  }

  function renderTagFilterSelection({
    container,
    availableTags,
    selectedKeys,
    onToggle,
    onRemove,
    onClear,
    clearDisabled,
    emptyText
  }) {
    renderTagSelection({
      container,
      availableTags,
      selectedKeys,
      onToggle,
      onRemove,
      emptyText
    });

    if (!container || !availableTags.length) return;

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "tag-clear-btn";
    clearBtn.textContent = "Limpar tags";
    clearBtn.disabled = clearDisabled;
    clearBtn.addEventListener("click", onClear);
    container.appendChild(clearBtn);
  }

  async function removeTagEverywhere(tag, { onAfterRemove } = {}) {
    const normalized = normalizeTag(tag);
    if (!normalized) return false;

    const confirmed = window.confirm(
      `Remover a tag "${normalized}" de todos os clips associados?`
    );
    if (!confirmed) return false;

    const key = normalized.toLowerCase();
    const items = await storage.get();

    const updatedItems = items.map((item) => {
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

    await storage.set(updatedItems);

    if (typeof onAfterRemove === "function") {
      await onAfterRemove({ updatedItems, removedKey: key, removedTag: normalized });
    }

    showStatus(`Tag "${normalized}" removida.`, "success");
    return true;
  }

  return {
    normalizeTag,
    extractTagsFromItems,
    renderTagSelection,
    renderTagFilterSelection,
    removeTagEverywhere
  };
}

window.createClipTagManager = useClipTagManager;
