const puppeteer = require('puppeteer');
const fs = require('fs');

const OUTPUT_FILE = 'quran_balagh.json';
const PROGRESS_FILE = 'progress_balagh.json';
const MAX_PID = 6050; // Large enough to cover all pages
const MAX_RETRIES = 3;

let quranData = {};
let progress = { pid: 1 };

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
        progress = { pid: 1 };
    }
}

function ensureSurah(surah) {
    if (!quranData[surah]) quranData[surah] = {};
}

function saveData() {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(quranData, null, 2), 'utf8');
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
    console.log(`💾 Progress saved: pid ${progress.pid}`);
}

function parseAyahId(idStr) {
    // Example: "002003" => surah 2, ayah 3
    var surah = parseInt(idStr.slice(0, 3), 10);
    var ayah = parseInt(idStr.slice(3), 10);
    return { surah, ayah };
}

function normalizeAyahText(text) {
    return text
        // Special Quranic signs
        .replace(/\uE022/g, '۞')   // Ruku
        .replace(/\uE023/g, '۩')   // Sajdah
        .replace(/\uE024/g, '۝')   // Verse separator
        .replace(/\uFD3E/g, '﴾')   // Start ornate parenthesis
        .replace(/\uFD3F/g, '﴿')   // End ornate parenthesis
        .replace(/\u06DD/g, '۝')   // Quranic end of ayah

        // Common ligatures
        .replace(/ﱁ/g, 'صلى')
        .replace(/ﱂ/g, 'قلى')
        .replace(/ﱃ/g, 'عليه')
        .replace(/ﱄ/g, 'وسلم')
        .replace(/ﱅ/g, 'رحمه')
        .replace(/ﱆ/g, 'رضي')
        .replace(/ﱇ/g, 'رضي الله عنه')
        .replace(/ﱈ/g, 'رضي الله عنها')
        .replace(/ﱉ/g, 'رضي الله عنهم')
        .replace(/\uFDFA/g, 'ﷺ') // Sallallahu Alayhi Wa Sallam

        // Ramooz al-Auqaf (Indo-Pak Mushaf style)
        .replace(/م/g, 'م')    // Stop mark: mandatory
        .replace(/ط/g, 'ط')    // Pause mark: long
        .replace(/ج/g, 'ج')    // Optional pause
        .replace(/ز/g, 'ز')    // Optional pause
        .replace(/ص/g, 'ص')    // Permitted stop
        .replace(/ق/g, 'ق')    // Necessary stop
        .replace(/لا/g, 'لا')  // Do not stop
        .replace(/س/g, 'س')    // Continuation
        .replace(/قف/g, 'قف')  // Your Mushaf “pause”
        .replace(/صل/g, 'صل')
        .replace(/قلى/g, 'قلى')
        .replace(/صلى/g, 'صلى')
        .replace(/وقفه/g, 'وقفه')
        .replace(/مر/g, 'مر')

        // Unicode Quranic marks to Indo-Pak equivalents
        .replace(/۟/g, 'قف')   // ۟ -> Mushaf pause
        .replace(/ۖ/g, 'صل')   // small sad, stop
        .replace(/ۗ/g, 'وقفه') // small waw, stop
        .replace(/ۘ/g, 'ج')    // optional stop
        .replace(/ۙ/g, 'ج')    // optional stop
        .replace(/ۚ/g, 'ز')    // optional stop
        .replace(/ۛ/g, 'س')    // continuation
        .replace(/ۜ/g, 'لا')   // do not stop
        .replace(/ۢ/g, 'م')    // mandatory stop
        .replace(/۠/g, 'ط')    // long pause
        .replace(/ۤ/g, 'ص')    // permitted stop
        .replace(/ۡ/g, 'ۡ')    // sukun
        .replace(/۬/g, '۬')    // small high meem
        .replace(/۪/g, '۪')    // shaddah
        .replace(/۫/g, '۫')    // madd
        .replace(/ۭ/g, 'ۭ')    // Quranic mark
        .replace(/ۥ/g, 'ۥ')
        .replace(/ۦ/g, 'ۦ')

        // Arabic diacritics (optional, for full Mushaf style)
        .replace(/\u064B/g, 'ً') // Fathatan
        .replace(/\u064C/g, 'ٌ') // Dammatan
        .replace(/\u064D/g, 'ٍ') // Kasratan
        .replace(/\u064E/g, 'َ') // Fatha
        .replace(/\u064F/g, 'ُ') // Damma
        .replace(/\u0650/g, 'ِ') // Kasra
        .replace(/\u0651/g, 'ّ') // Shadda
        .replace(/\u0652/g, 'ْ') // Sukun

        // Tatweel / elongation
        .replace(/\u0640/g, 'ـ')   // Arabic tatweel
        .replace(/\uE01F/g, 'ـ')   // Private-use tatweel
        .replace(/\u06E5/g, 'ۥ')
        .replace(/\u06E6/g, 'ۦ')

        // Remove any other private-use glyphs
        .replace(/[\uE000-\uF8FF]/g, '')

        .trim();
}


