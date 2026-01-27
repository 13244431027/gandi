(function (Scratch) {
  'use strict';

  const API = 'https://api-v2.cenguigui.cn/api/mp4/MP4_xiaojiejie.php';

  // Single overlay player reused across calls
  let overlay = null;
  let videoEl = null;

  function ensureOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.75)';
    overlay.style.zIndex = '2147483647';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '16px';
    overlay.style.boxSizing = 'border-box';

    const panel = document.createElement('div');
    panel.style.width = 'min(900px, 96vw)';
    panel.style.height = 'min(520px, 70vh)';
    panel.style.background = '#111';
    panel.style.borderRadius = '10px';
    panel.style.overflow = 'hidden';
    panel.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5)';
    panel.style.position = 'relative';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.position = 'absolute';
    closeBtn.style.right = '10px';
    closeBtn.style.top = '8px';
    closeBtn.style.width = '40px';
    closeBtn.style.height = '40px';
    closeBtn.style.border = '0';
    closeBtn.style.borderRadius = '8px';
    closeBtn.style.background = 'rgba(255,255,255,0.12)';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '26px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => {
      overlay.style.display = 'none';
      if (videoEl) {
        try { videoEl.pause(); } catch (e) {}
        // release stream
        videoEl.removeAttribute('src');
        try { videoEl.load(); } catch (e) {}
      }
    };

    videoEl = document.createElement('video');
    videoEl.style.width = '100%';
    videoEl.style.height = '100%';
    videoEl.style.objectFit = 'contain';
    videoEl.style.background = '#000';
    videoEl.controls = true;
    videoEl.playsInline = true;

    // Click background to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeBtn.onclick();
    });

    // ESC to close
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay && overlay.style.display !== 'none') {
        closeBtn.onclick();
      }
    });

    panel.appendChild(videoEl);
    panel.appendChild(closeBtn);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  async function fetchVideoUrl() {
    const res = await fetch(`${API}?type=json`, { method: 'GET' });
    const j = await res.json();
    return (j && j.data && typeof j.data.url === 'string') ? j.data.url : '';
  }

  class Mp4PopupPlayer {
    getInfo() {
      return {
        id: 'mp4popupplayer',
        name: '视频弹窗',
        blocks: [
          {
            opcode: 'getUrl',
            blockType: Scratch.BlockType.REPORTER,
            text: '获取随机视频URL'
          },
          {
            opcode: 'playPopup',
            blockType: Scratch.BlockType.COMMAND,
            text: '弹窗播放 URL [URL]',
            arguments: {
              URL: { type: Scratch.ArgumentType.STRING, defaultValue: '' }
            }
          },
          {
            opcode: 'playRandomPopup',
            blockType: Scratch.BlockType.COMMAND,
            text: '弹窗播放随机视频'
          },
          {
            opcode: 'closePopup',
            blockType: Scratch.BlockType.COMMAND,
            text: '关闭弹窗'
          }
        ]
      };
    }

    async getUrl() {
      try {
        return await fetchVideoUrl();
      } catch (e) {
        return '';
      }
    }

    playPopup(args) {
      ensureOverlay();
      const url = String(args.URL || '').trim();
      if (!url) return;

      overlay.style.display = 'flex';

      // Set src then play (autoplay may be blocked; controls remain)
      videoEl.src = url;
      const p = videoEl.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }

    async playRandomPopup() {
      try {
        const url = await fetchVideoUrl();
        this.playPopup({ URL: url });
      } catch (e) {
        // ignore
      }
    }

    closePopup() {
      if (!overlay) return;
      overlay.style.display = 'none';
      if (videoEl) {
        try { videoEl.pause(); } catch (e) {}
        videoEl.removeAttribute('src');
        try { videoEl.load(); } catch (e) {}
      }
    }
  }

  Scratch.extensions.register(new Mp4PopupPlayer());
})(Scratch);
