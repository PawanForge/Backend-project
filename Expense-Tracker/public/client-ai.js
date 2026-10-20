/**
 * Client-Side Controller for AI, Voice, and Smart Insights
 * 
 * Features:
 * 1. AI Expense Description & Category suggestions ("Generate with AI")
 * 2. Voice-controlled expense management (Web Speech API + typed fallback)
 * 3. Command execution safety pipeline (explicit preview & confirmation modals)
 * 4. AI Expense Chat Assistant drawer
 * 5. Spending Insights & Budget Warning meters
 */

document.addEventListener("DOMContentLoaded", () => {
    initAiDescriptionGenerator();
    initVoiceAndCommandController();
    initChatAssistant();
    loadSpendingInsights();
});

/* ==========================================================================
   1. AI Description Generator
   ========================================================================== */
function initAiDescriptionGenerator() {
    const aiDescBtn = document.getElementById("aiDescBtn");
    if (!aiDescBtn) return;

    aiDescBtn.addEventListener("click", async () => {
        const titleInput = document.getElementById("title");
        const amountInput = document.getElementById("amount");
        const typeSelect = document.getElementById("type");
        const categorySelect = document.getElementById("category");
        const descInput = document.getElementById("description");

        const title = titleInput ? titleInput.value.trim() : "";
        const amount = amountInput ? amountInput.value.trim() : "";
        const type = typeSelect ? typeSelect.value : "expense";
        const category = categorySelect ? categorySelect.value : "";

        if (!title && !amount) {
            showToast("Please enter at least an expense title or amount first.", "warning");
            if (titleInput) titleInput.focus();
            return;
        }

        // Set loading state
        const originalBtnText = aiDescBtn.innerHTML;
        aiDescBtn.innerHTML = "✨ Generating...";
        aiDescBtn.disabled = true;

        try {
            const response = await fetch("/api/ai/describe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, amount, type, category })
            });

            const data = await response.json();

            if (data.success) {
                if (descInput) {
                    descInput.value = data.description;
                    descInput.classList.add("highlight-field");
                    setTimeout(() => descInput.classList.remove("highlight-field"), 1500);
                }

                // If AI suggests a category and it's valid, update the dropdown
                if (data.suggestedCategory && categorySelect && categorySelect.value !== data.suggestedCategory) {
                    categorySelect.value = data.suggestedCategory;
                    categorySelect.classList.add("highlight-field");
                    setTimeout(() => categorySelect.classList.remove("highlight-field"), 1500);
                }

                const sourceTag = data.source === "gemini" ? "Google Gemini AI" : "Smart Offline Engine";
                showToast(`Description generated via ${sourceTag}! You can edit it anytime.`, "success");
            } else {
                showToast(data.error || "Failed to generate description.", "error");
            }
        } catch (error) {
            console.error("AI Describe error:", error);
            showToast("Network error while generating description.", "error");
        } finally {
            aiDescBtn.innerHTML = originalBtnText;
            aiDescBtn.disabled = false;
        }
    });
}

/* ==========================================================================
   2. Voice & Typed Command Controller
   ========================================================================== */
