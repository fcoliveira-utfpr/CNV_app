import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

/* ===================== CONFIG GOOGLE SIGN-IN ===================== */
// Web Client ID gerado no Google Cloud Console (OAuth 2.0 Client ID, tipo "Web application").
// Veja o passo a passo em README.md > "Conectar com o Google Sheets".
const GOOGLE_WEB_CLIENT_ID = "884219519511-pucur1v97fkv1kb8fj5klq4j9naf2mft.apps.googleusercontent.com";
const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

/* ===================== DADOS ===================== */
const FEEL_GOOD = ["Alegre","Grato(a)","Tranquilo(a)","Aliviado(a)","Confiante","Esperançoso(a)","Entusiasmado(a)","Amoroso(a)","Sereno(a)","Satisfeito(a)","Energizado(a)","Encantado(a)"];
const FEEL_BAD  = ["Triste","Frustrado(a)","Ansioso(a)","Cansado(a)","Irritado(a)","Confuso(a)","Sozinho(a)","Preocupado(a)","Envergonhado(a)","Decepcionado(a)","Sobrecarregado(a)","Com raiva","Inseguro(a)","Culpado(a)"];

const NEEDS = {
  "Subsistência e segurança física": ["Ar","Água","Comida","Descanso","Movimento","Abrigo","Saúde","Toque"],
  "Conexão": ["Aceitação","Afeto","Pertencimento","Companhia","Empatia","Confiança","Apoio mútuo","Respeito"],
  "Honestidade": ["Autenticidade","Integridade","Presença"],
  "Lazer": ["Diversão","Humor","Relaxamento"],
  "Paz": ["Harmonia","Ordem","Beleza","Igualdade"],
  "Autonomia": ["Escolha","Liberdade","Espaço","Espontaneidade"],
  "Significado": ["Clareza","Crescimento","Contribuição","Criatividade","Aprendizagem","Propósito","Segurança emocional","Consideração"]
};

const TIPS = [
  "Sentimento não é a mesma coisa que a história que você conta sobre ele. 'Sinto que você me ignorou' é uma interpretação; 'fico magoado(a)' é um sentimento.",
  "Toda crítica é a expressão trágica de uma necessidade não atendida — a sua ou a do outro.",
  "Um pedido feito com raiva costuma soar como exigência, mesmo sem querer. Vale respirar antes.",
  "Nomear a necessidade (não o sentimento) é o que geralmente abre espaço para uma solução.",
  "'Sempre' e 'nunca' raramente são observações — quase sempre são avaliações disfarçadas."
];

/* ===================== ESTADO ===================== */
let entries = JSON.parse(localStorage.getItem('cnv_entries') || '[]');
let spreadsheetId = localStorage.getItem('cnv_spreadsheet_id') || '';
let googleAccount = JSON.parse(localStorage.getItem('cnv_google_account') || 'null');
let sheetConnected = !!(spreadsheetId && googleAccount);
let googleInitialized = false;
let cachedSheetTitle = null;

let step = 1;
const TOTAL_STEPS = 5;
let draft = {obs:"", feelings:[], needs:[], pedido:"", pedidoPara:"mim"};
let libTab = "feel";

/* ===================== NAVEGAÇÃO PRINCIPAL ===================== */
function showScreen(name){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("screen-"+name).classList.add("active");
  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.toggle("active", b.dataset.screen===name));
  if(name==="historico") renderHistorico();
  if(name==="biblioteca") renderLibrary();
}

