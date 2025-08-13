const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

let result = {};
const filePath = path.join(__dirname, 'wbw-urdu.json');

// Load existing progress
if (fs.existsSync(filePath)) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        result = raw.trim() ? JSON.parse(raw) : {};
        console.log("📂 Loaded existing progress");
    } catch (err) {
        console.warn("⚠️ Error reading file, starting fresh:", err.message);
        result = {};
    }
}

function saveProgress() {
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf8');
}

function getResumePoint(surahMeta) {
    var lastSurah = 1, lastAyah = 0;
    var surahNumbers = Object.keys(result).map(Number).sort(function(a, b) { return a - b; });
    if (surahNumbers.length > 0) {
        lastSurah = surahNumbers[surahNumbers.length - 1];
        var ayahNumbers = Object.keys(result[lastSurah]).map(Number).sort(function(a, b) { return a - b; });
        if (ayahNumbers.length > 0) {
            lastAyah = ayahNumbers[ayahNumbers.length - 1];
            if (lastAyah >= surahMeta[lastSurah - 1]) {
                lastSurah++;
                lastAyah = 0;
            }
        }
    }
    return { lastSurah: lastSurah, lastAyah: lastAyah };
}

async function fetchVerse(surah, ayah) {
    var url = "https://equranlibrary.com/wordbyword/nazar/maududi/" + surah + "/" + ayah;
    try {
        var response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        var $ = cheerio.load(response.data);
        var fullArabicAyah = $('.text.center-justified > span[dir="rtl"]').first().text().trim();
        if (!fullArabicAyah) return null;
        if (!result[surah]) result[surah] = {};
        result[surah][ayah] = fullArabicAyah;
        return fullArabicAyah;
    } catch (e) {
        console.error("❌ Surah " + surah + ", Ayah " + ayah + ": " + e.message);
        return null;
    }
}

async function scrapeQuran() {
    console.log("🚀 Starting fast scraper...");

    var surahMeta = [
        7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
        111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73,
        54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60,
        49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
        44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19,
        26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 
        6, 3, 5, 4, 5, 6
    ];

    var resume = getResumePoint(surahMeta);
    console.log("⏩ Resuming from Surah " + resume.lastSurah + ", Ayah " + (resume.lastAyah + 1));

    var concurrency = 5; // Run 5 at a time to speed up
    for (var surah = resume.lastSurah; surah <= 114; surah++) {
        console.log("📖 Surah " + surah + "...");
        var startAyah = (surah === resume.lastSurah) ? resume.lastAyah + 1 : 1;
        var totalAyahs = surahMeta[surah - 1];
        var ayahs = [];
        for (var a = startAyah; a <= totalAyahs; a++) {
            ayahs.push(a);
        }

        for (var i = 0; i < ayahs.length; i += concurrency) {
            var chunk = ayahs.slice(i, i + concurrency);
            var promises = chunk.map(function(ayah) {
                return fetchVerse(surah, ayah);
            });
            var results = await Promise.all(promises);
            results.forEach(function(res, idx) {
                if (!res) console.warn("⚠️ Missing Surah " + surah + ", Ayah " + chunk[idx]);
            });
        }

        saveProgress(); // Save after each surah
    }

    console.log("🎉 Scraping complete!");
}

scrapeQuran();
