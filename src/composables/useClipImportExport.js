function useClipImportExport() {
  const { storage, showStatus, normalizeContent } = window.clipBoardCore;

  let refs = null;

  function buildExportData(items) {
    return items.map((item) => ({
      id: item.id,
      content: item.content,
      createdAt: item.createdAt
    }));
  }

  async function exportClips() {
    const items = await storage.get();
    const payload = buildExportData(items);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clip-board-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showStatus("Exportação concluída.", "success");
  }

  function isValidImportPayload(data) {
    if (!Array.isArray(data)) return false;

    return data.every((item) => {
      if (!item || typeof item !== "object") return false;
      const hasContent = typeof item.content === "string" && item.content.trim();
      const hasId = typeof item.id === "string" && item.id.trim();
      const hasCreatedAt = typeof item.createdAt === "string" && item.createdAt.trim();
      return hasContent && hasId && hasCreatedAt;
    });
  }

  async function importClips(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!isValidImportPayload(data)) {
        showStatus("Arquivo inválido: estrutura incorreta.", "error");
        return;
      }

      const existing = await storage.get();
      const contentSet = new Set(existing.map((item) => normalizeContent(item.content)));
      const idSet = new Set(existing.map((item) => item.id));

      const merged = [...existing];
      let addedCount = 0;

      data.forEach((item) => {
        const normalized = normalizeContent(item.content);
        if (contentSet.has(normalized) || idSet.has(item.id)) {
          return;
        }

        merged.push({
          id: item.id,
          content: item.content.trim(),
          createdAt: item.createdAt
        });
        contentSet.add(normalized);
        idSet.add(item.id);
        addedCount += 1;
      });

      await storage.set(merged);
      window.clipCrud.renderList();
      showStatus(`Importação concluída. ${addedCount} novo(s) clip(s).`, "success");
    } catch (error) {
      showStatus("Arquivo inválido: JSON malformado.", "error");
    }
  }

  function bindEvents() {
    refs.exportBtn.addEventListener("click", exportClips);
    refs.importBtn.addEventListener("click", () => refs.fileInput.click());
    refs.fileInput.addEventListener("change", (event) => {
      const [file] = event.target.files;
      importClips(file);
      event.target.value = "";
    });
  }

  function init(domRefs) {
    refs = domRefs;
    bindEvents();
  }

  return {
    init
  };
}

window.clipImportExport = useClipImportExport();
