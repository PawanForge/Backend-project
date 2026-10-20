/**
 * Insights and Aggregation Service
 * 
 * Computes factual financial analytics directly from MongoDB collection "Data".
 * Adheres to rule: Answers come from actual database queries, never invented data!
 */

/**
 * Generates comprehensive spending insights, category breakdowns, and budget status.
 * 
 * @param {import("mongodb").Collection} collection - MongoDB Data collection
 * @param {number} [customBudget] - Optional monthly budget limit override
 * @returns {Promise<Object>} Aggregated analytics data
 */
export async function getSpendingInsights(collection, customBudget = null) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Format YYYY-MM prefix for current and previous month
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

    // 1. Fetch all documents
    const allRecords = await collection.find().sort({ date: -1, _id: -1 }).toArray();

    let totalExpense = 0;
    let totalIncome = 0;
    let currentMonthExpense = 0;
    let currentMonthIncome = 0;
    let previousMonthExpense = 0;

    const categoryMap = {};

    allRecords.forEach((record) => {
        const amt = Number(record.amount) || 0;
        const recordDateStr = typeof record.date === "string" ? record.date : "";
        const isCurrentMonth = recordDateStr.startsWith(currentMonthStr);
        const isPrevMonth = recordDateStr.startsWith(prevMonthStr);

        if (record.type === "income") {
            totalIncome += amt;
            if (isCurrentMonth) currentMonthIncome += amt;
        } else {
            // Default to expense
            totalExpense += amt;

            if (isCurrentMonth) {
                currentMonthExpense += amt;
            } else if (isPrevMonth) {
                previousMonthExpense += amt;
            }

            // Category aggregation
            const cat = record.category || "Other";
            if (!categoryMap[cat]) {
                categoryMap[cat] = { category: cat, total: 0, count: 0 };
            }
            categoryMap[cat].total += amt;
            categoryMap[cat].count += 1;
        }
    });

    // 2. Category Breakdown with percentages
    const categoryBreakdown = Object.values(categoryMap).map((item) => ({
        ...item,
        percentage: totalExpense > 0 ? Math.round((item.total / totalExpense) * 100) : 0
    })).sort((a, b) => b.total - a.total);

    const topCategory = categoryBreakdown[0] || null;

    // 3. Month-over-Month Comparison
    const monthlyDiff = currentMonthExpense - previousMonthExpense;
    let monthlyPercentageChange = 0;
    if (previousMonthExpense > 0) {
        monthlyPercentageChange = Math.round((monthlyDiff / previousMonthExpense) * 100);
    }

    // 4. Budget Status
    const monthlyBudget = Number(customBudget) || Number(process.env.MONTHLY_BUDGET) || 25000;
    const budgetUsedPercentage = monthlyBudget > 0 ? Math.round((currentMonthExpense / monthlyBudget) * 100) : 0;
    
    let budgetStatus = "SAFE"; // SAFE | WARNING | EXCEEDED
    let budgetWarningMessage = null;

    if (budgetUsedPercentage >= 100) {
        budgetStatus = "EXCEEDED";
        const overspent = currentMonthExpense - monthlyBudget;
        budgetWarningMessage = `⚠️ Budget Alert: You have exceeded your monthly limit of ₹${monthlyBudget.toLocaleString('en-IN')} by ₹${overspent.toLocaleString('en-IN')} (${budgetUsedPercentage}%)!`;
    } else if (budgetUsedPercentage >= 70) {
        budgetStatus = "WARNING";
        const remaining = monthlyBudget - currentMonthExpense;
        budgetWarningMessage = `⚡ Warning: You have used ${budgetUsedPercentage}% of your monthly budget. Only ₹${remaining.toLocaleString('en-IN')} remaining.`;
    }

    // Find highest individual expense
    const expenseOnly = allRecords.filter(r => r.type !== "income");
    const highestIndividualExpense = expenseOnly.length > 0
        ? expenseOnly.reduce((max, r) => (Number(r.amount) > Number(max.amount) ? r : max), expenseOnly[0])
        : null;

    const savingsCapacity = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((savingsCapacity / totalIncome) * 100) : 0;

    return {
        overall: {
            totalExpense,
            totalIncome,
            balance: savingsCapacity,
            savingsCapacity,
            savingsRate,
            totalTransactions: allRecords.length
        },
        monthlyComparison: {
            currentMonthStr,
            prevMonthStr,
            currentMonthExpense,
            currentMonthIncome,
            previousMonthExpense,
            difference: monthlyDiff,
            percentageChange: monthlyPercentageChange
        },
        categoryBreakdown,
        topCategory,
        highestIndividualExpense,
        budget: {
            monthlyBudget,
            currentMonthExpense,
            budgetUsedPercentage,
            budgetStatus,
            budgetWarningMessage
        }
    };
}

/**
 * Retrieves expenses by a specific category.
 * 
 * @param {import("mongodb").Collection} collection
 * @param {string} category
 * @returns {Promise<Array>}
 */
export async function getExpensesByCategory(collection, category) {
    return await collection.find({
        type: "expense",
        category: { $regex: new RegExp(`^${category}$`, "i") }
    }).sort({ date: -1, _id: -1 }).toArray();
}

/**
 * Retrieves the most recent expense or transaction.
 * 
 * @param {import("mongodb").Collection} collection
 * @param {string} [type='expense']
 * @returns {Promise<Object|null>}
 */
export async function getLastRecord(collection, type = "expense") {
    const filter = type ? { type } : {};
    const records = await collection.find(filter).sort({ date: -1, _id: -1 }).limit(1).toArray();
    return records[0] || null;
}

/**
 * Retrieves expenses greater than a specified threshold.
 * 
 * @param {import("mongodb").Collection} collection
 * @param {number} threshold
 * @returns {Promise<Array>}
 */
export async function getExpensesAboveThreshold(collection, threshold = 1000) {
    return await collection.find({
        type: "expense",
        amount: { $gt: Number(threshold) }
    }).sort({ amount: -1 }).toArray();
}

/**
 * Retrieves the N most recent expenses.
 * 
 * @param {import("mongodb").Collection} collection
 * @param {number} [limit=5]
 * @returns {Promise<Array>}
 */
export async function getRecentExpenses(collection, limit = 5) {
    return await collection.find({ type: "expense" })
        .sort({ date: -1, _id: -1 })
        .limit(Number(limit) || 5)
        .toArray();
}
