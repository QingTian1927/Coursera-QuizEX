/* ---------------- DEFAULT FORMAT SETTINGS ---------------- */

let formatSettings = {
    questionSeparator: "\n\n",
    choiceSeparator: "\n",
    answerPrefix: "/",
    answerSuffix: ";"
};

// Load saved format settings
chrome.storage.sync.get(["formatSettings"], res => {
    if (res.formatSettings) {
        formatSettings = res.formatSettings;
        updateSettingsInputs();
    }
});

function updateSettingsInputs() {
    document.getElementById("inputSeparator").value = escapeForDisplay(formatSettings.questionSeparator);
    document.getElementById("inputChoice").value = escapeForDisplay(formatSettings.choiceSeparator);
    document.getElementById("inputAnswer").value = escapeForDisplay(formatSettings.answerPrefix);
    document.getElementById("inputSuffix").value = escapeForDisplay(formatSettings.answerSuffix);
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

// Generate preview text from scraped data
function generatePreviewText(data) {
    if (!data || data.length === 0) {
        return "";
    }

    let preview = "";
    data.forEach((q, i) => {
        preview += `Q${i + 1}: ${q.question}\n`;
        q.choices.forEach(c => {
            preview += ` • ${c.text}${c.selected ? " ✓" : ""}\n`;
        });
        preview += "\n";
    });
    return preview;
}

// Update preview display
function updatePreviewDisplay(data) {
    const previewContent = document.getElementById("previewContent");
    const previewCount = document.getElementById("previewCount");
    
    if (!data || data.length === 0) {
        previewContent.innerText = UI_TEXT[currentLang].noData;
        previewCount.innerText = "0";
    } else {
        previewContent.innerText = generatePreviewText(data);
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


/* ---------------- UI TEXT DICTIONARY ---------------- */

const UI_TEXT = {
    EN: {
        title: "Coursera Scraper",
        scrape: "🔍 Scrape Coursera Page",
        clear: "🗑️ Clear Data",
        noData: "No data yet…",
        json: "JSON",
        formatted: "Formatted",
        preview: "Preview",
        modalTitle: "Format Settings",
        labelSeparator: "Question Separator",
        hintSeparator: "Character(s) between question and choices",
        labelChoice: "Choice Separator",
        hintChoice: "Character(s) between each choice",
        labelAnswer: "Answer Prefix",
        hintAnswer: "Character(s) before the selected answer",
        labelSuffix: "Answer Suffix",
        hintSuffix: "Character(s) after the selected answer",
        cancel: "Cancel",
        save: "Save"
    },
    VI: {
        title: "Trích xuất Coursera",
        scrape: "🔍 Quét trang Coursera",
        clear: "🗑️ Xóa dữ liệu",
        noData: "Chưa có dữ liệu…",
        json: "JSON",
        formatted: "Định dạng",
        preview: "Xem trước",
        modalTitle: "Cài đặt định dạng",
        labelSeparator: "Phân cách câu hỏi",
        hintSeparator: "Ký tự giữa câu hỏi và các lựa chọn",
        labelChoice: "Phân cách lựa chọn",
        hintChoice: "Ký tự giữa các lựa chọn",
        labelAnswer: "Tiền tố đáp án",
        hintAnswer: "Ký tự trước đáp án đã chọn",
        labelSuffix: "Hậu tố đáp án",
        hintSuffix: "Ký tự sau đáp án đã chọn",
        cancel: "Hủy",
        save: "Lưu"
    }
};

function applyLanguage() {
    const t = UI_TEXT[currentLang];
    document.getElementById("title").innerText = t.title;
    document.getElementById("scrapeBtn").innerText = t.scrape;
    document.getElementById("clearBtn").innerText = t.clear;
    document.getElementById("btnJSON").innerText = t.json;
    document.getElementById("btnFormatted").innerText = t.formatted;
    document.getElementById("previewTitle").innerText = t.preview;
    document.getElementById("modalTitle").innerText = t.modalTitle;
    document.getElementById("labelSeparator").innerText = t.labelSeparator;
    document.getElementById("hintSeparator").innerText = t.hintSeparator;
    document.getElementById("labelChoice").innerText = t.labelChoice;
    document.getElementById("hintChoice").innerText = t.hintChoice;
    document.getElementById("labelAnswer").innerText = t.labelAnswer;
    document.getElementById("hintAnswer").innerText = t.hintAnswer;
    document.getElementById("labelSuffix").innerText = t.labelSuffix;
    document.getElementById("hintSuffix").innerText = t.hintSuffix;
    document.getElementById("cancelSettings").innerText = t.cancel;
    document.getElementById("saveSettings").innerText = t.save;
}


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
        answerSuffix: unescapeFromInput(document.getElementById("inputSuffix").value)
    };
    chrome.storage.sync.set({ formatSettings });
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


/* ---------------- CLEAR DATA BUTTON ---------------- */

document.getElementById("clearBtn").addEventListener("click", () => {
    clearScrapedDataStorage(success => {
        if (success) {
            updatePreviewDisplay([]);
        }
    });
});


/* ---------------- DOWNLOAD JSON ---------------- */

document.getElementById("downloadJSON").addEventListener("click", () => {
    loadScrapedDataFromStorage(data => {
        if (!data || data.length === 0) return;

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "coursera_questions.json";
        a.click();
        URL.revokeObjectURL(url);
    });
});


/* ---------------- DOWNLOAD FORMATTED WITH CUSTOM SETTINGS ---------------- */

document.getElementById("downloadFormatted").addEventListener("click", () => {
    loadScrapedDataFromStorage(data => {
        if (!data || data.length === 0) return;

        const out = data
            .map(q => {
                const sel = q.choices.find(c => c.selected)?.text || "";
                const choicesText = q.choices.map(c => c.text).join(formatSettings.choiceSeparator);
                
                return q.question + 
                       formatSettings.questionSeparator + 
                       choicesText + 
                       "\n" +
                       formatSettings.answerPrefix + 
                       sel + 
                       formatSettings.answerSuffix;
            })
            .join("");

        const blob = new Blob([out], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "coursera_flashcards.txt";
        a.click();
        URL.revokeObjectURL(url);
    });
});
