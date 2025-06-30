/**
 * 輔助函式：將 ISO 時間字串轉換為宋朝風格的時辰時間
 * @param {string} dateString - ISO 格式的時間字串
 * @returns {string} 格式化後的時間字串，例如 "960/06/30 子時一刻 (23:15)"
 */
export function formatSongDynastyTime(dateString) {
    try {
        const date = new Date(dateString);

        // 定義時辰
        const shichen = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
        // 定義刻
        const ke = ["初刻", "一刻", "二刻", "三刻", "四刻", "五刻", "六刻", "七刻"];

        let hour = date.getHours();
        
        // 子時 (23:00 - 00:59) 是跨日的，所以計算索引時需要特別處理
        const shichenIndex = Math.floor((hour + 1) / 2) % 12;

        // 計算當前時間在該時辰內經過了多少分鐘
        // 時辰的起始小時 (例如子時是23, 丑時是1, 寅時是3...)
        const shichenStartHour = shichenIndex === 0 ? 23 : shichenIndex * 2 - 1;
        
        let minutesIntoShichen = (hour - shichenStartHour) * 60 + date.getMinutes();
        // 處理跨日子時 (00:00-00:59)
        if (hour < shichenStartHour) {
            minutesIntoShichen += 24 * 60;
        }

        const keIndex = Math.floor(minutesIntoShichen / 15);

        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const westernTime = hour.toString().padStart(2, '0') + ":" + date.getMinutes().toString().padStart(2, '0');
        
        return `${year}/${month}/${day} ${shichen[shichenIndex]}時${ke[keIndex]} (約${westernTime})`;
    } catch (e) {
        console.error("時間格式化失敗:", e);
        return dateString; // 如果轉換失敗，回傳原始字串
    }
}
