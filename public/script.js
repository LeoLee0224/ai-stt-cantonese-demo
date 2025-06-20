document.addEventListener("DOMContentLoaded", () => {
  const micButton = document.getElementById("micButton");
  const transcriptDiv = document.getElementById("transcript");
  const loadingDiv = document.getElementById("loading");
  const micIcon = micButton.querySelector(".material-icons");

  let mediaRecorder = null;
  let isRecording = false;

  // 開始錄音
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          sampleSize: 16,
        },
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 48000,
      });

      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        // 將 webm 轉換為 wav
        const blob = new Blob(chunks, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // 創建 WAV 檔案
        const wavBuffer = audioBufferToWav(audioBuffer);
        const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

        await processAudio(wavBlob);
      };

      recorder.start();
      mediaRecorder = recorder;
      isRecording = true;
      updateUI();
    } catch (error) {
      console.error("錄音失敗:", error);
      alert("無法存取麥克風，請確認權限設定。");
    }
  }

  // 停止錄音
  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      mediaRecorder = null;
      isRecording = false;
      updateUI();
      showLoading(true);
    }
  }

  // 處理音訊
  async function processAudio(audioBlob) {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("轉換失敗");
      }

      const data = await response.json();
      transcriptDiv.textContent = data.transcript || "未能識別語音，請再試一次";
    } catch (error) {
      console.error("處理音訊失敗:", error);
      alert("轉換失敗，請稍後再試。");
      transcriptDiv.textContent = "轉換失敗，請稍後再試。";
    } finally {
      showLoading(false);
    }
  }

  // 更新 UI
  function updateUI() {
    micIcon.textContent = isRecording ? "stop" : "mic";
    micButton.classList.toggle("recording", isRecording);
  }

  // 顯示/隱藏載入動畫
  function showLoading(show) {
    loadingDiv.style.display = show ? "block" : "none";
    micButton.disabled = show;
  }

  // 將 AudioBuffer 轉換為 WAV 格式
  function audioBufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2;
    const buffer2 = new ArrayBuffer(44 + length);
    const view = new DataView(buffer2);
    const channels = [];
    let sample;
    let offset = 0;
    let pos = 0;

    // 寫入 WAV 檔案頭
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2 * numOfChan, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, length, true);

    // 寫入採樣數據
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][pos]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(44 + offset, sample, true);
        offset += 2;
      }
      pos++;
    }

    return buffer2;
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // 綁定按鈕點擊事件
  micButton.addEventListener("click", () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });
});
