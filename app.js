/*!
 * DocSpace Office
 * Built by Sulieman Khan
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    var $ = function (s) { return document.querySelector(s); };

    function on(sel, evt, fn) {
      var el = typeof sel === "string" ? $(sel) : sel;
      if (!el) { console.warn("[DocSpace] element not found:", sel); return; }
      el.addEventListener(evt, fn);
    }

    var home = $("#homeView"), editorView = $("#editorView"), readerView = $("#readerView"), editor = $("#editor");
    var recentKey = "docspace_recent_v1";
    var currentFile = null, autosaveTimer = null, currentWorkbook = null;

    if (!home || !editorView || !readerView || !editor) {
      console.error("[DocSpace] Core view elements missing — check index.html ids.");
      return;
    }

    // pdf.js needs its worker pointed at a matching CDN build
    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }

    function toast(msg) {
      var t = $("#toast");
      if (!t) return;
      t.textContent = msg;
      t.classList.add("show");
      clearTimeout(toast._t);
      toast._t = setTimeout(function () { t.classList.remove("show"); }, 1800);
    }

    function show(view) {
      [home, editorView, readerView].forEach(function (v) { v.classList.add("hidden"); });
      view.classList.remove("hidden");
      window.scrollTo(0, 0);
    }

    function recent() {
      try { return JSON.parse(localStorage.getItem(recentKey) || "[]"); }
      catch (e) { return []; }
    }

    function saveRecent(item) {
      var a = recent().filter(function (x) { return x.name !== item.name; });
      a.unshift(item);
      try { localStorage.setItem(recentKey, JSON.stringify(a.slice(0, 12))); }
      catch (e) { console.warn("[DocSpace] localStorage unavailable:", e); }
      renderRecent();
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c];
      });
    }

    function renderRecent() {
      var box = $("#recentList");
      if (!box) return;
      var a = recent();
      if (!a.length) {
        box.innerHTML = '<div class="recent-item"><div class="recent-meta"><b>No recent documents</b><small>Your opened documents will appear here.</small></div></div>';
        return;
      }
      box.innerHTML = a.map(function (x, i) {
        return '<div class="recent-item" data-i="' + i + '"><div class="file-icon">' +
          (x.ext || "DOC").toUpperCase().slice(0, 3) + '</div><div class="recent-meta"><b>' +
          escapeHtml(x.name) + '</b><small>' + new Date(x.time).toLocaleString() +
          '</small></div><span>\u203a</span></div>';
      }).join("");
      box.querySelectorAll(".recent-item").forEach(function (el) {
        el.onclick = function () {
          var item = a[el.dataset.i];
          if (item && item.content) newDoc(item.content, item.name);
          else toast("This file must be opened again from your device.");
        };
      });
    }

    function newDoc(content, title) {
      content = content || "<p>Start writing here...</p>";
      title = title || "Untitled Document";
      currentFile = { name: title, ext: "doc" };
      var titleEl = $("#docTitle");
      if (titleEl) titleEl.value = title;
      editor.innerHTML = content;
      show(editorView);
      updateWordCount();
      setTimeout(function () { editor.focus(); }, 150);
    }

    function updateWordCount() {
      var wc = $("#wordCount");
      if (!wc) return;
      var text = editor.innerText || "";
      var words = text.trim().length ? text.trim().split(/\s+/).length : 0;
      wc.textContent = words + (words === 1 ? " word" : " words");
    }

    function changed() {
      clearTimeout(autosaveTimer);
      var st = $("#saveState");
      if (st) st.textContent = "Unsaved";
      updateWordCount();
      autosaveTimer = setTimeout(saveDocument, 700);
    }

    function saveDocument() {
      var titleEl = $("#docTitle");
      var name = (titleEl && titleEl.value.trim()) || "Untitled Document";
      currentFile = { name: name, ext: "doc", content: editor.innerHTML, time: Date.now() };
      saveRecent(currentFile);
      var st = $("#saveState");
      if (st) st.textContent = "Saved";
      toast("Document saved");
    }

    function downloadBlob(data, name, type) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data], { type: type }));
      a.download = name;
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
    }

    // ---------- Reader view helpers ----------
    function readerSetup(title, metaText) {
      show(readerView);
      var titleEl = $("#readerTitle"), metaEl = $("#readerMeta"), tabs = $("#sheetTabs"), content = $("#readerContent");
      if (titleEl) titleEl.textContent = title;
      if (metaEl) metaEl.textContent = metaText || "";
      if (tabs) { tabs.classList.add("hidden"); tabs.innerHTML = ""; }
      if (content) content.innerHTML = '<div class="doc-loading">Loading\u2026</div>';
      return content;
    }

    function readerError(msg) {
      var content = $("#readerContent");
      if (content) content.innerHTML = '<div class="reader-error">' + escapeHtml(msg) + '</div>';
    }

    // ---------- PDF (pdf.js) ----------
    async function openPdfReader(file) {
      var content = readerSetup(file.name, "PDF");
      if (!window.pdfjsLib) { readerError("PDF engine failed to load. Check your internet connection and refresh."); return; }
      try {
        var buf = await file.arrayBuffer();
        var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        var wrap = document.createElement("div");
        wrap.className = "pdf-pages";
        var metaEl = $("#readerMeta");
        if (metaEl) metaEl.textContent = "PDF · " + pdf.numPages + (pdf.numPages === 1 ? " page" : " pages");

        for (var i = 1; i <= pdf.numPages; i++) {
          var page = await pdf.getPage(i);
          var viewport = page.getViewport({ scale: 1.4 });
          var canvas = document.createElement("canvas");
          canvas.className = "pdf-page";
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport }).promise;
          wrap.appendChild(canvas);
          var label = document.createElement("div");
          label.className = "pdf-page-num";
          label.textContent = "Page " + i + " of " + pdf.numPages;
          wrap.appendChild(label);
        }
        content.innerHTML = "";
        content.appendChild(wrap);
      } catch (err) {
        console.warn("[DocSpace] PDF render failed:", err);
        readerError("Could not open this PDF. It may be encrypted, corrupted, or password-protected.");
      }
    }

    // ---------- Word (.docx via Mammoth) ----------
    async function openDocxReader(file) {
      var content = readerSetup(file.name, "Word document");
      if (!window.mammoth) { readerError("Word engine failed to load. Check your internet connection and refresh."); return; }
      try {
        var buf = await file.arrayBuffer();
        var result = await mammoth.convertToHtml({ arrayBuffer: buf });
        content.innerHTML = '<div class="docx-page">' + result.value + '</div>';
        if (result.messages && result.messages.length) {
          console.info("[DocSpace] Word conversion notes:", result.messages);
        }
      } catch (err) {
        console.warn("[DocSpace] DOCX render failed:", err);
        readerError("Could not open this Word file. Only modern .docx files are supported (not legacy .doc).");
      }
    }

    // ---------- Excel / CSV (SheetJS) ----------
    async function openSheetReader(file, ext) {
      var content = readerSetup(file.name, ext.toUpperCase());
      if (!window.XLSX) { readerError("Spreadsheet engine failed to load. Check your internet connection and refresh."); return; }
      try {
        var wb;
        if (ext === "csv") {
          var text = await file.text();
          wb = XLSX.read(text, { type: "string" });
        } else {
          var buf = await file.arrayBuffer();
          wb = XLSX.read(buf, { type: "array" });
        }
        currentWorkbook = wb;
        var metaEl = $("#readerMeta");
        if (metaEl) metaEl.textContent = ext.toUpperCase() + " · " + wb.SheetNames.length +
          (wb.SheetNames.length === 1 ? " sheet" : " sheets");

        var tabs = $("#sheetTabs");
        if (tabs && wb.SheetNames.length > 1) {
          tabs.classList.remove("hidden");
          tabs.innerHTML = wb.SheetNames.map(function (name, i) {
            return '<button class="sheet-tab' + (i === 0 ? " active" : "") + '" data-sheet="' + escapeHtml(name) + '">' + escapeHtml(name) + '</button>';
          }).join("");
          tabs.querySelectorAll(".sheet-tab").forEach(function (btn) {
            btn.onclick = function () {
              tabs.querySelectorAll(".sheet-tab").forEach(function (b) { b.classList.remove("active"); });
              btn.classList.add("active");
              renderSheet(wb, btn.dataset.sheet);
            };
          });
        } else if (tabs) {
          tabs.classList.add("hidden");
        }
        renderSheet(wb, wb.SheetNames[0]);
      } catch (err) {
        console.warn("[DocSpace] Spreadsheet render failed:", err);
        readerError("Could not open this spreadsheet. The file may be corrupted or in an unsupported format.");
      }
    }

    function renderSheet(wb, sheetName) {
      var content = $("#readerContent");
      if (!content) return;
      var sheet = wb.Sheets[sheetName];
      var html = XLSX.utils.sheet_to_html(sheet, { id: "___tbl" });
      html = html.replace('id="___tbl"', 'class="sheet-table"');
      content.innerHTML = '<div class="sheet-table-wrap">' + html + '</div>';
    }

    // ---------- Wire up controls ----------
    on("#newDocBtn", "click", function () { newDoc(); });
    on("#blankBtn", "click", function () { newDoc(); });
    on("#notesBtn", "click", function () { newDoc("<h2>Quick Notes</h2><p></p>", "Quick Notes"); });
    on("#backBtn", "click", function () { show(home); });
    on("#readerBack", "click", function () { show(home); });

    on("#clearRecentBtn", "click", function () {
      if (!recent().length) { toast("Nothing to clear"); return; }
      if (!confirm("Clear all recent documents? This can't be undone.")) return;
      localStorage.removeItem(recentKey);
      renderRecent();
      toast("Recent list cleared");
    });

    on("#themeBtn", "click", function () {
      document.body.classList.toggle("dark");
      var isDark = document.body.classList.contains("dark");
      try { localStorage.setItem("docspace_theme", isDark ? "dark" : "light"); } catch (e) {}
      var btn = $("#themeBtn");
      if (btn) btn.textContent = isDark ? "\u2600" : "\u263E";
    });

    try {
      if (localStorage.getItem("docspace_theme") === "dark") {
        document.body.classList.add("dark");
        var themeBtn = $("#themeBtn");
        if (themeBtn) themeBtn.textContent = "\u2600";
      }
    } catch (e) {}

    document.querySelectorAll("[data-cmd]").forEach(function (b) {
      b.addEventListener("click", function () {
        editor.focus();
        document.execCommand(b.dataset.cmd, false, null);
        changed();
      });
    });

    on("#formatBlock", "change", function (e) { editor.focus(); document.execCommand("formatBlock", false, e.target.value); changed(); });
    on("#fontSize", "change", function (e) { editor.focus(); document.execCommand("fontSize", false, e.target.value); changed(); });
    editor.addEventListener("input", changed);

    on("#saveBtn", "click", saveDocument);
    on("#docTitle", "input", function () {
      clearTimeout(autosaveTimer);
      var st = $("#saveState");
      if (st) st.textContent = "Unsaved";
      autosaveTimer = setTimeout(saveDocument, 800);
    });

    on("#downloadBtn", "click", function () {
      var titleEl = $("#docTitle");
      var title = ((titleEl && titleEl.value) || "document").replace(/[\\/:*?"<>|]/g, "_");
      var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(title) +
        '</title></head><body>' + editor.innerHTML + '</body></html>';
      downloadBlob(html, title + ".html", "text/html");
      toast("HTML downloaded");
    });

    on("#printBtn", "click", function () { window.print(); });

    on("#openFileBtn", "click", function () {
      var input = $("#fileInput");
      if (input) input.click();
    });

    on("#fileInput", "change", async function (e) {
      var f = e.target.files[0];
      if (!f) return;
      currentFile = f;
      var ext = f.name.split(".").pop().toLowerCase();

      if (ext === "pdf") { await openPdfReader(f); e.target.value = ""; return; }
      if (ext === "docx") { await openDocxReader(f); e.target.value = ""; return; }
      if (ext === "xlsx" || ext === "xls" || ext === "csv") { await openSheetReader(f, ext); e.target.value = ""; return; }
      if (ext === "doc") {
        readerSetup(f.name, "Word document");
        readerError("Legacy .doc files aren't supported yet — please save as .docx and reopen.");
        e.target.value = "";
        return;
      }

      var text = await f.text();
      if (ext === "txt") newDoc("<pre>" + escapeHtml(text) + "</pre>", f.name);
      else newDoc(text, f.name);
      saveRecent({ name: f.name, ext: ext, content: editor.innerHTML, time: Date.now() });
      e.target.value = "";
    });

    on("#readerDownload", "click", function () {
      if (currentFile) downloadBlob("", currentFile.name || "document", "application/octet-stream");
    });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !editorView.classList.contains("hidden")) {
        e.preventDefault();
        saveDocument();
      }
    });

    renderRecent();
  }
})();
