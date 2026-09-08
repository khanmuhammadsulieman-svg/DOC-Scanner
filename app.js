const $=s=>document.querySelector(s);
const home=$("#homeView"), editorView=$("#editorView"), readerView=$("#readerView"), editor=$("#editor");
const recentKey="docspace_recent_v1";
let currentFile=null, autosaveTimer=null;

function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("show"),1800)}
function show(view){[home,editorView,readerView].forEach(v=>v.classList.add("hidden"));view.classList.remove("hidden");window.scrollTo(0,0)}
function recent(){try{return JSON.parse(localStorage.getItem(recentKey)||"[]")}catch{return[]}}
function saveRecent(item){let a=recent().filter(x=>x.name!==item.name);a.unshift(item);localStorage.setItem(recentKey,JSON.stringify(a.slice(0,12)));renderRecent()}
function renderRecent(){const box=$("#recentList"), a=recent(); if(!a.length){box.innerHTML='<div class="recent-item"><div class="recent-meta"><b>No recent documents</b><small>Your opened documents will appear here.</small></div></div>';return}box.innerHTML=a.map((x,i)=>`<div class="recent-item" data-i="${i}"><div class="file-icon">${(x.ext||"DOC").toUpperCase().slice(0,3)}</div><div class="recent-meta"><b>${escapeHtml(x.name)}</b><small>${new Date(x.time).toLocaleString()}</small></div><span>›</span></div>`).join("");box.querySelectorAll(".recent-item").forEach(el=>el.onclick=()=>openRecent(a[el.dataset.i]))}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function newDoc(content="<p>Start writing here...</p>",title="Untitled Document"){currentFile={name:title,ext:"doc"};$("#docTitle").value=title;editor.innerHTML=content;show(editorView);setTimeout(()=>editor.focus(),150)}
function openRecent(x){if(x.content)newDoc(x.content,x.name);else toast("This file must be opened again from your device.")}
$("#newDocBtn").onclick=()=>newDoc();
$("#blankBtn").onclick=()=>newDoc();
$("#notesBtn").onclick=()=>newDoc("<h2>Quick Notes</h2><p></p>","Quick Notes");
$("#backBtn").onclick=()=>show(home);
$("#readerBack").onclick=()=>show(home);
$("#clearRecentBtn").onclick=()=>{localStorage.removeItem(recentKey);renderRecent();toast("Recent list cleared")};
$("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("docspace_theme",document.body.classList.contains("dark")?"dark":"light");$("#themeBtn").textContent=document.body.classList.contains("dark")?"☀":"☾"};
if(localStorage.getItem("docspace_theme")==="dark"){document.body.classList.add("dark");$("#themeBtn").textContent="☀"}

document.querySelectorAll("[data-cmd]").forEach(b=>b.onclick=()=>{editor.focus();document.execCommand(b.dataset.cmd,false,null);changed()});
$("#formatBlock").onchange=e=>{editor.focus();document.execCommand("formatBlock",false,e.target.value);changed()};
$("#fontSize").onchange=e=>{editor.focus();document.execCommand("fontSize",false,e.target.value);changed()};
editor.addEventListener("input",changed);
function changed(){clearTimeout(autosaveTimer);$("#saveState").textContent="Unsaved";autosaveTimer=setTimeout(saveDocument,700)}
function saveDocument(){const name=$("#docTitle").value.trim()||"Untitled Document";currentFile={name,ext:"doc",content:editor.innerHTML,time:Date.now()};saveRecent(currentFile);$("#saveState").textContent="Saved";toast("Document saved")}
$("#saveBtn").onclick=saveDocument;
$("#docTitle").oninput=()=>{clearTimeout(autosaveTimer);$("#saveState").textContent="Unsaved";autosaveTimer=setTimeout(saveDocument,800)};
$("#downloadBtn").onclick=()=>{const title=($("#docTitle").value||"document").replace(/[\\/:*?"<>|]/g,"_");const html=`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${editor.innerHTML}</body></html>`;downloadBlob(html,title+".html","text/html");toast("HTML downloaded")};
$("#printBtn").onclick=()=>window.print();
function downloadBlob(data,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}

$("#openFileBtn").onclick=()=>$("#fileInput").click();
$("#fileInput").onchange=async e=>{const f=e.target.files[0];if(!f)return;currentFile=f;const ext=f.name.split(".").pop().toLowerCase();if(ext==="pdf"){await openPdfReader(f);return}const text=await f.text();if(ext==="txt"){newDoc("<pre>"+escapeHtml(text)+"</pre>",f.name)}else{newDoc(text,f.name)}saveRecent({name:f.name,ext,content:editor.innerHTML,time:Date.now()});e.target.value=""};

async function openPdfReader(file){show(readerView);$("#readerTitle").textContent=file.name;$("#readerContent").innerHTML="<p>Loading PDF…</p>";try{const buf=await file.arrayBuffer();const bytes=new Uint8Array(buf);let raw=new TextDecoder("latin1").decode(bytes);let text=raw.replace(/\\r/g,"").match(/BT[\\s\\S]*?ET/g)?.join("\\n")||"";text=text.replace(/\\/\\\\/g,"").replace(/\\((.*?)\\)\\s*Tj/g,"$1\\n").replace(/\\[(.*?)\\]\\s*TJ/g,"$1\\n").replace(/<[^>]+>/g,"").replace(/[^\\x20-\\x7E\\n]+/g," ");$("#readerContent").innerHTML="<h2>"+escapeHtml(file.name)+"</h2><p class='muted'>PDF preview (basic text extraction). For complex/scanned PDFs, use a dedicated PDF viewer.</p><pre>"+escapeHtml(text.slice(0,100000))+"</pre>";}catch(err){$("#readerContent").innerHTML="<p>Could not preview this PDF in the basic reader.</p>"}}
$("#readerDownload").onclick=()=>{if(currentFile)downloadBlob("",currentFile.name||"document","application/octet-stream")};
renderRecent();
