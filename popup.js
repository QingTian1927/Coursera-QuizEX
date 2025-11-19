/* ---------------- DEFAULT FORMAT SETTINGS ---------------- */

let formatSettings = {
    questionSeparator: "\n\n",
    choiceSeparator: "\n",
    answerPrefix: "/",
    answerSuffix: ";",
    defaultFormat: "normal"
};

// Load saved format settings (persisted via chrome.storage.sync)
chrome.storage.sync.get(["formatSettings"], res => {
    if (res.formatSettings) {
        formatSettings = res.formatSettings;
        updateSettingsInputs();
        // Set format selector to saved default
        document.getElementById("formatSelect").value = formatSettings.defaultFormat || "normal";
    }
});

function updateSettingsInputs() {
    document.getElementById("inputSeparator").value = escapeForDisplay(formatSettings.questionSeparator);
    document.getElementById("inputChoice").value = escapeForDisplay(formatSettings.choiceSeparator);
    document.getElementById("inputAnswer").value = escapeForDisplay(formatSettings.answerPrefix);
    document.getElementById("inputSuffix").value = escapeForDisplay(formatSettings.answerSuffix);
    document.getElementById("defaultFormatSelect").value = formatSettings.defaultFormat || "normal";
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

    let output = "";
    data.forEach((q, i) => {
        output += `Q${i + 1}: ${q.question}\n`;
        q.choices.forEach(c => {
            output += ` • ${c.text}${c.selected ? " ✓" : ""}\n`;
        });
        output += "\n";
    });
    return output;
}

// Generate formatted output (flashcard format)
function generateFormattedOutput(data) {
    if (!data || data.length === 0) return "";

    return data
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
        .join("\n\n");
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


/* ---------------- UI TEXT DICTIONARY ---------------- */

const UI_TEXT = {
    EN: {
        title: "Coursera Scraper",
        scrape: "🔍 Scrape Coursera Page",
        clear: "🗑️ Clear Data",
        noData: "No data yet…",
        preview: "Preview",
        download: "Download",
        format: "Format:",
        copied: "Copied!",
        modalTitle: "Settings",
        labelDefaultFormat: "Default Output Format",
        hintDefaultFormat: "Format used for preview and download",
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
        preview: "Xem trước",
        download: "Tải xuống",
        format: "Định dạng:",
        copied: "Đã sao chép!",
        modalTitle: "Cài đặt",
        labelDefaultFormat: "Định dạng mặc định",
        hintDefaultFormat: "Định dạng dùng để xem trước và tải xuống",
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
    document.getElementById("previewTitle").innerText = t.preview;
    document.getElementById("btnDownload").innerText = t.download;
    document.getElementById("formatLabel").innerText = t.format;
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
    document.getElementById("cancelSettings").innerText = t.cancel;
    document.getElementById("saveSettings").innerText = t.save;
}


/* ---------------- FORMAT SELECTOR ---------------- */

const formatSelect = document.getElementById("formatSelect");

// Update preview when format changes
formatSelect.addEventListener("change", () => {
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
            // Visual feedback
            const originalText = copyBtn.innerText;
            copyBtn.innerText = "✓";
            copyBtn.style.color = "var(--success)";
            
            setTimeout(() => {
                copyBtn.innerText = originalText;
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
        defaultFormat: document.getElementById("defaultFormatSelect").value
    };
    chrome.storage.sync.set({ formatSettings });
    
    // Update format selector to match new default
    document.getElementById("formatSelect").value = formatSettings.defaultFormat;
    
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
