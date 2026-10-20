import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { createAiRouter } from "./routes/aiRoutes.js";
import { isAiConfigured } from "./services/aiService.js";

// Load environment variables from .env file (if present)
dotenv.config();

const app = express();

// Configuration
const PORT = process.env.PORT || 3200;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "expense";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "Data";

// ==========================================
// Middleware Configuration
// ==========================================

// 1. Template Engine: Set EJS as the view engine
app.set("view engine", "ejs");

// 2. Serve static files (CSS, client JS, images) from the "public" folder
app.use(express.static("public"));

// 3. Parse incoming HTML form data (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// 4. Parse incoming JSON payloads
app.use(express.json());

// 5. AI and Voice Assistant API Routes
app.use("/api/ai", createAiRouter(() => collection));

// ==========================================
// MongoDB Connection Setup
// ==========================================
const client = new MongoClient(MONGO_URI);
let collection;

/**
 * Connect to MongoDB and start the Express HTTP server.
 * Handles database connection errors gracefully with friendly console feedback.
 */
async function startServer() {
    try {
        console.log("Connecting to MongoDB at:", MONGO_URI);
        await client.connect();
        console.log(" Connected successfully to MongoDB!");

        const db = client.db(DB_NAME);
        collection = db.collection(COLLECTION_NAME);

        // Start listening only AFTER database connection is established
        app.listen(PORT, () => {
            console.log(` Expense Tracker running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("\n❌ MongoDB Connection Error:", error.message);
        console.error("👉 Please verify that MongoDB service is running.");
        console.error("👉 On Windows, open PowerShell as Admin and run: Start-Service MongoDB\n");
        process.exit(1);
    }
}

// ==========================================
// Express Routes
// ==========================================

/**
 * 1. GET / - Read & Display all transactions / expenses
 * Fetches all records from MongoDB, calculates totals, and renders "Display.ejs"
 */
app.get("/", async (req, res) => {
    try {
        // Fetch all transactions from MongoDB, newest first
        const transactions = await collection.find().sort({ date: -1, _id: -1 }).toArray();

        let totalIncome = 0;
        let totalExpense = 0;

        // Calculate total income and total expense
        transactions.forEach((transaction) => {
            const amount = Number(transaction.amount) || 0;
            if (transaction.type === "income") {
                totalIncome += amount;
            } else {
                // Default to expense
                totalExpense += amount;
            }
        });

        const balance = totalIncome - totalExpense;

        // Extract flash alerts from query parameters (e.g. /?success=... or /?error=...)
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;

        res.render("Display", {
            transactions,
            totalIncome,
            totalExpense,
            balance,
            success: successMessage,
            error: errorMessage,
            isAiConfigured: isAiConfigured()
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).send("Server Error: Failed to retrieve expenses. Please try again later.");
    }
});

/**
 * 2. POST /transactions - Create a new transaction / expense
 * Validates form input, creates a document, and inserts it into MongoDB.
 */
app.post("/transactions", async (req, res) => {
    try {
        const { title, amount, type, category, date, description } = req.body;

        // Input validation
        if (!title || title.trim() === "") {
            return res.redirect("/?error=Please provide a valid title/name.");
        }

        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.redirect("/?error=Please provide a valid amount greater than 0.");
        }

        if (!date) {
            return res.redirect("/?error=Please select a valid date.");
        }

        // Sanitize and structure the new expense document
        const newTransaction = {
            title: title.trim(),
            amount: parsedAmount,
            type: type === "income" ? "income" : "expense",
            category: category ? category.trim() : "Other",
            date: date,
            description: description ? description.trim() : "",
            createdAt: new Date()
        };

        // Insert into MongoDB collection
        await collection.insertOne(newTransaction);

        const typeLabel = newTransaction.type === "income" ? "Income" : "Expense";
        res.redirect(`/?success=${encodeURIComponent(typeLabel + " added successfully!")}`);
    } catch (error) {
        console.error("Error adding transaction:", error);
        res.redirect("/?error=" + encodeURIComponent("Failed to add expense. Please try again."));
    }
});

/**
 * 3. GET /transactions/edit/:id - Render Edit form for an existing expense
 * Finds the transaction by ID and renders "update.ejs" with existing data.
 */
app.get("/transactions/edit/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Validate that the ID is a valid 24-character MongoDB ObjectId
        if (!ObjectId.isValid(id)) {
            return res.redirect("/?error=" + encodeURIComponent("Invalid transaction ID."));
        }

        const transaction = await collection.findOne({ _id: new ObjectId(id) });

        if (!transaction) {
            return res.redirect("/?error=" + encodeURIComponent("Transaction not found."));
        }

        res.render("update", {
            transaction,
            error: null
        });
    } catch (error) {
        console.error("Error loading transaction for edit:", error);
        res.redirect("/?error=" + encodeURIComponent("Error loading edit page."));
    }
});

/**
 * 4. POST /transactions/update/:id - Update an existing expense
 * Validates inputs and updates the document in MongoDB.
 */
app.post("/transactions/update/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title, amount, type, category, date, description } = req.body;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.redirect("/?error=" + encodeURIComponent("Invalid transaction ID."));
        }

        // Validate Inputs
        if (!title || title.trim() === "") {
            return res.redirect(`/transactions/edit/${id}?error=Title cannot be empty.`);
        }

        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.redirect(`/transactions/edit/${id}?error=Amount must be greater than 0.`);
        }

        if (!date) {
            return res.redirect(`/transactions/edit/${id}?error=Date is required.`);
        }

        // Update document in MongoDB
        const updateResult = await collection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    title: title.trim(),
                    amount: parsedAmount,
                    type: type === "income" ? "income" : "expense",
                    category: category ? category.trim() : "Other",
                    date: date,
                    description: description ? description.trim() : "",
                    updatedAt: new Date()
                }
            }
        );

        if (updateResult.matchedCount === 0) {
            return res.redirect("/?error=" + encodeURIComponent("Transaction not found to update."));
        }

        res.redirect("/?success=" + encodeURIComponent("Transaction updated successfully!"));
    } catch (error) {
        console.error("Error updating transaction:", error);
        res.redirect("/?error=" + encodeURIComponent("Failed to update transaction."));
    }
});

/**
 * 5. POST /transactions/delete/:id - Delete an expense
 * Removes the document matching the given ID from MongoDB.
 */
app.post("/transactions/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.redirect("/?error=" + encodeURIComponent("Invalid transaction ID."));
        }

        const deleteResult = await collection.deleteOne({ _id: new ObjectId(id) });

        if (deleteResult.deletedCount === 0) {
            return res.redirect("/?error=" + encodeURIComponent("Expense not found or already deleted."));
        }

        res.redirect("/?success=" + encodeURIComponent("Expense deleted successfully!"));
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.redirect("/?error=" + encodeURIComponent("Failed to delete expense."));
    }
});

// ==========================================
// 404 Catch-all Route
// ==========================================
app.use((req, res) => {
    res.status(404).send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>404 - Page Not Found</h2>
            <p>The page you requested does not exist.</p>
            <a href="/" style="color: #4f46e5; text-decoration: none; font-weight: bold;">← Back to Expense Tracker</a>
        </div>
    `);
});

// Start the server
startServer();