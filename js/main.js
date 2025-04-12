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
    
    // 设置示例内容（如果有）
    setupInitialContent();
    
    // 自动预览初始内容
    previewMarkdown();
    
    // 初始调整编辑器高度
    setTimeout(adjustEditorHeight, 300);
}

// 设置初始示例内容
function setupInitialContent() {
    // 检查是否有全局示例内容变量
    if (window.exampleMarkdown) {
        editor.setValue(window.exampleMarkdown);
    } else if (document.getElementById('example-content')) {
        // 或者尝试从页面获取示例内容
        const exampleContent = document.getElementById('example-content').textContent;
        if (exampleContent && exampleContent.trim()) {
            editor.setValue(exampleContent.trim());
        }
    }
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
        viewportMargin: Infinity, // 确保编辑器高度自适应内容
        extraKeys: {
            "Enter": "newlineAndIndentContinueMarkdownList",
            "Ctrl-A": function(cm) {
                // 阻止默认的全选行为，改为只选中编辑器内容
                cm.execCommand("selectAll");
                // 阻止事件冒泡
                return false;
            }
        },
        tabSize: 2
    });

    // 监听编辑器变化，使用节流函数
    editor.on('change', throttledPreview);
    
    // 自动调整编辑器高度
    editor.on('change', function() {
        adjustEditorHeight();
    });
    
    // 确保编辑器获得焦点，便于操作
    setTimeout(() => editor.focus(), 500);
    
    // 添加额外的键盘事件处理
    preventDefaultShortcuts();
}

// 调整编辑器高度
function adjustEditorHeight() {
    const content = editor.getValue();
    const lineCount = content.split('\n').length;
    
    // 最小高度为500px，每行加大约20px
    const editorHeight = Math.max(500, lineCount * 20 + 100);
    
    const editorElement = editor.getWrapperElement();
    editorElement.style.height = editorHeight + 'px';
    
    // 重新计算编辑器尺寸
    editor.refresh();
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
    // 添加对Ctrl+V的特殊支持
    editor.getWrapperElement().addEventListener('keydown', function(e) {
        // 检测Ctrl+V组合键
        if (e.ctrlKey && e.key === 'v') {
            // 阻止默认的编辑器粘贴行为
            e.stopPropagation();
            e.preventDefault();
            
            // 直接使用clipboard API获取纯文本内容
            navigator.clipboard.readText()
                .then(text => {
                    // 直接插入内容，不经过CodeMirror的默认粘贴处理
                    editor.replaceSelection(text);
                    
                    // 立即更新预览
                    setTimeout(function() {
                        previewMarkdown();
                    }, 10);
                })
                .catch(err => {
                    console.error('无法访问剪贴板:', err);
                    // 如果访问剪贴板失败，允许原生粘贴行为
                    document.execCommand('paste');
                });
            
            return false;
        }
    }, true);

    // 监听编辑器区域的粘贴事件 - 仅用于其他方式的粘贴（非Ctrl+V）
    editor.on('paste', function(cm, e) {
        // Ctrl+V已经被上面的事件处理了，此处处理右键菜单粘贴等
        if (window.ctrlVPasteActive) {
            return;
        }
        
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
        
        // 处理纯文本粘贴 - 修复特殊字符转义问题
        const text = clipboardData.getData('text/plain');
        if (text) {
            e.preventDefault(); // 阻止默认粘贴行为
            
            // 直接插入文本，不做任何转义处理
            cm.replaceSelection(text);
            return;
        }
    });
    
    // 拦截全局的粘贴事件
    document.addEventListener('paste', function(e) {
        // 检查焦点是否在编辑器中
        if (editor && editor.hasFocus()) {
            // 已经通过编辑器的paste事件处理了
            return;
        }
        
        // 如果是从右键菜单粘贴到编辑器，需要特殊处理
        const activeElement = document.activeElement;
        if (activeElement && activeElement.closest('.CodeMirror')) {
            const clipboardData = e.clipboardData || window.clipboardData;
            const text = clipboardData.getData('text/plain');
            if (text) {
                e.preventDefault();
                editor.replaceSelection(text);
                previewMarkdown();
            }
        }
    });
    
    // 监听全局的右键菜单事件
    document.addEventListener('contextmenu', function(e) {
        const element = e.target;
        // 检查右键点击是否在编辑器内
        if (element && element.closest('.CodeMirror')) {
            // 标记右键菜单激活状态
            window.rightClickPasteActive = true;
            
            // 设置一个超时来在粘贴操作后重置状态
            setTimeout(function() {
                window.rightClickPasteActive = false;
            }, 5000); // 给足够的时间进行右键粘贴
        }
    });
    
    // 为编辑器添加额外的粘贴监听器，捕获通过右键菜单的粘贴
    const editorElement = editor.getWrapperElement();
    editorElement.addEventListener('input', function(e) {
        // 如果输入是由粘贴引起的（右键菜单粘贴）
        if (e.inputType === 'insertFromPaste') {
            // 标记此次粘贴操作是正常文本粘贴，不需要处理转义
            // 在下一个事件循环中尝试修复内容
            setTimeout(function() {
                // 立即更新预览，不再尝试修复转义字符
                previewMarkdown();
            }, 0);
        }
    });
}

