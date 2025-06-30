第四階段：實作「迷霧系統」
目標：讓 NPC 的背景故事和物品的真實用途預設為「未知」，需要玩家透過特定條件來解鎖。

一、 後端修改：賦予世界「秘密」
1. 修改檔案：Pydantic 資料模型 (player.py)
我們要更新資料模型，讓它能夠區分「客觀真實」和「玩家認知」。

檔案: backend/app/models/player.py (完整版)

from pydantic import BaseModel, Field
from typing import List, Optional

# --- 新增/修改的模型 ---
class InventoryItem(BaseModel):
    id: str
    name: str
    description: str # 這將是玩家看到的描述 (可能是模糊的)
    quantity: int
    identified: bool # 是否已鑑定

class Relationship(BaseModel):
    id: str
    name: str
    title: str
    affinity: int
    status: str
    unlocked_backstory: List[str] # 玩家已解鎖的背景故事片段

# --- 原有的模型 ---
class PlayerStatus(BaseModel):
    health: int
    hunger: int

class PlayerAttributes(BaseModel):
    strength: int
    intelligence: int
    agility: int
    luck: int

class PlayerFaction(BaseModel):
    id: str
    name: str
    leader: str
    scale: str

# --- 修改 Player 主模型 ---
class Player(BaseModel):
    name: str
    appearance: str
    status: PlayerStatus
    attributes: PlayerAttributes
    location: str
    location_name: Optional[str] = None # 加入地點名稱
    faction: PlayerFaction
    inventory: List[InventoryItem] = Field(default_factory=list)
    relationships: List[Relationship] = Field(default_factory=list)

2. 修改檔案：資料填充服務 (seed_service.py)
我們讓初始資料包含「未鑑定」狀態和分段的背景故事。

檔案: backend/app/services/seed_service.py (完整版)

import datetime
from app.core.firebase_config import db

class SeedService:
    @staticmethod
    def seed_database():
        print("開始填充資料庫...")
        
        # --- 1. 定義初始資料 ---
        player_ref = db.collection('players').document('player_001')

        # --- 2. 寫入世界和地點 ---
        db.collection('worlds').document('main_world').set({'currentTime': datetime.datetime.now(datetime.timezone.utc), 'currentWeather': "晴朗", 'currentTemperature': 28})
        db.collection('locations').document('blackstone_village_hut').set({"name": "你的茅屋", "description": "一間簡陋但還算乾淨的茅屋..."})
        print(" -> 世界與地點資料已寫入。")

        # --- 3. 寫入玩家主資料 ---
        player_ref.set({
            'name': "阿明", 'appearance': "一個看起來有些迷茫的年輕人。", 'location': "blackstone_village_hut",
            'status': { 'health': 100, 'hunger': 80 },
            'attributes': { 'strength': 10, 'intelligence': 10, 'agility': 10, 'luck': 10 },
            'faction': { 'id': "blackstone_village", 'name': "黑石部落", 'leader': "石山", 'scale': "小型" }
        })
        print(" -> 玩家主資料已寫入。")

        # --- 4. 寫入玩家的子集合資料 ---
        inventory_ref = player_ref.collection('inventory')
        inventory_ref.document('item_glowing_stone').set({'quantity': 1, 'identified': False}) # 預設為未鑑定
        inventory_ref.document('item_worn_clothes').set({'quantity': 1, 'identified': True})  # 衣服預設為已鑑定

        relationships_ref = player_ref.collection('relationships')
        relationships_ref.document('npc_xiao_xi').set({'affinity': 25, 'status': "友善", 'unlocked_backstory_indices': [0]}) # 解鎖第0條背景
        relationships_ref.document('npc_lie_feng').set({'affinity': -15, 'status': "警惕", 'unlocked_backstory_indices': []}) # 尚未解鎖任何背景
        print(" -> 玩家子集合資料已寫入。")

        # --- 5. 寫入世界的「客觀真實」定義 ---
        db.collection('items').document('item_glowing_stone').set({'name': '奇怪的石頭', 'vague_description': '一顆在河邊撿到的、發出微光的石頭。', 'true_description': '蘊含著微弱星辰之力的星輝石，在黑暗中能提供照明。'})
        db.collection('items').document('item_worn_clothes').set({'name': '破舊的布衣', 'vague_description': '身上僅有的衣物。', 'true_description': '一件普通但耐磨的粗麻布衣。'})

        db.collection('npcs').document('npc_xiao_xi').set({'name': '小溪', 'title': '獸皮少女', 'backstory': ["她是部落巫醫的學徒。", "似乎在偷偷練習一種不為人知的草藥學。"]})
        db.collection('npcs').document('npc_lie_feng').set({'name': '烈風', 'title': '獵首', 'backstory': ["他的父親曾是部落的英雄，但在一次狩獵中犧牲。", "他對任何可能威脅部落的外來者都抱有極深的敵意。"]})
        print(" -> 世界的客觀真實定義已寫入。")

        print("資料庫填充完畢！")
        return {"status": "success", "message": "Database seeded with detailed data for Fog of War."}

