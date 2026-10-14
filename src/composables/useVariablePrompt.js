function useVariablePrompt() {
  const panel = document.getElementById("variablePanel");
  const form = document.getElementById("variableForm");
  const fields = document.getElementById("variableFields");
  const cancelBtn = document.getElementById("variableCancelBtn");
  const lastValues = {};
  let pending = null;

  function close(result) {
    if (!pending) return;
    const { resolve, returnFocus } = pending;
    pending = null;
    panel.hidden = true;
    fields.replaceChildren();
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    resolve(result);
  }

  function ask(names) {
    if (pending) close(null);

    fields.replaceChildren();
    names.forEach((name, index) => {
      const label = document.createElement("label");
      label.className = "var-field";

      const text = document.createElement("span");
      text.className = "var-label";
      text.textContent = name;

      const input = document.createElement("input");
      input.type = "text";
      input.className = "input";
      input.dataset.name = name;
      input.value = lastValues[name] || "";
      input.autocomplete = "off";
      if (index === 0) input.dataset.first = "true";

      label.append(text, input);
      fields.append(label);
    });

    return new Promise((resolve) => {
      pending = { resolve, returnFocus: document.activeElement };
      panel.hidden = false;
      const first = fields.querySelector("input");
      if (first) {
        first.focus();
        first.select();
      }
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = {};
    fields.querySelectorAll("input").forEach((input) => {
      values[input.dataset.name] = input.value;
      lastValues[input.dataset.name] = input.value;
    });
    close(values);
  });

  cancelBtn.addEventListener("click", () => close(null));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && pending) {
      event.stopPropagation();
      close(null);
    }
  });

  return { ask };
}

window.variablePrompt = useVariablePrompt();
