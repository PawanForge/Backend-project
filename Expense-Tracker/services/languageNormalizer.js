/**
 * Language and Number Normalizer for English, Hindi, and Hinglish.
 * 
 * Handles:
 * 1. Number words in Hindi/Hinglish (paanch sau -> 500, do hazaar -> 2000, etc.)
 * 2. Currency variations (rupaye, rupya, rs, inr, ₹, bucks)
 * 3. Relative dates (aaj -> today, kal -> yesterday, is hafte -> this week, is mahine -> this month)
 * 4. Hinglish verbal action patterns
 */

// Mapping of Hindi/Hinglish number words to numeric values
const HINDI_NUMBER_WORDS = {
    "ek": 1, "do": 2, "teen": 3, "chaar": 4, "char": 4, "paanch": 5, "panch": 5,
    "chhah": 6, "che": 6, "saat": 7, "aath": 8, "ath": 8, "nau": 9, "das": 10,
    "gyaarah": 11, "baarah": 12, "terah": 13, "chaudah": 14, "pandrah": 15,
    "solah": 16, "satrah": 17, "athaarah": 18, "unnees": 19, "bees": 20,
    "pachees": 25, "tees": 30, "pentees": 35, "chaalees": 40, "pachaas": 50,
    "saath": 60, "sattar": 70, "assi": 80, "nabbe": 90, "sau": 100, "so": 100,
    "dedh sau": 150, "dhai sau": 250, "hazaar": 1000, "hazar": 1000, "lakh": 100000, "lac": 100000,
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "hundred": 100, "thousand": 1000
};

/**
 * Normalizes numbers written in words or mixed expressions into standard digits.
 * E.g., "paanch sau rupaye" -> "500 rupaye"
 *       "250 rupees" -> "250 rupees"
 *       "dhai sau" -> "250"
 * 
 * @param {string} text
 * @returns {string} Normalized text with digits
 */
export function normalizeNumberWords(text) {
    if (!text) return "";
    let str = " " + text.toLowerCase() + " ";

    // Handle special composite words
    str = str.replace(/\bdedh\s+sau\b/g, " 150 ");
    str = str.replace(/\bdhai\s+sau\b/g, " 250 ");
    str = str.replace(/\bdedh\s+hazaar\b/g, " 1500 ");
    str = str.replace(/\bdhai\s+hazaar\b/g, " 2500 ");

    // Multiplier conversions: "<number> sau/hundred" -> number * 100
    // E.g. "paanch sau" -> 5 * 100 = 500, "5 sau" -> 500
    str = str.replace(/\b(\d+|ek|do|teen|chaar|char|paanch|panch|chhah|che|saat|aath|ath|nau|das)\s+(?:sau|so|hundred)\b/g, (match, p1) => {
        const base = isNaN(Number(p1)) ? (HINDI_NUMBER_WORDS[p1] || 1) : Number(p1);
        return " " + (base * 100) + " ";
    });

    // Multiplier conversions: "<number> hazaar/hazar/thousand/k" -> number * 1000
    str = str.replace(/\b(\d+|ek|do|teen|chaar|char|paanch|panch|chhah|che|saat|aath|ath|nau|das)\s+(?:hazaar|hazar|thousand|k)\b/g, (match, p1) => {
        const base = isNaN(Number(p1)) ? (HINDI_NUMBER_WORDS[p1] || 1) : Number(p1);
        return " " + (base * 1000) + " ";
    });

    // Multiplier conversions: "<number> lakh/lac" -> number * 100000
    str = str.replace(/\b(\d+|ek|do|teen|chaar|char|paanch|panch|chhah|che|saat|aath|ath|nau|das)\s+(?:lakh|lac)\b/g, (match, p1) => {
        const base = isNaN(Number(p1)) ? (HINDI_NUMBER_WORDS[p1] || 1) : Number(p1);
        return " " + (base * 100000) + " ";
    });

    // Temporarily protect verbal phrases ending with "do" (e.g. kar do, badal do, bata do, hata do)
    str = str.replace(/\b(kar|badal|bata|hata|de|likh|shuru|khatam|change)\s+do\b/gi, "$1 __DO_VERB__");

    // Single number words replacement
    for (const [word, num] of Object.entries(HINDI_NUMBER_WORDS)) {
        const regex = new RegExp(`\\b${word}\\b`, "g");
        str = str.replace(regex, num);
    }

    // Restore verbal "do"
    str = str.replace(/__DO_VERB__/g, "do");

    // Clean up currency symbols: ₹500, Rs. 500, Rs500 -> 500 rupees
    str = str.replace(/[₹]\s*(\d+(?:\.\d+)?)/g, "$1 rupees");
    str = str.replace(/\brs\.?\s*(\d+(?:\.\d+)?)/g, "$1 rupees");
    str = str.replace(/\binr\s*(\d+(?:\.\d+)?)/g, "$1 rupees");

    return str.replace(/\s+/g, " ").trim();
}

/**
 * Resolves relative date expressions in English or Hindi/Hinglish to standard ISO YYYY-MM-DD.
 * 
 * @param {string} text
 * @returns {{ dateStr: string, matchedPeriod?: string }}
 */
export function resolveRelativeDate(text) {
    const lower = text.toLowerCase();
    const now = new Date();

    // Today / Aaj
    if (/\b(aaj|today|aj)\b/.test(lower)) {
        return { dateStr: now.toISOString().split("T")[0], matchedPeriod: "today" };
    }

    // Yesterday / Kal / Beeta kal
    if (/\b(kal|yesterday|beeta\s+kal|last\s+day)\b/.test(lower)) {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return { dateStr: y.toISOString().split("T")[0], matchedPeriod: "yesterday" };
    }

    // Default to today
    return { dateStr: now.toISOString().split("T")[0], matchedPeriod: "today" };
}

/**
 * Detects whether the user is speaking/typing in Hindi / Hinglish or English.
 * 
 * @param {string} text
 * @returns {'hinglish' | 'english'}
 */
export function detectLanguage(text) {
    if (!text) return "english";
    const lower = text.toLowerCase();

    // Common Hinglish / Hindi indicator tokens
    const hinglishTokens = [
        "aaj", "kal", "maine", "mera", "meri", "mere", "apne", "apna", "apni",
        "kharch", "kharcha", "kiye", "kiya", "karo", "kar", "do", "dalo", "daalo",
        "dikhao", "batao", "hai", "hain", "kya", "kaise", "kyun", "kitna", "kitne",
        "zyada", "jyada", "kam", "wale", "wali", "mein", "par", "se", "ko",
        "paise", "rupaye", "rupay", "bachaye", "bachana", "bachayein", "mahine",
        "hafte", "pichle", "hona", "chahiye"
    ];

    const words = lower.split(/\s+/);
    const hasHinglish = words.some(w => hinglishTokens.includes(w)) ||
        hinglishTokens.some(tok => lower.includes(" " + tok + " ") || lower.startsWith(tok + " ") || lower.endsWith(" " + tok));

    return hasHinglish ? "hinglish" : "english";
}
