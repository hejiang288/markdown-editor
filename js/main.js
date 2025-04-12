/**
 * Markdown编辑器主要功能
 */

// 初始化编辑器
let editor;

// 缓存导出CSS
let cachedExportCSS = {};

document.addEventListener('DOMContentLoaded', function() {
    // 确保highlight.js已加载
    if (typeof hljs === 'undefined') {
        console.warn('等待highlight.js加载...');
        const hlScript = document.createElement('script');
        hlScript.src = 'https://cdn.bootcdn.net/ajax/libs/highlight.js/10.7.2/highlight.min.js';
        hlScript.onload = function() {
            console.log('highlight.js加载完成');
            initApp();
        };
        document.head.appendChild(hlScript);
    } else {
        initApp();
    }
});

// 应用初始化
function initApp() {
    initializeEditor();
    setupDragAndDrop();
    setupClipboardHandling();
    setupImageLazyLoad();
    
    // 自动预览初始内容
    previewMarkdown();
}

// 添加节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 使用节流处理的预览函数
const throttledPreview = throttle(function() {
    previewMarkdown();
}, 300);

// 初始化编辑器
function initializeEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
        mode: 'markdown',
        theme: 'monokai',
        lineNumbers: true,
        lineWrapping: true,
        extraKeys: {
            "Enter": "newlineAndIndentContinueMarkdownList",
            "Ctrl-V": function(cm) {
                // 默认行为会由事件监听器处理
            }
        },
        tabSize: 2
    });

    // 监听编辑器变化，使用节流函数
    editor.on('change', throttledPreview);
}

// 设置拖放功能
function setupDragAndDrop() {
    const editorElement = editor.getWrapperElement();
    
    editorElement.addEventListener('dragover', function(e) {
        e.preventDefault();
        editorElement.classList.add('drag-over');
    });
    
    editorElement.addEventListener('dragleave', function() {
        editorElement.classList.remove('drag-over');
    });
    
    editorElement.addEventListener('drop', function(e) {
        e.preventDefault();
        editorElement.classList.remove('drag-over');
        
        // 拖放文件处理
        if (e.dataTransfer.files.length) {
            const file = e.dataTransfer.files[0];
            
            // 检查是否为文本文件
            if (file.type === 'text/markdown' || file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    editor.setValue(event.target.result);
                    previewMarkdown();
                    showToast('文件已加载');
                };
                reader.readAsText(file);
            } else {
                showToast('请拖放Markdown或文本文件');
            }
        } else {
            // 纯文本拖放
            const text = e.dataTransfer.getData('text');
            if (text) {
                editor.setValue(text);
                previewMarkdown();
            }
        }
    });
}

// 设置剪贴板处理
function setupClipboardHandling() {
    editor.on('paste', function(cm, e) {
        const clipboardData = e.clipboardData || window.clipboardData;
        
        // 处理粘贴图片
        if (clipboardData.items && clipboardData.items.length) {
            const items = clipboardData.items;
            
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    
                    // 获取粘贴的图片
                    const blob = items[i].getAsFile();
                    handlePastedImage(blob);
                    return;
                }
            }
        }
        
        // 尝试获取HTML内容并转换为Markdown（如果有turndown库）
        if (typeof TurndownService !== 'undefined') {
            const html = clipboardData.getData('text/html');
            if (html && html.trim()) {
                e.preventDefault();
                
                // 使用turndown库将HTML转换为Markdown
                const turndownService = new TurndownService({
                    headingStyle: 'atx',
                    codeBlockStyle: 'fenced'
                });
                
                const markdown = turndownService.turndown(html);
                cm.replaceSelection(markdown);
                return;
            }
        }
        
        // 如果没有HTML或无法转换，使用纯文本
        // 默认行为会处理纯文本粘贴
    });
}

// 处理粘贴的图片
function handlePastedImage(blob) {
    // 创建加载提示
    showToast('正在处理图片...');
    
    // 检查图片大小，如果超过阈值则尝试压缩
    if (blob.size > 1024 * 1024) { // 大于1MB的图片进行压缩
        compressImage(blob, function(compressedBlob) {
            processImageBlob(compressedBlob || blob);
        });
    } else {
        processImageBlob(blob);
    }
}

// 压缩图片
function compressImage(blob, callback) {
    try {
        const img = new Image();
        img.onload = function() {
            URL.revokeObjectURL(img.src);
            
            // 目标尺寸 - 保持宽高比但减小尺寸
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            
            let width = img.width;
            let height = img.height;
            
            // 按比例缩小
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            
            // 创建Canvas并绘制调整大小的图像
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // 转换为Blob，压缩质量为0.7
            canvas.toBlob(function(compressedBlob) {
                console.log(`图片已压缩: ${(blob.size / 1024).toFixed(2)}KB -> ${(compressedBlob.size / 1024).toFixed(2)}KB`);
                callback(compressedBlob);
            }, 'image/jpeg', 0.7);
        };
        
        img.onerror = function() {
            console.error('图片压缩失败');
            callback(null); // 压缩失败，使用原始blob
        };
        
        img.src = URL.createObjectURL(blob);
    } catch (error) {
        console.error('图片压缩出错:', error);
        callback(null); // 出错时使用原始blob
    }
}