// 修复转义字符
function fixEscapedCharacters() {
    try {
        // 获取当前光标位置
        const cursor = editor.getCursor();
        
        // 查找粘贴的文本范围 - 多行粘贴处理
        // 首先检查当前行
        let currentLine = editor.getLine(cursor.line);
        let startLine = cursor.line;
        let endLine = cursor.line;
        
        // 向上查找可能被粘贴影响的行
        while (startLine > 0) {
            const prevLine = editor.getLine(startLine - 1);
            // 如果有大量转义符号，认为这行也是粘贴的一部分
            if (prevLine && (prevLine.includes('\\[') || prevLine.includes('\\]') || 
                prevLine.includes('\\(') || prevLine.includes('\\)') || 
                prevLine.includes('\\!') || prevLine.includes('\\#'))) {
                startLine--;
            } else {
                break;
            }
        }
        
        // 向下查找可能被粘贴影响的行
        const lineCount = editor.lineCount();
        while (endLine < lineCount - 1) {
            const nextLine = editor.getLine(endLine + 1);
            // 如果有大量转义符号，认为这行也是粘贴的一部分
            if (nextLine && (nextLine.includes('\\[') || nextLine.includes('\\]') || 
                nextLine.includes('\\(') || nextLine.includes('\\)') || 
                nextLine.includes('\\!') || nextLine.includes('\\#'))) {
                endLine++;
            } else {
                break;
            }
        }
        
        // 处理粘贴文本范围内的所有行
        let anyChanges = false;
        for (let i = startLine; i <= endLine; i++) {
            const line = editor.getLine(i);
            
            // 检查常见的被错误转义的Markdown字符
            const fixed = line
                .replace(/\\\[/g, '[')
                .replace(/\\\]/g, ']')
                .replace(/\\\(/g, '(')
                .replace(/\\\)/g, ')')
                .replace(/\\!/g, '!')
                .replace(/\\#/g, '#')
                .replace(/\\\*/g, '*')
                .replace(/\\_/g, '_')
                .replace(/\\`/g, '`')
                .replace(/\\>/g, '>')
                .replace(/\\\|/g, '|')
                .replace(/\\-/g, '-')
                .replace(/\\\+/g, '+')
                .replace(/\\\./g, '.')
                .replace(/\\=/g, '=')
                .replace(/\\\{/g, '{')
                .replace(/\\\}/g, '}')
                .replace(/\\\\/g, '\\');
            
            // 如果内容有变化，替换当前行
            if (fixed !== line) {
                // 替换当前行内容
                const from = {line: i, ch: 0};
                const to = {line: i, ch: line.length};
                editor.replaceRange(fixed, from, to);
                anyChanges = true;
            }
        }
        
        // 如果有修改，更新预览
        if (anyChanges) {
            previewMarkdown();
        }
    } catch (error) {
        console.error('修复转义字符失败:', error);
    }
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
                // 存储原始光标位置
                const originalCursor = editor.getCursor();
                
                // 先清空编辑器再插入，以避免和现有内容混合
                editor.setValue(text);
                
                // 标记可能需要清理转义字符
                window.lastPasteNeedsCleanup = true;
                
                // 延迟修复转义字符，确保内容已完全更新
                setTimeout(function() {
                    if (window.lastPasteNeedsCleanup) {
                        fixEscapedCharacters();
                        window.lastPasteNeedsCleanup = false;
                        // 更新预览
                        previewMarkdown();
                    }
                }, 10);
                
                // 尝试恢复光标位置，如果位置有效
                if (originalCursor.line < editor.lineCount()) {
                    editor.setCursor(originalCursor);
                } else {
                    // 设置到文档末尾
                    editor.setCursor(editor.lineCount(), 0);
                }
                
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

// 防止默认快捷键行为
function preventDefaultShortcuts() {
    // 获取编辑器元素
    const editorElement = editor.getWrapperElement();
    
    // 捕获阶段添加事件监听器，这样能在事件到达文档前处理
    editorElement.addEventListener('keydown', function(e) {
        // 检查是否是编辑器获得焦点时的Ctrl+A
        if (e.ctrlKey && e.key === 'a' && editor.hasFocus()) {
            // 阻止默认行为
            e.preventDefault();
            e.stopPropagation();
            
            // 手动执行编辑器的全选命令
            editor.execCommand('selectAll');
            return false;
        }
    }, true);  // true表示在捕获阶段处理，这很重要
    
    // 处理编辑器点击，确保点击后能正确处理快捷键
    editorElement.addEventListener('click', function(e) {
        // 确保编辑器获得焦点
        if (!editor.hasFocus()) {
            editor.focus();
        }
    });
    
    // 处理编辑器区域以外的点击，以便正确处理光标状态
    document.addEventListener('click', function(e) {
        // 检查点击是否在编辑器区域外
        if (!editorElement.contains(e.target) && !e.target.closest('.toolbar')) {
            // 如果在编辑器外点击，但不是在工具栏上，则清除编辑器选择
            if (editor.hasFocus()) {
                editor.setCursor(editor.getCursor());
            }
        }
    });
} 
