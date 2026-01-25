(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('This extension must be run unsandboxed in TurboWarp.');
  }

  const API = 'https://yunzhiapi.cn/API/rmtmsp.php';
  let lastURL = '';
  let lastRaw = '';
  let playerWindow = null;

  function extractURL(text) {
    const t = String(text || '').trim();
    if (/^https?:\/\/\S+$/i.test(t)) return t;
    const m = t.match(/https?:\/\/[^\s"'<>()]+/i);
    if (m) return m[0];
    return '';
  }

  function createPlayerWindow(videoURL) {
    // 移除旧窗口
    if (playerWindow && playerWindow.parentNode) {
      playerWindow.parentNode.removeChild(playerWindow);
    }

    // 创建弹窗容器
    playerWindow = document.createElement('div');
    playerWindow.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 640px;
      max-width: 90vw;
      background: #1a1a1a;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      z-index: 999999;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    // 标题栏（可拖动）
    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      cursor: move;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    `;
    header.innerHTML = `
      <span>🎬 云智随机视频</span>
      <button id="closeBtn" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        transition: background 0.2s;
      ">×</button>
    `;

    // 视频容器
    const videoContainer = document.createElement('div');
    videoContainer.style.cssText = `
      background: #000;
      position: relative;
      padding-top: 56.25%; /* 16:9 */
    `;

    const video = document.createElement('video');
    video.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `;
    video.controls = true;
    video.autoplay = true;
    video.src = videoURL;

    videoContainer.appendChild(video);

    // 底部信息栏
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 12px 16px;
      background: #2a2a2a;
      color: #aaa;
      font-size: 12px;
      word-break: break-all;
    `;
    footer.textContent = `URL: ${videoURL}`;

    playerWindow.appendChild(header);
    playerWindow.appendChild(videoContainer);
    playerWindow.appendChild(footer);
    document.body.appendChild(playerWindow);

    // 关闭按钮
    const closeBtn = header.querySelector('#closeBtn');
    closeBtn.addEventListener('click', () => {
      if (playerWindow && playerWindow.parentNode) {
        playerWindow.parentNode.removeChild(playerWindow);
        playerWindow = null;
      }
    });

    // 鼠标悬停效果
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255,255,255,0.3)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255,255,255,0.2)';
    });

    // 拖动功能
    let isDragging = false;
    let startX, startY, initialX, initialY;

    header.addEventListener('mousedown', (e) => {
      if (e.target.id === 'closeBtn') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = playerWindow.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      playerWindow.style.transform = 'none';
      playerWindow.style.left = initialX + 'px';
      playerWindow.style.top = initialY + 'px';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      playerWindow.style.left = (initialX + dx) + 'px';
      playerWindow.style.top = (initialY + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  class YunzhiVideoExt {
    getInfo() {
      return {
        id: 'yunzhiRmtmsp',
        name: '云智随机视频',
        color1: '#7C3AED',
        color2: '#6D28D9',
        blocks: [
          {
            opcode: 'getVideoURL',
            blockType: Scratch.BlockType.REPORTER,
            text: '获取随机视频 URL'
          },
          {
            opcode: 'playVideo',
            blockType: Scratch.BlockType.COMMAND,
            text: '播放最后视频（弹窗）'
          },
          {
            opcode: 'playVideoURL',
            blockType: Scratch.BlockType.COMMAND,
            text: '播放视频 URL [URL]',
            arguments: {
              URL: { type: Scratch.ArgumentType.STRING, defaultValue: '' }
            }
          },
          {
            opcode: 'closePlayer',
            blockType: Scratch.BlockType.COMMAND,
            text: '关闭视频播放器'
          },
          '---',
          {
            opcode: 'lastVideoURL',
            blockType: Scratch.BlockType.REPORTER,
            text: '最后视频 URL'
          },
          {
            opcode: 'lastResponse',
            blockType: Scratch.BlockType.REPORTER,
            text: '最后原始返回'
          }
        ]
      };
    }

    async getVideoURL() {
      lastURL = '';
      lastRaw = '';

      try {
        const res = await fetch(API, {
          method: 'GET',
          redirect: 'follow',
          cache: 'no-store'
        });

        const finalURL = res.url || '';
        const ct = (res.headers.get('content-type') || '').toLowerCase();

        if (finalURL && (ct.includes('video/') || ct.includes('application/vnd.apple.mpegurl'))) {
          lastURL = finalURL;
          lastRaw = `[content-type=${ct}] ${finalURL}`;
          return lastURL;
        }

        const txt = await res.text();
        lastRaw = txt;

        const extracted = extractURL(txt);
        lastURL = extracted || finalURL || '';
        return lastURL;
      } catch (e) {
        lastRaw = String(e);
        return '';
      }
    }

    playVideo() {
      if (lastURL) {
        createPlayerWindow(lastURL);
      } else {
        alert('请先使用"获取随机视频 URL"积木获取视频链接');
      }
    }

    playVideoURL(args) {
      const url = String(args.URL || '').trim();
      if (url) {
        createPlayerWindow(url);
      } else {
        alert('请提供有效的视频 URL');
      }
    }

    closePlayer() {
      if (playerWindow && playerWindow.parentNode) {
        playerWindow.parentNode.removeChild(playerWindow);
        playerWindow = null;
      }
    }

    lastVideoURL() {
      return lastURL || '';
    }

    lastResponse() {
      return lastRaw || '';
    }
  }

  Scratch.extensions.register(new YunzhiVideoExt());
})(Scratch);