// function normalizeAyahText(text) {
//     return text
//         // Special Quranic signs
//         .replace(/\uE022/g, '۞') // Ruku
//         .replace(/\uE023/g, '۩') // Sajdah
//         .replace(/\uE024/g, '۝') // Verse separator
//         .replace(/\uFD3E/g, '﴾') // Start ornate parenthesis
//         .replace(/\uFD3F/g, '﴿') // End ornate parenthesis

//         // Common ligatures
//         .replace(/ﱁ/g, 'صلى')
//         .replace(/ﱂ/g, 'قلى')
//         .replace(/ﱃ/g, 'عليه')
//         .replace(/ﱄ/g, 'وسلم')
//         .replace(/ﱅ/g, 'رحمه')
//         .replace(/ﱆ/g, 'رضي')
//         .replace(/ﱇ/g, 'رضي الله عنه')
//         .replace(/ﱈ/g, 'رضي الله عنها')
//         .replace(/ﱉ/g, 'رضي الله عنهم')

//         // Ramooz al-Auqaf (Indo-Pak Mushaf style)
//         .replace(/م/g, 'م')    // Stop mark: mandatory
//         .replace(/ط/g, 'ط')    // Pause mark: long
//         .replace(/ج/g, 'ج')    // Optional pause
//         .replace(/ز/g, 'ز')    // Optional pause
//         .replace(/ص/g, 'ص')    // Permitted stop
//         .replace(/ق/g, 'ق')    // Necessary stop
//         .replace(/لا/g, 'لا')  // Do not stop
//         .replace(/س/g, 'س')    // Continuation
//         .replace(/قف/g, 'قف')  // Your Mushaf “pause”
//         .replace(/صل/g, 'صل')
//         .replace(/قلى/g, 'قلى')
//         .replace(/صلى/g, 'صلى')
//         .replace(/وقفه/g, 'وقفه')
//         .replace(/مر/g, 'مر')

//         // Unicode Quranic marks to Indo-Pak equivalents
//         .replace(/۟/g, 'قف')   // ۟ -> Mushaf pause
//         .replace(/ۖ/g, 'صل')   // small sad, stop
//         .replace(/ۗ/g, 'وقفه') // small waw, stop
//         .replace(/ۙ/g, 'ج')    // optional stop
//         .replace(/ۚ/g, 'ز')    // optional stop
//         .replace(/ۛ/g, 'س')    // continuation
//         .replace(/ۜ/g, 'لا')   // do not stop
//         .replace(/ۢ/g, 'م')    // mandatory stop
//         .replace(/۠/g, 'ط')    // long pause
//         .replace(/ۤ/g, 'ص')    // permitted stop
//         .replace(/ۡ/g, 'ۡ')    // sukun
//         .replace(/۬/g, '۬')    // small high meem
//         .replace(/۪/g, '۪')    // shaddah
//         .replace(/۫/g, '۫')    // madd
//         .replace(/ۭ/g, 'ۭ')    // quranic mark
//         .replace(/ۥ/g, 'ۥ')
//         .replace(/ۦ/g, 'ۦ')

//         // Indo-Pak elongation & small letters
//         .replace(/\uE01F/g, 'ـ')  // tatweel
//         .replace(/\u06E5/g, 'ۥ')
//         .replace(/\u06E6/g, 'ۦ')

//         // Remove unknown private-use glyphs (keep known Quranic symbols)
//         .replace(/[\uE000-\uF8FF]/g, '')

//         .trim();
// }


// function normalizeAyahText(text) {
//     return text
//         // Special Quranic signs
//         .replace(/\uE022/g, '۞') // Ruku sign
//         .replace(/\uE023/g, '۩') // Sajdah sign
//         .replace(/\uE024/g, '۝') // Verse separator
//         .replace(/\uFD3E/g, '﴾') // Start ornate parenthesis
//         .replace(/\uFD3F/g, '﴿') // End ornate parenthesis

//         // Common ligatures
//         .replace(/ﱁ/g, 'صلى')
//         .replace(/ﱂ/g, 'قلى')
//         .replace(/ﱃ/g, 'عليه')
//         .replace(/ﱄ/g, 'وسلم')
//         .replace(/ﱅ/g, 'رحمه')
//         .replace(/ﱆ/g, 'رضي')
//         .replace(/ﱇ/g, 'رضي الله عنه')
//         .replace(/ﱈ/g, 'رضي الله عنها')
//         .replace(/ﱉ/g, 'رضي الله عنهم')

