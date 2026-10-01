# PDF → Markdown Converter

A React app for uploading a PDF, previewing or editing the generated Markdown, and saving it as a `.md` file in `C:\temp`.

- `client/`: React (Vite) UI on http://localhost:5173
- `server/`: Express API on http://localhost:5000. It converts PDFs with `pdfjs-dist` and writes files to `C:\temp`.

Browsers can't write to arbitrary folders on your PC, so the Node server handles the save.

## Setup

```bash
npm run install:all
```

## Run

```bash
npm run dev
```

Then open http://localhost:5173.

To save somewhere else, set the `SAVE_DIR` environment variable before starting the server.
