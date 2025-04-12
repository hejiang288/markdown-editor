/**
 * Markdown编辑器服务器
 * 一个简单的Express服务器，用于提供静态文件访问
 */

const express = require('express');
const compression = require('compression');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 启用Gzip压缩
app.use(compression());

// 设置安全相关的HTTP头
app.use((req, res, next) => {
  // 启用XSS保护
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // 防止MIME类型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // 允许图片粘贴等功能
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// 提供静态文件
app.use(express.static(path.join(__dirname), {
  // 设置缓存 - 一周
  maxAge: '7d'
}));

// 为所有路由提供index.html，支持前端路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(port, () => {
  console.log(`Markdown编辑器运行在 http://localhost:${port}`);
}); 