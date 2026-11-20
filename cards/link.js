/* Púcas cards ↔ Donrí: the real link.
   The game lives at /donrifamily/cards/ on the same site as Donrí, so it shares Donrí's sign-in
   (localStorage "donri.cfg" and "donri.tok") and reads and writes the same family file in OneDrive.
   It keeps its own copy of the file ("donri.cards.data"), so it never overwrites Donrí's copy on this phone.
   Merge rules are Donrí's: per document, the newer "u" wins; a deleted document is {_del:true, u}.
   The game only writes its own parts: cards/<kid>, cards/<kid>-pack, play/<kid>-<date>,
   settings/puca-<kid> (xp only, +3 for a win), activity and inbox (plus an ntfy notification). */
(function () {
  "use strict";
  const AUTH = "https://login.microsoftonline.com/consumers/oauth2/v2.0";
  const GRAPH = "https://graph.microsoft.com/v1.0";
  const SCOPES = "openid profile offline_access User.Read Files.ReadWrite.All Calendars.ReadWrite";
  const DONRI = location.origin + location.pathname.replace(/cards\/[^/]*$/, "");
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const blank = () => ({ app: "donri", v: 1, cols: {} });
  let cfg = ls.get("donri.cfg", {}), tok = ls.get("donri.tok", null);
  let D = ls.get("donri.cards.data", null), etag = ls.get("donri.cards.etag", null), dirty = ls.get("donri.cards.dirty", false);
  let state = "start", lastErr = null, refreshing = null, busyP = Promise.resolve(), saveT = null;
  const listeners = [];
  const persist = () => { ls.set("donri.cards.data", D); ls.set("donri.cards.etag", etag); ls.set("donri.cards.dirty", dirty); };

  /* ---------- sign-in (borrowed from Donrí: same client, same refresh token) ---------- */
  async function tokenRequest(params) {
    const r = await fetch(AUTH + "/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: cfg.c, scope: SCOPES, ...params }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) throw Object.assign(new Error(j.error_description || "token"), { code: j.error || "token_error" });
    const fresh = ls.get("donri.tok", null); // Donrí may have refreshed meanwhile
    tok = { at: j.access_token, rt: j.refresh_token || (fresh && fresh.rt) || (tok && tok.rt), exp: Date.now() + (j.expires_in || 3600) * 1000 };
    ls.set("donri.tok", tok);
    return tok.at;
  }
  async function accessToken() {
    const latest = ls.get("donri.tok", null); if (latest && (!tok || latest.exp > tok.exp)) tok = latest;
    if (tok && tok.at && tok.exp - Date.now() > 90000) return tok.at;
    if (!tok || !tok.rt) throw Object.assign(new Error("signed out"), { code: "signed_out" });
    if (!refreshing) refreshing = tokenRequest({ grant_type: "refresh_token", refresh_token: tok.rt }).finally(() => refreshing = null);
    try { return await refreshing; }
    catch (e) { throw Object.assign(new Error("signed out"), { code: (e.code === "invalid_grant" || e.code === "interaction_required") ? "signed_out" : e.code }); }
  }
  async function graph(path, opts = {}) {
    const t = await accessToken();
    const r = await fetch(path.startsWith("http") ? path : GRAPH + path, { ...opts, headers: { Authorization: "Bearer " + t, ...(opts.headers || {}) } });
    if (r.status === 401 && tok) { tok.exp = 0; }
    return r;
  }
  async function graphJson(path, opts) { const r = await graph(path, opts); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error((j.error && j.error.message) || r.status), { status: r.status }); return j; }
  const shareId = u => "u!" + btoa(unescape(encodeURIComponent(u))).replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
  const fileBase = () => cfg.viaShare && cfg.s ? `/shares/${shareId(cfg.s)}/driveItem` : `/drives/${cfg.d}/items/${cfg.i}`;

  /* ---------- the family file ---------- */
  function merge(a, b) {
    const out = blank();
    for (const col of new Set([...Object.keys((a && a.cols) || {}), ...Object.keys((b && b.cols) || {})])) {
      const ca = (a && a.cols[col]) || {}, cb = (b && b.cols[col]) || {}, o = out.cols[col] = {};
      for (const id of new Set([...Object.keys(ca), ...Object.keys(cb)])) { const x = ca[id], y = cb[id]; o[id] = !x ? y : !y ? x : ((x.u || 0) > (y.u || 0) ? x : y); }
    }
    return out;
  }
  function aheadOf(a, b) {
    for (const col of Object.keys(a.cols)) for (const [id, x] of Object.entries(a.cols[col])) { const y = b && b.cols && b.cols[col] && b.cols[col][id]; if (!y || (y.u || 0) < (x.u || 0)) return true; }
    return false;
  }
  async function pull(force) {
    const meta = await graphJson(fileBase());
    if (!force && meta.eTag === etag && D) return false;
    const r = await fetch(meta["@microsoft.graph.downloadUrl"], { cache: "no-store" });
    if (!r.ok) throw new Error("download " + r.status);
    const remote = await r.json();
    D = merge(D || blank(), remote); etag = meta.eTag; dirty = aheadOf(D, remote); persist();
    return true;
  }
  async function push() {
    for (let i = 0; i < 4 && dirty; i++) {
      const r = await graph(`${fileBase()}/content`, { method: "PUT", headers: { "Content-Type": "application/json", ...(etag ? { "If-Match": etag } : {}) }, body: JSON.stringify(D) });
      if (r.status === 412 || r.status === 409) { await pull(true); continue; }
      if (!r.ok) throw new Error("upload " + r.status);
      const j = await r.json(); etag = j.eTag; dirty = false; persist(); return;
    }
  }
  function sync(force) {
    if (!cfg.c || !(cfg.d || cfg.s)) { state = "nofile"; emit(); return Promise.resolve(); }
    if (!tok) { state = "signedout"; emit(); return Promise.resolve(); }
    busyP = busyP.then(async () => {
      try { const got = await pull(force); if (dirty) await push(); state = "ok"; lastErr = null; if (got) emit(); else emitState(); }
      catch (e) { lastErr = e; state = e.code === "signed_out" ? "signedout" : (D ? "offline" : "error"); emit(); }
    });
    return busyP;
  }
  function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(() => sync(false), 600); }
  const emit = () => listeners.forEach(f => f("data"));
  const emitState = () => listeners.forEach(f => f("state"));

  const docs = col => { const c = (D && D.cols[col]) || {}; return Object.keys(c).filter(id => !c[id]._del).map(id => ({ id, ...c[id] })); };
  const doc = (col, id) => { const x = D && D.cols[col] && D.cols[col][id]; return x && !x._del ? { id, ...x } : null; };
  function put(col, id, data) {
    D = D || blank(); const { id: _d, ...rest } = data; const cur = D.cols[col] && D.cols[col][id];
    (D.cols[col] = D.cols[col] || {})[id] = { ...rest, u: Math.max(Date.now(), ((cur && cur.u) || 0) + 1) };
    dirty = true; persist(); scheduleSave();
  }
  const patch = (col, id, data) => { const cur = doc(col, id) || {}; const { id: _d, ...rest } = cur; put(col, id, { ...rest, ...data }); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Donrí's own rules, read from the family file ---------- */
  const ymd = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const today = () => ymd(new Date());
  const members = () => (((doc("settings", "family") || {}).members) || []).filter(m => m && m.name);
  const kids = () => members().filter(m => !m.topic).map(m => m.name);
  const adults = () => members().filter(m => m.topic);
  const kidSettings = () => doc("settings", "kids") || {};
  const kidPref = (key, k) => ((kidSettings()[key] || {})[k]) !== false;
  const gems = k => docs("points").filter(p => p.kid === k).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const playId = k => k + "-" + today();
  const playDoc = k => doc("play", playId(k)) || {};
  const localSecs = k => Number(ls.get("donri.play." + playId(k), 0)) || 0;
  const usedSecs = k => Math.max(localSecs(k), Number(playDoc(k).secs) || 0);
  const playLimit = () => Number(kidSettings().playMins) || 10;
  const secsLeft = k => Math.max(0, (playLimit() + (Number(playDoc(k).extraMins) || 0)) * 60 - usedSecs(k));
  const byIncludes = (by, n) => String(by || "").split(" & ").includes(n);
  const pendTeam = c => (c.pendingTeam && c.pendingTeam.length ? c.pendingTeam : (c.pendingBy ? [c.pendingBy] : []));
  const jobToday = k => docs("chores").some(c => (c.lastDone === today() && byIncludes(c.lastBy, k)) || pendTeam(c).includes(k));
  const pinHash = s => { let h = 5381; for (const ch of "donri-kid:" + s) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0; return h.toString(36); };
  const wants = (m, k) => (m.notify && k in m.notify) ? !!m.notify[k] : true;

  function addPlay(k, secs) {
    const s = localSecs(k) + secs; ls.set("donri.play." + playId(k), s);
    put("play", playId(k), { ...playDoc(k), kid: k, date: today(), secs: Math.max(s, Number(playDoc(k).secs) || 0) });
  }
  function log(text, by) { put("activity", uid(), { text, by: by || "Púcas cards", at: Date.now() }); }
  function notifyGrownups(title, message) {
    adults().filter(m => wants(m, "stars")).forEach(m => {
      put("inbox", uid(), { to: m.name, title, message, link: "today", at: Date.now() });
      try { fetch("https://ntfy.sh/", { method: "POST", body: JSON.stringify({ topic: m.topic, title, message, tags: ["black_joker"], click: DONRI + "#today" }) }); } catch (e) {}
    });
  }
  function addXp(k, n) { const p = doc("settings", "puca-" + k); if (!p) return; patch("settings", "puca-" + k, { xp: (Number(p.xp) || 0) + n }); }

  window.LINK = {
    DONRI, sync, put, patch, doc, docs, today, kids, adults, kidSettings, kidPref, gems, secsLeft, jobToday, playDoc, pinHash,
    addPlay, log, notifyGrownups, addXp,
    get state() { return state; }, get error() { return lastErr; }, get hasData() { return !!D; },
    on(f) { listeners.push(f); },
    device() { return ls.get("donri.kid", "") || "family"; },
    pinOk(p) { const h = kidSettings().pin; return !!h && pinHash(p) === h; },
    hasPin() { return !!kidSettings().pin; },
    start() {
      if (D) state = "ok";
      sync(true);
      setInterval(() => { if (document.visibilityState === "visible") sync(false); }, 20000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sync(false); });
    }
  };
})();
