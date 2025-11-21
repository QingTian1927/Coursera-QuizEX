/* ---------------- DEFAULT FORMAT SETTINGS ---------------- */

// Default delay constants (in milliseconds)
const DEFAULT_NAVIGATION_DELAY = 4000;
const DEFAULT_FEEDBACK_DELAY = 4000;

let formatSettings = {
    questionSeparator: "\n\n",
    choiceSeparator: "\n",
    answerPrefix: "/",
    answerSuffix: ";",
    defaultFormat: "normal",
    navigationDelay: DEFAULT_NAVIGATION_DELAY,
    feedbackDelay: DEFAULT_FEEDBACK_DELAY
};

// Load saved format settings (persisted via chrome.storage.sync)
chrome.storage.sync.get(["formatSettings"], res => {
    if (res.formatSettings) {
        formatSettings = res.formatSettings;
        // Ensure delay settings exist (for backward compatibility)
        if (!formatSettings.navigationDelay) formatSettings.navigationDelay = DEFAULT_NAVIGATION_DELAY;
        if (!formatSettings.feedbackDelay) formatSettings.feedbackDelay = DEFAULT_FEEDBACK_DELAY;
        updateSettingsInputs();
    }
});

// Load current format selection (persisted via chrome.storage.local for this session)
chrome.storage.local.get(["currentFormat"], res => {
    const currentFormat = res.currentFormat || formatSettings.defaultFormat || "normal";
    document.getElementById("formatSelect").value = currentFormat;
});

function updateSettingsInputs() {
    document.getElementById("inputSeparator").value = escapeForDisplay(formatSettings.questionSeparator);
    document.getElementById("inputChoice").value = escapeForDisplay(formatSettings.choiceSeparator);
    document.getElementById("inputAnswer").value = escapeForDisplay(formatSettings.answerPrefix);
    document.getElementById("inputSuffix").value = escapeForDisplay(formatSettings.answerSuffix);
    document.getElementById("defaultFormatSelect").value = formatSettings.defaultFormat || "normal";
    document.getElementById("inputNavigationDelay").value = formatSettings.navigationDelay || DEFAULT_NAVIGATION_DELAY;
    document.getElementById("inputFeedbackDelay").value = formatSettings.feedbackDelay || DEFAULT_FEEDBACK_DELAY;
}

function escapeForDisplay(str) {
    return str.replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r');
}

function unescapeFromInput(str) {
    return str.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
}


/* ---------------- SCRAPED DATA STORAGE MANAGEMENT (via Background Worker) ---------------- */

// Load scraped data from background service worker
function loadScrapedDataFromStorage(callback) {
    chrome.runtime.sendMessage({ action: 'getScrapedData' }, response => {
        if (chrome.runtime.lastError) {
            console.error('Error loading data:', chrome.runtime.lastError);
            callback([]);
            return;
        }
        console.log('Loaded data:', response);
        callback(response?.data || []);
    });
}

// Append scraped data via background service worker
function appendScrapedDataToStorage(newData, callback) {
    chrome.runtime.sendMessage({ 
        action: 'appendScrapedData', 
        data: newData 
    }, response => {
        if (chrome.runtime.lastError) {
            console.error('Error appending data:', chrome.runtime.lastError);
            callback(false);
            return;
        }
        console.log('Appended data:', response);
        callback(response?.success || false);
    });
}

// Clear scraped data via background service worker
function clearScrapedDataStorage(callback) {
    chrome.runtime.sendMessage({ action: 'clearScrapedData' }, response => {
        if (chrome.runtime.lastError) {
            console.error('Error clearing data:', chrome.runtime.lastError);
            callback(false);
            return;
        }
        console.log('Cleared data:', response);
        callback(response?.success || false);
    });
}

/* ---------------- FORMAT GENERATION ---------------- */

// Generate normal format (simple preview)
function generateNormalFormat(data) {
    if (!data || data.length === 0) return "";

    const t = UI_TEXT[currentLang];

    let output = "";
    data.forEach((q, i) => {
        output += `Q${i + 1}: ${q.question} ${!q.correct ? `(${t.incorrect})` : ''}\n`;
        q.choices.forEach(c => {
            output += ` • ${c.text}${c.selected ? " (x)" : ""}\n`;
        });
        output += "\n";
    });
    return output;
}

