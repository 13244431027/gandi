// Qwen3 API TurboWarp Extension
// API: https://yunzhiapi.cn/API/qwen3.php?question=...
(function (Scratch) {
  "use strict";

  const API_URL = "https://yunzhiapi.cn/API/qwen3.php";

  class Qwen3Extension {
    getInfo() {
      return {
        id: "qwen3api",
        name: "Qwen3 API",
        color1: "#4B7BEC",
        color2: "#3867D6",
        blocks: [
          {
            opcode: "ask",
            blockType: Scratch.BlockType.REPORTER,
            text: "问 Qwen3 [QUESTION] 系统提示词 [SYSTEM] 深度思考 [THINK]",
            arguments: {
              QUESTION: { type: Scratch.ArgumentType.STRING, defaultValue: "你好" },
              SYSTEM: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
              THINK: { type: Scratch.ArgumentType.STRING, defaultValue: "no" }
            }
          },
          {
            opcode: "askRaw",
            blockType: Scratch.BlockType.REPORTER,
            text: "问 Qwen3(原始返回) [QUESTION]",
            arguments: {
              QUESTION: { type: Scratch.ArgumentType.STRING, defaultValue: "你好" }
            }
          }
        ]
      };
    }

    // TurboWarp 支持 async reporter（返回 Promise）
    async ask(args) {
      const question = String(args.QUESTION ?? "").trim();
      const system = String(args.SYSTEM ?? "").trim();
      const think = String(args.THINK ?? "").trim() || "no";

      if (!question) return "question 不能为空";

      // 用 URLSearchParams 生成 query
      const params = new URLSearchParams();
      params.set("question", question);
      if (system) params.set("system", system);
      if (think) params.set("think", think);

      const url = `${API_URL}?${params.toString()}`;

      let text;
      try {
        const res = await fetch(url, { method: "GET" });
        text = await res.text();
      } catch (e) {
        return "请求失败: " + (e && e.message ? e.message : String(e));
      }

      // 尝试按 JSON 解析；失败则直接返回文本
      try {
        const data = JSON.parse(text);

        // 兼容你文档里的字段：status/http_code/content
        if (data && typeof data === "object") {
          if (data.http_code && String(data.http_code) !== "200") {
            return "接口错误 http_code=" + data.http_code + (data.status ? (" status=" + data.status) : "");
          }
          if (typeof data.content === "string") return data.content;
          // 有些接口 content 可能不是 string，兜底 stringify
          if (data.content != null) return JSON.stringify(data.content);
        }
        return text;
      } catch (_) {
        return text;
      }
    }

    async askRaw(args) {
      const question = String(args.QUESTION ?? "").trim();
      if (!question) return "question 不能为空";

      const params = new URLSearchParams();
      params.set("question", question);

      const url = `${API_URL}?${params.toString()}`;

      try {
        const res = await fetch(url, { method: "GET" });
        return await res.text();
      } catch (e) {
        return "请求失败: " + (e && e.message ? e.message : String(e));
      }
    }
  }

  Scratch.extensions.register(new Qwen3Extension());
})(Scratch);
