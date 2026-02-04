# Clip Board

Browser extension to save, organize, and quickly copy custom text snippets. It uses the browser’s local storage and includes search, favorites, most-copied ordering, and JSON import/export.

## ✨ Features

- Save and edit text clips.
- Copy with one click and track copy counts.
- Favorite important clips.
- Search and filters (all, favorites, most copied).
- Drag-and-drop reordering.
- JSON import and export.

## 📦 Installation (developer mode)

1. Open your browser’s extensions page (e.g., Chrome/Edge).
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the project folder.

## 🧭 Usage

- Click the **+** button to create a new clip.
- Use **Ctrl+Enter** (or **Cmd+Enter**) to save quickly while typing.
- Use the **⋮** menu to **Export** or **Import**.
- Use the search field and filter to find clips.

## 📁 Project structure

- [manifest.json](manifest.json)
- [popup.html](popup.html)
- [src/main.js](src/main.js)
- [src/composables/useCore.js](src/composables/useCore.js)
- [src/composables/useClipCrud.js](src/composables/useClipCrud.js)
- [src/composables/useClipImportExport.js](src/composables/useClipImportExport.js)
- [src/styles/global.css](src/styles/global.css)

## 🔐 Permissions

- `storage`: saves clips locally in the browser.
- `clipboardWrite`: copies content to the clipboard.

## 📄 License

MIT. See [LICENSE](LICENSE).
