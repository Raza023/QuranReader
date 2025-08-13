const puppeteer = require('puppeteer');
const fs = require('fs');

const OUTPUT_FILE = 'quran_data.json';
const PROGRESS_FILE = 'progress.json';
const BATCH_SIZE = 5; // Larger batch size for faster runs
const MAX_RETRIES = 5; // Fewer retries for speed

const surahAyatCounts = [
    0, 7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123,
    111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118,
    64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83,
    182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18,
    45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11,
    11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40,
    31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26,
    30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8,
    3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6
];

let quranData = {};
let progress = { surah: 1, ayat: 1 };

if (fs.existsSync(OUTPUT_FILE)) {
    try {
        quranData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8') || '{}');
    } catch (e) {
        quranData = {};
    }
}
if (fs.existsSync(PROGRESS_FILE)) {
    try {
        progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8') || '{}');
    } catch (e) {
        progress = { surah: 1, ayat: 1 };
    }
}

function ensureSurah(surah) {
    if (!quranData[surah]) quranData[surah] = {};
}

function saveData() {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(quranData, null, 2), 'utf8');
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
    console.log(`💾 Progress saved: Surah ${progress.surah}, Ayat ${progress.ayat}`);
}

function normalizeAyahText(text) {
    return text
        .replace(/\uE022/g, '۞') // Ruku
        .replace(/\uE023/g, '۩') // Sajdah
        .replace(/\uE024/g, '۝') // Verse separator
        .replace(/\uFD3E/g, '﴾') // Start ornate parenthesis
        .replace(/\uFD3F/g, '﴿') // End ornate parenthesis
        .replace(/ﱁ/g, 'صلى')   // Salla
        .replace(/ﱂ/g, 'قلى')   // Qala
        // Waqf marks
        .replace(/م/g, 'م').replace(/ط/g, 'ط').replace(/ج/g, 'ج')
        .replace(/ز/g, 'ز').replace(/ص/g, 'ص').replace(/ق/g, 'ق')
        .replace(/لا/g, 'لا').replace(/س/g, 'س').replace(/ك/g, 'ك')
        .replace(/ع/g, 'ع')
        // Small Quranic symbols
        .replace(/ۗ/g, 'ۗ').replace(/ۙ/g, 'ۙ').replace(/ۚ/g, 'ۚ')
        .replace(/ۛ/g, 'ۛ').replace(/ۖ/g, 'ۖ').replace(/ۘ/g, 'ۘ')
        .replace(/ۜ/g, 'ۜ').replace(/ۢ/g, 'ۢ').replace(/۠/g, '۠')
        .replace(/ۤ/g, 'ۤ').replace(/ۡ/g, 'ۡ')
        // Remove private glyphs
        .replace(/[\uE000-\uF8FF]/g, '')
        .trim();
}

async function scrapeAyah(browser, surah, ayah) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const page = await browser.newPage();
        const url = `https://read.quranexplorer.com/${surah}/${ayah}/${ayah}/IndoPak/Mishari-Rashid/Hide/Tajweed-OFF`;
        console.log(`Fetching Surah ${surah} Ayah ${ayah} (Attempt ${attempt})...`);
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForSelector('#_txt_Script_Body font.Arabic-IndoPak, #_txt_Script_Body span.Arabic-IndoPak', { timeout: 10000 });
            const text = await page.$eval('#_txt_Script_Body font.Arabic-IndoPak, #_txt_Script_Body span.Arabic-IndoPak', el => el.textContent.trim());
            await page.close();
            if (text) return normalizeAyahText(text);
        } catch (err) {
            console.error(`⚠️ Error: ${err.message}`);
            await page.close();
        }
    }
    return null;
}

(async function scrapeQuran() {
    const browser = await puppeteer.launch({ headless: true });

    async function nextSurah(surah, ayah) {
        if (surah > 114) {
            console.log('🎉 Scraping complete!');
            await browser.close();
            return;
        }
        ensureSurah(surah);
        const totalAyat = surahAyatCounts[surah];

        async function nextBatch(a) {
            if (a > totalAyat) {
                progress = { surah: surah + 1, ayat: 1 };
                saveData();
                return nextSurah(surah + 1, 1);
            }

            const tasks = [];
            for (let i = 0; i < BATCH_SIZE && a + i <= totalAyat; i++) {
                const currentAyah = a + i;
                if (!quranData[surah][currentAyah]) {
                    tasks.push(
                        (async () => {
                            const text = await scrapeAyah(browser, surah, currentAyah);
                            if (text) {
                                quranData[surah][currentAyah] = text;
                                console.log(`✅ Saved: ${surah}:${currentAyah}`);
                            } else {
                                console.log(`❌ Failed: ${surah}:${currentAyah}`);
                            }
                        })()
                    );
                }
            }

            await Promise.all(tasks);
            progress = { surah: surah, ayat: a + BATCH_SIZE };
            saveData();
            return nextBatch(a + BATCH_SIZE);
        }

        return nextBatch(ayah);
    }

    await nextSurah(progress.surah, progress.ayat);
})();
