/**
 * Express Router for AI and Voice Features
 * 
 * Routes:
 * - POST /api/ai/describe      -> Generates description & category suggestions
 * - POST /api/ai/command       -> Parses natural language & voice commands into structured actions
 * - POST /api/ai/chat          -> Answers user questions using verified MongoDB data
 * - GET  /api/ai/insights      -> Returns category-wise summaries, monthly comparison & budget warnings
 * 
 * Safety & Architecture:
 * - Never executes raw queries or eval().
 * - Maps all actions to allowlisted parameters.
 * - Confirms write/delete operations explicitly before execution.
 */

import { Router } from "express";
import { generateExpenseDescription, generateChatResponse, isAiConfigured } from "../services/aiService.js";
import { parseCommand } from "../services/commandParser.js";
import {
    getSpendingInsights,
    getLastRecord,
    getExpensesAboveThreshold,
    getRecentExpenses
} from "../services/insightsService.js";

export function createAiRouter(getCollection) {
    const router = Router();

    /**
     * 1. POST /api/ai/describe
     * Generates a description and category recommendation.
     */
    router.post("/describe", async (req, res) => {
        try {
            const { title, amount, category, type } = req.body;

            if (!title && !amount) {
                return res.status(400).json({
                    success: false,
                    error: "Please provide a title or amount to generate a description."
                });
            }

            const result = await generateExpenseDescription({
                title,
                amount,
                category,
                type
            });

            res.json({
                success: true,
                description: result.description,
                suggestedCategory: result.suggestedCategory,
                source: result.source,
                aiConfigured: isAiConfigured()
            });
        } catch (error) {
            console.error("[AI Routes] Describe error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to generate description. Please enter one manually."
            });
        }
    });

    /**
     * 2. POST /api/ai/command
     * Parses voice or typed natural language commands into safe, structured actions.
     */
    router.post("/command", async (req, res) => {
        try {
            const { command } = req.body;
            const collection = getCollection();

            if (!command || typeof command !== "string" || command.trim() === "") {
                return res.status(400).json({
                    success: false,
                    error: "Command cannot be empty."
                });
            }

            const parsed = parseCommand(command);

            // If intent targets the last expense, look up the actual record from MongoDB
            if (parsed.target === "LAST_EXPENSE") {
                const lastRecord = await getLastRecord(collection, "expense");

                if (!lastRecord) {
                    return res.json({
                        success: false,
                        intent: parsed.intent,
                        message: parsed.language === "hinglish"
                            ? "Database mein koi pichla expense nahi mila."
                            : "No previous expenses were found in the database to perform this action."
                    });
                }

                parsed.targetRecord = {
                    _id: lastRecord._id.toString(),
                    title: lastRecord.title,
                    amount: lastRecord.amount,
                    type: lastRecord.type,
                    category: lastRecord.category,
                    date: lastRecord.date,
                    description: lastRecord.description
                };
            }

            // If intent is changing category across expenses, count matching documents
            if (parsed.action === "CHANGE_CATEGORY") {
                const count = await collection.countDocuments({
                    type: "expense",
                    category: parsed.fromCategory
                });
                parsed.matchCount = count;
            }

            // If intent is querying a specific category total
            if (parsed.intent === "spending_summary" && parsed.category) {
                const catRecords = await collection.find({
                    type: "expense",
                    category: { $regex: new RegExp(`^${parsed.category}$`, "i") }
                }).toArray();
                const total = catRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                parsed.categoryTotal = total;
                parsed.categoryCount = catRecords.length;
            }

            res.json(parsed);
        } catch (error) {
            console.error("[AI Routes] Command parser error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to process command. Please try typing or repeating your command."
            });
        }
    });

    /**
     * 3. POST /api/ai/batch-category-update
     * Safely updates category for all matching expenses after explicit user confirmation.
     */
    router.post("/batch-category-update", async (req, res) => {
        try {
            const { fromCategory, toCategory } = req.body;
            const collection = getCollection();

            if (!fromCategory || !toCategory) {
                return res.status(400).json({ success: false, error: "Missing source or target category." });
            }

            const allowed = ["Food", "Travel", "Shopping", "Bills", "Salary", "Health", "Other"];
            if (!allowed.includes(fromCategory) || !allowed.includes(toCategory)) {
                return res.status(400).json({ success: false, error: "Invalid category selection." });
            }

            const updateResult = await collection.updateMany(
                { type: "expense", category: fromCategory },
                { $set: { category: toCategory } }
            );

            res.json({
                success: true,
                modifiedCount: updateResult.modifiedCount,
                message: `Successfully updated ${updateResult.modifiedCount} expense(s) from "${fromCategory}" to "${toCategory}".`
            });
        } catch (error) {
            console.error("[AI Routes] Batch category update error:", error);
            res.status(500).json({ success: false, error: "Failed to update categories." });
        }
    });

    /**
     * 4. POST /api/ai/chat
     * Answers queries about expenses using factual MongoDB aggregation and financial coaching.
     */
    router.post("/chat", async (req, res) => {
        try {
            const { message } = req.body;
            const collection = getCollection();

            if (!message || typeof message !== "string" || message.trim() === "") {
                return res.status(400).json({
                    success: false,
                    error: "Message cannot be empty."
                });
            }

            const parsed = parseCommand(message);
            const insights = await getSpendingInsights(collection);

            let financialContext = {
                intent: parsed.intent,
                totalExpense: insights.overall.totalExpense,
                totalIncome: insights.overall.totalIncome,
                balance: insights.overall.balance,
                currentMonthExpense: insights.monthlyComparison.currentMonthExpense,
                previousMonthExpense: insights.monthlyComparison.previousMonthExpense,
                topCategory: insights.topCategory,
                categoryBreakdown: insights.categoryBreakdown,
                highestIndividualExpense: insights.highestIndividualExpense,
                totalTransactions: insights.overall.totalTransactions,
                targetCategory: parsed.category || null,
                language: parsed.language || "english"
            };

            // Enhance context based on specific intent
            if (parsed.intent === "list_expenses" || parsed.intent === "ANALYTICS_RECENT" || parsed.intent === "RECENT_EXPENSES") {
                const limit = parsed.limit || 5;
                financialContext.recentExpenses = await getRecentExpenses(collection, limit);
            } else if (parsed.intent === "search_expenses" || parsed.intent === "SEARCH_ABOVE_THRESHOLD") {
                const threshold = parsed.minAmount || parsed.threshold || 1000;
                financialContext.expensesAboveThreshold = await getExpensesAboveThreshold(collection, threshold);
            }

            const chatResult = await generateChatResponse(message, financialContext);

            res.json({
                success: true,
                answer: chatResult.answer,
                source: chatResult.source,
                aiConfigured: isAiConfigured(),
                language: chatResult.language,
                factualData: financialContext
            });
        } catch (error) {
            console.error("[AI Routes] Chat assistant error:", error);
            res.status(500).json({
                success: false,
                error: "Could not retrieve financial data. Please try again."
            });
        }
    });

    /**
     * 4. GET /api/ai/insights
     * Returns full spending insights, category distributions, and budget status.
     */
    router.get("/insights", async (req, res) => {
        try {
            const collection = getCollection();
            const customBudget = req.query.budget ? Number(req.query.budget) : null;
            const insights = await getSpendingInsights(collection, customBudget);

            res.json({
                success: true,
                insights,
                aiConfigured: isAiConfigured()
            });
        } catch (error) {
            console.error("[AI Routes] Insights error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to generate spending insights."
            });
        }
    });

    return router;
}
