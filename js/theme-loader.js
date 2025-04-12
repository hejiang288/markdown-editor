/**
 * 主题和代码样式加载器
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化主题和代码样式
    changeTheme();
    changeCodeStyle();
    
    // 绑定选择器变化事件
    document.getElementById('theme').addEventListener('change', changeTheme);
    document.getElementById('code-style').addEventListener('change', changeCodeStyle);
});

// 更改主题
function changeTheme() {
    try {
        const theme = document.getElementById('theme').value;
        const container = document.querySelector('.container');
        
        // 移除所有主题类
        container.classList.remove(
            'theme-default', 
            'theme-business', 
            'theme-dark', 
            'theme-elegant', 
            'theme-mdnice', 
            'theme-mdnice2', 
            'theme-mdnice3', 
            'theme-mdnice4',
            'theme-nature',
            'theme-academic',
            'theme-minimal',
            'theme-chinese',
            'theme-magazine',
            'theme-contrast'
        );
        
        // 添加选中的主题类
        container.classList.add('theme-' + theme);
        
        // 更换主题CSS文件 - 主题更改不需要立即更新预览，避免多次渲染
        changeCssFile('theme-css', `css/themes/${theme}.css`, false);
    } catch (error) {
        console.error('更改主题失败:', error);
    }
}

// 更改代码样式
function changeCodeStyle() {
    try {
        const style = document.getElementById('code-style').value;
        const preview = document.getElementById('nice');
        
        // 移除所有代码块样式类
        preview.classList.remove('code-style-default', 'code-style-modern', 'code-style-tech', 'code-style-mac');
        
        // 添加选中的样式类
        preview.classList.add('code-style-' + style);
        
        // 更换代码样式CSS文件 - 代码样式更改后需要重新高亮代码块
        changeCssFile('code-style-css', `css/code-styles/${style}.css`, true);
    } catch (error) {
        console.error('更改代码样式失败:', error);
    }
}

// 更改CSS文件
function changeCssFile(id, href, updatePreviewAfterLoad = true) {
    let link = document.getElementById(id);
    
    // 如果link元素不存在，创建一个新的
    if (!link) {
        link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
    
    // 获取完整的href URL
    const fullHref = new URL(href, window.location.href).href;
    
    // 如果href已经是当前值，不做更改
    if (link.href === fullHref) {
        return;
    }
    
    // 添加加载事件监听器
    link.onload = function() {
        console.log(`CSS文件加载完成: ${href}`);
        // 如果有预览内容，在CSS加载完成后更新预览
        if (updatePreviewAfterLoad && typeof previewMarkdown === 'function') {
            // 强制重新应用代码高亮
            if (id === 'code-style-css' && typeof hljs !== 'undefined') {
                setTimeout(function() {
                    document.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightBlock(block);
                    });
                }, 100);
            } else {
                previewMarkdown();
            }
        }
    };
    
    link.onerror = function() {
        console.error(`CSS文件加载失败: ${href}`);
    };
    
    // 设置新的href并触发加载
    link.href = href;
}

// 导出公共函数
window.changeTheme = changeTheme;
window.changeCodeStyle = changeCodeStyle; 