// Generate formatted output (flashcard format)
function generateFormattedOutput(data) {
    if (!data || data.length === 0) return "";

    const t = UI_TEXT[currentLang];

    return data
        .map(q => {
            const sel = q.choices.find(c => c.selected)?.text || "";
            const choicesText = q.choices.map(c => c.text).join(formatSettings.choiceSeparator);
            const statusText = !q.correct ? ` (${t.incorrect})` : '';
            
            return q.question + 
                   formatSettings.questionSeparator + 
                   choicesText + 
                   "\n" +
                   formatSettings.answerPrefix + 
                   sel + 
                   statusText +
                   formatSettings.answerSuffix;
        })
        .join("");
}

// Generate JSON format
function generateJSONFormat(data) {
    if (!data || data.length === 0) return "";
    return JSON.stringify(data, null, 2);
}

// Get formatted output based on selected format
function getFormattedOutput(data, format) {
    switch(format) {
        case "normal":
            return generateNormalFormat(data);
        case "formatted":
            return generateFormattedOutput(data);
        case "json":
            return generateJSONFormat(data);
        default:
            return generateNormalFormat(data);
    }
}

// Update preview display based on selected format
function updatePreviewDisplay(data) {
    const previewContent = document.getElementById("previewContent");
    const previewCount = document.getElementById("previewCount");
    const formatSelect = document.getElementById("formatSelect");
    
    if (!data || data.length === 0) {
        previewContent.innerText = UI_TEXT[currentLang].noData;
        previewCount.innerText = "0";
    } else {
        const selectedFormat = formatSelect.value;
        previewContent.innerText = getFormattedOutput(data, selectedFormat);
        previewCount.innerText = data.length.toString();
    }
}

// Initialize on load - load existing data from background worker
loadScrapedDataFromStorage(data => {
    updatePreviewDisplay(data);
});


/* ---------------- THEME TOGGLE ---------------- */

const themeToggle = document.getElementById("themeToggle");
const themeSlider = document.getElementById("themeSlider");

chrome.storage.sync.get(["theme"], res => {
    if (res.theme === "dark") {
        document.body.classList.add("dark");
        themeSlider.style.left = "22px";
    }
});

themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    themeSlider.style.left = isDark ? "22px" : "2px";
    chrome.storage.sync.set({ theme: isDark ? "dark" : "light" });
});


/* ---------------- LANGUAGE DROPDOWN ---------------- */

const languageSelect = document.getElementById("languageSelect");
let currentLang = "VI";

chrome.storage.sync.get(["lang"], res => {
    currentLang = res.lang || "VI";
    languageSelect.value = currentLang;
    applyLanguage();
});

languageSelect.addEventListener("change", () => {
    currentLang = languageSelect.value;
    chrome.storage.sync.set({ lang: currentLang });
    applyLanguage();
});

function applyLanguage() {
    const t = UI_TEXT[currentLang];
    document.getElementById("title").innerText = t.title;
    document.getElementById("scrapeBtnText").innerText = t.scrape;
    document.getElementById("autoScrapeBtnText").innerText = t.autoScrape;
    document.getElementById("clearBtnText").innerText = t.clear;
    document.getElementById("previewTitle").innerText = t.preview;
    document.getElementById("btnDownload").innerText = t.download;
    document.getElementById("formatLabel").innerText = t.format;
    document.getElementById("infoToggleText").innerText = t.about;
    document.getElementById("modalTitle").innerText = t.modalTitle;
    document.getElementById("labelDefaultFormat").innerText = t.labelDefaultFormat;
    document.getElementById("hintDefaultFormat").innerText = t.hintDefaultFormat;
    document.getElementById("labelSeparator").innerText = t.labelSeparator;
    document.getElementById("hintSeparator").innerText = t.hintSeparator;
    document.getElementById("labelChoice").innerText = t.labelChoice;
    document.getElementById("hintChoice").innerText = t.hintChoice;
    document.getElementById("labelAnswer").innerText = t.labelAnswer;
    document.getElementById("hintAnswer").innerText = t.hintAnswer;
    document.getElementById("labelSuffix").innerText = t.labelSuffix;
    document.getElementById("hintSuffix").innerText = t.hintSuffix;
    document.getElementById("labelNavigationDelay").innerText = t.labelNavigationDelay;
    document.getElementById("hintNavigationDelay").innerText = t.hintNavigationDelay;
    document.getElementById("labelFeedbackDelay").innerText = t.labelFeedbackDelay;
    document.getElementById("hintFeedbackDelay").innerText = t.hintFeedbackDelay;
    document.getElementById("cancelSettings").innerText = t.cancel;
    document.getElementById("saveSettings").innerText = t.save;
    document.getElementById("infoVersion").innerText = t.infoVersion;
    document.getElementById("infoAuthor").innerText = t.infoAuthor;
    document.getElementById("infoGitHub").innerText = t.infoGitHub;
    document.getElementById("infoHelp").innerText = t.infoHelp;
    
    // Update format selector options
    updateFormatOptions();
    
    // Update log panel title
    updateLogPanelTitle();
}

