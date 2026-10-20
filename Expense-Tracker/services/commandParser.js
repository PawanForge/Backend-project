/**
 * Multilingual Natural Language Command Parser for English, Hindi, and Hinglish.
 * 
 * Maps spoken and typed natural language commands into standard structured intents:
 * - add_expense
 * - edit_expense
 * - delete_expense
 * - list_expenses
 * - search_expenses
 * - filter_expenses
 * - spending_summary
 * - spending_advice
 * - general_financial_question
 * - clarification_needed
 * 
 * Safety Rule:
 * All parsing operations return action descriptors requiring user confirmation
 * before any write/update/delete operation is committed to MongoDB!
 */

import { inferCategoryFromTitle } from "./aiService.js";
import { normalizeNumberWords, resolveRelativeDate, detectLanguage } from "./languageNormalizer.js";

/**
 * Parses a voice or text command into an actionable structured intent.
 * 
 * @param {string} rawCommand - Raw voice transcript or typed text
 * @returns {Object} Structured intent response
 */
export function parseCommand(rawCommand) {
    if (!rawCommand || typeof rawCommand !== "string" || rawCommand.trim() === "") {
        return {
            intent: "clarification_needed",
            success: false,
            message: "No command detected. Please speak or type an instruction (e.g., 'Add 500 rupees for petrol')."
        };
    }

    const command = rawCommand.trim();
    const lang = detectLanguage(command);

    // 1. Normalize numbers in words ("paanch sau" -> 500, "₹500" -> "500 rupees", etc.)
    const normalized = normalizeNumberWords(command);
    const lower = normalized.toLowerCase().replace(/[.,!?;:]/g, "");

    // =========================================================================
    // 1. DELETE EXPENSE (English & Hinglish)
    // E.g.: "Mera last expense delete karo", "Delete my last expense", "Last expense hatao"
    // =========================================================================
    if (
        /(?:delete|remove|cancel|hatao|mitao)\s+(?:my\s+|mera\s+|mere\s+)?last\s+(?:expense|transaction|entry|kharcha)/i.test(lower) ||
        /(?:mera\s+|mere\s+)?last\s+(?:expense|transaction|entry|kharcha)\s+(?:ko\s+)?(?:delete|remove|hatao|mitao)\s*(?:karo|kar\s+do)?/i.test(lower)
    ) {
        return {
            intent: "delete_expense",
            target: "LAST_EXPENSE",
            requiresConfirmation: true,
            success: true,
            language: lang,
            message: lang === "hinglish"
                ? "Aapke aakhiri expense ko delete karne ki request identify hui hai. Kripya confirm kijiye."
                : "Identified request to delete your last expense. Please confirm before deleting."
        };
    }

    // =========================================================================
    // 2. EDIT EXPENSE - AMOUNT UPDATE (English & Hinglish)
    // E.g.: "Last expense ka amount 700 rupees kar do", "Edit my last expense amount to 700 rupees"
    // =========================================================================
    const editAmountHinglish = lower.match(/(?:last\s+expense|aakhiri\s+kharcha)\s+(?:ka\s+)?(?:amount|rupaye?|paisa|paise)?\s*(?:to\s+)?(\d+(?:\.\d+)?)\s*(?:rupees?|rupaye?|rs\.?)?\s*(?:kar\s+do|badlo|karo|update\s+karo)/i);
    const editAmountEnglish = lower.match(/(?:edit|change|update)\s+(?:my\s+)?last\s+expense\s+(?:amount\s+)?to\s+(?:rs\.?|inr|rupees?)?\s*(\d+(?:\.\d+)?)/i);

    const editAmountMatch = editAmountHinglish || editAmountEnglish;
    if (editAmountMatch) {
        const newAmount = parseFloat(editAmountMatch[1]);
        return {
            intent: "edit_expense",
            action: "UPDATE_AMOUNT",
            target: "LAST_EXPENSE",
            newAmount,
            requiresConfirmation: true,
            success: true,
            language: lang,
            message: lang === "hinglish"
                ? `Last expense ka amount badal kar ₹${newAmount} karne ki request identify hui hai. Kripya review karein aur confirm kijiye.`
                : `Identified request to change last expense amount to ₹${newAmount}. Please review and confirm.`
        };
    }

    // =========================================================================
    // 3. EDIT EXPENSE - CATEGORY BATCH CHANGE
    // E.g.: "Meri shopping expenses ko travel category mein change karo."
    // =========================================================================
    const catChangeMatch = lower.match(/(?:meri|mera|my)?\s*(food|travel|shopping|bills|salary|health|other)\s+expenses?\s+(?:ko\s+)?(food|travel|shopping|bills|salary|health|other)\s+category\s+(?:mein\s+)?(?:change|badlo|convert|update|shift)\s*(?:karo|kar\s+do)?/i);
    if (catChangeMatch) {
        const fromCategory = capitalize(catChangeMatch[1]);
        const toCategory = capitalize(catChangeMatch[2]);
        return {
            intent: "edit_expense",
            action: "CHANGE_CATEGORY",
            fromCategory,
            toCategory,
            requiresConfirmation: true,
            success: true,
            language: lang,
            message: lang === "hinglish"
                ? `Aapke sabhi "${fromCategory}" expenses ko "${toCategory}" category mein badalne ki request identify hui hai. Kripya confirm kijiye.`
                : `Identified request to change "${fromCategory}" expenses to "${toCategory}" category. Please review and confirm.`
        };
    }

    // =========================================================================
    // 4. OPEN EDIT FORM FOR LAST EXPENSE (English & Hinglish)
    // E.g.: "Mera last expense edit karo", "Open edit form for my last expense"
    // =========================================================================
    if (
        /(?:mera\s+|mere\s+)?last\s+(?:expense|kharcha|transaction)\s+(?:ko\s+)?(?:edit|update|badlo)\s*(?:karo|kar\s+do)?/i.test(lower) ||
        /^(?:open\s+)?(?:edit|update)(?:\s+form)?\s+(?:for\s+)?(?:my\s+)?last\s+(?:expense|transaction)/i.test(lower)
    ) {
        return {
            intent: "edit_expense",
            action: "OPEN_FORM",
            target: "LAST_EXPENSE",
            requiresConfirmation: true,
            success: true,
            language: lang,
            message: lang === "hinglish"
                ? "Aapke aakhiri expense ka edit form open kiya ja raha hai."
                : "Opening edit form for your most recent expense."
        };
    }

    // =========================================================================
    // 5. CATEGORY-SPECIFIC SPENDING QUERY (English & Hinglish)
    // E.g.: "Food category mein kitna kharch hua?", "How much did I spend on Travel?"
    // =========================================================================
    const categorySpendMatch = lower.match(/(food|travel|shopping|bills|salary|health|other)\s+(?:category\s+mein\s+kitna\s+kharch\s+hua|par\s+kitna\s+kharcha\s+hua|spending|spend)/i) ||
        lower.match(/(?:how\s+much\s+(?:did\s+i\s+spend|spent)\s+on)\s+(food|travel|shopping|bills|salary|health|other)/i);
    if (categorySpendMatch) {
        const cat = capitalize(categorySpendMatch[1]);
        return {
            intent: "spending_summary",
            scope: "CATEGORY",
            category: cat,
            success: true,
            language: lang,
            message: lang === "hinglish"
                ? `"${cat}" category ke kul kharche ka calculation kiya ja raha hai...`
                : `Calculating total spending for "${cat}" category...`
        };
    }

    // =========================================================================
    // 6. FILTER / SEARCH: THRESHOLD (English & Hinglish)
    // E.g.: "Mujhe 1000 rupees se zyada wale expenses dikhao", "Find expenses above 1000 rupees"
    // =========================================================================
    const thresholdMatch = lower.match(/(?:mujhe\s+)?(\d+(?:\.\d+)?)\s*(?:rupees?|rupaye?|rs\.?)?\s*se\s*(?:zyada|jyada|above|bade)\s*(?:wale\s+)?expenses?\s*(?:dikhao|batao|search\s+karo)?/i) ||
        lower.match(/(?:find|show|list|search)?\s*expenses?\s*(?:above|greater\s+than|more\s+than|over)\s*(?:rs\.?|inr|rupees?)?\s*(\d+(?:\.\d+)?)/i);
    if (thresholdMatch) {
        const threshold = parseFloat(thresholdMatch[1]);
        return {
            intent: "search_expenses",
            minAmount: threshold,
            success: true,
            language: lang,
            message: lang === "hinglish"
                ? `₹${threshold} se zyada wale expenses filter kiye ja rahe hain...`
                : `Filtering expenses greater than ₹${threshold}...`
        };
    }

    // =========================================================================
    // 7. FILTER: THIS MONTH (English & Hinglish)
    // E.g.: "Is month ke expenses dikhao", "Iss mahine ke expenses dikhao", "Show expenses from this month"
    // =========================================================================
    if (
        /(?:is|iss|this)\s+(?:month|mahine|mahina)\s+(?:ke\s+expenses?\s+(?:dikhao|batao|list\s+karo)|expenses?)/i.test(lower) ||
        /(?:show|display|list|view)\s+(?:expenses?\s+from\s+this\s+month|this\s+months?\s+expenses?)/i.test(lower)
    ) {
        return {
            intent: "filter_expenses",
            period: "this_month",
            success: true,
            language: lang,
            message: lang === "hinglish"
                ? "Is mahine ke transactions filter kiye ja rahe hain..."
                : "Filtering transactions from the current month..."
        };
    }

    // =========================================================================
    // 8. ADD EXPENSE / INCOME (English, Hindi, and Hinglish)
    // Examples:
    // - "Add 500 rupees for petrol."
    // - "Aaj maine 250 rupees lunch par kharch kiye, expense add karo."
    // - "Maine kal 300 rupees cab par spend kiye."
    // - "Spent 300 on groceries"
    // =========================================================================
    const isAddCommand =
        /\b(?:add|spent|spend|paid|pay|bought|record|new|expense|kharch|kharcha|diye|lagaye|lagaya)\b/i.test(lower) ||
        /\b(?:kharch\s+kiye|kharcha\s+kiya|spend\s+kiye|kharch\s+hua|bhara|add\s+karo|jodo|dalo|daalo)\b/i.test(lower);

    if (isAddCommand) {
        const addResult = parseMultilingualAdd(lower, normalized, command, lang);
        if (addResult) return addResult;
    }

    // =========================================================================
    // 9. FINANCIAL ADVICE & QUESTIONS (English & Hinglish)
    // Examples:
    // - "How can I control my expenses?"
    // - "Main apne expenses kaise control karun?"
    // - "Where am I spending too much?"
    // - "Mujhe paise save karne hain, kya karun?"
    // - "Why are my expenses increasing?"
    // - "How much can I save next month?"
    // - "Which expenses should I reduce?"
    // - "Give me a plan to save 5000 rupees per month."
    // =========================================================================
    if (
        /(?:kaise\s+control\s+karun|how\s+can\s+i\s+control|control\s+my\s+expenses|reduce\s+expenses|kharcha\s+kam\s+kaise|paise\s+kaise\s+bachaye)/i.test(lower) ||
        /(?:where\s+am\s+i\s+spending\s+too\s+much|kahan\s+zyada\s+kharch|highest\s+spending|spending\s+too\s+much)/i.test(lower) ||
        /(?:save\s+karne\s+hain|save\s+money|how\s+much\s+can\s+i\s+save|plan\s+to\s+save|bachat\s+kaise)/i.test(lower) ||
        /(?:why\s+are\s+my\s+expenses\s+increasing|kharch\s+kyun\s+badh\s+raha)/i.test(lower) ||
        /(?:which\s+expenses\s+should\s+i\s+reduce|kaunse\s+expenses\s+kam\s+karun)/i.test(lower)
    ) {
        return {
            intent: "spending_advice",
            query: command,
            success: true,
            language: lang,
            message: lang === "hinglish"
                ? "Aapke financial data ke mutabiq personalized bachat aur expense control advice calculate ki ja rahi hai..."
                : "Analyzing your expense data to generate personalized financial advice..."
        };
    }

    // =========================================================================
    // 10. GENERAL ANALYTICS QUESTIONS
    // =========================================================================
    if (/(how\s+much\s+(did\s+i|spent|spend)|total\s+spend|current\s+month\s+expense|kul\s+kharcha)/i.test(lower)) {
        return {
            intent: "spending_summary",
            period: "this_month",
            success: true,
            language: lang,
            message: "Calculating total spending for the current month..."
        };
    }

    if (/(which\s+category|highest\s+category|top\s+category|costs?\s+(me\s+)?the\s+most|sabse\s+zyada\s+kharch)/i.test(lower)) {
        return {
            intent: "spending_summary",
            scope: "TOP_CATEGORY",
            success: true,
            language: lang,
            message: "Analyzing category spending to find your highest category..."
        };
    }

    const recentMatch = lower.match(/(?:show|list|get|dikhao|batao)\s+(?:my\s+|mera\s+)?(\d+|five|three|ten|paanch)?\s*(?:most\s+)?recent\s+(?:expenses?|kharcha)/i) ||
        /(?:recent\s+expenses?|aakhiri\s+expenses?)/i.test(lower);
    if (recentMatch) {
        return {
            intent: "list_expenses",
            limit: 5,
            success: true,
            language: lang,
            message: "Fetching your recent expenses..."
        };
    }

    if (/(compare\s+(this\s+month|months?)|month\s+over\s+month|versus\s+last\s+month|pichle\s+mahine\s+se\s+compare)/i.test(lower)) {
        return {
            intent: "spending_summary",
            scope: "COMPARE_MONTHS",
            success: true,
            language: lang,
            message: "Comparing this month's spending with the previous month..."
        };
    }

    // =========================================================================
    // 11. AMBIGUOUS / CLARIFICATION NEEDED
    // If command is not understood, ask specific clarifying questions
    // =========================================================================
    return {
        intent: "clarification_needed",
        success: false,
        originalCommand: command,
        language: lang,
        message: lang === "hinglish"
            ? `Mujhe command theek se samajh nahi aayi. Aap yeh try kar sakte hain:
• "Add 500 rupees for petrol" ya "Aaj 250 lunch par kharch kiye"
• "Mera last expense edit karo" ya "Last expense ka amount 700 rupees kar do"
• "Mera last expense delete karo"
• "Food category mein kitna kharch hua?"
• "Main apne expenses kaise control karun?"`
            : `I didn't quite understand that command. Try asking:
• "Add 500 rupees for petrol"
• "Edit my last expense amount to 700 rupees"
• "Delete my last expense"
• "How much did I spend on Food?"
• "How can I control my expenses?"`
    };
}

