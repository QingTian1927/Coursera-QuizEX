/* ---------------- BACKGROUND SERVICE WORKER ---------------- */

// Auto-scrape state
let autoScrapeState = {
    isRunning: false,
    isCancelled: false,
    logs: [],
    progress: { current: 0, total: 0 },
    error: null
};

// Default delay constants
const DEFAULT_NAVIGATION_DELAY = 4000;
const DEFAULT_FEEDBACK_DELAY = 4000;

// UI Text dictionary for localized log messages
const UI_TEXT = {
    EN: {
        logStarting: "Starting auto-scrape process...",
        logGettingFirstContent: "Getting first course content...",
        logNavigatingToContent: "Navigating to first content page...",
        logAlreadyOnModulePage: "Already on module page, skipping navigation...",
        logExtractingAssignments: "Extracting assignments and quizzes...",
        logFoundAssignments: (count) => `Found ${count} assignment(s)/quiz(zes)`,
        logProcessingAssignment: (current, total, title) => `Processing ${current}/${total}: ${title}`,
        logNavigatingToAssignment: "Navigating to assignment page...",
        logCheckingFeedback: "Checking for feedback button...",
        logNoFeedbackButton: "No feedback button found, skipping...",
        logClickingFeedback: "Clicking feedback button...",
        logScrapingQuestions: "Scraping questions...",
        logScrapedQuestions: (count) => `Scraped ${count} question(s)`,
        logNoQuestionsFound: "No questions found",
        logSavingData: "Saving data...",
        logCompleted: (total, count) => `Completed! Total questions: ${total}, Assignments processed: ${count}`,
        logError: (error) => `Error: ${error}`,
        logNoAssignments: "No assignments or quizzes could be found on this page",
        logStopped: "Auto-scrape cancelled by user"
    },
    VI: {
        logStarting: "Bắt đầu quá trình tự động quét...",
        logGettingFirstContent: "Lấy nội dung khóa học đầu tiên...",
        logNavigatingToContent: "Điều hướng đến trang nội dung đầu tiên...",
        logAlreadyOnModulePage: "Đã ở trang mô-đun, bỏ qua điều hướng...",
        logExtractingAssignments: "Trích xuất bài tập và bài kiểm tra...",
        logFoundAssignments: (count) => `Tìm thấy ${count} bài tập/bài kiểm tra`,
        logProcessingAssignment: (current, total, title) => `Xử lý ${current}/${total}: ${title}`,
        logNavigatingToAssignment: "Điều hướng đến trang bài tập...",
        logCheckingFeedback: "Kiểm tra nút phản hồi...",
        logNoFeedbackButton: "Không tìm thấy nút phản hồi, bỏ qua...",
        logClickingFeedback: "Nhấn nút phản hồi...",
        logScrapingQuestions: "Quét câu hỏi...",
        logScrapedQuestions: (count) => `Đã quét ${count} câu hỏi`,
        logNoQuestionsFound: "Không tìm thấy câu hỏi",
        logSavingData: "Lưu dữ liệu...",
        logCompleted: (total, count) => `Hoàn tất! Tổng số câu hỏi: ${total}, Bài tập đã xử lý: ${count}`,
        logError: (error) => `Lỗi: ${error}`,
        logNoAssignments: "Không tìm thấy bài tập hoặc bài kiểm tra nào trên trang này",
        logStopped: "Tự động quét đã bị hủy bởi người dùng"
    }
};

// Clear data when browser starts up
chrome.runtime.onStartup.addListener(() => {
    console.log('Browser started - clearing scraped data and resetting format');
    chrome.storage.local.set({ 
        scrapedData: [],
        currentFormat: null  // Clear current format selection on browser startup
    });
    // Reset auto-scrape state
    autoScrapeState = {
        isRunning: false,
        isCancelled: false,
        logs: [],
        progress: { current: 0, total: 0 },
        error: null
    };
});

// Initialize storage on installation (first time only)
chrome.runtime.onInstalled.addListener(() => {
    console.log('Coursera Scraper Extension Installed');
    
    // Initialize storage with empty array
    chrome.storage.local.set({ 
        scrapedData: [],
        currentFormat: null
    });
    
    // Reset auto-scrape state
    autoScrapeState = {
        isRunning: false,
        isCancelled: false,
        logs: [],
        progress: { current: 0, total: 0 },
        error: null
    };
});

// Helper function to add log entry
function addLog(message, type = 'info') {
    const timestamp = new Date();
    autoScrapeState.logs.push({
        message,
        type,
        timestamp: `[${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}]`
    });
}

// Helper function to send message to content script
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

// Helper function to navigate and wait for page load
function navigateToURL(tabId, url, navigationDelay) {
    return new Promise((resolve) => {
        chrome.tabs.update(tabId, { url }, () => {
            chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    setTimeout(() => resolve(), navigationDelay);
                }
            });
        });
    });
}