function updateFormatOptions() {
    const formatSelect = document.getElementById("formatSelect");
    const defaultFormatSelect = document.getElementById("defaultFormatSelect");
    const attr = currentLang === "EN" ? "data-text-en" : "data-text-vi";
    
    [formatSelect, defaultFormatSelect].forEach(select => {
        Array.from(select.options).forEach(option => {
            const text = option.getAttribute(attr);
            if (text) option.text = text;
        });
    });
}


/* ---------------- LOG PANEL MANAGEMENT ---------------- */

const logToggleBtn = document.getElementById("logToggleBtn");
const logPanelOverlay = document.getElementById("logPanelOverlay");
const logPanel = document.getElementById("logPanel");
const logPanelClose = document.getElementById("logPanelClose");
const logPanelBody = document.getElementById("logPanelBody");
const buttonRow = document.querySelector(".button-row");

function showLogPanel() {
    logToggleBtn.classList.add("active");
    buttonRow.classList.remove("log-hidden");
}

function hideLogPanel() {
    logToggleBtn.classList.remove("active");
    logPanel.classList.remove("active");
    logPanelOverlay.classList.remove("active");
    buttonRow.classList.add("log-hidden");
}

function toggleLogPanel() {
    logPanel.classList.toggle("active");
    logPanelOverlay.classList.toggle("active");
}

function clearLog() {
    logPanelBody.innerHTML = "";
}

function addLogEntry(message, type = "info") {
    const entry = document.createElement("div");
    entry.className = "log-entry";
    
    const timestamp = document.createElement("span");
    timestamp.className = "log-timestamp";
    const now = new Date();
    timestamp.textContent = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
    
    const msgElement = document.createElement("span");
    msgElement.className = `log-message ${type}`;
    msgElement.textContent = message;
    
    entry.appendChild(timestamp);
    entry.appendChild(msgElement);
    logPanelBody.appendChild(entry);
    
    // Auto-scroll to bottom
    logPanelBody.scrollTop = logPanelBody.scrollHeight;
}

logToggleBtn.addEventListener("click", toggleLogPanel);
logPanelClose.addEventListener("click", toggleLogPanel);
logPanelOverlay.addEventListener("click", toggleLogPanel);

// Update log panel title when language changes
function updateLogPanelTitle() {
    const titleElement = document.getElementById("logPanelTitleText");
    if (titleElement) {
        titleElement.textContent = UI_TEXT[currentLang].logPanelTitle;
    }
}


/* ---------------- FORMAT SELECTOR ---------------- */

const formatSelect = document.getElementById("formatSelect");

// Update preview when format changes
formatSelect.addEventListener("change", () => {
    // Save the selected format to session storage (chrome.storage.local)
    chrome.storage.local.set({ currentFormat: formatSelect.value });
    
    // Update preview
    loadScrapedDataFromStorage(data => {
        updatePreviewDisplay(data);
    });
});


/* ---------------- COPY TO CLIPBOARD ---------------- */

const copyBtn = document.getElementById("copyBtn");

