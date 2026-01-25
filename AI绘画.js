// TurboWarp Unsandboxed Extension: Yunzhi AI Drawing (ks)
// API: https://yunzhiapi.cn/API/ks/api.php?msg=xxx&size=1024x1024&guidance=7.5&batch=1

(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('This extension must be run unsandboxed in TurboWarp.');
  }

  const API = 'https://yunzhiapi.cn/API/ks/api.php';

  let lastURL = '';
  let lastRaw = '';

  // Best-effort parse: API may return plain URL, JSON with url, or some wrapper text.
  function extractURL(text) {
    const t = String(text || '').trim();

    // Try JSON first
    try {
      const obj = JSON.parse(t);
      if (obj && typeof obj === 'object') {
        if (typeof obj.url === 'string') return obj.url.trim();
        // sometimes nested
        if (obj.data && typeof obj.data.url === 'string') return obj.data.url.trim();
      }
    } catch (e) {}

    // If it's already a URL string
    if (/^https?:\/\/\S+$/i.test(t)) return t;

    // Otherwise, extract first http(s) URL from the text
    const m = t.match(/https?:\/\/[^\s"'<>()]+/i);
    if (m) return m[0];

    return '';
  }

  class YunzhiKsExt {
    getInfo() {
      return {
        id: 'yunzhiKsAI',
        name: '云智AI绘画',
        color1: '#3B82F6',
        color2: '#2563EB',
        blocks: [
          {
            opcode: 'generate',
            blockType: Scratch.BlockType.REPORTER,
            text: '生成图片 URL 提示词 [MSG] 大小 [SIZE] 引导 [GUIDANCE] 数量 [BATCH]',
            arguments: {
              MSG: { type: Scratch.ArgumentType.STRING, defaultValue: '绘画内容' },
              SIZE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'sizes',
                defaultValue: '1024x1024'
              },
              GUIDANCE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 7.5 },
              BATCH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            }
          },
          {
            opcode: 'openLast',
            blockType: Scratch.BlockType.COMMAND,
            text: '打开最后图片 URL'
          },
          {
            opcode: 'getLastURL',
            blockType: Scratch.BlockType.REPORTER,
            text: '最后图片 URL'
          },
          {
            opcode: 'getLastRaw',
            blockType: Scratch.BlockType.REPORTER,
            text: '最后原始返回'
          }
        ],
        menus: {
          sizes: {
            acceptReporters: true,
            items: ['256x256', '512x512', '768x768', '1024x1024', '1536x1536']
          }
        }
      };
    }

    async generate(args) {
      const msg = String(args.MSG ?? '').trim();
      if (!msg) return '';

      const size = String(args.SIZE ?? '1024x1024').trim() || '1024x1024';

      // API says guidance is int 1-10, but example default is 7.5; keep numeric and clamp.
      let guidance = Number(args.GUIDANCE);
      if (!Number.isFinite(guidance)) guidance = 7.5;
      guidance = Math.max(1, Math.min(10, guidance));

      let batch = Number(args.BATCH);
      if (!Number.isFinite(batch)) batch = 1;
      batch = Math.max(1, Math.min(4, Math.round(batch)));

      const url = new URL(API);
      url.searchParams.set('msg', msg);
      url.searchParams.set('size', size);
      url.searchParams.set('guidance', String(guidance));
      url.searchParams.set('batch', String(batch));

      let respText = '';
      try {
        const res = await fetch(url.toString(), { method: 'GET' });
        respText = await res.text();
      } catch (e) {
        lastRaw = String(e);
        lastURL = '';
        return '';
      }

      lastRaw = respText;

      const extracted = extractURL(respText);
      lastURL = extracted;

      // If batch > 1 and API actually returns multiple URLs, you can adapt to split or parse JSON array.
      return extracted || '';
    }

    openLast() {
      if (lastURL) window.open(lastURL, '_blank', 'noopener,noreferrer');
    }

    getLastURL() {
      return lastURL || '';
    }

    getLastRaw() {
      return lastRaw || '';
    }
  }

  Scratch.extensions.register(new YunzhiKsExt());
})(Scratch);
