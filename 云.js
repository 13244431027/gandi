// Chat Panel (Local Multiplayer, No Cloud) - TurboWarp/CCW Custom Extension
// - Draggable floating window
// - Groups: id + name + avatar
// - Players/identities: created/switch ONLY via blocks (NO UI switching)
// - Import/Export JSON (schema versioned)
// - Cloud placeholders: blocks exist but do nothing yet (for later wiring)
//
// This code follows a "design-first" contract similar to your examples:
// - Uses extensionId/exticon
// - Exposes export/import + future cloud blocks
// - Keeps UI simple and safe (textContent, no HTML injection)

(() => {
  "use strict";

  const extensionId = "cjwxycExt";
  const exticon =
    "data:image/svg+xml;base64,0";

  const SCHEMA = "cj.chatpanel.localmp.v1";

  // ---------- Scratch binding ----------
  if (typeof Scratch === "undefined" || !Scratch.extensions) return;
  const rt = Scratch.vm && Scratch.vm.runtime;

  // ---------- Utils ----------
  const now = () => Date.now();

  const clamp = (n, lo, hi) => {
    n = Number(n);
    if (!Number.isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  };

  const s = (v) => (v == null ? "" : String(v));
  const normText = (v) => s(v).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const trim = (v) => normText(v).trim();
  const isBlank = (v) => trim(v).length === 0;

  const deepClone = (o) => JSON.parse(JSON.stringify(o));
  const tryParse = (txt) => {
    try {
      return { ok: true, value: JSON.parse(txt) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  };

  // ---------- Defaults ----------
  const DEFAULTS = {
    panel: {
      visible: true,
      x: 40,
      y: 40,
      w: 380,
      h: 440,
      z: 999999,
      theme: "dark", // dark|light
      opacity: 0.96,
      fontSize: 13,
      enterToSend: true,
      autoScroll: true,
      showHeader: true,
      showClear: true
    },
    limits: {
      maxMessagesPerGroup: 400,
      maxTextLength: 240,
      minSendIntervalMs: 120
    },
    identities: {
      activeId: "p1",
      map: {
        p1: { id: "p1", name: "玩家1", color: "#6aa9ff", avatar: "" }
      }
    },
    groups: {
      activeId: "main"
    }
  };

  // ---------- Data Model ----------
  // Group:
  // { id, name, avatar, createdAt, messages:[Message], meta:{lastMessageAt} }
  // Message:
  // { id:number, groupId, type:"user"|"system"|"error", text, senderId, senderName, senderColor, timestamp }
  class Store {
    constructor() {
      this.config = deepClone(DEFAULTS);
      this.groups = Object.create(null);
      this._nextMsgId = 1;

      // Hat latch
      this._eventToken = 0;
      this._lastEvent = null; // { message, group, identity }

      // Rate-limit by senderId
      this._lastSendAt = Object.create(null);

      this._ensureDefaults();
    }

    _ensureDefaults() {
      this._ensureDefaultGroup();
      this._ensureDefaultIdentity();
    }

    _ensureDefaultGroup() {
      const id = this.config.groups.activeId || "main";
      if (!this.groups[id]) {
        this.groups[id] = {
          id,
          name: "主聊群",
          avatar: "",
          createdAt: now(),
          messages: [],
          meta: { lastMessageAt: 0 }
        };
      }
      this.config.groups.activeId = id;
    }

    _ensureDefaultIdentity() {
      const map = this.config.identities.map;
      if (!map || typeof map !== "object") this.config.identities.map = Object.create(null);

      if (!this.config.identities.map.p1) {
        this.config.identities.map.p1 = { id: "p1", name: "玩家1", color: "#6aa9ff", avatar: "" };
      }
      const aid = this.config.identities.activeId;
      if (!aid || !this.config.identities.map[aid]) this.config.identities.activeId = "p1";
    }

    // ----- Identity (NO UI switching) -----
    listIdentities() {
      return Object.values(this.config.identities.map).map((i) => ({
        id: i.id,
        name: i.name,
        color: i.color,
        avatar: i.avatar || ""
      }));
    }

    hasIdentity(id) {
      return !!this.config.identities.map[String(id)];
    }

    createIdentity(id, name, color, avatar) {
      id = trim(id);
      if (!id) return { ok: false, error: "Identity id cannot be empty." };
      if (this.config.identities.map[id]) return { ok: false, error: "Identity id already exists." };

      this.config.identities.map[id] = {
        id,
        name: trim(name) || id,
        color: s(color) || "#6aa9ff",
        avatar: trim(avatar)
      };
      this.config.identities.activeId = id;
      return { ok: true };
    }

    setActiveIdentity(id) {
      id = String(id);
      if (!this.config.identities.map[id]) return { ok: false, error: "Identity not found." };
      this.config.identities.activeId = id;
      return { ok: true };
    }

    updateIdentity(id, name, color, avatar) {
      id = String(id);
      const it = this.config.identities.map[id];
      if (!it) return { ok: false, error: "Identity not found." };

      if (name != null && trim(name)) it.name = trim(name);
      if (color != null && s(color)) it.color = s(color);
      if (avatar != null) it.avatar = trim(avatar);
      return { ok: true };
    }

    deleteIdentity(id) {
      id = String(id);
      if (!this.config.identities.map[id]) return { ok: false, error: "Identity not found." };
      const keys = Object.keys(this.config.identities.map);
      if (keys.length <= 1) return { ok: false, error: "Cannot delete last identity." };

      delete this.config.identities.map[id];
      if (this.config.identities.activeId === id) {
        this.config.identities.activeId = Object.keys(this.config.identities.map)[0];
      }
      return { ok: true };
    }

    activeIdentity() {
      this._ensureDefaultIdentity();
      return this.config.identities.map[this.config.identities.activeId];
    }

    // ----- Groups (UI can switch groups) -----
    listGroups() {
      return Object.values(this.groups).map((g) => ({ id: g.id, name: g.name, avatar: g.avatar || "" }));
    }

    hasGroup(id) {
      return !!this.groups[String(id)];
    }

    createGroup(id, name, avatar) {
      id = trim(id);
      if (!id) return { ok: false, error: "Group id cannot be empty." };
      if (this.groups[id]) return { ok: false, error: "Group id already exists." };

      this.groups[id] = {
        id,
        name: trim(name) || id,
        avatar: trim(avatar),
        createdAt: now(),
        messages: [],
        meta: { lastMessageAt: 0 }
      };
      this.config.groups.activeId = id;
      return { ok: true };
    }

    setActiveGroup(id) {
      id = String(id);
      if (!this.groups[id]) return { ok: false, error: "Group not found." };
      this.config.groups.activeId = id;
      return { ok: true };
    }

    activeGroup() {
      this._ensureDefaultGroup();
      return this.groups[this.config.groups.activeId];
    }

    renameGroup(id, name) {
      id = String(id);
      const g = this.groups[id];
      if (!g) return { ok: false, error: "Group not found." };
      const nm = trim(name);
      if (!nm) return { ok: false, error: "Name cannot be empty." };
      g.name = nm;
      return { ok: true };
    }

    setGroupAvatar(id, avatar) {
      id = String(id);
      const g = this.groups[id];
      if (!g) return { ok: false, error: "Group not found." };
      g.avatar = trim(avatar);
      return { ok: true };
    }

    deleteGroup(id) {
      id = String(id);
      if (!this.groups[id]) return { ok: false, error: "Group not found." };
      const keys = Object.keys(this.groups);
      if (keys.length <= 1) return { ok: false, error: "Cannot delete last group." };
      delete this.groups[id];
      if (this.config.groups.activeId === id) this.config.groups.activeId = Object.keys(this.groups)[0];
      return { ok: true };
    }

    clearActiveGroupMessages() {
      const g = this.activeGroup();
      g.messages = [];
      g.meta.lastMessageAt = 0;
      return { ok: true };
    }

    // ----- Messaging -----
    _pushEvent(message) {
      const g = this.groups[message.groupId] || null;
      const i = this.config.identities.map[message.senderId] || null;

      this._lastEvent = {
        message: deepClone(message),
        group: g ? { id: g.id, name: g.name } : null,
        identity: i ? { id: i.id, name: i.name, color: i.color } : null
      };
      this._eventToken++;

      if (rt) rt.startHats("cj_chat_whenMessage");
    }

    appendMessage({ groupId, type, text, senderId, senderName, senderColor }) {
      const g = this.groups[String(groupId)];
      if (!g) return { ok: false, error: "Group not found." };

      text = normText(text);
      if (text.length > this.config.limits.maxTextLength) {
        return { ok: false, error: `Message too long (max ${this.config.limits.maxTextLength}).` };
      }

      const msg = {
        id: this._nextMsgId++,
        groupId: g.id,
        type: String(type), // user|system|error
        text,
        senderId: s(senderId),
        senderName: s(senderName),
        senderColor: s(senderColor),
        timestamp: now()
      };

      g.messages.push(msg);
      g.meta.lastMessageAt = msg.timestamp;

      const maxN = clamp(this.config.limits.maxMessagesPerGroup, 10, 5000);
      if (g.messages.length > maxN) g.messages.splice(0, g.messages.length - maxN);

      this._pushEvent(msg);
      return { ok: true, message: msg };
    }

    sendUser(text) {
      const ident = this.activeIdentity();
      const gid = this.config.groups.activeId;

      const t = now();
      const minInterval = clamp(this.config.limits.minSendIntervalMs, 0, 5000);
      const last = this._lastSendAt[ident.id] || 0;
      if (t - last < minInterval) return { ok: false, error: "Sending too fast." };
      this._lastSendAt[ident.id] = t;

      if (isBlank(text)) return { ok: false, error: "Blank message." };

      return this.appendMessage({
        groupId: gid,
        type: "user",
        text: normText(text),
        senderId: ident.id,
        senderName: ident.name,
        senderColor: ident.color
      });
    }

    sendAs(pid, text) {
      pid = String(pid);
      const ident = this.config.identities.map[pid];
      if (!ident) return { ok: false, error: "Identity not found." };

      const t = now();
      const minInterval = clamp(this.config.limits.minSendIntervalMs, 0, 5000);
      const last = this._lastSendAt[pid] || 0;
      if (t - last < minInterval) return { ok: false, error: "Sending too fast." };
      this._lastSendAt[pid] = t;

      if (isBlank(text)) return { ok: false, error: "Blank message." };

      return this.appendMessage({
        groupId: this.config.groups.activeId,
        type: "user",
        text: normText(text),
        senderId: ident.id,
        senderName: ident.name,
        senderColor: ident.color
      });
    }

    system(text) {
      return this.appendMessage({
        groupId: this.config.groups.activeId,
        type: "system",
        text: normText(text),
        senderId: "system",
        senderName: "系统",
        senderColor: "#999999"
      });
    }

    error(text) {
      return this.appendMessage({
        groupId: this.config.groups.activeId,
        type: "error",
        text: normText(text),
        senderId: "system",
        senderName: "错误",
        senderColor: "#ff6666"
      });
    }

    // ----- Import/Export -----
    exportJSON() {
      return JSON.stringify({
        schema: SCHEMA,
        exportedAt: now(),
        config: this.config,
        groups: this.groups
      });
    }

    importJSON(jsonText, mode) {
      const parsed = tryParse(s(jsonText));
      if (!parsed.ok) return { ok: false, error: parsed.error };

      const data = parsed.value;
      if (!data || typeof data !== "object") return { ok: false, error: "Invalid data." };
      if (data.schema !== SCHEMA) return { ok: false, error: "Schema mismatch." };
      if (!data.config || typeof data.config !== "object") return { ok: false, error: "Missing config." };
      if (!data.groups || typeof data.groups !== "object") return { ok: false, error: "Missing groups." };

      if (mode === "replace") {
        this.config = deepClone(DEFAULTS);
        this.groups = Object.create(null);
        this._nextMsgId = 1;
        this._lastSendAt = Object.create(null);
      }

      // identities
      const incomingIds = data.config.identities && data.config.identities.map;
      if (incomingIds && typeof incomingIds === "object") {
        for (const [key, it] of Object.entries(incomingIds)) {
          const id = trim((it && it.id) ? it.id : key);
          if (!id) continue;

          if (!this.config.identities.map[id]) {
            this.config.identities.map[id] = {
              id,
              name: trim(it.name) || id,
              color: s(it.color) || "#6aa9ff",
              avatar: trim(it.avatar)
            };
          } else if (mode === "merge") {
            this.updateIdentity(id, it.name, it.color, it.avatar);
          }
        }
      }

      // groups + messages
      for (const [gidKey, g] of Object.entries(data.groups)) {
        if (!g || typeof g !== "object") continue;
        const gid = trim(g.id || gidKey);
        if (!gid) continue;

        if (!this.groups[gid]) {
          this.groups[gid] = {
            id: gid,
            name: trim(g.name) || gid,
            avatar: trim(g.avatar),
            createdAt: Number(g.createdAt) || now(),
            messages: [],
            meta: { lastMessageAt: 0 }
          };
        } else if (mode === "merge") {
          this.groups[gid].name = trim(g.name) || this.groups[gid].name;
          this.groups[gid].avatar = trim(g.avatar) || this.groups[gid].avatar;
        }

        const msgs = Array.isArray(g.messages) ? g.messages : [];
        for (const m of msgs) {
          if (!m || typeof m !== "object") continue;
          const text = normText(m.text);
          if (!text) continue;

          const mid = Number(m.id);
          const finalId = Number.isFinite(mid) ? mid : this._nextMsgId++;

          this.groups[gid].messages.push({
            id: finalId,
            groupId: gid,
            type: String(m.type || "user"),
            text: text.slice(0, this.config.limits.maxTextLength),
            senderId: s(m.senderId || "p1"),
            senderName: s(m.senderName || "玩家"),
            senderColor: s(m.senderColor || "#6aa9ff"),
            timestamp: Number(m.timestamp) || now()
          });

          this._nextMsgId = Math.max(this._nextMsgId, finalId + 1);
        }

        const maxN = clamp(this.config.limits.maxMessagesPerGroup, 10, 5000);
        if (this.groups[gid].messages.length > maxN) {
          this.groups[gid].messages.splice(0, this.groups[gid].messages.length - maxN);
        }
        const last = this.groups[gid].messages[this.groups[gid].messages.length - 1];
        this.groups[gid].meta.lastMessageAt = last ? last.timestamp : 0;
      }

      if (mode === "replace") {
        if (data.config.panel) this.config.panel = data.config.panel;
        if (data.config.limits) this.config.limits = data.config.limits;
        if (data.config.groups) this.config.groups = data.config.groups;
        if (data.config.identities && data.config.identities.activeId) {
          this.config.identities.activeId = data.config.identities.activeId;
        }
      }

      this._ensureDefaults();
      return { ok: true };
    }
  }

  // ---------- UI (Floating, draggable; NO identity switching) ----------
  class PanelUI {
    constructor(store) {
      this.store = store;
      this.root = null;

      this.header = null;
      this.groupSelect = null;
      this.identityBadge = null;

      this.banner = null;
      this.list = null;
      this.input = null;
      this.sendBtn = null;
      this.clearBtn = null;

      this._drag = { active: false, dx: 0, dy: 0 };
      this._autoScrollSuspended = false;
      this._renderToken = -1;
    }

    ensure() {
      if (this.root) return;

      const root = document.createElement("div");
      root.style.position = "fixed";
      root.style.left = `${this.store.config.panel.x}px`;
      root.style.top = `${this.store.config.panel.y}px`;
      root.style.width = `${this.store.config.panel.w}px`;
      root.style.height = `${this.store.config.panel.h}px`;
      root.style.zIndex = String(this.store.config.panel.z);
      root.style.opacity = String(this.store.config.panel.opacity);
      root.style.display = this.store.config.panel.visible ? "flex" : "none";
      root.style.flexDirection = "column";
      root.style.borderRadius = "10px";
      root.style.overflow = "hidden";
      root.style.userSelect = "none";
      root.style.boxShadow = "0 10px 35px rgba(0,0,0,0.35)";
      root.style.backdropFilter = "blur(8px)";
      this.applyTheme(root);

      const header = document.createElement("div");
      header.style.display = this.store.config.panel.showHeader ? "flex" : "none";
      header.style.alignItems = "center";
      header.style.gap = "8px";
      header.style.padding = "8px 10px";
      header.style.cursor = "move";
      header.style.borderBottom = "1px solid rgba(255,255,255,0.10)";

      const title = document.createElement("div");
      title.textContent = "聊天";
      title.style.fontWeight = "600";

      const groupSelect = document.createElement("select");
      groupSelect.style.flex = "1 1 auto";
      groupSelect.style.minWidth = "0";
      groupSelect.style.fontSize = `${this.store.config.panel.fontSize}px`;
      this.styleControl(groupSelect);
      groupSelect.addEventListener("change", () => {
        this.store.setActiveGroup(groupSelect.value);
        this.renderAll();
      });

      // identity display only (NO UI switching)
      const identityBadge = document.createElement("div");
      identityBadge.style.flex = "0 0 auto";
      identityBadge.style.fontSize = `${this.store.config.panel.fontSize}px`;
      identityBadge.style.padding = "4px 8px";
      identityBadge.style.borderRadius = "999px";
      identityBadge.style.border = "1px solid rgba(255,255,255,0.12)";
      identityBadge.style.background = "rgba(0,0,0,0.18)";
      identityBadge.style.maxWidth = "160px";
      identityBadge.style.whiteSpace = "nowrap";
      identityBadge.style.overflow = "hidden";
      identityBadge.style.textOverflow = "ellipsis";

      const clearBtn = document.createElement("button");
      clearBtn.textContent = "清空";
      clearBtn.style.fontSize = `${this.store.config.panel.fontSize}px`;
      this.styleButton(clearBtn);
      clearBtn.style.display = this.store.config.panel.showClear ? "block" : "none";
      clearBtn.addEventListener("click", () => {
        this.store.clearActiveGroupMessages();
        this.store.system("已清空聊天记录");
        this.renderAll();
      });

      header.appendChild(title);
      header.appendChild(groupSelect);
      header.appendChild(identityBadge);
      header.appendChild(clearBtn);

      const banner = document.createElement("div");
      banner.style.display = "none";
      banner.style.padding = "6px 10px";
      banner.style.fontSize = `${this.store.config.panel.fontSize}px`;
      banner.style.background = "rgba(80,160,255,0.18)";
      banner.style.borderBottom = "1px solid rgba(255,255,255,0.10)";
      banner.style.cursor = "pointer";
      banner.textContent = "有新消息，点击跳到最新";
      banner.addEventListener("click", () => {
        this._autoScrollSuspended = false;
        banner.style.display = "none";
        this.scrollToBottom();
      });

      const list = document.createElement("div");
      list.style.flex = "1 1 auto";
      list.style.padding = "10px";
      list.style.overflow = "auto";
      list.style.display = "flex";
      list.style.flexDirection = "column";
      list.style.gap = "8px";
      list.style.userSelect = "text";
      list.addEventListener("scroll", () => {
        const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
        this._autoScrollSuspended = !nearBottom;
        if (!this._autoScrollSuspended) banner.style.display = "none";
      });

      const composer = document.createElement("div");
      composer.style.display = "flex";
      composer.style.gap = "8px";
      composer.style.padding = "8px 10px";
      composer.style.borderTop = "1px solid rgba(255,255,255,0.10)";

      const input = document.createElement("textarea");
      input.rows = 2;
      input.placeholder = "输入消息…";
      input.style.flex = "1 1 auto";
      input.style.resize = "none";
      input.style.fontSize = `${this.store.config.panel.fontSize}px`;
      this.styleControl(input);
      input.addEventListener("keydown", (e) => {
        if (!this.store.config.panel.enterToSend) return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.sendFromInput();
        }
      });

      const sendBtn = document.createElement("button");
      sendBtn.textContent = "发送";
      sendBtn.style.fontSize = `${this.store.config.panel.fontSize}px`;
      this.styleButton(sendBtn);
      sendBtn.addEventListener("click", () => this.sendFromInput());

      composer.appendChild(input);
      composer.appendChild(sendBtn);

      root.appendChild(header);
      root.appendChild(banner);
      root.appendChild(list);
      root.appendChild(composer);

      // drag header (ignore controls)
      header.addEventListener("pointerdown", (e) => {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
        if (tag === "select" || tag === "button" || tag === "option" || tag === "textarea") return;

        this._drag.active = true;
        const rect = root.getBoundingClientRect();
        this._drag.dx = e.clientX - rect.left;
        this._drag.dy = e.clientY - rect.top;
        header.setPointerCapture(e.pointerId);
      });
      header.addEventListener("pointermove", (e) => {
        if (!this._drag.active) return;
        const nx = clamp(e.clientX - this._drag.dx, 0, window.innerWidth - 40);
        const ny = clamp(e.clientY - this._drag.dy, 0, window.innerHeight - 40);
        root.style.left = `${nx}px`;
        root.style.top = `${ny}px`;
        this.store.config.panel.x = nx;
        this.store.config.panel.y = ny;
      });
      header.addEventListener("pointerup", (e) => {
        if (!this._drag.active) return;
        this._drag.active = false;
        try { header.releasePointerCapture(e.pointerId); } catch (_) {}
      });

      document.body.appendChild(root);

      this.root = root;
      this.header = header;
      this.groupSelect = groupSelect;
      this.identityBadge = identityBadge;
      this.banner = banner;
      this.list = list;
      this.input = input;
      this.sendBtn = sendBtn;
      this.clearBtn = clearBtn;

      this.renderAll();
    }

    styleControl(el) {
      el.style.padding = "6px 8px";
      el.style.borderRadius = "10px";
      el.style.border = "1px solid rgba(255,255,255,0.15)";
      el.style.background = "rgba(0,0,0,0.16)";
      el.style.color = "inherit";
      el.style.outline = "none";
    }

    styleButton(btn) {
      btn.style.padding = "6px 10px";
      btn.style.borderRadius = "10px";
      btn.style.border = "1px solid rgba(255,255,255,0.15)";
      btn.style.background = "rgba(0,0,0,0.20)";
      btn.style.color = "inherit";
      btn.style.cursor = "pointer";
    }

    applyTheme(root) {
      const t = this.store.config.panel.theme;
      if (t === "light") {
        root.style.background = "rgba(245,245,245,0.92)";
        root.style.color = "#111";
        root.style.border = "1px solid rgba(0,0,0,0.12)";
      } else {
        root.style.background = "rgba(20,20,24,0.88)";
        root.style.color = "#f0f0f0";
        root.style.border = "1px solid rgba(255,255,255,0.16)";
      }
    }

    setVisible(v) {
      this.ensure();
      this.root.style.display = v ? "flex" : "none";
      this.store.config.panel.visible = !!v;
    }

    scrollToBottom() {
      if (!this.list) return;
      this.list.scrollTop = this.list.scrollHeight;
    }

    renderOptions() {
      // groups
      this.groupSelect.innerHTML = "";
      for (const g of this.store.listGroups().sort((a, b) => a.id.localeCompare(b.id))) {
        const opt = document.createElement("option");
        opt.value = g.id;
        opt.textContent = g.name ? `${g.name} (${g.id})` : g.id;
        this.groupSelect.appendChild(opt);
      }
      this.groupSelect.value = this.store.config.groups.activeId;

      // identity (display-only)
      const ident = this.store.activeIdentity();
      this.identityBadge.textContent = `${ident.name} (${ident.id})`;
      this.identityBadge.style.boxShadow = `inset 0 0 0 2px ${ident.color}22`;
    }

    renderMessages() {
      const g = this.store.activeGroup();
      const fontSize = `${this.store.config.panel.fontSize}px`;

      this.list.innerHTML = "";
      for (const m of g.messages) {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.flexDirection = "column";
        row.style.gap = "2px";

        if (m.type === "system" || m.type === "error") {
          const pill = document.createElement("div");
          pill.style.alignSelf = "center";
          pill.style.padding = "4px 8px";
          pill.style.borderRadius = "999px";
          pill.style.border = "1px solid rgba(255,255,255,0.10)";
          pill.style.background = "rgba(0,0,0,0.12)";
          pill.style.fontSize = fontSize;
          pill.style.color = m.type === "error" ? "#ff7b7b" : "inherit";
          pill.textContent = m.type === "error" ? `错误：${m.text}` : m.text;
          row.appendChild(pill);
        } else {
          const head = document.createElement("div");
          head.style.display = "flex";
          head.style.alignItems = "center";
          head.style.gap = "8px";

          const dot = document.createElement("div");
          dot.style.width = "10px";
          dot.style.height = "10px";
          dot.style.borderRadius = "999px";
          dot.style.background = m.senderColor || "#6aa9ff";
          dot.style.flex = "0 0 auto";

          const name = document.createElement("div");
          name.style.fontSize = fontSize;
          name.style.opacity = "0.9";
          name.textContent = m.senderName || m.senderId || "玩家";

          const time = document.createElement("div");
          time.style.fontSize = "11px";
          time.style.opacity = "0.5";
          time.style.marginLeft = "auto";
          time.textContent = new Date(m.timestamp).toLocaleTimeString();

          head.appendChild(dot);
          head.appendChild(name);
          head.appendChild(time);

          const bubble = document.createElement("div");
          bubble.style.fontSize = fontSize;
          bubble.style.whiteSpace = "pre-wrap";
          bubble.style.wordBreak = "break-word";
          bubble.style.padding = "8px 10px";
          bubble.style.borderRadius = "12px";
          bubble.style.border = "1px solid rgba(255,255,255,0.10)";
          bubble.style.background = "rgba(0,0,0,0.12)";
          bubble.textContent = m.text;

          row.appendChild(head);
          row.appendChild(bubble);
        }

        this.list.appendChild(row);
      }
    }

    renderAll() {
      this.ensure();
      this.applyTheme(this.root);

      this.root.style.left = `${this.store.config.panel.x}px`;
      this.root.style.top = `${this.store.config.panel.y}px`;
      this.root.style.width = `${this.store.config.panel.w}px`;
      this.root.style.height = `${this.store.config.panel.h}px`;
      this.root.style.opacity = String(this.store.config.panel.opacity);

      this.header.style.display = this.store.config.panel.showHeader ? "flex" : "none";
      this.clearBtn.style.display = this.store.config.panel.showClear ? "block" : "none";

      this.renderOptions();
      this.renderMessages();

      if (this.store.config.panel.autoScroll && !this._autoScrollSuspended) this.scrollToBottom();
      this._renderToken = this.store._eventToken;
    }

    renderIncremental() {
      if (!this.root) return;
      if (this._renderToken === this.store._eventToken) return;

      const suspended = this._autoScrollSuspended;
      this.renderOptions();
      this.renderMessages();

      if (this.store.config.panel.autoScroll && !suspended) this.scrollToBottom();
      else if (suspended) this.banner.style.display = "block";

      this._renderToken = this.store._eventToken;
    }

    sendFromInput() {
      const r = this.store.sendUser(this.input.value);
      if (!r.ok) {
        if (r.error === "Blank message.") this.store.system("不能发送空消息");
        else if (r.error === "Sending too fast.") this.store.system("发送太快了");
        else if (String(r.error).startsWith("Message too long")) this.store.error(r.error);
        else this.store.error(r.error || "发送失败");
      } else {
        this.input.value = "";
      }
      this.renderIncremental();
    }
  }

  const store = new Store();
  const ui = new PanelUI(store);

  // ---------- Blocks ----------
  // Cloud placeholders: exist now, do nothing (so later you can "获取积木" and wire transport)
  const cloudBlocks = [
    "---",
    { blockType: Scratch.BlockType.LABEL, text: "☁ 云功能(后期) 占位" },
    {
      opcode: "cloudConnect",
      blockType: Scratch.BlockType.COMMAND,
      text: "云连接 服务器[URL] 房间[ROOM]",
      arguments: {
        URL: { type: Scratch.ArgumentType.STRING, defaultValue: "wss://example.com" },
        ROOM: { type: Scratch.ArgumentType.STRING, defaultValue: "room1" }
      }
    },
    { opcode: "cloudDisconnect", blockType: Scratch.BlockType.COMMAND, text: "云断开连接" },
    { opcode: "cloudStatus", blockType: Scratch.BlockType.REPORTER, text: "云连接状态" }
  ];

  class ChatExt {
    getInfo() {
      return {
        id: extensionId,
        name: "多人聊天(无云)",
        color1: "#00aeff",
        color2: "#00aeff",
        menuIconURI: exticon,
        blocks: [
          // Panel
          { opcode: "showPanel", blockType: Scratch.BlockType.COMMAND, text: "显示聊天面板" },
          { opcode: "hidePanel", blockType: Scratch.BlockType.COMMAND, text: "隐藏聊天面板" },
          { opcode: "panelVisible", blockType: Scratch.BlockType.BOOLEAN, text: "聊天面板可见？" },

          // Groups
          {
            opcode: "createGroup",
            blockType: Scratch.BlockType.COMMAND,
            text: "创建聊群 id:[ID] 名称:[NAME] 头像:[AVATAR]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "group1" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "聊群1" },
              AVATAR: { type: Scratch.ArgumentType.STRING, defaultValue: "" }
            }
          },
          {
            opcode: "switchGroup",
            blockType: Scratch.BlockType.COMMAND,
            text: "切换聊群 id:[ID]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "main" }
            }
          },
          { opcode: "activeGroupId", blockType: Scratch.BlockType.REPORTER, text: "当前聊群id" },

          // Players/Identities (NO UI switching)
          {
            opcode: "createPlayer",
            blockType: Scratch.BlockType.COMMAND,
            text: "创建玩家 id:[ID] 名称:[NAME] 颜色:[COLOR] 头像:[AVATAR]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "p2" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "玩家2" },
              COLOR: { type: Scratch.ArgumentType.COLOR, defaultValue: "#f59e0b" },
              AVATAR: { type: Scratch.ArgumentType.STRING, defaultValue: "" }
            }
          },
          {
            opcode: "switchPlayer",
            blockType: Scratch.BlockType.COMMAND,
            text: "切换当前玩家 id:[ID]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "p1" }
            }
          },
          { opcode: "activePlayerId", blockType: Scratch.BlockType.REPORTER, text: "当前玩家id" },

          // Messages
          {
            opcode: "sendMsg",
            blockType: Scratch.BlockType.COMMAND,
            text: "发送消息 [TEXT]",
            arguments: { TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "你好" } }
          },
          {
            opcode: "sendAs",
            blockType: Scratch.BlockType.COMMAND,
            text: "以玩家[PID]发送消息 [TEXT]",
            arguments: {
              PID: { type: Scratch.ArgumentType.STRING, defaultValue: "p2" },
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "我是玩家2" }
            }
          },
          {
            opcode: "systemMsg",
            blockType: Scratch.BlockType.COMMAND,
            text: "发送系统提示 [TEXT]",
            arguments: { TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "提示" } }
          },

          // Import/Export
          { opcode: "exportAll", blockType: Scratch.BlockType.REPORTER, text: "导出全部(JSON)" },
          {
            opcode: "importReplace",
            blockType: Scratch.BlockType.COMMAND,
            text: "导入(JSON)并替换 [JSON]",
            arguments: { JSON: { type: Scratch.ArgumentType.STRING, defaultValue: "" } }
          },
          {
            opcode: "importMerge",
            blockType: Scratch.BlockType.COMMAND,
            text: "导入(JSON)并合并 [JSON]",
            arguments: { JSON: { type: Scratch.ArgumentType.STRING, defaultValue: "" } }
          },

          // Event
          { opcode: "whenMessage", blockType: Scratch.BlockType.HAT, text: "当收到消息", isEdgeActivated: false },
          { opcode: "eventText", blockType: Scratch.BlockType.REPORTER, text: "收到的消息文本" },
          { opcode: "eventSenderId", blockType: Scratch.BlockType.REPORTER, text: "收到的消息发送者id" },
          { opcode: "eventSenderName", blockType: Scratch.BlockType.REPORTER, text: "收到的消息发送者名称" },
          { opcode: "eventGroupId", blockType: Scratch.BlockType.REPORTER, text: "收到的消息聊群id" },

          ...cloudBlocks
        ]
      };
    }

    // Panel
    showPanel() { ui.setVisible(true); }
    hidePanel() { ui.setVisible(false); }
    panelVisible() { return !!store.config.panel.visible; }

    // Groups
    createGroup(args) {
      ui.ensure();
      const r = store.createGroup(args.ID, args.NAME, args.AVATAR);
      if (!r.ok) store.error(r.error);
      ui.renderAll();
    }
    switchGroup(args) {
      ui.ensure();
      const r = store.setActiveGroup(args.ID);
      if (!r.ok) store.error(r.error);
      ui.renderAll();
    }
    activeGroupId() { return store.config.groups.activeId; }

    // Players
    createPlayer(args) {
      ui.ensure();
      const r = store.createIdentity(args.ID, args.NAME, args.COLOR, args.AVATAR);
      if (!r.ok) store.error(r.error);
      ui.renderAll();
    }
    switchPlayer(args) {
      ui.ensure();
      const r = store.setActiveIdentity(args.ID);
      if (!r.ok) store.error(r.error);
      ui.renderAll();
    }
    activePlayerId() { return store.config.identities.activeId; }

    // Messages
    sendMsg(args) { ui.ensure(); store.sendUser(args.TEXT); ui.renderIncremental(); }
    sendAs(args) { ui.ensure(); const r = store.sendAs(args.PID, args.TEXT); if (!r.ok) store.error(r.error); ui.renderIncremental(); }
    systemMsg(args) { ui.ensure(); store.system(args.TEXT); ui.renderIncremental(); }

    // Import/Export
    exportAll() { return store.exportJSON(); }
    importReplace(args) {
      ui.ensure();
      const r = store.importJSON(args.JSON, "replace");
      if (!r.ok) store.error(`导入失败：${r.error}`);
      else store.system("已导入(替换)");
      ui.renderAll();
    }
    importMerge(args) {
      ui.ensure();
      const r = store.importJSON(args.JSON, "merge");
      if (!r.ok) store.error(`导入失败：${r.error}`);
      else store.system("已导入(合并)");
      ui.renderAll();
    }

    // Event hat (latch by token)
    whenMessage() {
      if (!this._seen) this._seen = 0;
      if (store._eventToken !== this._seen) {
        this._seen = store._eventToken;
        return true;
      }
      return false;
    }
    eventText() { return store._lastEvent && store._lastEvent.message ? store._lastEvent.message.text : ""; }
    eventSenderId() { return store._lastEvent && store._lastEvent.message ? store._lastEvent.message.senderId : ""; }
    eventSenderName() { return store._lastEvent && store._lastEvent.message ? store._lastEvent.message.senderName : ""; }
    eventGroupId() { return store._lastEvent && store._lastEvent.message ? store._lastEvent.message.groupId : ""; }

    // Cloud placeholders
    cloudConnect() { /* TODO later: wire transport */ }
    cloudDisconnect() { /* TODO later: wire transport */ }
    cloudStatus() { return "offline"; }
  }

  Scratch.extensions.register(new ChatExt());
})();
