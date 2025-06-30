import { initThemeSwitcher } from './theme.js';
import { initDashboard } from './dashboard.js';
import { initModals } from './modals.js';

// 函數：用來載入 HTML 元件內容
async function loadComponent(url, containerId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not load ${url} - ${response.statusText}`);
        const text = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            // 如果是儀表板，則用附加的方式
            if (container.id === 'info-dashboard') {
                container.innerHTML += text;
            } else {
                container.innerHTML = text;
            }
        }
    } catch (error) {
        console.error('Failed to load component:', error);
    }
}

// 當整個頁面結構載入完成後執行
document.addEventListener('DOMContentLoaded', async () => {
    // 平行載入所有 HTML 元件
    await Promise.all([
        loadComponent('components/header.html', 'header-container'),
        loadComponent('components/scene-info.html', 'scene-info-container'),
        loadComponent('components/narrative.html', 'narrative-container'),
        loadComponent('components/actions.html', 'actions-container'),
        loadComponent('components/panel-player.html', 'info-dashboard'),
        loadComponent('components/panel-world.html', 'info-dashboard'),
        loadComponent('components/panel-quests.html', 'info-dashboard'),
        loadComponent('components/modals.html', 'modals-container')
    ]);

    // 所有元件的 HTML 都載入到 DOM 後，再初始化需要操作這些 DOM 的 JS 功能
    initThemeSwitcher();
    initDashboard();
    initModals();

    console.log("遊戲介面已模組化並初始化完畢。");
});
