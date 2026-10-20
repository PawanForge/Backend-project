/**
 * AI Service for Expense Tracker
 * 
 * Provides:
 * 1. AI Expense Description & Category suggestions
 * 2. Conversational, Context-Aware Financial Advice in English & Hinglish
 * 
 * Design:
 * - If GEMINI_API_KEY is configured in .env, calls Google Gemini 1.5 Flash via native fetch.
 * - If GEMINI_API_KEY is missing, rate-limited, or fails, falls back to a comprehensive
 *   intelligent multilingual financial advisory engine grounded 100% in MongoDB facts!
 */

import { detectLanguage } from "./languageNormalizer.js";

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * Check if the Gemini API key is configured.
 */
export function isAiConfigured() {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");
}

/**
 * Generates an expense description and suggests a category.
 * 
 * @param {Object} params
 * @param {string} params.title - Expense title (e.g. "Petrol", "Grocery")
 * @param {number} params.amount - Expense amount (e.g. 500)
 * @param {string} [params.category] - Currently selected category (if any)
 * @param {string} [params.type] - "expense" or "income"
 * @returns {Promise<{ description: string, suggestedCategory: string, source: 'gemini' | 'heuristic' }>}
 */
export async function generateExpenseDescription({ title, amount, category, type = "expense" }) {
    const safeTitle = (title || "Expense").trim();
    const safeAmount = Number(amount) || 0;
    const safeType = type === "income" ? "income" : "expense";

    // Fallback heuristic function (always reliable, 0 ms latency, works offline)
    const getHeuristicResult = () => {
        let suggestedCat = category || inferCategoryFromTitle(safeTitle);
        let desc = "";

        if (safeType === "income") {
            desc = `Received ₹${safeAmount} for ${safeTitle} (${suggestedCat}).`;
        } else {
            desc = `Paid ₹${safeAmount} for ${safeTitle} categorized under ${suggestedCat}.`;
        }

        return {
            description: desc,
            suggestedCategory: suggestedCat,
            source: "heuristic"
        };
    };

    if (!isAiConfigured()) {
        return getHeuristicResult();
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY.trim();
        const url = `${GEMINI_API_ENDPOINT}?key=${apiKey}`;

        const prompt = `You are a concise financial assistant. A user has a transaction:
Title: "${safeTitle}"
Amount: ₹${safeAmount}
Type: ${safeType}
Current Category: "${category || 'None'}"

Available Categories: [Food, Travel, Shopping, Bills, Salary, Health, Other]

Respond with STRICT JSON only in the following format:
{
  "description": "A crisp, professional 1-sentence note about this transaction (max 15 words)",
  "suggestedCategory": "One of: Food, Travel, Shopping, Bills, Salary, Health, Other"
}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 150,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            console.warn(`[AI Service] Gemini API returned status ${response.status}. Falling back to heuristic.`);
            return getHeuristicResult();
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) return getHeuristicResult();

        const parsed = JSON.parse(rawText);
        return {
            description: parsed.description || getHeuristicResult().description,
            suggestedCategory: validateCategory(parsed.suggestedCategory, getHeuristicResult().suggestedCategory),
            source: "gemini"
        };
    } catch (error) {
        console.warn("[AI Service] Gemini API call failed:", error.message);
        return getHeuristicResult();
    }
}

/**
 * Generates an intelligent, context-aware answer for the AI Financial Assistant chat
 * in English or Hinglish using real MongoDB calculations.
 * 
 * @param {string} userQuestion - The question asked by the user
 * @param {Object} financialContext - Factual MongoDB aggregations & calculations
 * @returns {Promise<{ answer: string, source: 'gemini' | 'factual-engine', language: string }>}
 */
export async function generateChatResponse(userQuestion, financialContext) {
    const safeQuestion = (userQuestion || "").trim();
    const lang = detectLanguage(safeQuestion);

    // Multilingual Factual & Advisory Engine
    const buildFactualAndAdvisoryResponse = () => {
        const {
            intent,
            totalExpense = 0,
            totalIncome = 0,
            balance = 0,
            topCategory = null,
            categoryBreakdown = [],
            highestIndividualExpense = null,
            recentExpenses = [],
            currentMonthExpense = 0,
            previousMonthExpense = 0,
            expensesAboveThreshold = [],
            categorySpecificExpenses = [],
            targetCategory = null,
            totalTransactions = 0
        } = financialContext;

        const isHinglish = lang === "hinglish";

        // =========================================================================
        // 1. NO EXPENSE DATA AVAILABLE
        // =========================================================================
        if (totalTransactions === 0 || totalExpense === 0) {
            if (isHinglish) {
                return `ℹ️ **Abhi aapke database mein koi expense record nahi hai.**
Personalized advice ke liye pehle apne daily kharche add kijiye (jaise "Add 500 petrol" ya "Aaj 250 lunch").

💡 **General Budgeting Tips:**
1. **50-30-20 Rule:** Apni income ka 50% zarooraton (Needs) par, 30% chahaton (Wants) par, aur kam se kam 20% savings mein rakhein.
2. **Pay Yourself First:** Salary aate hi pehle savings alag nikal lein.
3. **Daily Tracking:** Har chhota-bada kharcha is app mein record karein.`;
            }
            return `ℹ️ **No expense records found in your database.**
To give you personalized financial insights, please add a few transactions first (e.g. "Add 500 for petrol" or "250 for lunch").

💡 **Core Budgeting Principles:**
1. **50/30/20 Rule:** Allocate 50% of income to Needs, 30% to Wants, and 20% to Savings/Investments.
2. **Pay Yourself First:** Transfer a fixed savings amount as soon as income arrives.
3. **Daily Tracking:** Log all spending to identify money leaks early.`;
        }

        // =========================================================================
        // 2. FINANCIAL ADVICE: "How can I control my expenses?" / "Main expenses kaise control karun?"
        // =========================================================================
        if (intent === "spending_advice" || /control|kam\s+karun|reduce|save|bachaye|bachana/i.test(safeQuestion)) {
            const topCatName = topCategory ? topCategory.category : "Food";
            const topCatAmount = topCategory ? `₹${topCategory.total.toLocaleString('en-IN')}` : "₹0";
            const topCatPercent = topCategory ? `${topCategory.percentage}%` : "0%";

            if (isHinglish) {
                let planMsg = "";
                // If user asked to save 5000 or specific amount
                const targetSaveMatch = safeQuestion.match(/(\d+)\s*(?:rupees|rupaye|hazaar)?/i);
                if (targetSaveMatch && Number(targetSaveMatch[1]) >= 500) {
                    const targetAmt = Number(targetSaveMatch[1]);
                    const dailyTarget = Math.round(targetAmt / 30);
                    planMsg = `\n🎯 **Monthly ₹${targetAmt.toLocaleString('en-IN')} Save Karne Ka Plan:**\n• Aapko daily lagbhag **₹${dailyTarget}** ya weekly **₹${Math.round(targetAmt / 4)}** bachana hoga.`;
                }

                return `💡 **Aapke Expenses Control Aur Bachat Karne Ka Practical Plan:**

1. 🎯 **Sabse Bada Kharcha Kam Karein:**
   Aapka sabse zyada paisa **${topCatName}** par kharch ho raha hai (**${topCatAmount}**, jo kul kharche ka **${topCatPercent}** hai). Is category par weekly limit tay karein.

2. ⚖️ **50-30-20 Budgeting Rule:**
   • **50% Needs:** Rent, bills aur basic ration.
   • **30% Wants:** Bahar ka khana, shopping, OTT (yahan se 15-20% cut karein).
   • **20% Savings:** Emergency fund aur investments.

3. 🛑 **24-Hour Cooling Rule:**
   Kisi bhi gair-zaroori shopping se pehle 24 ghante intezaar karein taaki impulse buying se bacha ja sake.
${planMsg}
4. 📱 **Sunday Review:**
   Har Sunday is Expense Tracker mein pichle hafte ka total check karein taaki mahine ke aakhiri dino mein budget out of control na ho.`;
            }

            return `💡 **Personalized Strategy to Control Your Expenses & Save More:**

1. 🎯 **Target Your Primary Expense Leak:**
   Your highest spending is in **${topCatName}** (**${topCatAmount}**, which represents **${topCatPercent}** of your total spending). Putting a weekly cap on ${topCatName} will produce the fastest savings.

2. ⚖️ **Implement the 50/30/20 Rule:**
   • **50% Needs:** Fixed obligations (rent, groceries, utilities).
   • **30% Wants:** Discretionary choices (dining out, entertainment, shopping)—target cutting this by 15-20%.
   • **20% Savings:** Build an emergency fund of 3-6 months' expenses.

3. 🛑 **24-Hour Purchase Rule:**
   For any unplanned purchase above ₹1,000, wait 24 hours to eliminate emotional/impulse spending.

4. 📊 **Weekly Check-Ins:**
   Review your summary cards here every Sunday to stay under your monthly budget limit.`;
        }

        // =========================================================================
        // 3. WHERE AM I SPENDING TOO MUCH? / HIGHEST SPENDING
        // =========================================================================
        if (/where\s+am\s+i\s+spending|kahan\s+zyada|biggest\s+expense|highest/i.test(safeQuestion)) {
            const topList = categoryBreakdown.slice(0, 3).map((c, i) => `${i + 1}. **${c.category}**: ₹${c.total.toLocaleString('en-IN')} (${c.percentage}%)`).join("\n");
            const biggestSingle = highestIndividualExpense
                ? `\n📌 Sabse bada single expense: **${highestIndividualExpense.title}** (₹${Number(highestIndividualExpense.amount).toLocaleString('en-IN')} on ${highestIndividualExpense.date})`
                : "";

            if (isHinglish) {
                return `📊 **Aapke Sabse Zyada Kharch Hone Wale Categories:**\n${topList}${biggestSingle}\n\n👉 Recommendation: **${topCategory?.category || 'Top'}** category par sabse pehle dhyan dijiye kyunki yeh aapka sabse bada spending block hai.`;
            }
            return `📊 **Your Highest Spending Areas:**\n${topList}${biggestSingle}\n\n👉 Recommendation: Focus on trimming **${topCategory?.category || 'Top'}** spending first, as it has the largest impact on your cash flow.`;
        }

        // =========================================================================
        // 4. CATEGORY-SPECIFIC SPEND (e.g. "Food category mein kitna kharch hua?")
        // =========================================================================
        if (targetCategory || intent === "spending_summary" && financialContext.category) {
            const cat = targetCategory || financialContext.category;
            const match = categoryBreakdown.find(c => c.category.toLowerCase() === cat.toLowerCase());
            const catTotal = match ? match.total : 0;
            const catCount = match ? match.count : 0;
            const catPercent = match ? match.percentage : 0;

            if (isHinglish) {
                return `🏷️ **${cat} Category Ka Kharcha:**\n• Kul Rakam: **₹${catTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**\n• Transactions: **${catCount}**\n• Kul kharche ka hissa: **${catPercent}%**`;
            }
            return `🏷️ **${cat} Category Spending:**\n• Total Amount: **₹${catTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**\n• Transaction Count: **${catCount}**\n• Share of Total Expenses: **${catPercent}%**`;
        }

        // =========================================================================
        // 5. CURRENT MONTH EXPENSE
        // =========================================================================
        if (intent === "CURRENT_MONTH_EXPENSE" || intent === "ANALYTICS_CURRENT_MONTH" || /this\s+month|is\s+mahine/i.test(safeQuestion)) {
            if (isHinglish) {
                return `📅 Is mahine ka kul kharcha **₹${currentMonthExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** hai. (Aapka current net balance **₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** hai).`;
            }
            return `📅 This month's total spending is **₹${currentMonthExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**. (Current net balance is **₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**).`;
        }

        // =========================================================================
        // 6. TOP CATEGORY
        // =========================================================================
        if (intent === "TOP_CATEGORY" || intent === "ANALYTICS_TOP_CATEGORY") {
            if (isHinglish) {
                return `🏷️ Aapka sabse zyada kharcha **${topCategory.category}** category par hua hai — kul **₹${topCategory.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** (${topCategory.count} transaction(s), ${topCategory.percentage}%).`;
            }
            return `🏷️ Your highest spending category is **${topCategory.category}** with a total of **₹${topCategory.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** across ${topCategory.count} transaction(s) (${topCategory.percentage}%).`;
        }

        // =========================================================================
        // 7. RECENT EXPENSES
        // =========================================================================
        if (intent === "RECENT_EXPENSES" || intent === "ANALYTICS_RECENT" || intent === "list_expenses") {
            if (!recentExpenses.length) return isHinglish ? "Koi expenses nahi mile." : "No expenses found.";
            const list = recentExpenses.map((e, i) => `${i + 1}. **${e.title}** — ₹${Number(e.amount).toLocaleString('en-IN')} (${e.category || 'Other'}, ${e.date})`).join("\n");
            return isHinglish
                ? `📋 **Aapke haal hi ke expenses:**\n${list}`
                : `📋 **Here are your most recent expenses:**\n${list}`;
        }

        // =========================================================================
        // 8. COMPARE MONTHS
        // =========================================================================
        if (intent === "COMPARE_MONTHS" || intent === "ANALYTICS_COMPARE_MONTHS") {
            const diff = currentMonthExpense - previousMonthExpense;
            const diffFormatted = Math.abs(diff).toLocaleString('en-IN', { minimumFractionDigits: 2 });
            let trend = "";
            if (previousMonthExpense === 0) {
                trend = isHinglish ? "Pichle mahine ka koi record nahi tha direct tulna ke liye." : "No spending recorded in previous month for percentage comparison.";
            } else if (diff > 0) {
                const percent = Math.round((diff / previousMonthExpense) * 100);
                trend = isHinglish ? `Pichle mahine ke mukable kharcha **₹${diffFormatted} (+${percent}%)** badh gaya hai.` : `Spending increased by **₹${diffFormatted} (+${percent}%)** compared to last month.`;
            } else if (diff < 0) {
                const percent = Math.round((Math.abs(diff) / previousMonthExpense) * 100);
                trend = isHinglish ? `Shabash! Pichle mahine ke mukable kharcha **₹${diffFormatted} (-${percent}%)** kam hua hai.` : `Great job! Spending decreased by **₹${diffFormatted} (-${percent}%)** compared to last month.`;
            } else {
                trend = isHinglish ? "Kharcha pichle mahine ke barabar hi hai." : "Spending is exactly the same as last month.";
            }

            return `📊 **Month-over-Month Comparison:**\n• Current Month: ₹${currentMonthExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n• Previous Month: ₹${previousMonthExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n• ${trend}`;
        }

        // =========================================================================
        // 9. THRESHOLD SEARCH
        // =========================================================================
        if (intent === "EXPENSES_ABOVE_THRESHOLD" || intent === "SEARCH_ABOVE_THRESHOLD" || intent === "search_expenses") {
            if (!expensesAboveThreshold.length) {
                return isHinglish ? "Is limit se zyada ka koi expense nahi mila." : "No expenses found exceeding the specified amount.";
            }
            const list = expensesAboveThreshold.map((e, i) => `${i + 1}. **${e.title}** — ₹${Number(e.amount).toLocaleString('en-IN')} on ${e.date}`).join("\n");
            return `🔍 **${isHinglish ? 'Bade Expenses Ki List' : 'Expenses above threshold'}:**\n${list}`;
        }

        // Default Overview
        if (isHinglish) {
            return `💼 **Aapka Financial Overview:**\n• Total Income: ₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n• Total Expenses: ₹${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n• Current Balance: ₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n• Is Mahine Ka Kharch: ₹${currentMonthExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        }
        return `💼 **Your Financial Overview:**\n• Total Income: ₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n• Total Expenses: ₹${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n• Current Balance: ₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n• This Month Spending: ₹${currentMonthExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    };

    // If Gemini API is not configured, return factual & advisory engine response
    if (!isAiConfigured()) {
        return {
            answer: buildFactualAndAdvisoryResponse(),
            source: "factual-engine",
            language: lang
        };
    }

    // Call Gemini with full context, language instruction, and personal advisor persona
    try {
        const apiKey = process.env.GEMINI_API_KEY.trim();
        const url = `${GEMINI_API_ENDPOINT}?key=${apiKey}`;

        const prompt = `You are a helpful, expert Personal Financial Advisor for an Expense Tracker app.
The user asked: "${safeQuestion}"
Detected Language: ${lang.toUpperCase()} (Hinglish/Hindi or English).

VERIFIED MONGODB FACTS:
${JSON.stringify(financialContext, null, 2)}

INSTRUCTIONS:
1. Respond in the EXACT language used by the user:
   - If user spoke Hinglish (e.g., "kaise control karun", "paise save karne hain"), respond in natural, friendly Hinglish with proper financial terms.
   - If user spoke English, respond in clear, professional English.
2. Ground all numbers ONLY in the verified facts above. NEVER invent or hallucinate amounts.
3. If giving advice, provide 3 actionable, personalized recommendations targeting their highest spending categories.
4. Distinguish between factual calculations and tips.
5. End with a helpful, friendly follow-up question.
6. Format cleanly with bullet points and bold headers.`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 350
                }
            })
        });

        if (!response.ok) {
            return {
                answer: buildFactualAndAdvisoryResponse(),
                source: "factual-engine",
                language: lang
            };
        }

        const data = await response.json();
        const aiAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiAnswer) {
            return {
                answer: buildFactualAndAdvisoryResponse(),
                source: "factual-engine",
                language: lang
            };
        }

        return {
            answer: aiAnswer.trim(),
            source: "gemini",
            language: lang
        };
    } catch (error) {
        console.warn("[AI Service] Gemini chat failed:", error.message);
        return {
            answer: buildFactualAndAdvisoryResponse(),
            source: "factual-engine",
            language: lang
        };
    }
}

