const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

let result = {};
const filePath = path.join(__dirname, 'wbw-urdu.json');

// Load existing data if present
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

async function fetchVerse(surah, ayah) {
    const url = `https://equranlibrary.com/wordbyword/nazar/maududi/${surah}/${ayah}`;
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const $ = cheerio.load(response.data);

        const words = [];

        // Match Arabic (red, AlQalam) and Urdu (blue, Mehr)
        $('font[style*="font-family:AlQalam"]').each(function () {
            const arabic = $(this).text().trim();
            const urduFont = $(this).nextAll('font[style*="font-family:Mehr"]').first();
            const urdu = urduFont.text().replace(/^:\s*/, '').trim(); // remove colon and spaces
            if (arabic && urdu) {
                words.push({ arabic, urdu });
            }
        });

        if (words.length === 0) {
            console.warn(`⚠️ No words found for Surah ${surah}, Ayah ${ayah}`);
            return null;
        }

        if (!result[surah]) result[surah] = {};
        result[surah][ayah] = words;
        saveProgress();

        console.log(`✅ Surah ${surah} - Ayah ${ayah} (${words.length} words)`);
        return words;
    } catch (error) {
        console.error(`❌ Error Surah ${surah}, Ayah ${ayah}:`, error.message);
        return null;
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
        26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11
    ];

    const { lastSurah, lastAyah } = getResumePoint(surahMeta);
    console.log(`⏩ Resuming from Surah ${lastSurah}, Ayah ${lastAyah + 1}`);

    for (let surah = lastSurah; surah <= 114; surah++) {
        console.log(`📖 Surah ${surah}...`);
        const startAyah = (surah === lastSurah) ? lastAyah + 1 : 1;
        for (let ayah = startAyah; ayah <= surahMeta[surah - 1]; ayah++) {
            const words = await fetchVerse(surah, ayah);
            if (!words) {
                console.warn(`⏭ Skipping Surah ${surah}, Ayah ${ayah}`);
            }
        }
    }

    console.log("🎉 Scraping complete!");
}

scrapeQuran();


/*
for verses 102 to 114

// scrape-wbw-urdu.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const lastVerseBySurah = {
  102: 8,
  103: 3,
  104: 9,
  105: 5,
  106: 4,
  107: 7,
  108: 3,
  109: 6,
  110: 3,
  111: 5,
  112: 4,
  113: 5,
  114: 6,
};

async function scrapeVerse(surah, verse) {
  const url = `https://equranlibrary.com/wordbyword/nazar/maududi/${surah}/${verse}`;
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const translations = [];

    $('.translation.center-justified > span.preformatted').each((_, elem) => {
      const fonts = $(elem).find('font');
      for (let i = 0; i < fonts.length; i += 2) {
        const arabic = $(fonts[i]).text().trim();
        let urdu = '';
        if (fonts[i + 1]) {
          urdu = $(fonts[i + 1]).text().trim();
        }
        if (arabic) translations.push({ arabic, urdu });
      }
    });

    return translations;
  } catch (error) {
    console.error(`Error fetching Surah ${surah}, Ayah ${verse}:`, error.message);
    return null;
  }
}

async function main() {
  let result = {};

  // Load existing data to resume if file exists
  if (fs.existsSync('wbw-urdu.json')) {
    try {
      const raw = fs.readFileSync('wbw-urdu.json', 'utf8');
      if (raw.trim()) result = JSON.parse(raw);
    } catch (e) {
      console.error('Error reading existing wbw-urdu.json:', e);
    }
  }

  for (let surah = 102; surah <= 114; surah++) {
    const lastVerse = lastVerseBySurah[surah];
    if (!result[surah]) result[surah] = {};
    for (let verse = 1; verse <= lastVerse; verse++) {
      if (result[surah][verse]) {
        console.log(`Skipping Surah ${surah}, Verse ${verse} (already scraped)`);
        continue; // skip already scraped
      }
      console.log(`Scraping Surah ${surah}, Verse ${verse}...`);
      const data = await scrapeVerse(surah, verse);
      if (data) {
        result[surah][verse] = data;
        // Save after each verse
        fs.writeFileSync('wbw-urdu.json', JSON.stringify(result, null, 2), 'utf8');
      } else {
        console.log(`No data for Surah ${surah}, Verse ${verse}`);
      }
      // Optional delay to be polite to the server (e.g. 500 ms)
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('Scraping complete.');
}

main();

*/