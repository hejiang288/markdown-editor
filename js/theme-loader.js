/**
 * 主题加载器
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化主题
    changeTheme();
    
    // 绑定选择器变化事件
    document.getElementById('theme').addEventListener('change', changeTheme);
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
        
        // 更换主题CSS文件
        changeCssFile('theme-css', `css/themes/${theme}.css`, true);
    } catch (error) {
        console.error('更改主题失败:', error);
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
            // 需要刷新预览以应用新主题
            setTimeout(function() {
                if (typeof hljs !== 'undefined') {
                    document.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightBlock(block);
                    });
                }
                previewMarkdown();
            }, 100);
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