// 处理图片Blob并添加到编辑器
function processImageBlob(blob) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        
        // 创建Markdown格式的图片链接并插入
        const md = `![粘贴的图片](${base64})`;
        editor.replaceSelection(md);
        
        // 更新预览
        previewMarkdown();
        showToast('图片已添加');
    };
    
    reader.onerror = function() {
        console.error('读取粘贴图片失败');
        showToast('无法处理粘贴的图片');
    };
    
    reader.readAsDataURL(blob);
}

// 预览Markdown
function previewMarkdown() {
    const preview = document.getElementById('nice');
    const content = editor.getValue();

    try {
        // 避免不必要的DOM更新 - 检查内容是否改变
        if (preview.getAttribute('data-content') === content) {
            return; // 如果内容没有变化，直接返回
        }
        
        // 移除当前所有观察中的图片
        if (window._imgObserver) {
            document.querySelectorAll('#nice img').forEach(img => {
                window._imgObserver.unobserve(img);
            });
        }
        
        // 使用marked进行渲染
        preview.innerHTML = marked(content);
        preview.setAttribute('data-content', content);
        
        // 高亮代码块，但先检查hljs是否已加载
        if (typeof hljs !== 'undefined') {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
        } else {
            console.warn('highlight.js尚未加载，无法高亮代码块');
            // 添加一个事件监听器，在hljs加载完成后执行高亮
            window.addEventListener('load', function() {
                if (typeof hljs !== 'undefined') {
                    document.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightBlock(block);
                    });
                }
            });
        }
    } catch (error) {
        console.error('预览失败:', error);
        preview.innerHTML = '<div style="color: red;">渲染出错: ' + error.message + '</div>';
    }
}

// 复制HTML内容
function copyContent() {
    const preview = document.getElementById('nice');
    const theme = document.getElementById('theme').value;
    const themeLabel = document.getElementById('theme').options[document.getElementById('theme').selectedIndex].text;
    
    // 在复制前临时添加主题标记（不会影响预览内容）
    const themeTag = document.createElement('div');
    themeTag.style.display = 'none';
    themeTag.setAttribute('data-theme', theme);
    themeTag.setAttribute('data-theme-name', themeLabel);
    preview.appendChild(themeTag);
    
    const range = document.createRange();
    range.selectNode(preview);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast('已复制HTML内容');
        } else {
            showToast('复制失败，请尝试使用快捷键');
        }
    } catch (err) {
        console.error('复制失败:', err);
        showToast('复制失败，请尝试使用快捷键');
    }
    
    // 复制完成后移除临时标记
    preview.removeChild(themeTag);
    window.getSelection().removeAllRanges();
}

// 下载HTML文件
function downloadHTML() {
    const preview = document.getElementById('nice');
    const content = preview.innerHTML;
    const blob = new Blob(['<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Markdown导出</title><style>' + getExportCSS() + '</style></head><body><div id="content">' + content + '</div></body></html>'], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'markdown_export_' + new Date().toISOString().slice(0, 10) + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('已下载HTML文件');
}

// 获取导出用的CSS
function getExportCSS() {
    const theme = document.getElementById('theme').value;
    const codeStyle = document.getElementById('code-style').value;
    
    // 检查缓存中是否已存在相同配置的CSS
    const cacheKey = `${theme}-${codeStyle}`;
    if (cachedExportCSS[cacheKey]) {
        return cachedExportCSS[cacheKey];
    }
    
    // 收集当前选择的主题和代码样式
    let css = '';
    
    // 从页面中提取当前主题的CSS
    const themeStyles = Array.from(document.styleSheets)
        .filter(sheet => {
            try {
                return sheet.cssRules;
            } catch (e) {
                return false; // 跨域样式表会抛出安全错误
            }
        })
        .flatMap(sheet => Array.from(sheet.cssRules))
        .filter(rule => rule.selectorText && rule.selectorText.includes(`.theme-${theme}`))
        .map(rule => rule.cssText)
        .join('\n');
    
    // 从页面中提取当前代码样式的CSS
    const codeStyles = Array.from(document.styleSheets)
        .filter(sheet => {
            try {
                return sheet.cssRules;
            } catch (e) {
                return false;
            }
        })
        .flatMap(sheet => Array.from(sheet.cssRules))
        .filter(rule => rule.selectorText && rule.selectorText.includes(`.code-style-${codeStyle}`))
        .map(rule => rule.cssText)
        .join('\n');
    
    // 基本样式
    css += `
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
            background-color: #ffffff;
        }
        #content {
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            background: #fff;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            border-radius: 8px;
        }
    `;
    
    // 添加通用的Markdown样式
    css += `
        #content {
            word-break: break-word;
            line-height: 1.75;
            font-weight: 400;
            font-size: 15px;
            overflow-x: hidden;
        }
        #content p {
            margin: 1.5em 0;
            padding: 0;
            line-height: 1.75;
        }
        #content h1, #content h2, #content h3, #content h4, #content h5, #content h6 {
            margin: 1.2em 0 1em;
            font-weight: bold;
        }
        #content img {
            max-width: 100%;
        }
        #content code {
            font-family: "JetBrains Mono", Consolas, Monaco, "Andale Mono", monospace;
        }
    `;
    
    // 添加主题和代码样式
    css += themeStyles + '\n' + codeStyles;
    
    // 缓存结果并返回
    cachedExportCSS[cacheKey] = css;
    return css;
}

// 粘贴并替换全部内容
function pasteFullContent() {
    // 直接替换内容，不显示确认提示
    try {
        navigator.clipboard.readText()
            .then(text => {
                editor.setValue(text);
                previewMarkdown();
                showToast('内容已粘贴');
            })
            .catch(err => {
                console.error('无法访问剪贴板:', err);
                showToast('请使用Ctrl+V粘贴或检查剪贴板权限');
            });
    } catch (err) {
        console.error('粘贴操作失败:', err);
        showToast('请使用Ctrl+V粘贴');
    }
}

// 清空编辑器内容
function clearContent() {
    // 直接清空内容，不显示确认提示
    editor.setValue('');
    previewMarkdown();
    showToast('内容已清空');
}

// 显示提示
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'copy-success';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 2秒后移除提示
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
}