/* ===================== WIZARD (Registro) ===================== */
function renderProgress(){
  const el = document.getElementById("stepsProgress");
  el.innerHTML = "";
  for(let i=1;i<=TOTAL_STEPS;i++){
    const s = document.createElement("span");
    if(i<=step) s.classList.add("done");
    el.appendChild(s);
  }
}
function wizardNext(){
  if(step < TOTAL_STEPS){
    step++;
    updateWizardView();
  } else {
    doSave();
  }
}
function wizardBack(){
  if(step>1){ step--; updateWizardView(); }
}
function updateWizardView(){
  document.querySelectorAll(".wizard-step").forEach(s=>{
    s.style.display = (Number(s.dataset.step)===step) ? "block" : "none";
  });
  document.getElementById("btnBack").style.visibility = step===1 ? "hidden" : "visible";
  document.getElementById("btnNext").textContent = step===TOTAL_STEPS ? "Salvar registro" : "Continuar";
  renderProgress();
  if(step===5) fillReview();
}
function toggleFeel(name){
  const idx = draft.feelings.indexOf(name);
  if(idx>-1) draft.feelings.splice(idx,1); else draft.feelings.push(name);
  renderWizardChips();
}
function toggleNeed(name){
  const idx = draft.needs.indexOf(name);
  if(idx>-1) draft.needs.splice(idx,1); else draft.needs.push(name);
  renderWizardChips();
}
function setPedidoPara(v){
  draft.pedidoPara = v;
  document.getElementById("segMim").classList.toggle("active", v==="mim");
  document.getElementById("segOutro").classList.toggle("active", v==="outro");
}
function renderWizardChips(){
  const good = document.getElementById("feelGoodChips");
  good.innerHTML = FEEL_GOOD.map(f=>`<span class="chip feel-good ${draft.feelings.includes(f)?'selected':''}" onclick="toggleFeel('${f}')">${f}</span>`).join("");
  const bad = document.getElementById("feelBadChips");
  bad.innerHTML = FEEL_BAD.map(f=>`<span class="chip feel-bad ${draft.feelings.includes(f)?'selected':''}" onclick="toggleFeel('${f}')">${f}</span>`).join("");

  const needWrap = document.getElementById("needChipsWizard");
  needWrap.innerHTML = Object.entries(NEEDS).map(([cat, items])=>`
    <div class="chip-group-title">${cat}</div>
    <div class="chips">${items.map(n=>`<span class="chip need ${draft.needs.includes(n)?'selected':''}" onclick="toggleNeed('${n}')">${n}</span>`).join("")}</div>
  `).join("");
}
function fillReview(){
  document.getElementById("revObs").textContent = document.getElementById("obsInput").value.trim() || "(nada escrito)";
  document.getElementById("revFeel").textContent = draft.feelings.length ? draft.feelings.join(", ") : "(nenhum selecionado)";
  document.getElementById("revNeed").textContent = draft.needs.length ? draft.needs.join(", ") : "(nenhuma selecionada)";
  const pedidoTxt = document.getElementById("pedidoInput").value.trim();
  document.getElementById("revPedido").textContent = pedidoTxt ? `${pedidoTxt} (${draft.pedidoPara==='mim'?'para mim mesmo(a)':'para outra pessoa'})` : "(nada escrito)";
  document.getElementById("syncHint").textContent = sheetConnected
    ? "✅ Conectado — este registro será enviado para a sua planilha ao salvar."
    : "💡 Ainda não há planilha conectada — este registro ficará salvo só neste aparelho. Toque em ⚙️ para configurar.";
}
async function doSave(){
  draft.obs = document.getElementById("obsInput").value.trim();
  draft.pedido = document.getElementById("pedidoInput").value.trim();
  const today = new Date().toISOString().slice(0,10);
  const entry = {
    id: Date.now(),
    date: today,
    feelings: [...draft.feelings],
    needs: [...draft.needs],
    obs: draft.obs,
    pedido: draft.pedido,
    pedidoPara: draft.pedidoPara
  };

  entries.unshift(entry);
  localStorage.setItem('cnv_entries', JSON.stringify(entries));

  let sentToSheet = false;
  if (spreadsheetId && googleAccount) {
    sentToSheet = await syncEntryToSheet(entry);
  }

  showToast(sentToSheet ? "✅ Registro salvo na sua planilha" : "✅ Registro salvo neste aparelho");

  draft = {obs:"", feelings:[], needs:[], pedido:"", pedidoPara:"mim"};
  document.getElementById("obsInput").value = "";
  document.getElementById("pedidoInput").value = "";
  setPedidoPara("mim");
  step = 1;
  updateWizardView();
  renderWizardChips();
}
function showToast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 2600);
}

