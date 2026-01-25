// Hiku-4.5 API TurboWarp Extension
// API: https://yunzhiapi.cn/API/hiku-4.5/index.php?question=...
(function (Scratch) {
  "use strict";

  const API_URL = "https://yunzhiapi.cn/API/hiku-4.5/index.php";

  class Hiku45Extension {
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
        id: "hiku45api",
        name: "Hiku-4.5 API",
        color1: "#8854D0",
        color2: "#6F3DC2",
        blocks: [
          {
            opcode: "ask",
            blockType: Scratch.BlockType.REPORTER,
            text: "问 Hiku4.5 [QUESTION] UID [UID] 系统 [SYSTEM] 返回[type]",
            arguments: {
              QUESTION: { type: Scratch.ArgumentType.STRING, defaultValue: "你好" },
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
      if (uidIn) params.set("uid", uidIn); // 文档说 6 位数字，这里不强制，交给接口校验
      if (system) params.set("system", system);
      if (type) params.set("type", type); // text/json

      const url = `${API_URL}?${params.toString()}`;

      let httpStatus = 0;
      let text = "";
      try {
        const res = await fetch(url, { method: "GET" });
        httpStatus = res.status;
        text = await res.text();
      } catch (e) {
        this._last = { raw: "", content: "", uid: "", conversation_count: "" };
        return "请求失败: " + (e && e.message ? e.message : String(e));
      }

      // 记录原始返回
      this._last.raw = text;

      // 按文档状态码给出更清晰的信息（即使接口返回了 body）
      if (httpStatus !== 200) {
        // 202: 正在处理；403: 繁忙；500: 超时
        const msg =
          httpStatus === 202 ? "正在处理(202)" :
          httpStatus === 403 ? "处理繁忙(403)" :
          httpStatus === 500 ? "连接超时(500)" :
          `HTTP ${httpStatus}`;
        // 有 body 就拼上，方便排查
        return text ? `${msg}: ${text}` : msg;
      }

      // 尝试 JSON 解析（不管 type 是否 text，因为有些接口即便 text 也可能返回 JSON）
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (_) {
        // 非 JSON：当作纯文本
        this._last.content = text;
        this._last.uid = uidIn || "";
        this._last.conversation_count = "";
        return text;
      }

      // JSON 模式：按字段读取
      if (data && typeof data === "object") {
        const success = String(data.success ?? "");
        const content = (data.content != null) ? String(data.content) : "";
        const uid = (data.uid != null) ? String(data.uid) : "";
        const count = (data.conversation_count != null) ? String(data.conversation_count) : "";

        this._last.content = content;
        this._last.uid = uid || uidIn || "";
        this._last.conversation_count = count;

        // success=erro 也把 content 返回（通常里面会有错误原因）
        if (type.toLowerCase() === "json") {
          return JSON.stringify(data);
        }
        return content || (success && success !== "true" ? ("请求失败: " + success) : "");
      }

      // 兜底
      this._last.content = text;
      this._last.uid = uidIn || "";
      this._last.conversation_count = "";
      return text;
    }
  }

  Scratch.extensions.register(new Hiku45Extension());
})(Scratch);