function initVoiceAndCommandController() {
    const micBtn = document.getElementById("micBtn");
    const voiceStatus = document.getElementById("voiceStatus");
    const voiceLangSelect = document.getElementById("voiceLangSelect");
    const transcriptPreview = document.getElementById("transcriptPreview");
    const transcriptText = document.getElementById("transcriptText");
    const cmdForm = document.getElementById("cmdForm");
    const cmdInput = document.getElementById("cmdInput");

    // Check Web Speech API availability
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        // Default to selected language (hi-IN or en-IN)
        recognition.lang = voiceLangSelect ? voiceLangSelect.value : "hi-IN";

        if (voiceLangSelect) {
            voiceLangSelect.addEventListener("change", () => {
                if (recognition) {
                    recognition.lang = voiceLangSelect.value;
                }
                const isHi = voiceLangSelect.value.startsWith("hi");
                if (cmdInput) {
                    cmdInput.placeholder = isHi
                        ? "Boliye ya type kijiye (e.g. 'Add 500 petrol', 'Aaj 250 lunch par kharch kiye', 'Mera last expense delete karo')..."
                        : "Speak or type command (e.g. 'Add 500 for petrol', 'Delete my last expense')...";
                }
            });
        }

        recognition.onstart = () => {
            isListening = true;
            if (micBtn) {
                micBtn.classList.add("listening");
                micBtn.setAttribute("title", "Listening... Speak your command");
            }
            if (voiceStatus) {
                const isHi = voiceLangSelect && voiceLangSelect.value.startsWith("hi");
                voiceStatus.innerHTML = isHi
                    ? `<span class="pulse-dot"></span> Sun rahe hain... Boliye e.g. <em>"Aaj 250 lunch par kharch kiye"</em>`
                    : `<span class="pulse-dot"></span> Listening... Say e.g. <em>"Add 500 for petrol"</em>`;
                voiceStatus.className = "voice-status active";
            }
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;

            // Display exact recognized transcript before processing
            if (transcriptPreview && transcriptText) {
                transcriptPreview.style.display = "flex";
                transcriptText.textContent = `"${transcript}"`;
            }

            if (cmdInput) cmdInput.value = transcript;
            if (voiceStatus) {
                voiceStatus.innerHTML = `⚡ Processing: "<strong>${escapeHtml(transcript)}</strong>"...`;
            }
            executeCommand(transcript);
        };

        recognition.onerror = (event) => {
            console.warn("Speech recognition error:", event.error);
            isListening = false;
            if (micBtn) micBtn.classList.remove("listening");

            if (event.error === "not-allowed") {
                if (voiceStatus) {
                    voiceStatus.innerHTML = `⚠️ Microphone permission blocked. Please allow mic in browser settings or use the text box below.`;
                    voiceStatus.className = "voice-status error";
                }
                showToast("Microphone access denied. You can use the text command input below.", "error");
            } else if (event.error === "no-speech") {
                if (voiceStatus) {
                    voiceStatus.innerHTML = `Awaaz sunayi nahi di. Please click the mic again or type your command.`;
                    voiceStatus.className = "voice-status";
                }
            } else {
                if (voiceStatus) {
                    voiceStatus.innerHTML = `Voice status: ${event.error}. You can type instructions directly below.`;
                    voiceStatus.className = "voice-status error";
                }
            }
        };

        recognition.onend = () => {
            isListening = false;
            if (micBtn) micBtn.classList.remove("listening");
        };
    } else {
        // Speech API not supported
        if (voiceStatus) {
            voiceStatus.innerHTML = `ℹ️ Web Speech API is not supported in this browser. Please use the text command box below.`;
        }
        if (micBtn) {
            micBtn.style.opacity = "0.5";
            micBtn.setAttribute("title", "Voice not supported in this browser. Use text commands.");
        }
    }

    if (micBtn) {
        micBtn.addEventListener("click", () => {
            if (!recognition) {
                showToast("Speech Recognition is not available in your browser. Please type your command.", "warning");
                if (cmdInput) cmdInput.focus();
                return;
            }

            if (isListening) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                } catch (err) {
                    console.error("Speech start error:", err);
                }
            }
        });
    }

    // Typed command submission
    if (cmdForm) {
        cmdForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = cmdInput ? cmdInput.value.trim() : "";
            if (!text) return;

            // Show in transcript preview
            if (transcriptPreview && transcriptText) {
                transcriptPreview.style.display = "flex";
                transcriptText.textContent = `"${text}"`;
            }

            executeCommand(text);
        });
    }
}

/**
 * Sends command to backend parser and handles safe UI execution pipeline.
 */
async function executeCommand(commandText) {
    const voiceStatus = document.getElementById("voiceStatus");

    try {
        const response = await fetch("/api/ai/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: commandText })
        });

        const result = await response.json();

        if (voiceStatus) {
            voiceStatus.innerHTML = `✓ Result: ${result.message || "Command recognized."}`;
            voiceStatus.className = "voice-status success";
            setTimeout(() => {
                voiceStatus.className = "voice-status";
                voiceStatus.innerHTML = "Say or type instructions (e.g. <em>'Add 500 for petrol'</em>, <em>'Mera last expense delete karo'</em>)";
            }, 6000);
        }

        handleParsedAction(result, commandText);
    } catch (error) {
        console.error("Execute command error:", error);
        showToast("Error processing command. Please try typing it.", "error");
    }
}

