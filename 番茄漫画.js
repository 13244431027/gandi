(function(Scratch) {
  'use strict';

  class TomatoManga {
    constructor() {
      this.apiBase = 'https://api-v2.cenguigui.cn/api/tomato/manhua/api.php';
      this.lastResponse = null;
      this.lastDetailResponse = null;
      this.lastChapterResponse = null;
      this.viewerWindow = null;
      this.currentImageIndex = 0;
    }

    getInfo() {
      return {
        id: 'tomatoManga',
        name: '番茄漫画',
        color1: '#FF6B6B',
        color2: '#FF5252',
        color3: '#E53935',
        blocks: [
          {
            opcode: 'searchManga',
            blockType: Scratch.BlockType.REPORTER,
            text: '搜索漫画 [NAME] 第 [PAGE] 页',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '总裁'
              },
              PAGE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'getMangaDetail',
            blockType: Scratch.BlockType.REPORTER,
            text: '获取漫画详情 ID: [BOOK_ID]',
            arguments: {
              BOOK_ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '7247089381142432800'
              }
            }
          },
          {
            opcode: 'getChapterImages',
            blockType: Scratch.BlockType.REPORTER,
            text: '获取章节图片 章节ID: [ITEM_ID] 类型: [TYPE]',
            arguments: {
              ITEM_ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '7247090228098400825'
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'typeMenu',
                defaultValue: 'json'
              }
            }
          },
          '---',
          {
            blockType: Scratch.BlockType.LABEL,
            text: '搜索结果解析'
          },
          {
            opcode: 'getMangaTitle',
            blockType: Scratch.BlockType.REPORTER,
            text: '从搜索结果获取 [INDEX] 的标题',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'getMangaAuthor',
            blockType: Scratch.BlockType.REPORTER,
            text: '从搜索结果获取 [INDEX] 的作者',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'getMangaType',
            blockType: Scratch.BlockType.REPORTER,
            text: '从搜索结果获取 [INDEX] 的类型',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'getMangaCover',
            blockType: Scratch.BlockType.REPORTER,
            text: '从搜索结果获取 [INDEX] 的封面',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'getMangaIntro',
            blockType: Scratch.BlockType.REPORTER,
            text: '从搜索结果获取 [INDEX] 的简介',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'getMangaBookId',
            blockType: Scratch.BlockType.REPORTER,
            text: '从搜索结果获取 [INDEX] 的ID',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'getMangaLink',
            blockType: Scratch.BlockType.REPORTER,
            text: '从搜索结果获取 [INDEX] 的链接',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'getResultCount',
            blockType: Scratch.BlockType.REPORTER,
            text: '搜索结果数量'
          },
          '---',
          {
            blockType: Scratch.BlockType.LABEL,
            text: '漫画详情解析'
          },
          {
            opcode: 'getDetailBookName',
            blockType: Scratch.BlockType.REPORTER,
            text: '详情-漫画名称'
          },
          {
            opcode: 'getDetailAuthor',
            blockType: Scratch.BlockType.REPORTER,
            text: '详情-作者'
          },
          {
            opcode: 'getDetailCategory',
            blockType: Scratch.BlockType.REPORTER,
            text: '详情-分类'
          },
          {
            opcode: 'getDetailDesc',
            blockType: Scratch.BlockType.REPORTER,
            text: '详情-简介'
          },
          {
            opcode: 'getDetailCover',
            blockType: Scratch.BlockType.REPORTER,
            text: '详情-封面图'
          },
          {
            opcode: 'getDetailTotal',
            blockType: Scratch.BlockType.REPORTER,
            text: '详情-章节总数'
          },
          {
            opcode: 'getChapterTitle',
            blockType: Scratch.BlockType.REPORTER,
            text: '详情-第 [INDEX] 章标题',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'getChapterItemId',
            blockType: Scratch.BlockType.REPORTER,
            text: '详情-第 [INDEX] 章ID',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'getChapterUrl',
            blockType: Scratch.BlockType.REPORTER,
            text: '详情-第 [INDEX] 章链接',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          '---',
          {
            blockType: Scratch.BlockType.LABEL,
            text: '章节图片解析'
          },
          {
            opcode: 'getChapterImageCount',
            blockType: Scratch.BlockType.REPORTER,
            text: '章节-图片总数'
          },
          {
            opcode: 'getChapterImageUrl',
            blockType: Scratch.BlockType.REPORTER,
            text: '章节-第 [INDEX] 张图片链接',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'getAllChapterImages',
            blockType: Scratch.BlockType.REPORTER,
            text: '章节-所有图片链接(JSON)'
          },
          '---',
          {
            blockType: Scratch.BlockType.LABEL,
            text: '弹窗显示'
          },
          {
            opcode: 'openViewer',
            blockType: Scratch.BlockType.COMMAND,
            text: '打开漫画阅读器'
          },
          {
            opcode: 'openViewerWithChapter',
            blockType: Scratch.BlockType.COMMAND,
            text: '打开阅读器并加载章节 [ITEM_ID]',
            arguments: {
              ITEM_ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '7247090228098400825'
              }
            }
          },
          {
            opcode: 'closeViewer',
            blockType: Scratch.BlockType.COMMAND,
            text: '关闭漫画阅读器'
          },
          {
            opcode: 'showImage',
            blockType: Scratch.BlockType.COMMAND,
            text: '在阅读器显示第 [INDEX] 张图片',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'nextImage',
            blockType: Scratch.BlockType.COMMAND,
            text: '下一张图片'
          },
          {
            opcode: 'prevImage',
            blockType: Scratch.BlockType.COMMAND,
            text: '上一张图片'
          },
          {
            opcode: 'isViewerOpen',
            blockType: Scratch.BlockType.BOOLEAN,
            text: '阅读器是否打开？'
          },
          {
            opcode: 'getCurrentImageIndex',
            blockType: Scratch.BlockType.REPORTER,
            text: '当前显示的图片序号'
          },
          '---',
          {
            opcode: 'getLastResponse',
            blockType: Scratch.BlockType.REPORTER,
            text: '最后的完整响应'
          }
        ],
        menus: {
          typeMenu: {
            acceptReporters: true,
            items: ['json', 'pic', 'content']
          }
        }
      };
    }

    // 搜索漫画
    async searchManga(args) {
      try {
        const url = `${this.apiBase}?name=${encodeURIComponent(args.NAME)}&page=${args.PAGE}`;
        const response = await Scratch.fetch(url);
        const data = await response.json();
        
        this.lastResponse = data;
        
        if (data.code === 200) {
          return JSON.stringify(data);
        } else {
          return JSON.stringify({ error: data.msg || '搜索失败' });
        }
      } catch (error) {
        return JSON.stringify({ error: error.message });
      }
    }

    // 获取漫画详情
    async getMangaDetail(args) {
      try {
        const url = `${this.apiBase}?book_id=${encodeURIComponent(args.BOOK_ID)}`;
        const response = await Scratch.fetch(url);
        const data = await response.json();
        
        this.lastDetailResponse = data;
        
        if (data.code === 200) {
          return JSON.stringify(data);
        } else {
          return JSON.stringify({ error: data.msg || '获取详情失败' });
        }
      } catch (error) {
        return JSON.stringify({ error: error.message });
      }
    }

    // 获取章节图片
    async getChapterImages(args) {
      try {
        const url = `${this.apiBase}?item_id=${encodeURIComponent(args.ITEM_ID)}&type=${args.TYPE}`;
        const response = await Scratch.fetch(url);
        const data = await response.json();
        
        this.lastChapterResponse = data;
        
        if (data.code === 200) {
          return JSON.stringify(data);
        } else {
          return JSON.stringify({ error: data.msg || '获取章节失败' });
        }
      } catch (error) {
        return JSON.stringify({ error: error.message });
      }
    }

    // ========== 搜索结果解析 ==========
    
    getMangaTitle(args) {
      if (!this.lastResponse || !this.lastResponse.data) {
        return '';
      }
      const index = args.INDEX - 1;
      if (index >= 0 && index < this.lastResponse.data.length) {
        return this.lastResponse.data[index].title || '';
      }
      return '';
    }

    getMangaAuthor(args) {
      if (!this.lastResponse || !this.lastResponse.data) {
        return '';
      }
      const index = args.INDEX - 1;
      if (index >= 0 && index < this.lastResponse.data.length) {
        return this.lastResponse.data[index].author || '';
      }
      return '';
    }

    getMangaType(args) {
      if (!this.lastResponse || !this.lastResponse.data) {
        return '';
      }
      const index = args.INDEX - 1;
      if (index >= 0 && index < this.lastResponse.data.length) {
        return this.lastResponse.data[index].type || '';
      }
      return '';
    }

    getMangaCover(args) {
      if (!this.lastResponse || !this.lastResponse.data) {
        return '';
      }
      const index = args.INDEX - 1;
      if (index >= 0 && index < this.lastResponse.data.length) {
        return this.lastResponse.data[index].cover || '';
      }
      return '';
    }

    getMangaIntro(args) {
      if (!this.lastResponse || !this.lastResponse.data) {
        return '';
      }
      const index = args.INDEX - 1;
      if (index >= 0 && index < this.lastResponse.data.length) {
        return this.lastResponse.data[index].intro || '';
      }
      return '';
    }

    getMangaBookId(args) {
      if (!this.lastResponse || !this.lastResponse.data) {
        return '';
      }
      const index = args.INDEX - 1;
      if (index >= 0 && index < this.lastResponse.data.length) {
        return this.lastResponse.data[index].book_id || '';
      }
      return '';
    }

    getMangaLink(args) {
      if (!this.lastResponse || !this.lastResponse.data) {
        return '';
      }
      const index = args.INDEX - 1;
      if (index >= 0 && index < this.lastResponse.data.length) {
        return this.lastResponse.data[index].link || '';
      }
      return '';
    }

    getResultCount() {
      if (!this.lastResponse || !this.lastResponse.data) {
        return 0;
      }
      return this.lastResponse.data.length;
    }

    // ========== 漫画详情解析 ==========
    
    getDetailBookName() {
      if (!this.lastDetailResponse) {
        return '';
      }
      return this.lastDetailResponse.book_name || '';
    }

    getDetailAuthor() {
      if (!this.lastDetailResponse) {
        return '';
      }
      return this.lastDetailResponse.author || '';
    }

    getDetailCategory() {
      if (!this.lastDetailResponse) {
        return '';
      }
      return this.lastDetailResponse.category || '';
    }

    getDetailDesc() {
      if (!this.lastDetailResponse) {
        return '';
      }
      return this.lastDetailResponse.desc || '';
    }

    getDetailCover() {
      if (!this.lastDetailResponse) {
        return '';
      }
      return this.lastDetailResponse.book_pic || '';
    }

    getDetailTotal() {
      if (!this.lastDetailResponse) {
        return 0;
      }
      return parseInt(this.lastDetailResponse.total) || 0;
    }

    getChapterTitle(args) {
      if (!this.lastDetailResponse || !this.lastDetailResponse.data) {
        return '';
      }
      const index = args.INDEX - 1;
      if (index >= 0 && index < this.lastDetailResponse.data.length) {
        return this.lastDetailResponse.data[index].title || '';
      }
      return '';
    }

    getChapterItemId(args) {
      if (!this.lastDetailResponse || !this.lastDetailResponse.data) {
        return '';
      }
      const index = args.INDEX - 1;
      if (index >= 0 && index < this.lastDetailResponse.data.length) {
        return this.lastDetailResponse.data[index].item_id || '';
      }
      return '';
    }

    getChapterUrl(args) {
      if (!this.lastDetailResponse || !this.lastDetailResponse.data) {
        return '';
      }
      const index = args.INDEX - 1;
      if (index >= 0 && index < this.lastDetailResponse.data.length) {
        return this.lastDetailResponse.data[index].url_content || '';
      }
      return '';
    }

    // ========== 章节图片解析 ==========
    
    getChapterImageCount() {
      if (!this.lastChapterResponse || !this.lastChapterResponse.data || !this.lastChapterResponse.data.images) {
        return 0;
      }
      return this.lastChapterResponse.data.images.length;
    }

    getChapterImageUrl(args) {
      if (!this.lastChapterResponse || !this.lastChapterResponse.data || !this.lastChapterResponse.data.images) {
        return '';
      }
      const index = args.INDEX - 1;
      const images = this.lastChapterResponse.data.images;
      if (index >= 0 && index < images.length) {
        return images[index] || '';
      }
      return '';
    }

    getAllChapterImages() {
      if (!this.lastChapterResponse || !this.lastChapterResponse.data || !this.lastChapterResponse.data.images) {
        return '[]';
      }
      return JSON.stringify(this.lastChapterResponse.data.images);
    }

    // ========== 弹窗显示功能 ==========
    
    createViewerHTML() {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>番茄漫画阅读器</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              background: #1a1a1a;
              font-family: Arial, sans-serif;
              overflow: hidden;
            }
            #container {
              width: 100vw;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            #header {
              background: linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%);
              color: white;
              padding: 15px 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }
            #title {
              font-size: 20px;
              font-weight: bold;
            }
            #info {
              font-size: 14px;
              opacity: 0.9;
            }
            #imageContainer {
              flex: 1;
              display: flex;
              justify-content: center;
              align-items: center;
              overflow: auto;
              background: #2a2a2a;
            }
            #image {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            }
            #controls {
              background: #2a2a2a;
              padding: 15px;
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 15px;
              border-top: 2px solid #FF6B6B;
            }
            button {
              background: linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%);
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 16px;
              font-weight: bold;
              transition: all 0.3s;
              box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
            }
            button:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(255, 107, 107, 0.5);
            }
            button:active {
              transform: translateY(0);
            }
            button:disabled {
              background: #666;
              cursor: not-allowed;
              opacity: 0.5;
            }
            #loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: white;
              font-size: 18px;
              display: none;
            }
            .spinner {
              border: 4px solid rgba(255, 255, 255, 0.3);
              border-top: 4px solid #FF6B6B;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 10px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            #error {
              color: #ff4444;
              text-align: center;
              padding: 20px;
              display: none;
            }
          </style>
        </head>
        <body>
          <div id="container">
            <div id="header">
              <div id="title">番茄漫画阅读器</div>
              <div id="info">准备就绪</div>
            </div>
            <div id="imageContainer">
              <div id="loading">
                <div class="spinner"></div>
                <div>加载中...</div>
              </div>
              <div id="error"></div>
              <img id="image" style="display:none;">
            </div>
            <div id="controls">
              <button id="prevBtn" onclick="prevImage()">◀ 上一张</button>
              <button id="nextBtn" onclick="nextImage()">下一张 ▶</button>
            </div>
          </div>
          <script>
            let currentIndex = 0;
            let images = [];
            
            function updateInfo() {
              const info = document.getElementById('info');
              if (images.length > 0) {
                info.textContent = \`第 \${currentIndex + 1} / \${images.length} 张\`;
              } else {
                info.textContent = '暂无图片';
              }
              
              document.getElementById('prevBtn').disabled = currentIndex <= 0;
              document.getElementById('nextBtn').disabled = currentIndex >= images.length - 1;
            }
            
            function showImage(index) {
              if (index < 0 || index >= images.length) return;
              
              currentIndex = index;
              const img = document.getElementById('image');
              const loading = document.getElementById('loading');
              const error = document.getElementById('error');
              
              loading.style.display = 'block';
              img.style.display = 'none';
              error.style.display = 'none';
              
              img.onload = function() {
                loading.style.display = 'none';
                img.style.display = 'block';
                updateInfo();
              };
              
              img.onerror = function() {
                loading.style.display = 'none';
                error.style.display = 'block';
                error.textContent = '图片加载失败';
                updateInfo();
              };
              
              img.src = images[index];
            }
            
            function nextImage() {
              if (currentIndex < images.length - 1) {
                showImage(currentIndex + 1);
              }
            }
            
            function prevImage() {
              if (currentIndex > 0) {
                showImage(currentIndex - 1);
              }
            }
            
            function loadImages(imageList) {
              images = imageList;
              if (images.length > 0) {
                showImage(0);
              } else {
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').textContent = '没有可显示的图片';
              }
            }
            
            // 键盘控制
            document.addEventListener('keydown', function(e) {
              if (e.key === 'ArrowLeft') prevImage();
              if (e.key === 'ArrowRight') nextImage();
            });
            
            updateInfo();
          </script>
        </body>
        </html>
      `;
    }

    openViewer() {
      if (this.viewerWindow && !this.viewerWindow.closed) {
        this.viewerWindow.focus();
        return;
      }

      const width = 900;
      const height = 700;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;

      this.viewerWindow = window.open(
        '',
        'TomatoMangaViewer',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
      );

      if (this.viewerWindow) {
        this.viewerWindow.document.write(this.createViewerHTML());
        this.viewerWindow.document.close();
        
        // 如果有已加载的章节，自动显示
        if (this.lastChapterResponse && this.lastChapterResponse.data && this.lastChapterResponse.data.images) {
          setTimeout(() => {
            this.viewerWindow.loadImages(this.lastChapterResponse.data.images);
          }, 100);
        }
      }
    }

    async openViewerWithChapter(args) {
      // 先获取章节数据
      await this.getChapterImages({ ITEM_ID: args.ITEM_ID, TYPE: 'json' });
      
      // 打开阅读器
      this.openViewer();
      
      // 加载图片
      if (this.viewerWindow && this.lastChapterResponse && this.lastChapterResponse.data && this.lastChapterResponse.data.images) {
        setTimeout(() => {
          this.viewerWindow.loadImages(this.lastChapterResponse.data.images);
        }, 200);
      }
    }

    closeViewer() {
      if (this.viewerWindow && !this.viewerWindow.closed) {
        this.viewerWindow.close();
        this.viewerWindow = null;
      }
    }

    showImage(args) {
      if (!this.viewerWindow || this.viewerWindow.closed) {
        this.openViewer();
      }

      const index = args.INDEX - 1;
      if (this.viewerWindow && this.viewerWindow.showImage) {
        this.viewerWindow.showImage(index);
      }
    }

    nextImage() {
      if (this.viewerWindow && !this.viewerWindow.closed && this.viewerWindow.nextImage) {
        this.viewerWindow.nextImage();
      }
    }

    prevImage() {
      if (this.viewerWindow && !this.viewerWindow.closed && this.viewerWindow.prevImage) {
        this.viewerWindow.prevImage();
      }
    }

    isViewerOpen() {
      return this.viewerWindow && !this.viewerWindow.closed;
    }

    getCurrentImageIndex() {
      if (this.viewerWindow && !this.viewerWindow.closed) {
        return (this.viewerWindow.currentIndex || 0) + 1;
      }
      return 0;
    }

    // ========== 通用 ==========
    
    getLastResponse() {
      if (this.lastChapterResponse) {
        return JSON.stringify(this.lastChapterResponse);
      }
      if (this.lastDetailResponse) {
        return JSON.stringify(this.lastDetailResponse);
      }
      if (this.lastResponse) {
        return JSON.stringify(this.lastResponse);
      }
      return '';
    }
  }

  Scratch.extensions.register(new TomatoManga());
})(Scratch);
