const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// --- Simple concurrency limiter ---
function createLimiter(limit) {
    let activeCount = 0;
    const queue = [];

    const next = () => {
        if (queue.length === 0 || activeCount >= limit) return;
        activeCount++;
        const { fn, resolve, reject } = queue.shift();
        fn().then(resolve, reject).finally(() => {
            activeCount--;
            next();
        });
    };

    return (fn) =>
        new Promise((resolve, reject) => {
            queue.push({ fn, resolve, reject });
            next();
        });
}

let result = {};
const filePath = path.join(__dirname, 'wbw.json');

// Load existing progress
if (fs.existsSync(filePath)) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        result = raw.trim() ? JSON.parse(raw) : {};
        console.log(`📂 Loaded existing progress from ${filePath}`);
    } catch (err) {
        console.error("⚠️ Error reading existing file, starting fresh:", err.message);
        result = {};
    }
}

function saveProgress() {
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`💾 Saved (${fs.statSync(filePath).size} bytes)`);
}

function getResumePoint(surahMeta) {
    let lastSurah = 1;
    let lastAyah = 0;
    const surahNumbers = Object.keys(result).map(Number).sort((a, b) => a - b);
    if (surahNumbers.length > 0) {
        lastSurah = surahNumbers[surahNumbers.length - 1];
        const ayahNumbers = Object.keys(result[lastSurah]).map(Number).sort((a, b) => a - b);
        if (ayahNumbers.length > 0) {
            lastAyah = ayahNumbers[ayahNumbers.length - 1];
            if (lastAyah >= surahMeta[lastSurah - 1]) {
                lastSurah++;
                lastAyah = 0;
            }
        }
    }
    return { lastSurah, lastAyah };
}

async function fetchVerse(surah, ayah, attempt = 1) {
    const url = `https://equranlibrary.com/wordbyword/${surah}/${ayah}`;
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 20000
        });
        const $ = cheerio.load(response.data);

        const words = [];

        $('div.padding10px font[style*="font-family:AlQalam"]').each(function () {
            const arabic = $(this).text().trim();
            const englishFont = $(this).nextAll('b').first().find('font[style*="font-family:OpenSans"]');
            const english = englishFont.text().replace(/^[:\s]+/, '').trim();

            if (arabic && english) {
                words.push({ arabic, english });
            }
        });

        const fullTranslation = $('.translation-english .preformatted').text().trim();

        if (!result[surah]) result[surah] = {};
        result[surah][ayah] = {
            words,
            translation: fullTranslation || null
        };

        console.log(`✅ Surah ${surah} - Ayah ${ayah} (${words.length} words + translation)`);
        return true;
    } catch (error) {
        console.error(`❌ Error Surah ${surah}, Ayah ${ayah} (Attempt ${attempt}): ${error.message}`);
        if (attempt < 3) {
            console.log(`🔄 Retrying Surah ${surah}, Ayah ${ayah}...`);
            await new Promise(res => setTimeout(res, 2000));
            return fetchVerse(surah, ayah, attempt + 1);
        }
        return false;
    }
}

async function scrapeQuran() {
    console.log("🚀 Starting scraper...");

    const surahMeta = [
        7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
        111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73,
        54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60,
        49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
        44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19,
        26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3,
        6, 3, 5, 4, 5, 6
    ];

    const { lastSurah, lastAyah } = getResumePoint(surahMeta);
    console.log(`⏩ Resuming from Surah ${lastSurah}, Ayah ${lastAyah + 1}`);

    const limit = createLimiter(8);

    for (let surah = lastSurah; surah <= 114; surah++) {
        console.log(`📖 Surah ${surah}...`);
        const startAyah = (surah === lastSurah) ? lastAyah + 1 : 1;

        const tasks = [];
        for (let ayah = startAyah; ayah <= surahMeta[surah - 1]; ayah++) {
            tasks.push(limit(() => fetchVerse(surah, ayah)));
        }

        await Promise.allSettled(tasks);
        saveProgress();
    }

    console.log("✅ Initial scraping pass complete.");
    await checkAndFixMissing(surahMeta);
    console.log("🎉 All verses scraped successfully!");
}

// --- Check for missing ayahs and retry until fixed ---
async function checkAndFixMissing(surahMeta) {
    let missingFound = true;

    while (missingFound) {
        missingFound = false;
        const missingTasks = [];

        for (let surah = 1; surah <= 114; surah++) {
            for (let ayah = 1; ayah <= surahMeta[surah - 1]; ayah++) {
                if (!result[surah] || !result[surah][ayah]) {
                    console.warn(`⚠️ Missing Surah ${surah}, Ayah ${ayah}`);
                    missingFound = true;
                    missingTasks.push(fetchVerse(surah, ayah));
                }
            }
        }

        if (missingTasks.length > 0) {
            console.log(`🔄 Retrying ${missingTasks.length} missing ayahs...`);
            await Promise.allSettled(missingTasks);
            saveProgress();
        }
    }
}

scrapeQuran();
