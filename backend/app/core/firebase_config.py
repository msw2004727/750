# app/core/firebase_config.py
import firebase_admin
from firebase_admin import credentials, firestore
from . import config  # 確保 config 被執行以載入 .env

# 初始化 Firebase Admin SDK
# SDK 會自動從環境變數 GOOGLE_APPLICATION_CREDENTIALS 找到金鑰檔案
if not firebase_admin._apps:
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred, {
        'projectId': 'md-mai',  # 您的專案 ID
    })

# 建立一個全域的 firestore 客戶端物件，讓其他檔案可以共用
db = firestore.client()

print("Firebase Firestore client initialized successfully.")
