# DocSpace Office

A lightweight browser-based WPS-style document reader/editor.

**Built by Sulieman Khan**

## Run
Just open `index.html` in a browser — no build step required.

## Deploy on Vercel
This is a plain static site (no framework, no `package.json`). To avoid Vercel
misdetecting a build step:
1. Import the project as-is.
2. In Project Settings → General, set **Framework Preset** to **Other**.
3. Leave **Build Command** and **Output Directory** empty (a `vercel.json` is
   included that pins this automatically).
4. Deploy.

## GitHub Pages
1. Create a GitHub repository.
2. Upload `index.html`, `style.css`, and `app.js`.
3. Go to Settings → Pages.
4. Select the `main` branch and `/ (root)`.
5. Save.

No Android Studio, Flutter, Node.js, or VS Code is required.

## Current features
- Responsive WPS-style interface
- New document / quick notes
- Rich text editing
- Undo/redo
- Formatting and alignment
- Lists
- Live word count
- Dark mode
- Local recent-document list
- TXT/HTML opening
- Basic PDF text preview
- Print
- HTML download
- Ctrl/Cmd+S to save
- Defensive event binding so a missing element can't silently break every button

DOCX editing and a full PDF engine should be added in the next version for true WPS-level compatibility.

---
© Sulieman Khan