/* ===================== BIBLIOTECA ===================== */
function setLibTab(t){
  libTab = t;
  document.getElementById("tabFeel").classList.toggle("active", t==="feel");
  document.getElementById("tabNeed").classList.toggle("active", t==="need");
  document.getElementById("libFeelPane").style.display = t==="feel" ? "block":"none";
  document.getElementById("libNeedPane").style.display = t==="need" ? "block":"none";
  renderLibrary();
}
function renderLibrary(){
  const q = (document.getElementById("libSearch").value || "").toLowerCase();
  if(libTab==="feel"){
    document.getElementById("libFeelGood").innerHTML = FEEL_GOOD.filter(f=>f.toLowerCase().includes(q)).map(f=>`<span class="chip feel-good">${f}</span>`).join("") || "<p style='font-size:12.5px;color:var(--ink-muted)'>Nada encontrado.</p>";
    document.getElementById("libFeelBad").innerHTML = FEEL_BAD.filter(f=>f.toLowerCase().includes(q)).map(f=>`<span class="chip feel-bad">${f}</span>`).join("") || "<p style='font-size:12.5px;color:var(--ink-muted)'>Nada encontrado.</p>";
  } else {
    const pane = document.getElementById("libNeedPane");
    pane.innerHTML = Object.entries(NEEDS).map(([cat, items])=>{
      const filtered = items.filter(n=>n.toLowerCase().includes(q));
      if(!filtered.length) return "";
      return `<div class="need-category"><h4>${cat}</h4><div class="chips">${filtered.map(n=>`<span class="chip need">${n}</span>`).join("")}</div></div>`;
    }).join("") || "<p style='font-size:12.5px;color:var(--ink-muted)'>Nada encontrado.</p>";
  }
}

