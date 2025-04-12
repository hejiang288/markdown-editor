/**
 * 主题加载器
 */

document.addEventListener('DOMContentLoaded', function() {
    // 设置主题切换事件监听器
    document.getElementById('theme').addEventListener('change', function() {
        changeTheme(this.value);
    });
    
    // 初始化主题
    const initialTheme = document.getElementById('theme').value;
    changeTheme(initialTheme);
});

// 切换主题
function changeTheme(theme) {
    // 更新主题CSS链接
    const themeCssLink = document.getElementById('theme-css');
    themeCssLink.href = `css/themes/${theme}.css`;
    
    // 更新容器类
    const container = document.querySelector('.container');
    
    // 移除所有主题类
    const themeClasses = container.className.split(' ').filter(c => !c.startsWith('theme-'));
    container.className = themeClasses.join(' ');
    
    // 添加新主题类
    container.classList.add(`theme-${theme}`);
    
    // 更新预览
    if (typeof previewMarkdown === 'function') {
        previewMarkdown();
    }
    
    // 保存到本地存储
    try {
        localStorage.setItem('preferred-theme', theme);
    } catch (e) {
        console.warn('无法保存主题首选项到本地存储');
    }
}

// 加载用户偏好
function loadUserPreferences() {
    try {
        const savedTheme = localStorage.getItem('preferred-theme');
        if (savedTheme) {
            document.getElementById('theme').value = savedTheme;
            changeTheme(savedTheme);
        }
    } catch (e) {
        console.warn('无法从本地存储加载偏好设置');
    }
}

// 当文档加载完成时尝试加载用户偏好
document.addEventListener('DOMContentLoaded', loadUserPreferences);

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
            previewMarkdown();
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
