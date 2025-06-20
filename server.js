const express = require("express");
const multer = require("multer");
const speech = require("@google-cloud/speech");
const { Storage } = require("@google-cloud/storage");
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

// 建立 Google Cloud 客戶端
const speechClient = new speech.SpeechClient({
  keyFilename: "./google-credentials.json",
});

const gcsStorage = new Storage({
  keyFilename: "./google-credentials.json",
});

// 請替換為您的 Google Cloud Storage bucket 名稱
const bucketName = "ai-platform-stt";
const bucket = gcsStorage.bucket(bucketName);

// 提供靜態文件
app.use(express.static("public"));

// 上傳檔案到 GCS
async function uploadToGCS(filePath, fileName) {
  try {
    await bucket.upload(filePath, {
      destination: fileName,
    });
    return `gs://${bucketName}/${fileName}`;
  } catch (error) {
    console.error("上傳到 GCS 失敗:", error);
    throw error;
  }
}

// 從 GCS 刪除檔案
async function deleteFromGCS(fileName) {
  try {
    await bucket.file(fileName).delete();
  } catch (error) {
    console.error("從 GCS 刪除檔案失敗:", error);
  }
}

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  let gcsUri = null;
  let fileName = null;

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

    const audioBytes = fs.readFileSync(req.file.path);
    console.log("音訊檔案大小:", audioBytes.length, "bytes");

    const config = {
      encoding: "LINEAR16",
      sampleRateHertz: 48000,
      languageCode: "yue-Hant-HK",
      model: "default",
      enableAutomaticPunctuation: true,
      useEnhanced: true,
      audioChannelCount: 1,
    };

    // 檢查音頻長度（假設 48000Hz 採樣率，16位元）
    const audioLengthInSeconds = audioBytes.length / (48000 * 2);
    let transcription = "";

    if (audioLengthInSeconds > 60) {
      console.log("使用長時間音頻識別");
      try {
        // 上傳到 GCS
        fileName = `audio-${Date.now()}.wav`;
        console.log("開始上傳到 GCS，檔案名:", fileName);
        gcsUri = await uploadToGCS(req.file.path, fileName);
        console.log("成功上傳到 GCS，URI:", gcsUri);

        const request = {
          audio: { uri: gcsUri },
          config: config,
        };

        console.log("開始長時間音頻識別，請求配置:", request);
        // 使用長時間音頻識別
        const [operation] = await speechClient.longRunningRecognize(request);
        console.log("等待識別結果...");
        const [response] = await operation.promise();
        transcription = response.results
          .map((result) => result.alternatives[0].transcript)
          .join("\n");
      } catch (error) {
        console.error("長時間音頻識別過程中發生錯誤:");
        console.error("錯誤類型:", error.constructor.name);
        console.error("錯誤訊息:", error.message);
        console.error("錯誤詳情:", error);
        if (error.code) {
          console.error("錯誤代碼:", error.code);
        }
        throw error;
      }
    } else {
      console.log("使用同步音頻識別");
      const request = {
        audio: { content: audioBytes.toString("base64") },
        config: config,
      };

      // 使用同步音頻識別
      const [response] = await speechClient.recognize(request);
      transcription = response.results
        .map((result) => result.alternatives[0].transcript)
        .join("\n");
    }

    console.log("轉錄文字:", transcription);

    res.json({
      transcript: transcription,
      audioFile: req.file.filename,
    });
  } catch (error) {
    console.error("轉換失敗:", error);
    res.status(500).json({
      error: "轉換失敗",
      details: error.message,
      code: error.code,
      name: error.name,
    });
  } finally {
    // 清理：刪除 GCS 上的檔案（如果有的話）
    if (fileName) {
      try {
        await deleteFromGCS(fileName);
        console.log("已清理 GCS 上的檔案:", fileName);
      } catch (cleanupError) {
        console.error("清理 GCS 檔案時發生錯誤:", cleanupError);
      }
    }
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