copyBtn.addEventListener("click", () => {
    loadScrapedDataFromStorage(data => {
        if (!data || data.length === 0) return;
        
        const selectedFormat = formatSelect.value;
        const output = getFormattedOutput(data, selectedFormat);
        
        navigator.clipboard.writeText(output).then(() => {
            // Visual feedback - change icon to checkmark
            const originalSVG = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
            </svg>`;
            copyBtn.style.color = "var(--success)";
            
            setTimeout(() => {
                copyBtn.innerHTML = originalSVG;
                copyBtn.style.color = "";
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    });
});


/* ---------------- SETTINGS MODAL ---------------- */

const settingsModal = document.getElementById("settingsModal");
const openSettings = document.getElementById("openSettings");
const closeSettings = document.getElementById("closeSettings");
const cancelSettings = document.getElementById("cancelSettings");
const saveSettings = document.getElementById("saveSettings");

openSettings.addEventListener("click", () => {
    settingsModal.classList.add("active");
    updateSettingsInputs();
});

closeSettings.addEventListener("click", () => {
    settingsModal.classList.remove("active");
});

cancelSettings.addEventListener("click", () => {
    settingsModal.classList.remove("active");
});

saveSettings.addEventListener("click", () => {
    formatSettings = {
        questionSeparator: unescapeFromInput(document.getElementById("inputSeparator").value),
        choiceSeparator: unescapeFromInput(document.getElementById("inputChoice").value),
        answerPrefix: unescapeFromInput(document.getElementById("inputAnswer").value),
        answerSuffix: unescapeFromInput(document.getElementById("inputSuffix").value),
        defaultFormat: document.getElementById("defaultFormatSelect").value,
        navigationDelay: parseInt(document.getElementById("inputNavigationDelay").value) || DEFAULT_NAVIGATION_DELAY,
        feedbackDelay: parseInt(document.getElementById("inputFeedbackDelay").value) || DEFAULT_FEEDBACK_DELAY
    };
    chrome.storage.sync.set({ formatSettings });
    
    // Don't change the current format selector - keep user's active choice
    // The default format only affects new sessions
    
    // Refresh preview with new settings
    loadScrapedDataFromStorage(data => {
        updatePreviewDisplay(data);
    });
    
    settingsModal.classList.remove("active");
});

// Close modal when clicking outside
settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove("active");
    }
});


/* ---------------- REQUEST SCRAPED DATA ---------------- */

function requestScrapedData(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (!tabs || !tabs[0]) return callback(null);
        chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" }, callback);
    });
}


/* ---------------- SCRAPE + PREVIEW (WITH APPEND via Background) ---------------- */

document.getElementById("scrapeBtn").addEventListener("click", () => {
    requestScrapedData(response => {
        if (!response?.data || response.data.length === 0) {
            // No new data, just reload existing data
            loadScrapedDataFromStorage(data => {
                updatePreviewDisplay(data);
            });
            return;
        }

        // Append new data via background worker
        appendScrapedDataToStorage(response.data, success => {
            if (success) {
                // Reload and update display
                loadScrapedDataFromStorage(data => {
                    updatePreviewDisplay(data);
                });
            }
        });
    });
});


/* ---------------- AUTO-SCRAPE BUTTON ---------------- */

// Status polling interval
let statusPollInterval = null;

// Helper function to send messages to content script
function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, response => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}

// Helper function to navigate to a URL and wait for it to load
function navigateToURL(tabId, url) {
    return new Promise((resolve) => {
        chrome.tabs.update(tabId, { url }, () => {
            // Wait for the page to load
            chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    // Add extra delay to ensure content is fully rendered (using configured delay)
                    setTimeout(() => resolve(), formatSettings.navigationDelay);
                }
            });
        });
    });
}

// Poll auto-scrape status from background
function pollAutoScrapeStatus() {
    chrome.runtime.sendMessage({ action: 'getAutoScrapeStatus' }, (response) => {
        if (chrome.runtime.lastError || !response) return;
        
        const t = UI_TEXT[currentLang];
        
        // Update log panel with new logs
        if (response.logs && response.logs.length > 0) {
            clearLog();
            response.logs.forEach(log => {
                addLogEntry(log.message, log.type);
            });
        }
        
        // Update preview if data has changed
        loadScrapedDataFromStorage(data => {
            updatePreviewDisplay(data);
        });
        
        // Check if auto-scrape completed
        if (!response.isRunning) {
            stopStatusPolling();
            
            const btn = document.getElementById("autoScrapeBtn");
            const btnText = btn.querySelector("#autoScrapeBtnText");
            const btnIcon = btn.querySelector(".btn-icon");
            
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.classList.remove("btn-cancel-state"); // Remove cancel state class
            btnText.innerText = t.autoScrape;
            
            // Reset icon to play icon
            if (btnIcon) {
                btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/>
                </svg>`;
            }
            
            // Show error alert if there was an error
            if (response.error) {
                if (response.error.includes("Could not establish connection") || 
                    response.error.includes("Receiving end does not exist")) {
                    alert(t.alertConnectionError);
                } else {
                    alert(t.alertAutoScrapeError(response.error));
                }
            }
        }
    });
}

function startStatusPolling() {
    if (statusPollInterval) return;
    
    // Show log panel
    showLogPanel();
    
    // Poll every 500ms for updates
    statusPollInterval = setInterval(pollAutoScrapeStatus, 500);
    
    // Do an immediate poll
    pollAutoScrapeStatus();
}

function stopStatusPolling() {
    if (statusPollInterval) {
        clearInterval(statusPollInterval);
        statusPollInterval = null;
    }
}

document.getElementById("autoScrapeBtn").addEventListener("click", () => {
    const t = UI_TEXT[currentLang];
    const btn = document.getElementById("autoScrapeBtn");
    const btnText = btn.querySelector("#autoScrapeBtnText");
    const btnIcon = btn.querySelector(".btn-icon");
    
    // Check if currently running - if so, cancel it
    chrome.runtime.sendMessage({ action: 'getAutoScrapeStatus' }, (statusResponse) => {
        if (statusResponse && statusResponse.isRunning) {
            // Cancel the running auto-scrape
            chrome.runtime.sendMessage({ action: 'stopAutoScrape' }, (response) => {
                if (response && response.success) {
                    // Don't stop polling immediately - let it continue to capture the cancellation log
                    // The polling will stop automatically when isRunning becomes false
                }
            });
            return;
        }
        
        // Start new auto-scrape
        // Clear logs
        clearLog();
        
        // Change button to cancel state
        btn.disabled = false;  // Keep enabled so user can click to cancel
        btn.style.opacity = "1";
        btn.classList.add("btn-cancel-state"); // Add cancel state class for red color
        btnText.innerText = t.cancelAutoScrape;
        
        // Change icon to stop icon
        if (btnIcon) {
            btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-stop-fill" viewBox="0 0 16 16">
                <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5"/>
            </svg>`;
        }
        
        // Start auto-scrape in background
        chrome.runtime.sendMessage({ 
            action: 'startAutoScrape',
            settings: {
                navigationDelay: formatSettings.navigationDelay,
                feedbackDelay: formatSettings.feedbackDelay,
                language: currentLang  // Pass current language to background
            }
        }, (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.classList.remove("btn-cancel-state"); // Remove cancel state class
                btnText.innerText = t.autoScrape;
                
                // Reset icon to play icon
                if (btnIcon) {
                    btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/>
                    </svg>`;
                }
                
                const error = response?.error || chrome.runtime.lastError?.message || 'Unknown error';
                alert(t.alertAutoScrapeError(error));
                return;
            }
            
            // Start polling for status updates
            startStatusPolling();
        });
    });
});