seed_service = SeedService()

3. 修改檔案：遊戲服務 (game_service.py)
這是本次修改的核心，get_player_data 現在會根據玩家的「認知」來回傳不同的資訊。

檔案: backend/app/services/game_service.py (完整版)

import json
import datetime
from app.core.firebase_config import db
from app.models.action import PlayerAction
from app.services.ai_service import ai_service
from app.services.prompt_generator import generate_prompt

class GameService:
    @staticmethod
    def get_player_data(player_id: str):
        player_ref = db.collection('players').document(player_id)
        player_doc = player_ref.get()
        if not player_doc.exists: return None
        player_data = player_doc.to_dict()

        # 讀取地點名稱並加入玩家資料
        location_id = player_data.get('location')
        location_data = GameService.get_location_data(location_id)
        player_data['location_name'] = location_data.get('name', '未知地點') if location_data else '未知地點'

        # --- 關鍵修改：根據玩家認知來組合資料 ---

        # 1. 讀取 inventory 子集合並判斷描述
        inventory_list = []
        inventory_docs = player_ref.collection('inventory').stream()
        for doc in inventory_docs:
            item_id = doc.id
            player_item_data = doc.to_dict()
            item_info_doc = db.collection('items').document(item_id).get()
            if item_info_doc.exists:
                item_data = item_info_doc.to_dict()
                is_identified = player_item_data.get('identified', False)
                inventory_list.append({
                    "id": item_id,
                    "name": item_data.get('name'),
                    "description": item_data.get('true_description') if is_identified else item_data.get('vague_description', '一件神秘的物品。'),
                    "quantity": player_item_data.get('quantity'),
                    "identified": is_identified
                })
        player_data['inventory'] = inventory_list

        # 2. 讀取 relationships 子集合並篩選背景故事
        relationships_list = []
        relationship_docs = player_ref.collection('relationships').stream()
        for doc in relationship_docs:
            npc_id = doc.id
            player_relationship_data = doc.to_dict()
            npc_info_doc = db.collection('npcs').document(npc_id).get()
            if npc_info_doc.exists:
                npc_data = npc_info_doc.to_dict()
                
                # 根據玩家解鎖的索引，提取對應的背景故事
                unlocked_indices = player_relationship_data.get('unlocked_backstory_indices', [])
                full_backstory = npc_data.get('backstory', [])
                unlocked_stories = [full_backstory[i] for i in unlocked_indices if i < len(full_backstory)]
                
                relationships_list.append({
                    "id": npc_id,
                    "name": npc_data.get('name'),
                    "title": npc_data.get('title'),
                    "affinity": player_relationship_data.get('affinity'),
                    "status": player_relationship_data.get('status'),
                    "unlocked_backstory": unlocked_stories
                })
        player_data['relationships'] = relationships_list
        return player_data

    @staticmethod
    def get_world_state():
        world_ref = db.collection('worlds').document('main_world')
        world_doc = world_ref.get()
        return world_doc.to_dict() if world_doc.exists else None
    
    @staticmethod
    def get_location_data(location_id: str):
        if not location_id: return None
        location_ref = db.collection('locations').document(location_id)
        location_doc = location_ref.get()
        return location_doc.to_dict() if location_doc.exists else None
        
    @staticmethod
    def process_player_action(player_id: str, action: PlayerAction):
        player_data = GameService.get_player_data(player_id)
        world_data = GameService.get_world_state()
        location_data = GameService.get_location_data(player_data.get('location')) if player_data else {}
        if not all([player_data, world_data]): return {"status": "error"}
        prompt = generate_prompt(player_data, world_data, location_data, action.model_dump())
        ai_raw_response = ai_service.generate_narrative(prompt)
        try:
            ai_content_str = ai_raw_response['choices'][0]['message']['content']
            ai_data = json.loads(ai_content_str)
            world_changes = ai_data.get("world_changes", {})
            if world_changes:
                player_ref = db.collection('players').document(player_id)
                world_ref = db.collection('worlds').document('main_world')
                updates = {}
                time_unit = world_changes.get("time_unit", "minutes")
                time_amount = world_changes.get("time_amount", 0)
                if time_amount > 0 and isinstance(world_data['currentTime'], datetime.datetime):
                    delta = datetime.timedelta(minutes=time_amount) if time_unit == "minutes" else datetime.timedelta(hours=time_amount) if time_unit == "hours" else datetime.timedelta()
                    if delta.total_seconds() > 0:
                        new_time = world_data['currentTime'] + delta
                        updates['currentTime'] = new_time
                if updates: world_ref.update(updates)
        except Exception as e:
            print(f"[ERROR] 解析或處理 AI 回應失敗: {e}")
            return {"status": "ai_response_error"}
        next_gamestate = {
            "player": GameService.get_player_data(player_id),
            "world": GameService.get_world_state(),
            "narrative": {"description": ai_data.get("story_description"), "options": ai_data.get("options"), "atmosphere": ai_data.get("atmosphere")}
        }
        return {"status": "action_processed", "next_gamestate": next_gamestate}

