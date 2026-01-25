// TWHHSC (yunzhiapi.cn) TurboWarp extension
// API: https://yunzhiapi.cn/API/twhhsc.php
// Params: msg(required), size, guidance(1-10), batch(1-4), type(json/text)

(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("This extension must be loaded as an Unsandboxed extension.");
  }

  const API_URL = "https://yunzhiapi.cn/API/twhhsc.php";

  const SIZE_ITEMS = [
    "256x256",
    "512x512",
    "768x768",
    "1024x1024",
    "1536x1536"
  ];

  class TwhhscYunzhi {
    getInfo() {
      return {
        id: "twhhscYunzhi",
        name: "AI绘画(云智API)",
        color1: "#0B6B6B",
        color2: "#084D4D",
        blocks: [
          {
            opcode: "drawJsonPost",
            blockType: Scratch.BlockType.REPORTER,
            text: "绘画(POST) 提示词 [MSG] 尺寸 [SIZE] 引导 [GUIDANCE] 数量 [BATCH] 返回 [TYPE]",
            arguments: {
              MSG: { type: Scratch.ArgumentType.STRING, defaultValue: "一只戴着宇航员头盔的橘猫，赛博朋克风，霓虹灯，高清" },
              SIZE: { type: Scratch.ArgumentType.STRING, menu: "sizeMenu", defaultValue: "1024x1024" },
              GUIDANCE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 7.5 },
              BATCH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "typeMenu", defaultValue: "json" }
            }
          },
          {
            opcode: "drawJsonGet",
            blockType: Scratch.BlockType.REPORTER,
            text: "绘画(GET) 提示词 [MSG] 尺寸 [SIZE] 引导 [GUIDANCE] 数量 [BATCH] 返回 [TYPE]",
            arguments: {
              MSG: { type: Scratch.ArgumentType.STRING, defaultValue: "森林里的小木屋，晨雾，柔和光照，插画风" },
              SIZE: { type: Scratch.ArgumentType.STRING, menu: "sizeMenu", defaultValue: "1024x1024" },
              GUIDANCE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 7.5 },
              BATCH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "typeMenu", defaultValue: "json" }
            }
          },
          {
            opcode: "getImageUrlFromJson",
            blockType: Scratch.BlockType.REPORTER,
            text: "从JSON取图像链接 [JSON_TEXT] (第 [INDEX] 张)",
            arguments: {
              JSON_TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            }
          },
          {
            opcode: "drawAndGetImageUrl",
            blockType: Scratch.BlockType.REPORTER,
            text: "绘画并取图像链接 提示词 [MSG] 尺寸 [SIZE] 引导 [GUIDANCE] 数量 [BATCH] method [METHOD] (第 [INDEX] 张)",
            arguments: {
              MSG: { type: Scratch.ArgumentType.STRING, defaultValue: "二次元女孩，春天樱花，清新色调，精致细节" },
              SIZE: { type: Scratch.ArgumentType.STRING, menu: "sizeMenu", defaultValue: "1024x1024" },
              GUIDANCE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 7.5 },
              BATCH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              METHOD: { type: Scratch.ArgumentType.STRING, menu: "methodMenu", defaultValue: "POST" },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            }
          }
        ],
        menus: {
          sizeMenu: { acceptReporters: true, items: SIZE_ITEMS },
          typeMenu: {
            acceptReporters: true,
            items: [
              { text: "json", value: "json" },
              { text: "text", value: "text" }
            ]
          },
          methodMenu: { acceptReporters: true, items: ["POST", "GET"] }
        }
      };
    }

    async drawJsonPost(args) {
      return await this._request({
        method: "POST",
        msg: String(args.MSG ?? ""),
        size: String(args.SIZE ?? "1024x1024"),
        guidance: Number(args.GUIDANCE ?? 7.5),
        batch: Number(args.BATCH ?? 1),
        type: String(args.TYPE ?? "json")
      });
    }

    async drawJsonGet(args) {
      return await this._request({
        method: "GET",
        msg: String(args.MSG ?? ""),
        size: String(args.SIZE ?? "1024x1024"),
        guidance: Number(args.GUIDANCE ?? 7.5),
        batch: Number(args.BATCH ?? 1),
        type: String(args.TYPE ?? "json")
      });
    }

    getImageUrlFromJson(args) {
      const jsonText = String(args.JSON_TEXT ?? "");
      const index = Math.max(1, Math.floor(Number(args.INDEX ?? 1)));

      if (!jsonText.trim()) return "";

      let obj;
      try {
        obj = JSON.parse(jsonText);
      } catch (e) {
        return "";
      }

      // Common shapes:
      // 1) { id:0, image_url:"..." }
      // 2) { id:0, image_url:["...","..."] }
      // 3) { id:0, data:[{image_url:"..."}] } (just in case)
      const url = this._extractImageUrl(obj, index);
      return url || "";
    }

    async drawAndGetImageUrl(args) {
      const method = String(args.METHOD ?? "POST").toUpperCase();
      const jsonText = await this._request({
        method,
        msg: String(args.MSG ?? ""),
        size: String(args.SIZE ?? "1024x1024"),
        guidance: Number(args.GUIDANCE ?? 7.5),
        batch: Number(args.BATCH ?? 1),
        type: "json"
      });

      return this.getImageUrlFromJson({
        JSON_TEXT: jsonText,
        INDEX: args.INDEX
      });
    }

    _extractImageUrl(obj, index) {
      if (!obj || typeof obj !== "object") return "";

      // Direct string
      if (typeof obj.image_url === "string") return obj.image_url;

      // Array
      if (Array.isArray(obj.image_url)) {
        return obj.image_url[index - 1] || "";
      }

      // Nested list fallback
      if (Array.isArray(obj.data)) {
        const item = obj.data[index - 1];
        if (item && typeof item.image_url === "string") return item.image_url;
      }

      return "";
    }

    async _request({ method, msg, size, guidance, batch, type }) {
      if (!msg || !msg.trim()) return "";

      // Clamp to documented ranges
      const safeSize = SIZE_ITEMS.includes(size) ? size : "1024x1024";
      const safeGuidance = Math.min(10, Math.max(1, Number.isFinite(guidance) ? guidance : 7.5));
      const safeBatch = Math.min(4, Math.max(1, Math.floor(Number.isFinite(batch) ? batch : 1)));
      const safeType = (type === "text" || type === "json") ? type : "json";

      const params = new URLSearchParams();
      params.set("msg", msg);
      params.set("size", safeSize);
      params.set("guidance", String(safeGuidance));
      params.set("batch", String(safeBatch));
      params.set("type", safeType);

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

        // 接口说 200 默认成功；也可能给 500/404/503/414 等
        if (!res.ok) return `请求失败: HTTP ${res.status}`;

        return (await res.text()) ?? "";
      } catch (e) {
        return `请求异常: ${e && e.message ? e.message : String(e)}`;
      }
    }
  }

  Scratch.extensions.register(new TwhhscYunzhi());
})(Scratch);
