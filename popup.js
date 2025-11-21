/* ---------------- DEFAULT FORMAT SETTINGS ---------------- */

let formatSettings = {
    questionSeparator: "\n\n",
    choiceSeparator: "\n",
    answerPrefix: "/",
    answerSuffix: ";",
    defaultFormat: "normal",
    navigationDelay: 1500,  // Default navigation delay in ms
    feedbackDelay: 2000     // Default feedback button delay in ms
};

// Load saved format settings (persisted via chrome.storage.sync)
chrome.storage.sync.get(["formatSettings"], res => {
    if (res.formatSettings) {
        formatSettings = res.formatSettings;
        // Ensure delay settings exist (for backward compatibility)
        if (!formatSettings.navigationDelay) formatSettings.navigationDelay = 1500;
        if (!formatSettings.feedbackDelay) formatSettings.feedbackDelay = 2000;
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
    document.getElementById("inputNavigationDelay").value = formatSettings.navigationDelay || 1500;
    document.getElementById("inputFeedbackDelay").value = formatSettings.feedbackDelay || 2000;
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
            output += ` • ${c.text}${c.selected ? " (x)" : ""}\n`;
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


/* ---------------- UI TEXT DICTIONARY ---------------- */

const UI_TEXT = {
    EN: {
        title: "Coursera QuizEX",
        scrape: "Scrape Page",
        autoScrape: "Auto-Scrape",
        clear: "Clear Data",
        noData: "No data yet…",
        preview: "Preview",
        download: "Download",
        format: "Format:",
        copied: "Copied!",
        about: "About",
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
        labelNavigationDelay: "Navigation Delay (ms)",
        hintNavigationDelay: "Wait time after page navigation",
        labelFeedbackDelay: "Feedback Delay (ms)",
        hintFeedbackDelay: "Wait time after clicking feedback button",
        cancel: "Cancel",
        save: "Save",
        infoVersion: "Version:",
        infoAuthor: "Author:",
        infoGitHub: "GitHub:",
        infoHelp: "Help:",
        alertTabError: "Error: Could not access current tab",
        alertNotOnCoursePage: "Are you on the course welcome page?\n\nPlease navigate to the course main page where you can see all modules and lessons.",
        alertNoAssignments: "No assignments or quizzes could be found on this page.\n\nPlease make sure you're on a page that shows the course modules.",
        alertAutoScrapeComplete: (total, count) => `Auto-scrape completed!\n\nTotal questions scraped: ${total}\nAssignments processed: ${count}`,
        alertAutoScrapeError: (error) => `An error occurred during auto-scrape:\n\n${error}`
    },
    VI: {
        title: "Coursera QuizEX",
        scrape: "Quét trang",
        autoScrape: "Tự động quét",
        clear: "Xóa dữ liệu",
        noData: "Chưa có dữ liệu…",
        preview: "Xem trước",
        download: "Tải xuống",
        format: "Định dạng:",
        copied: "Đã sao chép!",
        about: "Thông tin",
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
        labelNavigationDelay: "Độ trễ điều hướng (ms)",
        hintNavigationDelay: "Thời gian chờ sau khi điều hướng trang",
        labelFeedbackDelay: "Độ trễ phản hồi (ms)",
        hintFeedbackDelay: "Thời gian chờ sau khi nhấn nút phản hồi",
        cancel: "Hủy",
        save: "Lưu",
        infoVersion: "Phiên bản:",
        infoAuthor: "Tác giả:",
        infoGitHub: "GitHub:",
        infoHelp: "Trợ giúp:",
        alertTabError: "Lỗi: Không thể truy cập tab hiện tại",
        alertNotOnCoursePage: "Bạn có đang ở trang chào mừng khóa học không?\n\nVui lòng điều hướng đến trang chính của khóa học nơi bạn có thể thấy tất cả các mô-đun và bài học.",
        alertNoAssignments: "Không tìm thấy bài tập hoặc bài kiểm tra nào trên trang này.\n\nVui lòng đảm bảo bạn đang ở trang hiển thị các mô-đun khóa học.",
        alertAutoScrapeComplete: (total, count) => `Tự động quét hoàn tất!\n\nTổng số câu hỏi đã quét: ${total}\nBài tập đã xử lý: ${count}`,
        alertAutoScrapeError: (error) => `Đã xảy ra lỗi trong quá trình tự động quét:\n\n${error}`
    }
};

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
        navigationDelay: parseInt(document.getElementById("inputNavigationDelay").value) || 1500,
        feedbackDelay: parseInt(document.getElementById("inputFeedbackDelay").value) || 2000
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

// Main auto-scrape function
async function performAutoScrape() {
    const t = UI_TEXT[currentLang];
    
    try {
        // Get current tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || !tabs[0]) {
            alert(t.alertTabError);
            return;
        }
        const tabId = tabs[0].id;
        
        console.log("Step 1: Getting first course content...");
        
        // Step 1: Get first course content
        let response = await sendMessageToTab(tabId, { action: "getFirstCourseContent" });
        
        if (!response || !response.data || !response.data.url) {
            alert(t.alertNotOnCoursePage);
            return;
        }
        
        console.log("Step 2: Navigating to first content page...");
        
        // Step 2: Navigate to the first content page (where modules are listed)
        await navigateToURL(tabId, response.data.url);
        
        console.log("Step 3: Extracting assignments...");
        
        // Step 3: Extract assignments
        response = await sendMessageToTab(tabId, { action: "extractAssignments" });
        
        if (!response || !response.data || response.data.length === 0) {
            alert(t.alertNoAssignments);
            return;
        }
        
        const assignments = response.data;
        console.log(`Found ${assignments.length} assignments/quizzes`);
        
        let totalScraped = 0;
        
        // Step 4-8: Process each assignment sequentially
        for (let i = 0; i < assignments.length; i++) {
            const assignment = assignments[i];
            console.log(`Processing ${i + 1}/${assignments.length}: ${assignment.title}`);
            
            // Navigate to assignment page
            await navigateToURL(tabId, assignment.url);
            
            // Step 5: Check for feedback button
            response = await sendMessageToTab(tabId, { action: "getViewFeedbackButton" });
            
            if (!response || !response.hasButton) {
                console.log(`No feedback button found for: ${assignment.title}`);
                continue; // Skip to next assignment
            }
            
            // Step 6: Click feedback button and scrape
            response = await sendMessageToTab(tabId, { 
                action: "clickViewFeedbackButton",
                delay: formatSettings.feedbackDelay
            });
            
            if (response && response.success && response.data && response.data.length > 0) {
                console.log(`Scraped ${response.data.length} questions from: ${assignment.title}`);
                
                // Save the data
                await new Promise((resolve) => {
                    appendScrapedDataToStorage(response.data, (success) => {
                        if (success) {
                            totalScraped += response.data.length;
                        }
                        resolve();
                    });
                });
            } else {
                console.log(`No data found for: ${assignment.title}`);
            }
        }
        
        // Update preview with all collected data
        loadScrapedDataFromStorage(data => {
            updatePreviewDisplay(data);
        });
        
        alert(t.alertAutoScrapeComplete(totalScraped, assignments.length));
        
    } catch (error) {
        console.error("Auto-scrape error:", error);
        alert(t.alertAutoScrapeError(error.message || error));
    }
}

document.getElementById("autoScrapeBtn").addEventListener("click", () => {
    // Disable button during scraping to prevent multiple clicks
    const btn = document.getElementById("autoScrapeBtn");
    const originalText = btn.querySelector("#autoScrapeBtnText").innerText;
    
    btn.disabled = true;
    btn.style.opacity = "0.6";
    btn.querySelector("#autoScrapeBtnText").innerText = "Scraping...";
    
    performAutoScrape().finally(() => {
        // Re-enable button
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.querySelector("#autoScrapeBtnText").innerText = originalText;
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


/* ---------------- INFO PANEL TOGGLE ---------------- */

const infoToggle = document.getElementById("infoToggle");
const infoPanel = document.getElementById("infoPanel");

infoToggle.addEventListener("click", () => {
    const isActive = infoPanel.classList.toggle("active");
    infoToggle.classList.toggle("active", isActive);
});
