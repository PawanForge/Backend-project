# 💰 Expense Tracker Web Application (with AI & Voice Features)

A full-stack, beginner-friendly Expense Tracker built with **Node.js**, **Express.js**, **EJS**, and **MongoDB**, enhanced with **Voice-Controlled Management**, **AI Description Generator**, and an **AI Expense Chat Assistant**.

---

## 📌 Core Features

1. **Add Expenses & Income**: Easily record transactions with Title, Amount, Type (Expense/Income), Category, Date, and optional Description.
2. **Dynamic Dashboard**: Displays real-time calculations for **Net Balance**, **Total Income**, and **Total Expenses** formatted in Indian Rupee format (`₹`).
3. **Complete CRUD Operations**:
   - **Create**: Add new transactions.
   - **Read**: View all stored transactions in a responsive table.
   - **Update**: Edit existing transactions with pre-filled forms.
   - **Delete**: Remove transactions with confirmation safety dialogues.
4. **Data Validation & Sanitization**: Server-side and client-side validation to prevent empty fields, negative amounts, or invalid dates.
5. **Robust Error Handling**: Safe handling of invalid MongoDB Object IDs, missing records, and database disconnections.
6. **Empty State UI**: Informative message and icon displayed when no transactions are recorded.
7. **Responsive Design**: Modern interface styled with vanilla CSS, optimized for desktop, tablet, and mobile.

---

## 🤖 Advanced AI & Voice Features

### 1. AI Expense Description Generator ("✨ Generate with AI")
- Available on both the Add and Edit transaction forms.
- Automatically generates a concise note summarizing the title, amount, and category.
- Intelligently infers and auto-selects the category from natural language keywords (e.g. "petrol" -> `Travel`, "zomato" -> `Food`, "broadband" -> `Bills`).
- Works **offline** with smart heuristics, or seamlessly upgrades to **Google Gemini 1.5 Flash** when `GEMINI_API_KEY` is provided in `.env`.
- API keys are **never** exposed in frontend JavaScript.

### 2. Voice-Controlled Expense Management
- Uses the browser's native **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`).
- Supports spoken commands such as:
  - *"Add 500 rupees petrol expense."*
  - *"Add 200 rupees food expense today."*
  - *"Open edit form for my last expense."*
  - *"Edit my last expense amount to 700 rupees."*
  - *"Show expenses from this month."*
  - *"Delete my last expense."*
- **Strict Safety Confirmation Guarantee**: A voice command **never** creates, modifies, or deletes a database document directly without an explicit user confirmation preview modal.
- Includes a typed-command input bar for browsers that do not support Web Speech or when microphone access is disabled.
- **Permissions Note**: Works natively on `http://localhost:3200` without HTTPS. In remote production, HTTPS is required by modern browsers for microphone access.

### 3. AI Expense Chat Assistant
- Floating slide-over assistant drawer accessible at all times.
- Answers real-time financial questions:
  - *"How much did I spend this month?"*
  - *"Which category costs me the most?"*
  - *"Show my five most recent expenses."*
  - *"Compare this month with last month."*
  - *"Find expenses above 1000 rupees."*
- Answers are **strictly grounded in factual MongoDB aggregations**—never invented or fabricated.

### 4. Smart Spending Insights & Budget Meter
- **Monthly Budget Limit**: Configurable via `.env` (`MONTHLY_BUDGET=25000`) or query parameters.
- **Visual Budget Meter**: Shows % of monthly budget used. Warns at 70% (Amber) and triggers an alert if exceeded (Red).
- **Category-Wise Spending Breakdown**: Visual distribution bars showing total spent and % share of each category.
- **Month-Over-Month Comparison**: Displays spending changes between current month and previous month.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Responsive Design System), Vanilla JavaScript (ES6+)
- **Template Engine**: EJS (Embedded JavaScript)
- **Backend Framework**: Node.js & Express.js (ES Modules)
- **Database**: MongoDB (Native Node.js Driver, database: `expense`, collection: `Data`)
- **Environment Management**: `dotenv`

---

## 📂 Project Architecture

