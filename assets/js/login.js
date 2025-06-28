// login.js - 處理登入與註冊頁面的前端邏輯

document.addEventListener('DOMContentLoaded', () => {
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
            // 移除同組所有按鈕的 'selected' class
            [...group.children].forEach(btn => btn.classList.remove('selected'));
            // 為被點擊的按鈕加上 'selected' class
            event.target.classList.add('selected');
            // 更新選擇的變數
            variableSetter(event.target.dataset.value);
        }
    }

    genderGroup.addEventListener('click', (e) => handleButtonGroupClick(genderGroup, (val) => selectedGender = val, e));
    personalityGroup.addEventListener('click', (e) => handleButtonGroupClick(personalityGroup, (val) => selectedPersonality = val, e));


    // 登入表單提交
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage('正在登入...', 'normal');
        // ... 登入邏輯 ...
    });

    // 註冊表單提交
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!selectedGender || !selectedPersonality) {
            showMessage('請選擇性別與人生信條！', 'error');
            return;
        }

        showMessage('正在創建角色...', 'normal');

        const userData = {
            nickname: document.getElementById('register-nickname').value,
            password: document.getElementById('register-password').value,
            height: document.getElementById('register-height').value,
            weight: document.getElementById('register-weight').value,
            gender: selectedGender,
            personality: selectedPersonality
        };

        try {
            // 未來這裡會呼叫後端 API
            // const response = await fetch('/api/register', { ... });
            // const data = await response.json();
            
            // 模擬成功
            console.log("發送到後端的註冊資料:", userData);
            showMessage('角色創建成功！正在進入江湖...', 'success');

            // 創建成功後，將 session_id 存入 localStorage 並跳轉
            // localStorage.setItem('game_session_id', data.session_id); 
            localStorage.setItem('game_session_id', `session_${userData.nickname}`); // 暫時用暱稱做ID
            
            setTimeout(() => {
                window.location.href = 'index.html'; // 跳轉到遊戲主頁
            }, 1500);

        } catch (error) {
            showMessage(`創建失敗: ${error.message}`, 'error');
        }
    });

    function showMessage(msg, type) {
        messageArea.textContent = msg;
        messageArea.className = 'message-area'; // Reset class
        if (type) {
            messageArea.classList.add(type);
        }
    }
});