/**
 * Handles parsed intents with STRICT confirmation rules.
 * Never modifies or deletes records without explicit user confirmation!
 */
function handleParsedAction(result, originalCommand = "") {
    if (!result.success || result.intent === "clarification_needed" || result.intent === "AMBIGUOUS") {
        showConfirmationModal({
            title: "❓ Command Clarification",
            content: `<p>${(result.message || "Please clarify your command.").replace(/\n/g, "<br>")}</p>`,
            showConfirm: false,
            cancelText: "Got it"
        });
        return;
    }

    // 1. ADD TRANSACTION (add_expense or legacy ADD)
    if ((result.intent === "add_expense" || result.intent === "ADD") && result.payload) {
        const p = result.payload;

        const titleInput = document.getElementById("title");
        const amountInput = document.getElementById("amount");
        const typeSelect = document.getElementById("type");
        const categorySelect = document.getElementById("category");
        const dateInput = document.getElementById("date");
        const descInput = document.getElementById("description");

        if (titleInput) titleInput.value = p.title || "";
        if (amountInput) amountInput.value = p.amount || "";
        if (typeSelect) typeSelect.value = p.type || "expense";
        if (categorySelect) categorySelect.value = p.category || "Other";
        if (dateInput) dateInput.value = p.date || new Date().toISOString().split("T")[0];
        if (descInput) descInput.value = p.description || "";

        // Scroll to form and highlight fields
        const formSection = document.querySelector(".form-section");
        if (formSection) {
            formSection.scrollIntoView({ behavior: "smooth" });
            formSection.classList.add("highlight-section");
            setTimeout(() => formSection.classList.remove("highlight-section"), 2500);
        }

        showToast(`✓ Form filled: ₹${p.amount} for "${p.title}" (${p.category}). Review and click Add!`, "success");
        return;
    }

    // 2. EDIT TRANSACTION (edit_expense or legacy OPEN_EDIT / EDIT_AMOUNT)
    if (result.intent === "edit_expense" || result.intent === "OPEN_EDIT" || result.intent === "EDIT_AMOUNT") {
        // A. Open Edit Form
        if (result.action === "OPEN_FORM" || result.intent === "OPEN_EDIT") {
            const rec = result.targetRecord;
            if (!rec) return;

            showConfirmationModal({
                title: "✏️ Open Edit Form",
                content: `
                    <p>Open edit form for your last expense?</p>
                    <div class="confirmation-card">
                        <strong>${escapeHtml(rec.title)}</strong><br>
                        Amount: ₹${Number(rec.amount).toFixed(2)}<br>
                        Category: ${escapeHtml(rec.category)}<br>
                        Date: ${escapeHtml(rec.date)}
                    </div>
                `,
                confirmText: "Open Edit Form",
                onConfirm: () => {
                    window.location.href = `/transactions/edit/${rec._id}`;
                }
            });
            return;
        }

        // B. Update Amount
        if (result.action === "UPDATE_AMOUNT" || result.intent === "EDIT_AMOUNT") {
            const rec = result.targetRecord;
            const newAmt = result.newAmount;
            if (!rec || !newAmt) return;

            showConfirmationModal({
                title: "✏️ Confirm Amount Update",
                content: `
                    <p>Update amount for this transaction?</p>
                    <div class="confirmation-card">
                        <strong>${escapeHtml(rec.title)}</strong><br>
                        Current Amount: <del>₹${Number(rec.amount).toFixed(2)}</del><br>
                        <span style="color: #16a34a; font-weight: bold;">New Amount: ₹${Number(newAmt).toFixed(2)}</span>
                    </div>
                `,
                confirmText: "Save New Amount",
                onConfirm: () => {
                    submitFormPost(`/transactions/update/${rec._id}`, {
                        title: rec.title,
                        amount: newAmt,
                        type: rec.type,
                        category: rec.category,
                        date: rec.date,
                        description: rec.description
                    });
                }
            });
            return;
        }

        // C. Batch Change Category (e.g. "Meri shopping expenses ko travel category mein change karo")
        if (result.action === "CHANGE_CATEGORY") {
            showConfirmationModal({
                title: "🏷️ Confirm Category Change",
                content: `
                    <p>Do you want to reclassify all <strong>${escapeHtml(result.fromCategory)}</strong> expenses to <strong>${escapeHtml(result.toCategory)}</strong>?</p>
                    <div class="confirmation-card">
                        Matching expenses found: <strong>${result.matchCount || 0}</strong><br>
                        From: <strong>${escapeHtml(result.fromCategory)}</strong> → To: <strong>${escapeHtml(result.toCategory)}</strong>
                    </div>
                `,
                confirmText: `Update ${result.matchCount || 0} Expenses`,
                onConfirm: async () => {
                    try {
                        const res = await fetch("/api/ai/batch-category-update", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ fromCategory: result.fromCategory, toCategory: result.toCategory })
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast(data.message, "success");
                            setTimeout(() => window.location.reload(), 1200);
                        } else {
                            showToast(data.error || "Update failed.", "error");
                        }
                    } catch (e) {
                        showToast("Failed to update categories.", "error");
                    }
                }
            });
            return;
        }
    }

    // 3. DELETE TRANSACTION (delete_expense or legacy DELETE)
    if ((result.intent === "delete_expense" || result.intent === "DELETE") && result.targetRecord) {
        const rec = result.targetRecord;

        showConfirmationModal({
            title: "🗑️ Confirm Expense Deletion",
            content: `
                <p style="color: #b91c1c; font-weight: 500;">Are you sure you want to delete this expense? This action cannot be undone.</p>
                <div class="confirmation-card danger-card">
                    <strong>${escapeHtml(rec.title)}</strong><br>
                    Amount: ₹${Number(rec.amount).toFixed(2)}<br>
                    Category: ${escapeHtml(rec.category)}<br>
                    Date: ${escapeHtml(rec.date)}
                </div>
            `,
            confirmText: "Yes, Delete Expense",
            confirmBtnClass: "delete-btn",
            onConfirm: () => {
                submitFormPost(`/transactions/delete/${rec._id}`, {});
            }
        });
        return;
    }

    // 4. FILTER / SEARCH INTENTS
    if (result.intent === "filter_expenses" || result.intent === "search_expenses" || result.intent === "FILTER_THIS_MONTH" || result.intent === "SEARCH_ABOVE_THRESHOLD") {
        filterTableRows(result);
        return;
    }

    // 5. SPENDING SUMMARY FOR CATEGORY
    if (result.intent === "spending_summary" && result.category) {
        showToast(`Total spent on ${result.category}: ₹${Number(result.categoryTotal || 0).toLocaleString('en-IN')}`, "info");
        openChatDrawer();
        sendChatMessage(originalCommand || `${result.category} category spending`);
        return;
    }

    // 6. ADVICE / CHAT INTENTS -> Open Chat Assistant and get personalized response
    if (result.intent === "spending_advice" || result.intent === "general_financial_question" || result.intent.startsWith("ANALYTICS_") || result.intent === "list_expenses") {
        openChatDrawer();
        sendChatMessage(originalCommand || result.query || result.message);
        return;
    }
}