// Poll status when popup opens if auto-scrape is running
chrome.runtime.sendMessage({ action: 'getAutoScrapeStatus' }, (response) => {
    if (response && response.isRunning) {
        const t = UI_TEXT[currentLang];
        const btn = document.getElementById("autoScrapeBtn");
        const btnText = btn.querySelector("#autoScrapeBtnText");
        const btnIcon = btn.querySelector(".btn-icon");
        
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.classList.add("btn-cancel-state"); // Add cancel state class for red color
        btnText.innerText = t.cancelAutoScrape;
        
        // Change icon to stop icon
        if (btnIcon) {
            btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-stop-fill" viewBox="0 0 16 16">
                <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5"/>
            </svg>`;
        }
        
        startStatusPolling();
    }
});


/* ---------------- CLEAR DATA BUTTON ---------------- */

document.getElementById("clearBtn").addEventListener("click", () => {
    clearScrapedDataStorage(success => {
        if (success) {
            updatePreviewDisplay([]);
        }
    });
});


/* ---------------- UNIFIED DOWNLOAD BUTTON ---------------- */

document.getElementById("downloadBtn").addEventListener("click", () => {
    loadScrapedDataFromStorage(data => {
        if (!data || data.length === 0) return;

        const selectedFormat = formatSelect.value;
        const output = getFormattedOutput(data, selectedFormat);
        
        let blob, filename;
        
        if (selectedFormat === "json") {
            blob = new Blob([output], { type: "application/json" });
            filename = "coursera_questions.json";
        } else {
            blob = new Blob([output], { type: "text/plain" });
            filename = selectedFormat === "formatted" 
                ? "coursera_flashcards.txt" 
                : "coursera_questions.txt";
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    });
});


/* ---------------- INFO PANEL TOGGLE ---------------- */

const infoToggle = document.getElementById("infoToggle");
const infoPanel = document.getElementById("infoPanel");

infoToggle.addEventListener("click", () => {
    const isActive = infoPanel.classList.toggle("active");
    infoToggle.classList.toggle("active", isActive);
});
