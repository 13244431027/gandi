// Qwen3VL API TurboWarp Extension
// API: https://yunzhiapi.cn/API/qwen3vl.php?question=...&image=...&video=...&type=...
(function (Scratch) {
  "use strict";

  const API_URL = "https://yunzhiapi.cn/API/qwen3vl.php";

  class Qwen3VLExtension {
    getInfo() {
      return {
        id: "qwen3vlapi",
        name: "Qwen3VL API",
        color1: "#20BF6B",
        color2: "#26DE81",
        blocks: [
          {
            opcode: "askVL",
            blockType: Scratch.BlockType.REPORTER,
            text: "问 Qwen3VL [QUESTION] 图片URL [IMAGE] 视频URL [VIDEO] 返回[type]",
            arguments: {
              QUESTION: { type: Scratch.ArgumentType.STRING, defaultValue: "图里是什么？" },
              IMAGE: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
              VIDEO: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
              type: { type: Scratch.ArgumentType.STRING, defaultValue: "text" }
            }
          },
          {
            opcode: "askImage",
            blockType: Scratch.BlockType.REPORTER,
            text: "问 Qwen3VL(图片) [QUESTION] 图片URL [IMAGE]",
            arguments: {
              QUESTION: { type: Scratch.ArgumentType.STRING, defaultValue: "描述这张图片" },
              IMAGE: { type: Scratch.ArgumentType.STRING, defaultValue: "https://example.com/a.jpg" }
            }
          },
          {
            opcode: "askVideo",
            blockType: Scratch.BlockType.REPORTER,
            text: "问 Qwen3VL(视频) [QUESTION] 视频URL [VIDEO]",
            arguments: {
              QUESTION: { type: Scratch.ArgumentType.STRING, defaultValue: "总结这个视频内容" },
              VIDEO: { type: Scratch.ArgumentType.STRING, defaultValue: "https://example.com/a.mp4" }
            }
          },
          {
            opcode: "askRaw",
            blockType: Scratch.BlockType.REPORTER,
            text: "Qwen3VL 原始返回 [QUESTION] 图片 [IMAGE] 视频 [VIDEO]",
            arguments: {
              QUESTION: { type: Scratch.ArgumentType.STRING, defaultValue: "你好" },
              IMAGE: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
              VIDEO: { type: Scratch.ArgumentType.STRING, defaultValue: "" }
            }
          }
        ]
      };
    }

    async askVL(args) {
      const question = String(args.QUESTION ?? "").trim();
      const image = String(args.IMAGE ?? "").trim();
      const video = String(args.VIDEO ?? "").trim();
      const type = String(args.type ?? "text").trim() || "text";

      if (!question) return "question 不能为空";
      if (!image && !video) {
        // 允许纯文本提问也可以，但你的接口主要是 VL；给个提示
        // 如果你希望强制必须传 image/video，把这行改成 return "image/video 至少填一个";
      }

      const params = new URLSearchParams();
      params.set("question", question);
      if (image) params.set("image", image);
      if (video) params.set("video", video);
      if (type) params.set("type", type);

      const url = `${API_URL}?${params.toString()}`;

      let text;
      try {
        const res = await fetch(url, { method: "GET" });

        // 文档里说：200/400/502
        if (res.status !== 200) {
          const body = await res.text().catch(() => "");
          return `接口返回 HTTP ${res.status}${body ? "：" + body : ""}`;
        }

        text = await res.text();
      } catch (e) {
        return "请求失败: " + (e && e.message ? e.message : String(e));
      }

      // 如果用户选择 json，就尽量解析并“更干净”地输出
      if (type.toLowerCase() === "json") {
        try {
          const data = JSON.parse(text);
          // 接口文档未给字段，这里直接 stringify 方便在积木里查看/再解析
          return JSON.stringify(data);
        } catch (_) {
          // 如果接口实际返回的不是 JSON，就原样返回
          return text;
        }
      }

      // 默认 text
      return text;
    }

    async askImage(args) {
      return this.askVL({ QUESTION: args.QUESTION, IMAGE: args.IMAGE, VIDEO: "", type: "text" });
    }

    async askVideo(args) {
      return this.askVL({ QUESTION: args.QUESTION, IMAGE: "", VIDEO: args.VIDEO, type: "text" });
    }

    async askRaw(args) {
      const question = String(args.QUESTION ?? "").trim();
      const image = String(args.IMAGE ?? "").trim();
      const video = String(args.VIDEO ?? "").trim();

      if (!question) return "question 不能为空";

      const params = new URLSearchParams();
      params.set("question", question);
      if (image) params.set("image", image);
      if (video) params.set("video", video);

      const url = `${API_URL}?${params.toString()}`;

      try {
        const res = await fetch(url, { method: "GET" });
        return await res.text();
      } catch (e) {
        return "请求失败: " + (e && e.message ? e.message : String(e));
      }
    }
  }

  Scratch.extensions.register(new Qwen3VLExtension());
})(Scratch);
