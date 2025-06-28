// 檔案: assets/js/login.js
// 版本: 1.4 - 身份選擇與介面切換邏輯

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = "https://md-server-main.onrender.com";

    // 獲取所有視圖和按鈕
    const views = {
        initial: document.getElementById('initial-choice-view'),
        login: document.getElementById('login-view'),
        register: document.getElementById('register-view'),
    };

    const btnShowLogin = document.getElementById('btn-show-login');
    const btnShowRegister = document.getElementById('btn-show-register');
    const backButtons = document.querySelectorAll('.btn-back');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    const loginMessageArea = document.getElementById('login-message-area');
    const registerMessageArea = document.getElementById('register-message-area');
    
    const genderGroup = document.getElementById('gender-group');
    const personalityGroup = document.getElementById('personality-group');

    let selectedGender = null;
    let selectedPersonality = null;

    // --- 核心：視圖切換函數 ---
    function switchView(targetViewId) {
        Object.values(views).forEach(view => {
            if (view.id === targetViewId) {
                view.classList.remove('hidden');
            } else {
                view.classList.add('hidden');
            }
        });
    }

    // --- 事件監聽 ---
    btnShowLogin.addEventListener('click', () => switchView('login-view'));
    btnShowRegister.addEventListener('click', () => switchView('register-view'));
    backButtons.forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.target));
    });

    // 處理按鈕組的單選邏輯
    function handleButtonGroupClick(group, variableSetter, event) {
        if (event.target.tagName === 'BUTTON') {
            [...group.children].forEach(btn => btn.classList.remove('selected'));
            event.target.classList.add('selected');
            variableSetter(event.target.dataset.value);
        }
    }

    genderGroup.addEventListener('click', (e) => handleButtonGroupClick(genderGroup, (val) => selectedGender = val, e));
    personalityGroup.addEventListener('click', (e) => handleButtonGroupClick(personalityGroup, (val) => selectedPersonality = val, e));

    // --- 表單提交邏輯 ---

    // 登入表單
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage(loginMessageArea, '正在登入...', 'normal');
        // ... (API 呼叫邏輯與上一版完全相同) ...
    });

    // 註冊表單
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedGender || !selectedPersonality) {
            showMessage(registerMessageArea, '請選擇性別與人生信條！', 'error');
            return;
        }
        showMessage(registerMessageArea, '正在創建角色...', 'normal');
        // ... (API 呼叫邏輯與上一版完全相同) ...
    });

    // 通用的訊息顯示函數
    function showMessage(element, msg, type) {
        element.textContent = msg;
        element.className = 'message-area';
        if (type) {
            element.classList.add(type);
        }
    }

    // 為了保持簡潔，API 呼叫的詳細程式碼已省略，
    // 請將您上一版 `login.js` 中 `loginForm` 和 `registerForm` 的 `try...catch` 區塊
    // 完整地複製到此處對應的事件監聽器中即可。
    // 注意：showMessage 的第一個參數需要改為對應的 message area 元素。
});