// Main auto-scrape function running in background
async function performBackgroundAutoScrape(tabId, settings) {
    autoScrapeState.isRunning = true;
    autoScrapeState.logs = [];
    autoScrapeState.progress = { current: 0, total: 0 };
    autoScrapeState.error = null;
    
    const navigationDelay = settings.navigationDelay || DEFAULT_NAVIGATION_DELAY;
    const feedbackDelay = settings.feedbackDelay || DEFAULT_FEEDBACK_DELAY;
    const lang = settings.language || 'VI'; // Default to VI if not specified
    const t = UI_TEXT[lang];
    
    try {
        addLog(t.logStarting, 'info');
        
        // Step 1: Try to get first course content
        addLog(t.logGettingFirstContent, 'info');
        let response = await sendMessageToTab(tabId, { action: "getFirstCourseContent" });
        
        if (response && response.data && response.data.url) {
            addLog(t.logNavigatingToContent, 'info');
            await navigateToURL(tabId, response.data.url, navigationDelay);
        } else {
            addLog(t.logAlreadyOnModulePage, 'info');
        }
        
        // Step 2: Extract assignments
        addLog(t.logExtractingAssignments, 'info');
        response = await sendMessageToTab(tabId, { action: "extractAssignments" });
        
        if (!response || !response.data || response.data.length === 0) {
            addLog(t.logNoAssignments, 'error');
            autoScrapeState.error = 'No assignments found';
            autoScrapeState.isRunning = false;
            return;
        }
        
        const assignments = response.data;
        autoScrapeState.progress.total = assignments.length;
        addLog(t.logFoundAssignments(assignments.length), 'success');
        
        let totalScraped = 0;
        
        // Process each assignment
        for (let i = 0; i < assignments.length; i++) {
            // Check if cancelled
            if (autoScrapeState.isCancelled) {
                addLog(t.logStopped, 'warning');
                autoScrapeState.isCancelled = false;
                // Small delay to ensure popup gets the final log update
                await new Promise(resolve => setTimeout(resolve, 1000));
                autoScrapeState.isRunning = false;
                return;
            }
            
            const assignment = assignments[i];
            autoScrapeState.progress.current = i + 1;
            addLog(t.logProcessingAssignment(i + 1, assignments.length, assignment.title), 'info');
            
            // Navigate to assignment
            addLog(t.logNavigatingToAssignment, 'info');
            await navigateToURL(tabId, assignment.url, navigationDelay);
            
            // Check for feedback button
            addLog(t.logCheckingFeedback, 'info');
            response = await sendMessageToTab(tabId, { action: "getViewFeedbackButton" });
            
            if (!response || !response.hasButton) {
                addLog(t.logNoFeedbackButton, 'warning');
                continue;
            }
            
            // Click feedback and scrape
            addLog(t.logClickingFeedback, 'info');
            addLog(t.logScrapingQuestions, 'info');
            response = await sendMessageToTab(tabId, { 
                action: "clickViewFeedbackButton",
                delay: feedbackDelay
            });
            
            if (response && response.success && response.data && response.data.length > 0) {
                addLog(t.logScrapedQuestions(response.data.length), 'success');
                addLog(t.logSavingData, 'info');
                
                // Save data to storage
                const result = await chrome.storage.local.get(['scrapedData']);
                const existingData = result.scrapedData || [];
                const updatedData = [...existingData, ...response.data];
                await chrome.storage.local.set({ scrapedData: updatedData });
                
                totalScraped += response.data.length;
            } else {
                addLog(t.logNoQuestionsFound, 'warning');
            }
        }
        
        addLog(t.logCompleted(totalScraped, assignments.length), 'success');
        autoScrapeState.isRunning = false;
        
    } catch (error) {
        console.error("Background auto-scrape error:", error);
        addLog(t.logError(error.message || error), 'error');
        autoScrapeState.error = error.message || String(error);
        autoScrapeState.isRunning = false;
    }
}

// Handle messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);

    switch (message.action) {
        case 'getScrapedData':
            // Return stored data to popup
            chrome.storage.local.get(['scrapedData'], (result) => {
                sendResponse({ data: result.scrapedData || [] });
            });
            return true;

        case 'appendScrapedData':
            // Append new scraped data to existing storage
            chrome.storage.local.get(['scrapedData'], (result) => {
                const existingData = result.scrapedData || [];
                const newData = message.data || [];
                const updatedData = [...existingData, ...newData];
                
                chrome.storage.local.set({ scrapedData: updatedData }, () => {
                    console.log(`Appended ${newData.length} questions. Total: ${updatedData.length}`);
                    sendResponse({ success: true, totalCount: updatedData.length });
                });
            });
            return true;

        case 'clearScrapedData':
            // Clear all stored data
            chrome.storage.local.set({ scrapedData: [] }, () => {
                console.log('Cleared all scraped data');
                sendResponse({ success: true });
            });
            return true;

        case 'setScrapedData':
            // Replace all data with new data
            chrome.storage.local.set({ scrapedData: message.data || [] }, () => {
                console.log(`Set scraped data: ${message.data.length} questions`);
                sendResponse({ success: true });
            });
            return true;

        case 'startAutoScrape':
            // Start auto-scrape in background
            if (autoScrapeState.isRunning) {
                sendResponse({ success: false, error: 'Auto-scrape already running' });
                return false;
            }
            
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || !tabs[0]) {
                    sendResponse({ success: false, error: 'Could not access current tab' });
                    return;
                }
                
                performBackgroundAutoScrape(tabs[0].id, message.settings || {})
                    .then(() => {
                        console.log('Auto-scrape completed');
                    })
                    .catch(err => {
                        console.error('Auto-scrape failed:', err);
                    });
                
                sendResponse({ success: true });
            });
            return true;

        case 'getAutoScrapeStatus':
            // Return current auto-scrape status
            sendResponse({
                isRunning: autoScrapeState.isRunning,
                logs: autoScrapeState.logs,
                progress: autoScrapeState.progress,
                error: autoScrapeState.error
            });
            return false;

        case 'stopAutoScrape':
            // Stop auto-scrape by setting cancellation flag
            if (autoScrapeState.isRunning) {
                autoScrapeState.isCancelled = true;
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'No auto-scrape running' });
            }
            return false;

        default:
            sendResponse({ error: 'Unknown action' });
            return false;
    }
});
