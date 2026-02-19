function useClipDnDManager({ storage }) {
  let dragSourceId = null;
  let dragOverTimer = null;

  async function reorderAndPersist(sourceId, targetId) {
    const items = await storage.get();
    const sourceIndex = items.findIndex((item) => item.id === sourceId);
    const targetIndex = items.findIndex((item) => item.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      return false;
    }

    const updated = [...items];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);
    await storage.set(updated);
    return true;
  }

  function bindClipDragHandlers({ clipEl, itemId, clipList, onReordered }) {
    clipEl.addEventListener("dragstart", (event) => {
      dragSourceId = itemId;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", itemId);
      clipEl.classList.add("dragging");
      clipList.classList.add("dragging-list");
    });

    clipEl.addEventListener("dragend", () => {
      clipEl.classList.remove("dragging");
      dragSourceId = null;
      clipList.classList.remove("dragging-list");
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
      const targetId = itemId;
      if (!sourceId || sourceId === targetId) return;

      const reordered = await reorderAndPersist(sourceId, targetId);
      if (reordered && typeof onReordered === "function") {
        onReordered();
      }
    });
  }

  return {
    bindClipDragHandlers
  };
}

window.createClipDnDManager = useClipDnDManager;
