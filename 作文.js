// rsxzzs.js - TurboWarp extension for https://yunzhiapi.cn/API/rsxzzs.php
// Uses Scratch/TurboWarp unsandboxed extension fetch.
// ASCII only.

class RSXZZSExtension {
  getInfo() {
    return {
      id: "rsxzzs",
      name: "作文生成(API)",
      color1: "#4B7BE5",
      color2: "#3D66C2",
      blocks: [
        {
          opcode: "generate",
          blockType: Scratch.BlockType.REPORTER,
          text: "生成作文 标题[title] 要求[content] 字数[number]",
          arguments: {
            title: { type: Scratch.ArgumentType.STRING, defaultValue: "春天的校园" },
            content: { type: Scratch.ArgumentType.STRING, defaultValue: "语言生动，有细节描写，结尾点题" },
            number: { type: Scratch.ArgumentType.NUMBER, defaultValue: 800 }
          }
        }
      ]
    };
  }

  async generate(args) {
    const title = String(args.title ?? "").trim();
    const content = String(args.content ?? "").trim();
    const numRaw = Number(args.number);
    const number = Number.isFinite(numRaw) ? Math.max(1, Math.floor(numRaw)) : 800;

    if (!title || !content) return "错误：title/content 不能为空";

    const url = "https://yunzhiapi.cn/API/rsxzzs.php";
    const params = new URLSearchParams({
      title,
      content,
      number: String(number)
    });

    // Prefer GET (matches docs). If CORS blocks GET, you can switch to POST.
    try {
      const res = await fetch(`${url}?${params.toString()}`, {
        method: "GET"
      });
      const text = await res.text();
      return (text || "").trim();
    } catch (e) {
      return `请求失败：${e && e.message ? e.message : String(e)}`;
    }
  }
}

Scratch.extensions.register(new RSXZZSExtension());
