// xsyyhc.php TTS TurboWarp Extension (MP3)
// API: https://yunzhiapi.cn/API/xsyyhc.php?msg=...&speed=...
(function (Scratch) {
  "use strict";

  const API_URL = "https://yunzhiapi.cn/API/xsyyhc.php";

  class XsyyhcTTSExtension {
    constructor() {
      this._audio = null;   // reuse one <audio> to avoid overlap issues
      this._lastUrl = "";
      this._lastError = "";
    }

    getInfo() {
      return {
        id: "xsyyhcTTS",
        name: "语音合成(MP3)",
        color1: "#EB3B5A",
        color2: "#C92A43",
        blocks: [
          {
            opcode: "makeUrl",
            blockType: Scratch.BlockType.REPORTER,
            text: "生成语音链接 文本[msg] 速度[speed]",
            arguments: {
              msg: { type: Scratch.ArgumentType.STRING, defaultValue: "你好，我是语音合成" },
              speed: { type: Scratch.ArgumentType.STRING, defaultValue: "7" }
            }
          },
          {
            opcode: "play",
            blockType: Scratch.BlockType.COMMAND,
            text: "播放语音 文本[msg] 速度[speed]",
            arguments: {
              msg: { type: Scratch.ArgumentType.STRING, defaultValue: "你好" },
              speed: { type: Scratch.ArgumentType.STRING, defaultValue: "7" }
            }
          },
          {
            opcode: "stop",
            blockType: Scratch.BlockType.COMMAND,
            text: "停止播放"
          },
          {
            opcode: "lastUrl",
            blockType: Scratch.BlockType.REPORTER,
            text: "上次语音链接"
          },
          {
            opcode: "lastError",
            blockType: Scratch.BlockType.REPORTER,
            text: "上次错误"
          }
        ]
      };
    }

    makeUrl(args) {
      const msg = String(args.msg ?? "").trim();
      let speed = String(args.speed ?? "").trim();

      if (!msg) {
        this._lastError = "msg 不能为空";
        return "";
      }

      // speed 可选，限制在 1..7；不合法就默认 7
      const n = Number(speed);
      if (!Number.isFinite(n) || n < 1 || n > 7) speed = "7";

      const params = new URLSearchParams();
      params.set("msg", msg);
      params.set("speed", speed);

      const url = `${API_URL}?${params.toString()}`;
      this._lastUrl = url;
      this._lastError = "";
      return url;
    }

    async play(args) {
      const url = this.makeUrl(args);
      if (!url) return;

      try {
        if (!this._audio) this._audio = new Audio();
        // 停掉上一次，避免叠音
        this._audio.pause();
        this._audio.currentTime = 0;

        this._audio.src = url;
        // 某些浏览器需要用户交互后才能播放；TurboWarp 一般由点击/按键触发没问题
        await this._audio.play();
        this._lastError = "";
      } catch (e) {
        this._lastError = "播放失败: " + (e && e.message ? e.message : String(e));
      }
    }

    stop() {
      try {
        if (this._audio) {
          this._audio.pause();
          this._audio.currentTime = 0;
        }
      } catch (_) {}
    }

    lastUrl() {
      return this._lastUrl || "";
    }

    lastError() {
      return this._lastError || "";
    }
  }

  Scratch.extensions.register(new XsyyhcTTSExtension());
})(Scratch);
