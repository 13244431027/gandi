// GLM-4.6 (yunzhiapi.cn) TurboWarp extension
// API: https://yunzhiapi.cn/API/glm4.6.php
// Params: question (required), type (optional: text/json; true for stream), system (optional)

(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("This extension must be loaded as an Unsandboxed extension.");
  }

  const API_URL = "https://yunzhiapi.cn/API/glm4.6.php";

  class GLM46Yunzhi {
    getInfo() {
      return {
        id: "glm46Yunzhi",
        name: "GLM-4.6(云智API)",
        color1: "#3B2A7A",
        color2: "#2A1E57",
        blocks: [
          {
            opcode: "askPostText",
            blockType: Scratch.BlockType.REPORTER,
            text: "GLM-4.6 问答(POST) 问题 [QUESTION] 系统提示 [SYSTEM]",
            arguments: {
              QUESTION: { type: Scratch.ArgumentType.STRING, defaultValue: "你好，介绍一下你自己" },
              SYSTEM: { type: Scratch.ArgumentType.STRING, defaultValue: "" }
            }
          },
          {
            opcode: "askGetText",
            blockType: Scratch.BlockType.REPORTER,
            text: "GLM-4.6 问答(GET) 问题 [QUESTION] 系统提示 [SYSTEM]",
            arguments: {
              QUESTION: { type: Scratch.ArgumentType.STRING, defaultValue: "写一首古风短诗" },
              SYSTEM: { type: Scratch.ArgumentType.STRING, defaultValue: "" }
            }
          },
          {
            opcode: "askCustom",
            blockType: Scratch.BlockType.REPORTER,
            text: "GLM-4.6 自定义请求 method [METHOD] question [QUESTION] system [SYSTEM] type [TYPE]",
            arguments: {
              METHOD: { type: Scratch.ArgumentType.STRING, menu: "methodMenu", defaultValue: "POST" },
              QUESTION: { type: Scratch.ArgumentType.STRING, defaultValue: "给我一个学习计划" },
              SYSTEM: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "typeMenu", defaultValue: "text" }
            }
          }
        ],
        menus: {
          methodMenu: {
            acceptReporters: true,
            items: ["POST", "GET"]
          },
          typeMenu: {
            acceptReporters: true,
            items: [
              { text: "text", value: "text" },
              { text: "json", value: "json" }
              // 备注：接口说明里“填true为流式输出”
              // TurboWarp 扩展要做真正流式逐字显示需要额外机制（事件/轮询/缓存）。
            ]
          }
        }
      };
    }

    async askPostText(args) {
      return await this._request({
        method: "POST",
        question: String(args.QUESTION ?? ""),
        system: String(args.SYSTEM ?? ""),
        type: "text"
      });
    }

    async askGetText(args) {
      return await this._request({
        method: "GET",
        question: String(args.QUESTION ?? ""),
        system: String(args.SYSTEM ?? ""),
        type: "text"
      });
    }

    async askCustom(args) {
      return await this._request({
        method: String(args.METHOD ?? "POST").toUpperCase(),
        question: String(args.QUESTION ?? ""),
        system: String(args.SYSTEM ?? ""),
        type: String(args.TYPE ?? "text")
      });
    }

    async _request({ method, question, system, type }) {
      if (!question || !question.trim()) return "";

      const params = new URLSearchParams();
      params.set("question", question);

      if (type && type !== "text") params.set("type", type);
      if (system && system.trim()) params.set("system", system);

      try {
        let res;
        if (method === "GET") {
          const url = `${API_URL}?${params.toString()}`;
          res = await fetch(url, { method: "GET" });
        } else {
          res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: params.toString()
          });
        }

        if (!res.ok) return `请求失败: HTTP ${res.status}`;

        // 接口返回格式：TEXT
        const text = await res.text();
        return text ?? "";
      } catch (e) {
        return `请求异常: ${e && e.message ? e.message : String(e)}`;
      }
    }
  }

  Scratch.extensions.register(new GLM46Yunzhi());
})(Scratch);
