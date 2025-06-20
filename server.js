const express = require("express");
const multer = require("multer");
const speech = require("@google-cloud/speech");
const fs = require("fs");
const path = require("path");

const app = express();

// 配置 multer 以保存有意義的檔案名
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // 使用時間戳作為檔案名
    cb(null, `audio-${Date.now()}.wav`);
  },
});

const upload = multer({ storage: storage });

// 建立 Google Cloud Speech 客戶端
const client = new speech.SpeechClient({
  keyFilename: "./google-credentials.json",
});

// 提供靜態文件
app.use(express.static("public"));

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    console.log("收到轉錄請求");

    if (!req.file) {
      console.error("未收到音訊檔案");
      return res.status(400).json({ error: "未收到音訊檔案" });
    }

    console.log("音訊檔案資訊:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    });

    // 讀取音訊檔案
    const audioBytes = fs.readFileSync(req.file.path);
    console.log("音訊檔案大小:", audioBytes.length, "bytes");

    const audio = {
      content: audioBytes.toString("base64"),
    };

    const config = {
      encoding: "LINEAR16",
      sampleRateHertz: 48000,
      languageCode: "yue-Hant-HK",
      model: "default",
      enableAutomaticPunctuation: true,
      useEnhanced: true,
      audioChannelCount: 1,
    };

    console.log("開始進行語音識別，使用配置:", config);
    const request = {
      audio: audio,
      config: config,
    };

    // 執行語音轉文字
    const [response] = await client.recognize(request);
    console.log("語音識別結果:", response);

    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join("\n");

    console.log("轉錄文字:", transcription);

    // 不再刪除音訊檔案
    // fs.unlinkSync(req.file.path);

    res.json({
      transcript: transcription,
      audioFile: req.file.filename, // 返回檔案名給前端
    });
  } catch (error) {
    console.error("轉換失敗:", error);
    res.status(500).json({ error: "轉換失敗", details: error.message });
  }
});

// 確保 uploads 目錄存在
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器運行於 port ${PORT}`);
});
