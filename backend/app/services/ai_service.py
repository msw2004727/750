import os
import requests
import openai
from abc import ABC, abstractmethod

# --- 1. 定義一個標準的 AI 服務"介面" (抽象基礎類別) ---
class BaseAIService(ABC):
    @abstractmethod
    def generate_narrative(self, prompt: str) -> dict:
        """
        根據 prompt 生成遊戲內容。
        所有 AI 服務都必須實現這個方法。
        返回一個包含敘述、選項等資訊的字典。
        """
        pass

# --- 2. 實作具體的 AI 服務 ---

class DeepSeekService(BaseAIService):
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_url = "https://api.deepseek.com/chat/completions"
        if not self.api_key:
            raise ValueError("DeepSeek API Key 未設定！")

    def generate_narrative(self, prompt: str) -> dict:
        print("[AI] 正在使用 DeepSeek 引擎...")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        # DeepSeek 的 API 請求格式
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "你是一個互動小說的劇情生成器。請根據情境，生成一段故事描述、三個給玩家的選項，並以 JSON 格式回傳結果。"},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"} # 要求輸出 JSON
        }
        
        try:
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=60)
            response.raise_for_status() # 如果狀態碼不是 2xx，則拋出異常
            print(f"[AI] DeepSeek 回應: {response.json()}")
            # 直接回傳 API 的 JSON 回應，其中應包含 'choices'
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"[AI] 呼叫 DeepSeek API 失敗: {e}")
            return {"error": "AI service failed"}


class ChatGPTService(BaseAIService):
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API Key 未設定！")
        self.client = openai.OpenAI(api_key=self.api_key)

    def generate_narrative(self, prompt: str) -> dict:
        print("[AI] 正在使用 ChatGPT 引擎...")
        try:
            response = self.client.chat.completions.create(
                model="gpt-4-0125-preview", # 或其他模型，如 gpt-3.5-turbo
                messages=[
                    {"role": "system", "content": "你是一個互動小說的劇情生成器。請根據情境，生成一段故事描述、三個給玩家的選項，並以 JSON 格式回傳結果。"},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            # 將 Pydantic 模型的回應轉為字典，其結構與 DeepSeek 相似，包含 'choices'
            response_dict = response.model_dump()
            print(f"[AI] ChatGPT 回應: {response_dict}")
            return response_dict
        except Exception as e:
            print(f"[AI] 呼叫 ChatGPT API 失敗: {e}")
            return {"error": "AI service failed"}

# --- 3. 建立一個工廠函式，根據設定回傳對應的服務實例 ---
def get_ai_service() -> BaseAIService:
    provider = os.getenv("AI_PROVIDER", "deepseek").lower()
    if provider == "chatgpt":
        return ChatGPTService()
    elif provider == "deepseek":
        return DeepSeekService()
    else:
        raise ValueError(f"不支援的 AI 供應商: {provider}")

# 建立一個全域實例供其他模組使用
ai_service = get_ai_service()