//         // Ramooz al-Auqaf - preserve as-is
//         .replace(/م/g, 'م')
//         .replace(/ط/g, 'ط')
//         .replace(/ج/g, 'ج')
//         .replace(/ز/g, 'ز')
//         .replace(/ص/g, 'ص')
//         .replace(/ق/g, 'ق')
//         .replace(/لا/g, 'لا')
//         .replace(/س/g, 'س')
//         .replace(/ك/g, 'ك')
//         .replace(/ع/g, 'ع')
//         .replace(/قف/g, 'قف')
//         .replace(/صل/g, 'صل')
//         .replace(/قلى/g, 'قلى')
//         .replace(/صلى/g, 'صلى')
//         .replace(/وقفه/g, 'وقفه')
//         .replace(/مر/g, 'مر')
//         .replace(/∅/g, '∅')

//         // Small Quranic symbols
//         .replace(/ۗ/g, 'ۗ')
//         .replace(/ۙ/g, 'ۙ')
//         .replace(/ۚ/g, 'ۚ')
//         .replace(/ۛ/g, 'ۛ')
//         .replace(/ۖ/g, 'ۖ')
//         .replace(/ۘ/g, 'ۘ')
//         .replace(/ۜ/g, 'ۜ')
//         .replace(/ۢ/g, 'ۢ')
//         .replace(/۠/g, '۠')
//         .replace(/ۤ/g, 'ۤ')
//         .replace(/ۡ/g, 'ۡ')
//         .replace(/۬/g, '۬')
//         .replace(/۪/g, '۪')
//         .replace(/۫/g, '۫')
//         .replace(/ۭ/g, 'ۭ')
//         .replace(/ۥ/g, 'ۥ')
//         .replace(/ۦ/g, 'ۦ')
//         .replace(/۟/g, '۟')

//         // Indo-Pak elongation & small letters
//         .replace(/\uE01F/g, 'ـ')
//         .replace(/\u06E5/g, 'ۥ')
//         .replace(/\u06E6/g, 'ۦ')

//         // Remove private use glyphs
//         .replace(/[\uE000-\uF8FF]/g, '')

//         .trim();
// }

async function scrapePid(browser, pid) {
    for (var attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const page = await browser.newPage();
        const url = `https://www.balaghulquran.com/index.php?pid=${pid}`;
        console.log(`Fetching pid ${pid} (Attempt ${attempt})...`);
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            var allAyahs = await page.evaluate(function () {
                var results = [];
                var rows = document.querySelectorAll('.row.mb-lg-6[id]');
                rows.forEach(function (row) {
                    var idAttr = row.getAttribute('id');
                    if (!idAttr) return;

                    var arabicEl = row.querySelector('.txtArabicQuran');
                    var urduEl = row.querySelector('.txtUrduQuran');

                    var arabic = arabicEl ? arabicEl.textContent.trim() : '';
                    var urdu = urduEl ? urduEl.textContent.trim() : '';

                    // Check for hashiyah in the immediate next row
                    var hashiyah = null;
                    var nextRow = row.nextElementSibling;
                    if (nextRow && nextRow.matches('.row.mb-lg-6') &&
                        nextRow.querySelector('.col-lg-12 .txtUrdu')) {
                        hashiyah = nextRow.querySelector('.txtUrdu').textContent.trim();
                    }

                    results.push({
                        idAttr: idAttr,
                        arabic: arabic,
                        urdu: urdu,
                        hashiyah: hashiyah
                    });
                });
                return results;
            });

            await page.close();

            if (!allAyahs || allAyahs.length === 0) return null;

            allAyahs.forEach(function (ayahData) {
                var ids = parseAyahId(ayahData.idAttr);
                ensureSurah(ids.surah);
                quranData[ids.surah][ids.ayah] = {
                    arabic: normalizeAyahText(ayahData.arabic),
                    urdu: normalizeAyahText(ayahData.urdu),
                    hashiyah: ayahData.hashiyah ? normalizeAyahText(ayahData.hashiyah) : null
                };
            });

            return true;
        } catch (err) {
            console.error(`⚠️ Error: ${err.message}`);
            await page.close();
        }
    }
    return false;
}

(async function scrapeQuran() {
    const browser = await puppeteer.launch({ headless: true });
    for (var pid = progress.pid; pid <= MAX_PID; pid++) {
        await scrapePid(browser, pid);
        progress.pid = pid + 1;
        saveData();
    }
    console.log('🎉 Scraping complete!');
    await browser.close();
})();