game_service = GameService()

二、 前端修改
最後，我們升級 ui.js，讓它能渲染出我們剛剛處理好的「迷霧」資訊。

檔案: js/ui.js (100% 完整版)

export function updateUI(gameState) {
    if (!gameState) { 
        console.error("[UI] gameState 為空，停止更新。"); 
        return; 
    }
    requestAnimationFrame(() => {
        updateSceneInfo(gameState.player, gameState.narrative);
        updateNarrative(gameState.world, gameState.narrative);
        updateActions(gameState.narrative ? gameState.narrative.options : []);
        updateDashboard(gameState.player, gameState.world);
        updateModals(gameState.player);
    });
}

function updateSceneInfo(player, narrative) {
    const charactersContainer = document.getElementById('characters-present-container');
    if (charactersContainer) {
        // TODO: This data should come from narrative.characters in the future
        charactersContainer.innerHTML = `
            <div class="bg-[var(--bg-tertiary)] flex items-center gap-1.5 py-1 px-2.5 rounded-full"><span class="text-base">😊</span><p class="text-xs font-normal">小溪</p></div>
        `;
    }
    const atmosphereContainer = document.getElementById('scene-atmosphere-container');
    if (atmosphereContainer) {
        // TODO: This data should come from narrative.atmosphere in the future
        const atmosphere = narrative ? narrative.atmosphere : "未知";
        atmosphereContainer.innerHTML = `<div class="card py-2 px-4"><p class="font-bold text-center text-teal-500">${atmosphere}</p></div>`;
    }
}

function updateNarrative(world, narrative) {
    const container = document.getElementById('narrative-box');
    if (!container) return;

    if (world.error) {
        container.innerHTML = `<p class="text-red-500">錯誤: ${world.error}</p>`;
    } else {
        const description = narrative ? narrative.description : `你身處於你的茅屋。`;
        container.innerHTML = `<p>${description}</p>`;
        container.scrollTop = container.scrollHeight;
    }
}

function updateActions(options) {
    const container = document.getElementById('options-container');
    if (!container) return;
    
    if (options && options.length > 0) {
        container.innerHTML = options.map((option_text, index) => {
            return `<button class="action-button" data-action-type="option" data-action-value="${option_text}">${index + 1}. ${option_text}</button>`;
        }).join('');
    } else {
        container.innerHTML = `<p class="text-gray-500 text-center italic">沒有可執行的動作。</p>`;
    }
}

function updateDashboard(player, world) {
    const statusBarContainer = document.getElementById('player-status-bars-container');
    if (statusBarContainer) {
        statusBarContainer.innerHTML = `
            <div class="card"><div class="flex justify-between items-center"><h3 class="font-bold">健康</h3><span class="text-green-500 font-semibold">${player.status.health}</span></div><div class="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 mt-2"><div class="bg-green-500 h-2.5 rounded-full" style="width: ${player.status.health}%"></div></div></div>
            <div class="card"><div class="flex justify-between items-center"><h3 class="font-bold">飢餓</h3><span class="text-yellow-500 font-semibold">${player.status.hunger}</span></div><div class="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 mt-2"><div class="bg-yellow-500 h-2.5 rounded-full" style="width: ${player.status.hunger}%"></div></div></div>
        `;
    }
    
    const worldInfoContainer = document.getElementById('world-info-cards-container');
    if (worldInfoContainer) {
        const timeString = new Date(world.currentTime.value || world.currentTime).toLocaleString('zh-TW', { hour12: false });
        worldInfoContainer.innerHTML = `
            <div class="card text-center"><h3 class="font-bold text-lg">時間</h3><p class="text-[var(--text-secondary)] text-sm">${timeString}</p></div>
            <div class="card text-center"><h3 class="font-bold text-lg">地點</h3><p class="text-[var(--text-secondary)] text-sm">${player.location_name || player.location}</p></div>
            <div class="card text-center"><h3 class="font-bold text-lg">天氣</h3><p class="text-[var(--text-secondary)] text-sm">${world.currentWeather}, ${world.currentTemperature}°C</p></div>
            <div class="card !p-3"><h3 class="font-bold text-center text-lg mb-1">所屬</h3><div class="text-center text-sm text-[var(--text-secondary)]"><p>${player.faction.name}</p><p>首領: ${player.faction.leader}</p><p>規模: ${player.faction.scale}</p></div></div>
        `;
    }

    const questBox = document.getElementById('quest-box');
    if(questBox) {
        // TODO: 任務列表未來應來自 gameState.player.quests
        questBox.innerHTML = ''; 
    }
}

