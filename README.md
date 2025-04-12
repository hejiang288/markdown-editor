# Markdown编辑器

一个优雅的Markdown编辑器，专为中文内容创作者设计，特别优化了微信公众号排版。

## 特色功能

- 🎨 多种精美主题，满足不同场景需求
- 🖌️ 多种代码高亮样式，展示美观的代码块
- 📋 一键复制富文本，轻松粘贴到微信公众号
- 📱 响应式设计，完美适配移动端和桌面端
- 🔄 HTML和Markdown互转，支持从网页复制内容
- 📷 支持图片粘贴和压缩，让文档更生动
- 📤 导出HTML文件，便于本地存档

## 快速开始

### 在线使用

访问[Markdown编辑器](https://github.com/markdown-editor)即可使用。

### 本地部署

1. 克隆本仓库
```bash
git clone https://github.com/yourusername/markdown-editor.git
cd markdown-editor
```

2. 使用Node.js运行（需要先安装Node.js）
```bash
# 安装依赖
npm install

# 启动服务
npm start
```

3. 使用Docker运行（需要先安装Docker）
```bash
# 构建镜像
docker build -t markdown-editor .

# 运行容器
docker run -d -p 80:80 markdown-editor

# 访问 http://localhost
```

4. 或者直接在浏览器中打开index.html文件

## 部署到网站

详见[部署指南.md](部署指南.md)文件，提供了多种部署方式的详细说明。

## 主题预览

编辑器内置多种主题：
- 默认主题 - 蓝色科技风
- 简约商务风
- 暗色科技风
- 优雅暗色主题
- MDNice主题
- 自然绿色主题
- 学术论文主题
- 极简风格主题
- 中文传统排版主题
- 杂志风格主题
- 鲜艳对比主题

## 使用方法

1. 在左侧编辑区输入Markdown文本
2. 右侧实时预览渲染效果
3. 选择适合的主题和代码块样式
4. 使用"复制HTML"按钮复制富文本内容
5. 粘贴到微信公众号或其他平台

## 浏览器兼容性

- Chrome（推荐）
- Firefox
- Safari
- Edge
- Opera

## 许可证

MIT

## 致谢

感谢以下开源项目：
- [CodeMirror](https://codemirror.net/)
- [marked](https://marked.js.org/)
- [highlight.js](https://highlightjs.org/)
- [Turndown](https://github.com/mixmark-io/turndown) 