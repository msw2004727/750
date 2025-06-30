export function initModals() {
    const openStatsModalBtn = document.getElementById('open-stats-modal');
    const openMemoryModalBtn = document.getElementById('open-memory-modal');
    const openNetworkModalBtn = document.getElementById('open-network-modal');
    const openEquipmentModalBtn = document.getElementById('open-equipment-modal');

    const statsModal = document.getElementById('stats-modal');
    const memoryModal = document.getElementById('memory-modal');
    const networkModal = document.getElementById('network-modal');
    const equipmentModal = document.getElementById('equipment-modal');
    
    const modals = [statsModal, memoryModal, networkModal, equipmentModal].filter(m => m != null);
    if (modals.length === 0) return;

    function openModal(modal) {
        if (modal) modal.classList.remove('hidden');
    }

    function closeModal() {
        modals.forEach(modal => modal.classList.add('hidden'));
    }

    if(openStatsModalBtn) openStatsModalBtn.addEventListener('click', () => openModal(statsModal));
    if(openMemoryModalBtn) openMemoryModalBtn.addEventListener('click', () => openModal(memoryModal));
    if(openNetworkModalBtn) openNetworkModalBtn.addEventListener('click', () => openModal(networkModal));
    if(openEquipmentModalBtn) openEquipmentModalBtn.addEventListener('click', () => openModal(equipmentModal));

    modals.forEach(modal => {
        // 點擊背景關閉
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        // 點擊關閉按鈕
        const closeButton = modal.querySelector('.close-modal');
        if(closeButton) closeButton.addEventListener('click', closeModal);
    });

    // --- 記憶排序按鈕特定邏輯 ---
    const memorySortContainer = document.querySelector('#memory-modal .flex-wrap');
    if (memorySortContainer) {
        memorySortContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('memory-sort-btn')) {
                memorySortContainer.querySelectorAll('.memory-sort-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
    }
}
