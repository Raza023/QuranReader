// download_verses.js
const fs = require("fs");
const path = require("path");
const https = require("https");
const async = require("async");

const surahMeta = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
  111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73,
  54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60,
  49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
  44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19,
  26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3,
  6, 3, 5, 4, 5, 6
];

const outputDir = path.join(__dirname, "verses");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

function zeroPad(num, length) {
  return num.toString().padStart(length, "0");
}

function downloadFile(url, dest, retries, callback) {
  const file = fs.createWriteStream(dest);

  https.get(url, res => {
    if (res.statusCode !== 200) {
      file.close();
      fs.unlink(dest, () => {
        if (retries > 0) {
          console.log("Retrying:", url);
          setTimeout(() => downloadFile(url, dest, retries - 1, callback), 1000);
        } else {
          callback(new Error("Failed: " + url));
        }
      });
      return;
    }

    res.pipe(file);
    file.on("finish", () => {
      file.close(callback);
    });
  }).on("error", err => {
    file.close();
    fs.unlink(dest, () => {
      if (retries > 0) {
        console.log("Retrying (err):", url);
        setTimeout(() => downloadFile(url, dest, retries - 1, callback), 1000);
      } else {
        callback(err);
      }
    });
  });
}

let tasks = [];
for (let s = 1; s <= surahMeta.length; s++) {
  const surahStr = zeroPad(s, 3);
  for (let a = 1; a <= surahMeta[s - 1]; a++) {
    const ayahStr = zeroPad(a, 3);
    const filename = `${surahStr}${ayahStr}.mp3`;
    const url = `https://everyayah.com/data/Alafasy_64kbps/${surahStr}${ayahStr}.mp3`;
    const dest = path.join(outputDir, filename);

    tasks.push(callback => {
      if (fs.existsSync(dest)) {
        return callback(); // skip if already downloaded
      }
      downloadFile(url, dest, 3, callback);
    });
  }
}

// Run with concurrency (e.g., 10 at a time)
async.parallelLimit(tasks, 10, err => {
  if (err) {
    console.error("Some downloads failed:", err);
  } else {
    console.log("All downloads completed!");
  }
});
