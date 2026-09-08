# DocSpace Office

A browser-based document reader/editor — PDF, Word (.docx), Excel (.xlsx/.xls/.csv), TXT and HTML.

**Built by Sulieman Khan**

## Run
Just open `index.html` in a browser — no build step required.
Requires an internet connection on first load (PDF, Word, and Excel parsing
libraries are loaded from a CDN).

## Deploy on Vercel
This is a plain static site (no framework, no `package.json`).
1. Import the project as-is.
2. In Project Settings → General, set **Framework Preset** to **Other**.
3. Leave **Build Command** / **Output Directory** empty — `vercel.json` pins this.
4. Deploy.

## GitHub Pages
1. Create a GitHub repository.
2. Upload all files at the repo root.
3. Settings → Pages → select `main` branch, `/ (root)`.
4. Save.

## Supported formats
| Format | Handling |
|---|---|
| .pdf | Rendered page-by-page via pdf.js (real rendering, not text scraping) |
| .docx | Converted to formatted HTML via Mammoth.js |
| .xlsx / .xls | Parsed and rendered as tabbed, styled tables via SheetJS |
| .csv | Parsed and rendered as a table via SheetJS |
| .txt | Opened directly into the editor |
| .html / .htm | Opened directly into the editor |
| .doc (legacy) | Not yet supported — convert to .docx first |

## Reader experience
Opening a PDF, Word, or Excel file switches to a **fullscreen reader** — the
site header is hidden, an edit/action toolbar sits at the top, and (for
multi-page PDFs or multi-sheet spreadsheets) a page/sheet rail sits on the
left, similar to Chrome's built-in PDF viewer. Click a thumbnail or sheet name
in the rail to jump straight to it.

## Other features
- New document / quick notes, rich text editing, undo/redo
- Formatting, alignment, lists, live word count
- Dark mode, local recent-document list
- Print, HTML download, Ctrl/Cmd+S to save
- Defensive event binding so a missing element can't silently break every button

---
© Sulieman Khan