/**
 * Handles multilingual ADD extraction for English, Hindi, and Hinglish.
 */
function parseMultilingualAdd(lower, normalized, original, lang) {
    // 1. Extract numeric amount
    // Matches numbers after optional currency indicator
    const amountMatch = lower.match(/(?:rs\.?|inr|rupees?|rupaye?|rupya)?\s*(\d+(?:\.\d+)?)\s*(?:rs\.?|inr|rupees?|rupaye?|rupya)?/i);
    if (!amountMatch || isNaN(parseFloat(amountMatch[1]))) {
        return null;
    }

    const amount = parseFloat(amountMatch[1]);
    if (amount <= 0) return null;

    // 2. Extract relative date (aaj / today, kal / yesterday)
    const { dateStr: date } = resolveRelativeDate(lower);

    // 3. Determine transaction type (income vs expense)
    let type = "expense";
    if (/\b(income|salary|stipend|kamai|aaye|earned|received|jama|credit)\b/i.test(lower)) {
        type = "income";
    }

    // 4. Extract meaningful title
    // Strip common command boilerplate words in English and Hindi/Hinglish
    const cleanWords = lower
        .replace(amountMatch[0], "")
        .replace(/\b(add|spent|spend|paid|pay|bought|record|new)\b/gi, "")
        .replace(/\b(aaj|aj|kal|maine|main|par|pe|mein|ko|se|ka|ki|ke|hua|kiye|kiya|karo|kar|do|dalo|daalo|rupees?|rupaye?|rupya|rs\.?|inr|expense|kharch|kharcha|income|today|yesterday|for|on)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

    let title = cleanWords
        ? capitalize(cleanWords)
        : (type === "income" ? "Income" : "Expense");

    // 5. Infer category
    const category = inferCategoryFromTitle(cleanWords || title);

    const message = lang === "hinglish"
        ? `Naya expense identify hua: ₹${amount} "${title}" (${category}) ke liye. Kripya review karein aur confirm karke save kijiye.`
        : `Parsed transaction: ₹${amount} for "${title}" (${category}). Please review and confirm to save.`;

    return {
        intent: "add_expense",
        success: true,
        requiresConfirmation: true, // Strict safety guarantee
        language: lang,
        payload: {
            title,
            amount,
            type,
            category,
            date,
            description: `Voice/Command logged: "${original}"`
        },
        message
    };
}

function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}
