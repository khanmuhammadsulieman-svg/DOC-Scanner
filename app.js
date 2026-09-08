/*!
 * DocSpace Office
 * Built by Sulieman Khan
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    var $ = function (s) { return document.querySelector(s); };

    // Bind an event only if the element actually exists.
    // A single missing/misnamed element can no longer break every other button on the page.
    function on(sel, evt, fn) {
      var el = typeof sel === "string" ? $(sel) : sel;
      if (!el) { console.warn("[DocSpace] element not found:", sel); return; }
      el.addEventListener(evt, fn);
    }

    var home = $("#homeView"), editorView = $("#editorView"), readerView = $("#readerView"), editor = $("#editor");
    var recentKey = "docspace_recent_v1";
    var currentFile = null, autosaveTimer = null;

    if (!home || !editorView || !readerView || !editor) {
      console.error("[DocSpace] Core view elements missing — check index.html ids.");
      return;
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
        el.onclick = function () { openRecent(a[el.dataset.i]); };
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

    function openRecent(x) {
      if (x && x.content) newDoc(x.content, x.name);
      else toast("This file must be opened again from your device.");
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

    async function openPdfReader(file) {
      show(readerView);
      var titleEl = $("#readerTitle"), contentEl = $("#readerContent");
      if (titleEl) titleEl.textContent = file.name;
      if (contentEl) contentEl.innerHTML = "<p>Loading PDF\u2026</p>";
      try {
        var buf = await file.arrayBuffer();
        var bytes = new Uint8Array(buf);
        var raw = new TextDecoder("latin1").decode(bytes);
        var chunks = raw.replace(/\r/g, "").match(/BT[\s\S]*?ET/g);
        var text = chunks ? chunks.join("\n") : "";
        text = text
          .replace(/\\\\/g, "")
          .replace(/\((.*?)\)\s*Tj/g, "$1\n")
          .replace(/\[(.*?)\]\s*TJ/g, "$1\n")
          .replace(/<[^>]+>/g, "")
          .replace(/[^\x20-\x7E\n]+/g, " ");
        if (contentEl) {
          contentEl.innerHTML = "<h2>" + escapeHtml(file.name) + "</h2>" +
            "<p class='muted'>PDF preview (basic text extraction). For complex/scanned PDFs, use a dedicated PDF viewer.</p>" +
            "<pre>" + escapeHtml(text.slice(0, 100000)) + "</pre>";
        }
      } catch (err) {
        if (contentEl) contentEl.innerHTML = "<p>Could not preview this PDF in the basic reader.</p>";
        console.warn("[DocSpace] PDF preview failed:", err);
      }
    }

    // --- Wire up all controls defensively ---
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
      var text = await f.text();
      if (ext === "txt") newDoc("<pre>" + escapeHtml(text) + "</pre>", f.name);
      else newDoc(text, f.name);
      saveRecent({ name: f.name, ext: ext, content: editor.innerHTML, time: Date.now() });
      e.target.value = "";
    });

    on("#readerDownload", "click", function () {
      if (currentFile) downloadBlob("", currentFile.name || "document", "application/octet-stream");
    });

    // Ctrl/Cmd+S saves the current document instead of triggering the browser's save dialog
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !editorView.classList.contains("hidden")) {
        e.preventDefault();
        saveDocument();
      }
    });

    renderRecent();
  }
})();