```text
Expense-Tracker/
├── node_modules/         # Installed npm packages
├── public/
│   ├── UI.css           # Responsive styles, cards, modals, chat drawer & badges
│   └── client-ai.js     # Client controller for Voice, AI generation, Chat & Modals
├── routes/
│   └── aiRoutes.js      # Express API routes for /api/ai/describe, /command, /chat, /insights
├── services/
│   ├── aiService.js     # Gemini API integration & offline heuristic fallback
│   ├── commandParser.js # Natural language & voice command parsing with safety checks
│   └── insightsService.js# MongoDB factual calculations & aggregations
├── views/
│   ├── Display.ejs      # Main dashboard with voice bar, forms, table, insights & chat
│   └── update.ejs       # Edit transaction form with AI describe button
├── .env                 # Environment variables (ignored in Git)
├── .env.example         # Template for environment configuration
├── .gitignore           # Git ignore rules (.env, node_modules)
├── package.json         # Project metadata, dependencies & scripts
├── README.md            # Comprehensive documentation & manual testing checklist
└── Server.js            # Express server, MongoDB connection & CRUD routes
```

---

## ⚙️ Prerequisites

1. **Node.js** (v18.x or newer): Check with `node -v`
2. **npm** (v9.x or newer): Check with `npm -v`
3. **MongoDB Server**: Ensure MongoDB is running locally on port `27017`.
   - On Windows: Run `Get-Service MongoDB` in PowerShell.
   - To start: `Start-Service MongoDB`

---

## 🚀 How to Run the Application

### 1. Navigate to the project directory:
```bash
cd "c:\Users\ASUS\OneDrive\Desktop\Backend-project\Expense-Tracker"
```

### 2. Verify `.env` configuration:
Create or edit your `.env` file (copied from `.env.example`):
```env
PORT=3200
MONGO_URI=mongodb://localhost:27017
DB_NAME=expense
COLLECTION_NAME=Data

# (Optional) Google Gemini API Key for Cloud AI features
# If left empty, the application seamlessly uses the built-in offline NLP engine!
GEMINI_API_KEY=

# (Optional) Monthly budget limit in INR (Default: 25000)
MONTHLY_BUDGET=25000
```

### 3. Start the application:
```bash
npm start
```
*(Or use `npm run dev` for automatic server reload on code changes)*

### 4. Open in your browser:
Navigate to: **[http://localhost:3200](http://localhost:3200)**

---

## 📋 Manual Testing Checklist

| Test Item | Action | Expected Result | Verified Status |
| :--- | :--- | :--- | :---: |
| **1. Basic CRUD** | Add, edit, and delete an expense | Database updates and reflects in UI | **PASS** |
| **2. Add Command** | Type/Speak *"Add 500 rupees petrol expense."* | Form populates ₹500, Title: Petrol, Category: Travel. Requires user click to save | **PASS** |
| **3. Edit Last Expense** | Type/Speak *"Open edit form for my last expense."* | Modal displays last expense and links to `/transactions/edit/:id` | **PASS** |
| **4. Edit Amount** | Type/Speak *"Edit my last expense amount to 700 rupees."* | Modal displays old amount and proposed ₹700 amount with confirm button | **PASS** |
| **5. Delete Last Expense**| Type/Speak *"Delete my last expense."* | Safety warning modal displays record with explicit confirmation requirement | **PASS** |
| **6. Filter Command** | Type/Speak *"Show expenses from this month."* | Table visually filters to only show records from current month | **PASS** |
| **7. Ambiguous Command** | Type *"What is the weather outside?"* | Shows helpful suggestion prompt with accepted command formats | **PASS** |
| **8. Chat - Current Month**| Ask *"How much did I spend this month?"* | Computes exact sum from MongoDB and returns current month total | **PASS** |
| **9. Chat - Top Category**| Ask *"Which category costs me the most?"* | Returns highest spending category with exact amount and count | **PASS** |
| **10. Chat - Recent 5** | Ask *"Show my five most recent expenses."* | Returns ordered list of recent expenses with dates and amounts | **PASS** |
| **11. Chat - Comparison** | Ask *"Compare this month with last month."* | Calculates difference and percentage change between months | **PASS** |
| **12. Chat - Threshold** | Ask *"Find expenses above 1000 rupees."* | Queries MongoDB for expenses > ₹1000 and lists matching records | **PASS** |
| **13. AI Description** | Click *"✨ Generate with AI"* on Add form | Generates smart description and auto-selects appropriate category | **PASS** |
| **14. Offline Fallback** | Test with empty `GEMINI_API_KEY` | Entire application functions smoothly using the offline heuristic engine | **PASS** |
| **15. Budget Warning** | Set low budget threshold (`?budget=1500`) | Displays amber warning or red "Budget Exceeded" alert with overspent amount | **PASS** |