/* ===================== HISTÓRICO ===================== */
const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function renderHistorico(){
  const list = document.getElementById("entriesList");

  if (!entries.length) {
    list.innerHTML = "<p style='font-size:12.5px;color:var(--ink-muted); padding:12px 0;'>Nenhum registro ainda. Toque em Registro para começar.</p>";
    renderBars("chartFeel", []);
    renderBars("chartNeed", []);
    return;
  }

  list.innerHTML = entries.map(e=>{
    const d = new Date(e.date+"T00:00:00");
    return `<div class="entry-card">
      <div class="entry-date"><div class="d">${d.getDate()}</div><div class="m">${MESES[d.getMonth()]}</div></div>
      <div class="entry-body">
        <div class="tags">
          ${e.feelings.map(f=>`<span class="tag-pill tag-feel">${f}</span>`).join("")}
          ${e.needs.map(n=>`<span class="tag-pill tag-need">${n}</span>`).join("")}
        </div>
        <div class="obs">${e.obs || ""}</div>
      </div>
    </div>`;
  }).join("");

  renderBars("chartFeel", freqOf(entries.flatMap(e=>e.feelings)));
  renderBars("chartNeed", freqOf(entries.flatMap(e=>e.needs)));
}
function freqOf(arr){
  const map = {};
  arr.forEach(v=>{ map[v] = (map[v]||0)+1; });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
}
function renderBars(containerId, pairs){
  const max = pairs.length ? pairs[0][1] : 1;
  document.getElementById(containerId).innerHTML = pairs.map(([label,count])=>`
    <div class="bar-row">
      <div class="top"><span class="label">${label}</span><span class="val">${count}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(count/max*100).toFixed(0)}%"></div></div>
    </div>
  `).join("") || "<p style='font-size:12.5px;color:var(--ink-muted)'>Ainda sem dados suficientes.</p>";
}
function exportCSV(){
  if (!entries.length) {
    showToast("⚠️ Nenhum registro para exportar");
    return;
  }
  let csv = 'Data,Sentimentos,Necessidades,Observacao,Pedido,Pedido Para\n';
  entries.forEach(e=>{
    const feelingsStr = `"${(e.feelings||[]).join('; ')}"`;
    const needsStr = `"${(e.needs||[]).join('; ')}"`;
    const obsStr = `"${(e.obs||'').replace(/"/g,'""')}"`;
    const pedidoStr = `"${(e.pedido||'').replace(/"/g,'""')}"`;
    csv += `"${e.date}",${feelingsStr},${needsStr},${obsStr},${pedidoStr},"${e.pedidoPara||''}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diario_cnv_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===================== GOOGLE SIGN-IN + GOOGLE SHEETS ===================== */
function extractSpreadsheetId(input){
  if (!input) return '';
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(input)) return input;
  return '';
}
async function ensureGoogleReady(){
  if (!window.Capacitor?.isNativePlatform?.()) {
    throw new Error('Login com Google só funciona no app instalado no celular, não no navegador.');
  }
  if (!googleInitialized) {
    await GoogleSignIn.initialize({ clientId: GOOGLE_WEB_CLIENT_ID, scopes: GOOGLE_SCOPES });
    googleInitialized = true;
  }
}
async function getSheetTitle(accessToken){
  if (cachedSheetTitle) return cachedSheetTitle;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error('sheet-lookup-failed:' + res.status);
  const data = await res.json();
  cachedSheetTitle = data.sheets?.[0]?.properties?.title || 'Sheet1';
  return cachedSheetTitle;
}
async function ensureHeaderRow(accessToken, title){
  const range = `${encodeURIComponent(title)}!A1:F1`;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error('header-check-failed:' + res.status);
  const data = await res.json();
  if (!data.values || !data.values.length) {
    const putRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [['Data','Sentimentos','Necessidades','Observação','Pedido','Pedido para']] })
    });
    if (!putRes.ok) throw new Error('header-write-failed:' + putRes.status);
  }
}
async function appendEntryToSheet(entry, accessToken, title){
  const range = `${encodeURIComponent(title)}!A1`;
  const row = [entry.date, (entry.feelings||[]).join(', '), (entry.needs||[]).join(', '), entry.obs||'', entry.pedido||'', entry.pedidoPara||''];
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] })
  });
  if (!res.ok) throw new Error('append-failed:' + res.status);
}
async function syncEntryToSheet(entry, isRetry){
  if (!spreadsheetId || !googleAccount?.accessToken) return false;
  try {
    const title = await getSheetTitle(googleAccount.accessToken);
    await ensureHeaderRow(googleAccount.accessToken, title);
    await appendEntryToSheet(entry, googleAccount.accessToken, title);
    return true;
  } catch (err) {
    const msg = String(err?.message || '');
    const isAuthError = msg.includes('401') || msg.includes('403');
    if (isAuthError && !isRetry) {
      try {
        await ensureGoogleReady();
        const result = await GoogleSignIn.signIn();
        if (result.accessToken) {
          googleAccount = { email: result.email, accessToken: result.accessToken };
          localStorage.setItem('cnv_google_account', JSON.stringify(googleAccount));
          cachedSheetTitle = null;
          return await syncEntryToSheet(entry, true);
        }
      } catch (err2) {
        console.error('Reautenticação falhou:', err2);
      }
    }
    console.error('Erro ao sincronizar com a planilha:', err);
    return false;
  }
}
async function googleConnect(){
  const link = document.getElementById('sheetLink').value.trim();
  const id = extractSpreadsheetId(link);
  if (!id) { showToast('⚠️ Cole o link da sua planilha do Google Sheets'); return; }

  try {
    await ensureGoogleReady();
    const result = await GoogleSignIn.signIn();
    if (!result.accessToken) {
      showToast('⚠️ Login feito, mas sem permissão de acesso ao Sheets. Tente novamente.');
      return;
    }
    spreadsheetId = id;
    googleAccount = { email: result.email, accessToken: result.accessToken };
    cachedSheetTitle = null;
    localStorage.setItem('cnv_spreadsheet_id', spreadsheetId);
    localStorage.setItem('cnv_google_account', JSON.stringify(googleAccount));
    sheetConnected = true;
    updateStatusBadge();
    showToast(`✅ Conectado como ${result.email}`);
    closeSheet();
  } catch (err) {
    console.error(err);
    showToast(err?.message?.includes('celular') ? `⚠️ ${err.message}` : '⚠️ Login cancelado ou falhou.');
  }
}
async function googleDisconnect(){
  try {
    if (window.Capacitor?.isNativePlatform?.()) {
      await ensureGoogleReady();
      await GoogleSignIn.signOut();
    }
  } catch (err) {
    console.error(err);
  }
  spreadsheetId = '';
  googleAccount = null;
  sheetConnected = false;
  cachedSheetTitle = null;
  localStorage.removeItem('cnv_spreadsheet_id');
  localStorage.removeItem('cnv_google_account');
  updateStatusBadge();
  showToast('Planilha desconectada.');
}

/* ===================== DITADO POR VOZ ===================== */
// O reconhecedor do Android só captura uma frase por vez e para sozinho a cada
// pausa breve. Por isso, a cada "stopped" natural (sem o usuário ter pedido pra
// parar) reiniciamos a escuta automaticamente, para simular um ditado contínuo.
const DICTATION_OPTIONS = { language: 'pt-BR', partialResults: true, popup: false, maxResults: 1 };
let dictationActive = null; // { fieldId, btnId, baseText, stopping }

function setMicButtonState(btn, recording){
  if (!btn) return;
  btn.classList.toggle('recording', recording);
  btn.textContent = recording ? '⏹️' : '🎤';
}

async function toggleDictation(fieldId, btnId){
  if (dictationActive?.fieldId === fieldId) {
    await finishDictation();
    return;
  }
  if (dictationActive) await finishDictation();
  await startDictation(fieldId, btnId);
}

async function startDictation(fieldId, btnId){
  if (!window.Capacitor?.isNativePlatform?.()) {
    showToast('⚠️ Ditado por voz só funciona no app instalado no celular.');
    return;
  }
  try {
    const { available } = await SpeechRecognition.available();
    if (!available) {
      showToast('⚠️ Reconhecimento de voz não disponível neste aparelho.');
      return;
    }
    let perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== 'granted') {
      perm = await SpeechRecognition.requestPermissions();
    }
    if (perm.speechRecognition !== 'granted') {
      showToast('⚠️ Permissão de microfone negada.');
      return;
    }
  } catch (err) {
    console.error(err);
    showToast('⚠️ Não foi possível acessar o microfone.');
    return;
  }

  const field = document.getElementById(fieldId);
  const btn = document.getElementById(btnId);
  dictationActive = { fieldId, btnId, baseText: field.value.trim(), stopping: false };
  setMicButtonState(btn, true);

  await SpeechRecognition.removeAllListeners();
  await SpeechRecognition.addListener('partialResults', (data) => {
    if (!dictationActive) return;
    const spoken = data.matches?.[0] || '';
    field.value = dictationActive.baseText ? `${dictationActive.baseText} ${spoken}`.trim() : spoken;
  });
  await SpeechRecognition.addListener('listeningState', (data) => {
    if (data.status !== 'stopped' || !dictationActive || dictationActive.stopping) return;
    // Pausa natural detectada pelo Android: continua ouvindo a próxima frase.
    // Esperamos um pouco antes de reiniciar porque o reconhecedor nativo ainda
    // está processando o resultado da frase anterior logo após o "stopped";
    // reiniciar na hora cria uma sessão fantasma que nunca é encerrada direito.
    dictationActive.baseText = field.value.trim();
    setTimeout(() => {
      if (!dictationActive || dictationActive.stopping) return;
      SpeechRecognition.start(DICTATION_OPTIONS).catch((err) => {
        console.error(err);
        finishDictation();
      });
    }, 300);
  });

  try {
    await SpeechRecognition.start(DICTATION_OPTIONS);
  } catch (err) {
    console.error(err);
    showToast('⚠️ Erro ao iniciar o ditado.');
    await finishDictation();
  }
}

async function finishDictation(){
  if (!dictationActive) return;
  dictationActive.stopping = true;
  const { btnId } = dictationActive;
  // Reverte o ícone já, na hora do toque — não depende de nenhuma resposta
  // nativa, que às vezes chega atrasada ou malformada e travava esse reset.
  dictationActive = null;
  setMicButtonState(document.getElementById(btnId), false);
  try { await SpeechRecognition.stop(); } catch (err) { console.error(err); }
  try { await SpeechRecognition.removeAllListeners(); } catch (err) { console.error(err); }
}

/* ===================== CONFIG (sheet) ===================== */
function openSheet(){
  document.getElementById("sheetLink").value = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : '';
  document.getElementById("sheetOverlay").classList.add("open");
  document.getElementById("configSheet").classList.add("open");
}
function closeSheet(){
  document.getElementById("sheetOverlay").classList.remove("open");
  document.getElementById("configSheet").classList.remove("open");
}
function updateStatusBadge(){
  const b = document.getElementById("statusBadge");
  b.classList.toggle("on", sheetConnected);
  b.classList.toggle("off", !sheetConnected);
  document.getElementById("statusText").textContent = sheetConnected
    ? `Conectado${googleAccount?.email ? ' ('+googleAccount.email+')' : ''}`
    : "Não conectado";
  const connectBtn = document.getElementById('btnGoogleConnect');
  const disconnectBtn = document.getElementById('btnGoogleDisconnect');
  if (connectBtn) connectBtn.textContent = sheetConnected ? 'Trocar planilha' : 'Entrar com Google';
  if (disconnectBtn) disconnectBtn.style.display = sheetConnected ? 'block' : 'none';
}

/* ===================== INIT ===================== */
function init(){
  renderProgress();
  renderWizardChips();
  updateStatusBadge();
  document.getElementById("dicaDoDia").textContent = TIPS[new Date().getDate() % TIPS.length];
}

/* Expõe no escopo global para os onclick="" do index.html */
Object.assign(window, {
  showScreen, wizardNext, wizardBack, toggleFeel, toggleNeed, setPedidoPara,
  setLibTab, renderLibrary, exportCSV,
  openSheet, closeSheet, googleConnect, googleDisconnect, toggleDictation
});

init();