/**
 * Deterministic category inference from keywords in the title (English and Hindi/Hinglish).
 */
export function inferCategoryFromTitle(title) {
    const t = (title || "").toLowerCase();

    if (/petrol|diesel|fuel|uber|ola|cab|auto|bus|metro|train|flight|parking|toll|gaadi|bike|car/.test(t)) {
        return "Travel";
    }
    if (/food|lunch|dinner|breakfast|swiggy|zomato|pizza|burger|snack|tea|coffee|chai|nashta|khana|restaurant|cafe|grocery|ration|vegetable|sabzi|fruit|milk|doodh/.test(t)) {
        return "Food";
    }
    if (/bill|bijli|electricity|water|pani|wifi|broadband|internet|recharge|mobile|phone|rent|kiraya|gas|cylinder|maintenance/.test(t)) {
        return "Bills";
    }
    if (/salary|stipend|tankhwah|kamai|freelance|bonus|dividend|interest|cashback|refund/.test(t)) {
        return "Salary";
    }
    if (/medicine|dawa|doctor|hospital|clinic|pharmacy|gym|fitness|protein|test|health|dawai/.test(t)) {
        return "Health";
    }
    if (/amazon|flipkart|myntra|clothes|kapde|shoes|joota|shopping|electronics|gadget|book|books|kitab/.test(t)) {
        return "Shopping";
    }

    return "Other";
}

/**
 * Validates category against allowed set.
 */
function validateCategory(cat, fallback = "Other") {
    const allowed = ["Food", "Travel", "Shopping", "Bills", "Salary", "Health", "Other"];
    return allowed.includes(cat) ? cat : fallback;
}