function updateModals(player) {
    // 更新數值彈窗
    const statsContainer = document.getElementById('stats-modal-content');
    if (statsContainer) {
        const attr = player.attributes;
        statsContainer.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div class="card"><h4 class="text-lg font-bold text-[var(--accent-color)]">力量 (${attr.strength})</h4><p class="text-sm text-[var(--text-secondary)] mt-1">影響物理傷害、負重能力與部份需要體力的行動成功率。</p></div><div class="card"><h4 class="text-lg font-bold text-[var(--accent-color)]">智力 (${attr.intelligence})</h4><p class="text-sm text-[var(--text-secondary)] mt-1">影響學習速度、觀察力、說服能力與使用複雜道具的成功率。</p></div><div class="card"><h4 class="text-lg font-bold text-[var(--accent-color)]">敏捷 (${attr.agility})</h4><p class="text-sm text-[var(--text-secondary)] mt-1">影響戰鬥中的閃避與命中率、行動速度與進行潛行等精細操作的成功率。</p></div><div class="card"><h4 class="text-lg font-bold text-[var(--accent-color)]">幸運 (${attr.luck})</h4><p class="text-sm text-[var(--text-secondary)] mt-1">一個神秘的數值，似乎會影響隨機事件的結果、物品掉落率與爆擊機率。</p></div></div>`;
    }

    // 更新人脈彈窗 (使用新資料)
    const networkContainer = document.getElementById('network-modal-content');
    if(networkContainer) {
        const relationships = player.relationships || [];
        if (relationships.length > 0) {
            networkContainer.innerHTML = relationships.map(r => `
                <div class="card">
                    <div class="flex justify-between items-center">
                        <h3 class="font-bold">${r.name} (${r.title})</h3>
                        <span class="${r.affinity >= 0 ? 'text-blue-500' : 'text-red-500'} font-semibold">${r.status} (${r.affinity})</span>
                    </div>
                    <!-- 只顯示已解鎖的背景故事 -->
                    ${r.unlocked_backstory && r.unlocked_backstory.length > 0 ? 
                        `<ul class="list-disc list-inside text-sm mt-2 text-[var(--text-secondary)]">
                            ${r.unlocked_backstory.map(story => `<li>${story}</li>`).join('')}
                        </ul>` 
                        : '<p class="text-sm text-gray-500 italic mt-1">你對此人知之甚少。</p>'
                    }
                </div>
            `).join('');
        } else {
            networkContainer.innerHTML = '<p class="text-gray-500 italic">目前沒有任何人脈關係。</p>';
        }
    }

    // 更新裝備彈窗 (使用新資料)
    const equipmentContainer = document.getElementById('equipment-modal-content');
    if(equipmentContainer) {
        const inventory = player.inventory || [];
        if (inventory.length > 0) {
            equipmentContainer.innerHTML = inventory.map(i => `
                <div class="card flex items-center space-x-4">
                    <div class="w-12 h-12 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center font-bold text-xl">${i.name.charAt(0)}</div>
                    <div>
                        <h3 class="font-bold">${i.name} (x${i.quantity}) ${i.identified ? '' : '<span class="text-sm text-red-500">(未鑑定)</span>'}</h3>
                        <p class="text-sm text-[var(--text-secondary)]">${i.description}</p>
                    </div>
                </div>
            `).join('');
        } else {
            equipmentContainer.innerHTML = '<p class="text-gray-500 italic">你的背包空空如也。</p>';
        }
    }
    
    // 更新記憶彈窗
    const memoryContainer = document.getElementById('memory-modal-content');
    if(memoryContainer) {
        // TODO: 記憶列表未來應來自 gameState.player.memories
        memoryContainer.querySelector('ul').innerHTML = '<li class="text-gray-500 italic">暫無記憶...</li>';
    }
}
