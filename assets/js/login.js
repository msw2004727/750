// 檔案: assets/js/login.js
// 版本: 1.1 - 整合後端 API 串接與頁面跳轉

document.addEventListener('DOMContentLoaded', () => {
    // 您的 Render 後端服務 URL
    const API_BASE_URL = "https://md-server-main.onrender.com";

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const messageArea = document.getElementById('message-area');
    
    const genderGroup = document.getElementById('gender-group');
    const personalityGroup = document.getElementById('personality-group');

    let selectedGender = null;
    let selectedPersonality = null;

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


    // [核心升級] 登入表單提交
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage('正在登入，請稍候...', 'normal');

        const loginData = {
            nickname: document.getElementById('login-nickname').value,
            password: document.getElementById('login-password').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `伺服器錯誤: ${response.status}`);
            }
            
            showMessage('登入成功！正在進入江湖...', 'success');

            // 將 session_id 存入 localStorage
            localStorage.setItem('game_session_id', data.session_id); 
            
            setTimeout(() => {
                window.location.href = 'index.html'; // 跳轉到遊戲主頁
            }, 1500);

        } catch (error) {
            showMessage(`登入失敗: ${error.message}`, 'error');
        }
    });

    // [核心升級] 註冊表單提交
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!selectedGender || !selectedPersonality) {
            showMessage('請選擇您的性別與人生信條！', 'error');
            return;
        }

        showMessage('正在創建角色，請稍候...', 'normal');

        const registerData = {
            nickname: document.getElementById('register-nickname').value,
            password: document.getElementById('register-password').value,
            height: document.getElementById('register-height').value,
            weight: document.getElementById('register-weight').value,
            gender: selectedGender,
            personality: selectedPersonality
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `伺服器錯誤: ${response.status}`);
            }
            
            showMessage('角色創建成功！正在進入江湖...', 'success');

            // 將 session_id 存入 localStorage
            localStorage.setItem('game_session_id', data.session_id); 
            
            setTimeout(() => {
                window.location.href = 'index.html'; // 跳轉到遊戲主頁
            }, 1500);

        } catch (error) {
            showMessage(`創建失敗: ${error.message}`, 'error');
        }
    });

    function showMessage(msg, type) {
        messageArea.textContent = msg;
        messageArea.className = 'message-area';
        if (type) {
            messageArea.classList.add(type);
        }
    }
});