/**
 * Filters the table rows visually based on filter intents.
 */
function filterTableRows(filterAction) {
    const rows = document.querySelectorAll(".expense-table tbody tr");
    if (!rows.length) return;

    let matchCount = 0;
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    rows.forEach(row => {
        let isMatch = true;

        if (filterAction.intent === "FILTER_THIS_MONTH") {
            const dateCell = row.cells[5]?.textContent || "";
            // Check if row date matches current month/year
            isMatch = dateCell.includes(String(now.getFullYear()));
        } else if (filterAction.intent === "SEARCH_ABOVE_THRESHOLD") {
            const amountCell = row.cells[3]?.textContent || "";
            const amountNumber = parseFloat(amountCell.replace(/[^0-9.]/g, ""));
            isMatch = amountNumber > filterAction.threshold;
        }

        if (isMatch) {
            row.style.display = "";
            row.classList.add("highlight-field");
            matchCount++;
            setTimeout(() => row.classList.remove("highlight-field"), 2000);
        } else {
            row.style.display = "none";
        }
    });

    showToast(`Filter applied: Showing ${matchCount} matching expense(s). Click anywhere to reset.`, "success");

    // Add click listener on container to restore view
    const reset = () => {
        rows.forEach(r => r.style.display = "");
        document.removeEventListener("click", reset);
    };
    setTimeout(() => document.addEventListener("click", reset), 500);
}

