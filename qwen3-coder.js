// Qwen3-Coder API TurboWarp Extension
// API: https://yunzhiapi.cn/API/qwen3-coder/index.php
(function (Scratch) {
  "use strict";

  const API_URL = "https://yunzhiapi.cn/API/qwen3-coder/index.php";

  class Qwen3CoderExtension {
    constructor() {
      this._last = {
        raw: "",
        content: "",
        uid: "",
        conversation_count: ""
      };
    }

    getInfo() {
      return {
        id: "qwen3coderapi",
        name: "Qwen3 Coder API",
        color1: "#2D98DA",
        color2: "#2277AA",
        blocks: [
          {
            opcode: "ask",
            blockType: Scratch.BlockType.REPORTER,
            text: "问 Qwen3-Coder [QUESTION] UID [UID] 系统 [SYSTEM] 返回[type]",
            arguments: {
              QUESTION: { type: Scratch.ArgumentType.STRING, defaultValue: "用Python写一个快速排序" },
              UID: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
              SYSTEM: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
              type: { type: Scratch.ArgumentType.STRING, defaultValue: "text" } // text/json
            }
          },
          {
            opcode: "lastContent",
            blockType: Scratch.BlockType.REPORTER,
            text: "上次回复内容"
          },
          {
            opcode: "lastUid",
            blockType: Scratch.BlockType.REPORTER,
            text: "上次UID"
          },
          {
            opcode: "lastCount",
            blockType: Scratch.BlockType.REPORTER,
            text: "上次对话次数"
          },
          {
            opcode: "lastRaw",
            blockType: Scratch.BlockType.REPORTER,
            text: "上次原始返回"
          }
        ]
      };
    }

    lastContent() {
      return this._last.content || "";
    }
    lastUid() {
      return this._last.uid || "";
    }
    lastCount() {
      return this._last.conversation_count || "";
    }
    lastRaw() {
      return this._last.raw || "";
    }

    async ask(args) {
      const question = String(args.QUESTION ?? "").trim();
      const uidIn = String(args.UID ?? "").trim();
      const system = String(args.SYSTEM ?? "").trim();
      const type = String(args.type ?? "text").trim() || "text";

      if (!question) return "question 不能为空";

      const params = new URLSearchParams();
      params.set("question", question);
      if (uidIn) params.set("uid", uidIn);
      if (system) params.set("system", system);
      if (type) params.set("type", type);

      const url = `${API_URL}?${params.toString()}`;

      let status = 0;
      let text = "";
      try {
        const res = await fetch(url, { method: "GET" });
        status = res.status;
        text = await res.text();
      } catch (e) {
        this._last = { raw: "", content: "", uid: "", conversation_count: "" };
        return "请求失败: " + (e && e.message ? e.message : String(e));
      }

      this._last.raw = text;

      if (status !== 200) {
        const msg =
          status === 202 ? "正在处理(202)" :
          status === 403 ? "处理繁忙(403)" :
          status === 500 ? "连接超时(500)" :
          `HTTP ${status}`;
        return text ? `${msg}: ${text}` : msg;
      }

      // 尝试 JSON 解析；解析失败则按纯文本返回
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (_) {
        this._last.content = text;
        this._last.uid = uidIn || "";
        this._last.conversation_count = "";
        return text;
      }

      if (data && typeof data === "object") {
        const success = String(data.success ?? "");
        const content = (data.content != null) ? String(data.content) : "";
        const uid = (data.uid != null) ? String(data.uid) : "";
        const count = (data.conversation_count != null) ? String(data.conversation_count) : "";

        this._last.content = content;
        this._last.uid = uid || uidIn || "";
        this._last.conversation_count = count;

        // type=json 时返回完整 JSON；否则返回 content
        if (type.toLowerCase() === "json") return JSON.stringify(data);

        // success=erro 时也尽量把 content 返回（通常是错误原因）
        if (success && success !== "true" && !content) return "请求失败: " + success;
        return content;
      }

      // 兜底
      this._last.content = text;
      this._last.uid = uidIn || "";
      this._last.conversation_count = "";
      return text;
    }
  }

  Scratch.extensions.register(new Qwen3CoderExtension());
})(Scratch);
