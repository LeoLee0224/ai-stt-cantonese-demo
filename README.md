# Google Speech-to-Text 示範網站

這是一個使用 Google Cloud Speech-to-Text API 的簡單示範網站。

## 前置需求

1. Node.js 14.0.0 或更高版本
2. Google Cloud 專案和憑證
3. 啟用 Google Cloud Speech-to-Text API

## 設置步驟

1. 在 Google Cloud Console 建立專案並下載憑證檔案（JSON 格式）
2. 將憑證檔案重命名為 `google-credentials.json` 並放在專案根目錄
3. 安裝依賴項：
   ```bash
   npm install
   ```
4. 啟動開發伺服器：
   ```bash
   npm start
   ```

## 使用方法

1. 點擊麥克風按鈕開始錄音
2. 說話
3. 再次點擊按鈕停止錄音
4. 等待文字轉換結果

## 注意事項

- 請確保已正確設置 Google Cloud 憑證
- 瀏覽器需要支援麥克風功能
- 建議使用 Chrome 瀏覽器以獲得最佳體驗