/* ==========================================================================
   3. AI Expense Chat Assistant
   ========================================================================== */
function initChatAssistant() {
    const chatToggleBtn = document.getElementById("chatToggleBtn");
    const chatDrawer = document.getElementById("chatDrawer");
    const closeChatBtn = document.getElementById("closeChatBtn");
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const chipBtns = document.querySelectorAll(".chat-chip");

    if (chatToggleBtn && chatDrawer) {
        chatToggleBtn.addEventListener("click", () => {
            chatDrawer.classList.toggle("open");
            if (chatDrawer.classList.contains("open") && chatInput) {
                chatInput.focus();
            }
        });
    }

    if (closeChatBtn && chatDrawer) {
        closeChatBtn.addEventListener("click", () => {
            chatDrawer.classList.remove("open");
        });
    }

    if (chipBtns) {
        chipBtns.forEach(chip => {
            chip.addEventListener("click", () => {
                const question = chip.getAttribute("data-question");
                if (question) {
                    sendChatMessage(question);
                }
            });
        });
    }

    if (chatForm && chatInput) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;
            chatInput.value = "";
            sendChatMessage(text);
        });
    }
}

function openChatDrawer() {
    const chatDrawer = document.getElementById("chatDrawer");
    if (chatDrawer) {
        chatDrawer.classList.add("open");
    }
}

async function sendChatMessage(messageText) {
    const messagesContainer = document.getElementById("chatMessages");
    if (!messagesContainer) return;

    // 1. Append User Message
    appendChatMessage("user", messageText);

    // 2. Append Typing Indicator
    const typingElem = document.createElement("div");
    typingElem.className = "chat-message assistant typing";
    typingElem.innerHTML = `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> Querying MongoDB...`;
    messagesContainer.appendChild(typingElem);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const response = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: messageText })
        });

        const data = await response.json();
        typingElem.remove();

        if (data.success) {
            const badge = data.source === "gemini" ? "✨ Gemini AI" : "📊 Verified Database Fact";
            appendChatMessage("assistant", data.answer, badge);
        } else {
            appendChatMessage("assistant", `⚠️ ${data.error || "Could not process question."}`);
        }
    } catch (err) {
        console.error("Chat error:", err);
        typingElem.remove();
        appendChatMessage("assistant", "⚠️ Network error connecting to chat service.");
    }
}

