// 檔案: assets/js/login.js
// 版本: 1.5 - 補全 API 請求與響應處理邏輯

document.addEventListener('DOMContentLoaded', () => {
    // 【重要】請確保這個 URL 與您 Render 後端的公開網址一致
    const API_BASE_URL = "https://md-server-main.onrender.com";

    // --- DOM 元素獲取 ---
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

    // 【本次修改】登入表單
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage(loginMessageArea, '正在登入...', 'normal');

        const nickname = document.getElementById('login-nickname').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname, password }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `伺服器錯誤: ${response.status}`);
            }

            // 登入成功
            localStorage.setItem('game_session_id', result.session_id);
            showMessage(loginMessageArea, '登入成功！正在進入江湖...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (error) {
            showMessage(loginMessageArea, `登入失敗: ${error.message}`, 'error');
        }
    });

    // 【本次修改】註冊表單
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nickname = document.getElementById('register-nickname').value;
        const password = document.getElementById('register-password').value;
        const height = document.getElementById('register-height').value;
        const weight = document.getElementById('register-weight').value;

        if (!selectedGender || !selectedPersonality) {
            showMessage(registerMessageArea, '請選擇性別與人生信條！', 'error');
            return;
        }

        showMessage(registerMessageArea, '正在創建角色...', 'normal');

        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nickname,
                    password,
                    height,
                    weight,
                    gender: selectedGender,
                    personality: selectedPersonality
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `伺服器錯誤: ${response.status}`);
            }

            // 註冊成功
            localStorage.setItem('game_session_id', result.session_id);
            showMessage(registerMessageArea, '角色創建成功！正在進入江湖...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (error) {
            showMessage(registerMessageArea, `註冊失敗: ${error.message}`, 'error');
        }
    });

    // 通用的訊息顯示函數
    function showMessage(element, msg, type) {
        element.textContent = msg;
        element.className = 'message-area'; // Reset classes
        if (type) {
            element.classList.add(type);
        }
    }
});
