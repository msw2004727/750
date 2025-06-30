export function initDashboard() {
    const dashboard = document.getElementById('info-dashboard');
    if (!dashboard) return;

    // --- 可收折面板功能 ---
    // 使用事件委派，監聽整個 dashboard 的點擊事件
    dashboard.addEventListener('click', (e) => {
        const header = e.target.closest('.section-header');
        if (!header) return;

        // 確保只有點擊圖示或標題才能觸發
        if (e.target.closest('.collapse-icon') || e.target.closest('.section-title')) {
            const container = header.closest('.section-container');
            const content = container.querySelector('.section-content');
            if (container && content) {
                const isCollapsed = container.classList.toggle('is-collapsed');
                content.classList.toggle('hidden');
                localStorage.setItem(container.id + '_collapsed', isCollapsed);
            }
        }
    });
    
    // 頁面載入時恢復所有面板的收折狀態
    document.querySelectorAll('#info-dashboard .section-container').forEach(container => {
        if (localStorage.getItem(container.id + '_collapsed') === 'true') {
            container.classList.add('is-collapsed');
            const content = container.querySelector('.section-content');
            if (content) content.classList.add('hidden');
        }
    });

    // --- 可拖曳面板功能 ---
    // 頁面載入時，恢復儲存的順序
    const savedOrder = JSON.parse(localStorage.getItem('panelOrder'));
    if (savedOrder) {
        savedOrder.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) dashboard.appendChild(panel);
        });
    }
    
    // 初始化 SortableJS
    new Sortable(dashboard, {
        animation: 150,
        handle: '.section-header',
        ghostClass: 'sortable-ghost',
        onEnd: function (evt) {
            const newOrder = Array.from(dashboard.children).map(el => el.id);
            localStorage.setItem('panelOrder', JSON.stringify(newOrder));
        },
    });
}