function appendChatMessage(sender, text, badgeText = null) {
    const messagesContainer = document.getElementById("chatMessages");
    if (!messagesContainer) return;

    const msg = document.createElement("div");
    msg.className = `chat-message ${sender}`;

    let badgeHtml = "";
    if (badgeText) {
        badgeHtml = `<div class="chat-badge">${badgeText}</div>`;
    }

    // Convert markdown asterisks to HTML bold
    const formatted = escapeHtml(text).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");

    msg.innerHTML = `
        ${badgeHtml}
        <div class="message-bubble">${formatted}</div>
    `;

    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/* ==========================================================================
   4. Spending Insights & Budget Warning Meter
   ========================================================================== */
async function loadSpendingInsights() {
    const insightsContainer = document.getElementById("smartInsightsContainer");
    if (!insightsContainer) return;

    try {
        const response = await fetch("/api/ai/insights");
        const data = await response.json();

        if (!data.success || !data.insights) return;
        const { categoryBreakdown, monthlyComparison, budget } = data.insights;

        // Render Budget Meter
        const budgetCard = document.getElementById("budgetCard");
        if (budgetCard) {
            let statusColor = "#16a34a"; // Green
            if (budget.budgetStatus === "WARNING") statusColor = "#d97706"; // Amber
            if (budget.budgetStatus === "EXCEEDED") statusColor = "#dc2626"; // Red

            let warningHtml = "";
            if (budget.budgetWarningMessage) {
                warningHtml = `<div class="budget-alert-box budget-${budget.budgetStatus.toLowerCase()}">${budget.budgetWarningMessage}</div>`;
            }

            budgetCard.innerHTML = `
                <div class="card-label">Monthly Budget Status</div>
                <h2>₹${Number(budget.currentMonthExpense).toLocaleString('en-IN')} <span class="budget-limit">/ ₹${Number(budget.monthlyBudget).toLocaleString('en-IN')}</span></h2>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${Math.min(budget.budgetUsedPercentage, 100)}%; background: ${statusColor};"></div>
                </div>
                <div class="budget-meta">
                    <span>${budget.budgetUsedPercentage}% used</span>
                    <span>${budget.budgetStatus}</span>
                </div>
                ${warningHtml}
            `;
        }

        // Render Category Breakdown Bars
        const catContainer = document.getElementById("categoryBreakdownList");
        if (catContainer && categoryBreakdown && categoryBreakdown.length > 0) {
            catContainer.innerHTML = categoryBreakdown.slice(0, 5).map(cat => `
                <div class="category-stat-row">
                    <div class="category-stat-info">
                        <strong>${escapeHtml(cat.category)}</strong>
                        <span>₹${Number(cat.total).toLocaleString('en-IN')} (${cat.percentage}%)</span>
                    </div>
                    <div class="progress-bar-container mini">
                        <div class="progress-bar-fill" style="width: ${cat.percentage}%;"></div>
                    </div>
                </div>
            `).join("");
        }

        // Render Monthly Comparison Badge
        const compElem = document.getElementById("monthlyComparisonText");
        if (compElem && monthlyComparison) {
            const diff = monthlyComparison.difference;
            const diffFormatted = Math.abs(diff).toLocaleString('en-IN');
            if (diff > 0) {
                compElem.innerHTML = `Spending is <span style="color: #dc2626; font-weight: bold;">+₹${diffFormatted} (+${monthlyComparison.percentageChange}%)</span> higher than last month.`;
            } else if (diff < 0) {
                compElem.innerHTML = `Spending is <span style="color: #16a34a; font-weight: bold;">-₹${diffFormatted} (${monthlyComparison.percentageChange}%)</span> lower than last month.`;
            } else {
                compElem.innerHTML = `Spending is consistent with last month.`;
            }
        }
    } catch (err) {
        console.error("Failed to load insights:", err);
    }
}

/* ==========================================================================
   Helper Utilities
   ========================================================================== */
function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 50);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showConfirmationModal({ title, content, confirmText = "Confirm", cancelText = "Cancel", confirmBtnClass = "add-btn", showConfirm = true, onConfirm = null }) {
    // Remove existing modal if any
    const existing = document.getElementById("customConfirmModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "customConfirmModal";
    modal.className = "modal-overlay";

    modal.innerHTML = `
        <div class="modal-box">
            <h3>${title}</h3>
            <div class="modal-body">${content}</div>
            <div class="modal-actions">
                ${showConfirm ? `<button type="button" class="${confirmBtnClass}" id="modalConfirmBtn">${confirmText}</button>` : ""}
                <button type="button" class="cancel-btn" id="modalCancelBtn">${cancelText}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();

    document.getElementById("modalCancelBtn")?.addEventListener("click", close);

    if (showConfirm && onConfirm) {
        document.getElementById("modalConfirmBtn")?.addEventListener("click", () => {
            close();
            onConfirm();
        });
    }
}

function submitFormPost(actionUrl, dataObj) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = actionUrl;

    for (const [key, value] of Object.entries(dataObj)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
