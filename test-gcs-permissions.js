const { Storage } = require("@google-cloud/storage");

async function testGCSPermissions() {
  const storage = new Storage({
    keyFilename: "./google-credentials.json",
  });

  const bucketName = "ai-platform-stt";
  const bucket = storage.bucket(bucketName);
  const testFileName = "test-permissions.txt";

  try {
    console.log("測試 Storage Object Creator 權限...");
    const file = bucket.file(testFileName);
    await file.save("test content");
    console.log("✓ 創建文件成功 - 有 storage.objects.create 權限");

    console.log("\n測試 Storage Object Viewer 權限...");
    const [exists] = await file.exists();
    console.log("✓ 檢查文件存在成功 - 有 storage.objects.get 權限");

    console.log("\n測試 Storage Object Delete 權限...");
    await file.delete();
    console.log("✓ 刪除文件成功 - 有 storage.objects.delete 權限");
  } catch (error) {
    console.error("錯誤:", error.message);
    if (error.code) {
      console.error("錯誤代碼:", error.code);
    }
  }
}

testGCSPermissions();