// 添加图片懒加载处理
function setupImageLazyLoad() {
    try {
        // 使用更高效的图片加载策略
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    // 为图片设置加载完成的处理器
                    img.onload = function() {
                        this.classList.add('loaded');
                    };
                    
                    // 图片加载失败处理
                    img.onerror = function() {
                        console.error('图片加载失败:', this.getAttribute('data-src') || this.src);
                        this.alt = '图片加载失败';
                        this.classList.add('loaded'); // 即使失败也标记为已加载
                    };
                    
                    // 确保src属性存在
                    if (img.getAttribute('data-src')) {
                        img.src = img.getAttribute('data-src');
                    }
                    
                    // 停止观察这个元素
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '200px', // 提前200px开始加载，增加预加载区域
            threshold: 0.01 // 只要有1%可见就开始加载
        });
        
        // 保存全局引用，以便在后续操作中使用
        window._imgObserver = observer;
        
        // 修改预览Markdown逻辑，优化图片处理
        const originalPreviewMarkdown = previewMarkdown;
        previewMarkdown = function() {
            try {
                // 标记预览区域为加载中，添加视觉反馈
                const preview = document.getElementById('nice');
                preview.classList.add('loading-content');
                
                // 执行原始预览
                originalPreviewMarkdown();
                
                // 直接对小图片应用立即加载策略，只对大图片使用懒加载
                document.querySelectorAll('#nice img').forEach(img => {
                    if (img.classList.contains('loaded')) return;
                    
                    // 保存原始src作为data-src
                    if (img.src && !img.getAttribute('data-src')) {
                        img.setAttribute('data-src', img.src);
                    }
                    
                    // 对于base64小图片，直接加载不使用懒加载
                    if (img.getAttribute('data-src') && 
                        img.getAttribute('data-src').startsWith('data:image') && 
                        img.getAttribute('data-src').length < 10000) {
                        img.src = img.getAttribute('data-src');
                        img.classList.add('loaded');
                    } else {
                        // 大图片或网络图片使用懒加载
                        if (img.src) img.removeAttribute('src');
                        observer.observe(img);
                    }
                });
                
                // 移除加载中状态
                setTimeout(() => {
                    preview.classList.remove('loading-content');
                }, 100);
            } catch (error) {
                console.error('预览处理图片时出错:', error);
                
                // 出错时直接加载所有图片
                document.querySelectorAll('#nice img').forEach(img => {
                    if (!img.classList.contains('loaded') && img.getAttribute('data-src')) {
                        img.src = img.getAttribute('data-src');
                        img.classList.add('loaded');
                    }
                });
                
                // 还原为原始预览函数
                const preview = document.getElementById('nice');
                preview.classList.remove('loading-content');
            }
        };
    } catch (error) {
        console.error('设置图片懒加载失败:', error);
        // 如果懒加载失败，提供备用方案 - 直接加载所有图片
        const originalPreviewMarkdown = previewMarkdown;
        previewMarkdown = function() {
            try {
                originalPreviewMarkdown();
                // 直接加载所有图片，不使用懒加载
                document.querySelectorAll('#nice img').forEach(img => {
                    if (img.getAttribute('data-src') && !img.src) {
                        img.src = img.getAttribute('data-src');
                    }
                    img.classList.add('loaded');
                });
            } catch (error) {
                console.error('预览加载图片时出错:', error);
                originalPreviewMarkdown();
            }
        };
    }
} 