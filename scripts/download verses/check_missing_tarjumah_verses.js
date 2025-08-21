
const fs = require("fs");
const path = require("path");

const surahMeta = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
  111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73,
  54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60,
  49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
  44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19,
  26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3,
  6, 3, 5, 4, 5, 6
];

const outputDir = path.join(__dirname, "tarjumah");

function zeroPad(num, length) {
  return num.toString().padStart(length, "0");
}

let missing = [];

for (let s = 1; s <= surahMeta.length; s++) {
  const surahStr = zeroPad(s, 3);
  for (let a = 1; a <= surahMeta[s - 1]; a++) {
    const ayahStr = zeroPad(a, 3);
    const filename = `${surahStr}${ayahStr}.mp3`;
    const filePath = path.join(outputDir, filename);

    if (!fs.existsSync(filePath)) {
      missing.push(filename);
    }
  }
}

if (missing.length > 0) {
  console.log("❌ Missing files (" + missing.length + "):");
  console.log(missing.join("\n"));
} else {
  console.log("✅ All files are present!");
}
