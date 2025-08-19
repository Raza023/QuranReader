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
    var surah = parseInt(idStr.slice(0, 3), 10);
    var ayah = parseInt(idStr.slice(3), 10);
    return { surah, ayah };
}

function normalizeAyahText(text) {
    return text
        .replace(/\uE022/g, '۞')   // Ruku
        .replace(/\uE023/g, '۩')   // Sajdah
        .replace(/\uE024/g, '۝')   // Verse separator
        .replace(/\uFD3E/g, '﴾')
        .replace(/\uFD3F/g, '﴿')
        .replace(/\u06DD/g, '۝')
        .replace(/ﱁ/g, 'صلى')
        .replace(/ﱂ/g, 'قلى')
        .replace(/ﱃ/g, 'عليه')
        .replace(/ﱄ/g, 'وسلم')
        .replace(/ﱅ/g, 'رحمه')
        .replace(/ﱆ/g, 'رضي')
        .replace(/ﱇ/g, 'رضي الله عنه')
        .replace(/ﱈ/g, 'رضي الله عنها')
        .replace(/ﱉ/g, 'رضي الله عنهم')
        .replace(/\uFDFA/g, 'ﷺ')
        .replace(/۟/g, 'قف')
        .replace(/ۖ/g, 'صل')
        .replace(/ۗ/g, 'وقفه')
        .replace(/ۘ/g, 'ج')
        .replace(/ۙ/g, 'ج')
        .replace(/ۚ/g, 'ز')
        .replace(/ۛ/g, 'س')
        .replace(/ۜ/g, 'لا')
        .replace(/ۢ/g, 'م')
        .replace(/۠/g, 'ط')
        .replace(/ۤ/g, 'ص')
        .replace(/\u064B/g, 'ً')
        .replace(/\u064C/g, 'ٌ')
        .replace(/\u064D/g, 'ٍ')
        .replace(/\u064E/g, 'َ')
        .replace(/\u064F/g, 'ُ')
        .replace(/\u0650/g, 'ِ')
        .replace(/\u0651/g, 'ّ')
        .replace(/\u0652/g, 'ْ')
        .replace(/\u0640/g, 'ـ')
        .replace(/\uE01F/g, 'ـ')
        .replace(/\u06E5/g, 'ۥ')
        .replace(/\u06E6/g, 'ۦ')
        .replace(/[\uE000-\uF8FF]/g, '')
        .trim();
}

async function scrapePid(browser, pid) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const page = await browser.newPage();
        const url = `https://www.balaghulquran.com/index.php?pid=${pid}`;
        console.log(`Fetching pid ${pid} (Attempt ${attempt})...`);
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const allAyahs = await page.evaluate(() => {
                const results = [];
                const rows = document.querySelectorAll('.row.mb-lg-6[id]');

                rows.forEach(row => {
                    const idAttr = row.getAttribute('id');
                    if (!idAttr) return;

                    const arabicEl = row.querySelector('.txtArabicQuran');
                    const urduEl = row.querySelector('.txtUrduQuran');

                    const arabic = arabicEl ? arabicEl.textContent.trim() : '';
                    const urdu = urduEl ? urduEl.textContent.trim() : '';

                    // collect all consecutive hashiyah rows
                    let hashiyahParts = [];
                    let nextRow = row.nextElementSibling;
                    while (nextRow) {
                        // stop if marker row (empty col-lg-6 etc.)
                        if (nextRow.querySelector('.col-lg-6.col-md-6.col-sm-6')) break;

                        const hashiyahEl = nextRow.querySelector('.col-lg-12 .txtUrdu');
                        if (hashiyahEl) {
                            hashiyahParts.push(hashiyahEl.textContent.trim());
                            nextRow = nextRow.nextElementSibling;
                            continue;
                        }

                        // stop if another ayah row found
                        if (nextRow.hasAttribute('id') && nextRow.querySelector('.txtArabicQuran')) {
                            break;
                        }

                        nextRow = nextRow.nextElementSibling;
                    }

                    const hashiyah = hashiyahParts.length ? hashiyahParts.join('\n\n') : null;

                    results.push({
                        idAttr,
                        arabic,
                        urdu,
                        hashiyah
                    });
                });
                return results;
            });

            await page.close();

            if (!allAyahs || allAyahs.length === 0) return null;

            allAyahs.forEach(ayahData => {
                const ids = parseAyahId(ayahData.idAttr);
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
    for (let pid = progress.pid; pid <= MAX_PID; pid++) {
        await scrapePid(browser, pid);
        progress.pid = pid + 1;
        saveData();
    }
    console.log('🎉 Scraping complete!');
    await browser.close();
})();
