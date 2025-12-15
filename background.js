/* ---------------- BACKGROUND SERVICE WORKER ---------------- */

// Import UI text dictionary
importScripts('i18n.js');

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
        // Early exit if cancelled
        if (autoScrapeState.isCancelled) {
            resolve('cancelled');
            return;
        }
        chrome.tabs.update(tabId, { url }, () => {
            chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    // If cancelled during navigation delay, exit early
                    const delay = navigationDelay || DEFAULT_NAVIGATION_DELAY;
                    const start = Date.now();
                    const tick = () => {
                        if (autoScrapeState.isCancelled) {
                            resolve('cancelled');
                            return;
                        }
                        if (Date.now() - start >= delay) {
                            resolve('done');
                        } else {
                            setTimeout(tick, 100);
                        }
                    };
                    tick();
                }
            });
        });
    });
}

// Helper: scrape current course on the active page (no state reset here)
async function scrapeSingleCourseInternal(tabId, settings, t) {
    const navigationDelay = settings.navigationDelay || DEFAULT_NAVIGATION_DELAY;
    const feedbackDelay = settings.feedbackDelay || DEFAULT_FEEDBACK_DELAY;

    // Step 1: Try to get first course content
    addLog(t.logGettingFirstContent, 'info');
    let response = await sendMessageToTab(tabId, { action: "getFirstCourseContent" });

    if (response && response.data && response.data.url) {
        addLog(t.logNavigatingToContent, 'info');
        const navResult = await navigateToURL(tabId, response.data.url, navigationDelay);
        if (navResult === 'cancelled') {
            addLog(t.logStopped, 'warning');
            return { totalScraped: 0, assignmentCount: 0, cancelled: true };
        }
    } else {
        addLog(t.logAlreadyOnModulePage, 'info');
    }

    // Step 2: Extract assignments
    addLog(t.logExtractingAssignments, 'info');
    response = await sendMessageToTab(tabId, { action: "extractAssignments" });

        if (!response || !response.data || response.data.length === 0) {
        addLog(t.logNoAssignments, 'error');
        autoScrapeState.error = 'No assignments found';
            return { totalScraped: 0, assignmentCount: 0, cancelled: false };
    }

    const assignments = response.data;
    autoScrapeState.progress.total = assignments.length;
    addLog(t.logFoundAssignments(assignments.length), 'success');

    let totalScraped = 0;

    // Process each assignment
    for (let i = 0; i < assignments.length; i++) {
        if (autoScrapeState.isCancelled) {
            addLog(t.logStopped, 'warning');
            autoScrapeState.isCancelled = false;
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { totalScraped, assignmentCount: i };
        }

        const assignment = assignments[i];
        autoScrapeState.progress.current = i + 1;
        addLog(t.logProcessingAssignment(i + 1, assignments.length, assignment.title), 'info');

        // Navigate to assignment
        addLog(t.logNavigatingToAssignment, 'info');
        const navAssign = await navigateToURL(tabId, assignment.url, navigationDelay);
        if (navAssign === 'cancelled') {
            addLog(t.logStopped, 'warning');
            return { totalScraped, assignmentCount: i, cancelled: true };
        }

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
        // Respect cancellation during feedback wait by splitting delay handling: content side handles delay
        if (autoScrapeState.isCancelled) {
            addLog(t.logStopped, 'warning');
            return { totalScraped, assignmentCount: i, cancelled: true };
        }
        response = await sendMessageToTab(tabId, { action: "clickViewFeedbackButton", delay: feedbackDelay });

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
    return { totalScraped, assignmentCount: assignments.length, cancelled: false };
}

// Entry point: Multi-course (learning paths) or single-course fallback
async function performAutoScrapeEntry(tabId, settings) {
    // Wait for messages to load
    await messagesLoaded;

    autoScrapeState.isRunning = true;
    autoScrapeState.isCancelled = false;
    autoScrapeState.logs = [];
    autoScrapeState.progress = { current: 0, total: 0 };
    autoScrapeState.error = null;

    const lang = settings.language || detectBrowserLanguage();
    UI_TEXT.setLanguage(lang);
    const t = UI_TEXT;

    try {
        addLog(t.logStarting, 'info');
        addLog(t.logCheckingMyLearning, 'info');

        // Check if on My Learning > Completed
        let detection = await sendMessageToTab(tabId, { action: 'isOnMyLearningCompleted' });
        const onMyLearningCompleted = !!(detection && detection.isMyLearningCompleted);

        if (!onMyLearningCompleted) {
            addLog(t.logNotOnMyLearning, 'info');
            const result = await scrapeSingleCourseInternal(tabId, settings, t);
            autoScrapeState.isRunning = false;
            return;
        }

        addLog(t.logOnMyLearningCompleted, 'info');
        // Get learning paths
        const pathsResp = await sendMessageToTab(tabId, { action: 'getLearningPaths' });
        const paths = (pathsResp && pathsResp.data) || [];
        addLog(t.logFoundLearningPaths(paths.length), 'success');

        if (!paths.length) {
            addLog(t.logNotOnMyLearning, 'info');
            const result = await scrapeSingleCourseInternal(tabId, settings, t);
            autoScrapeState.isRunning = false;
            return;
        }

        addLog(t.logPromptSelectLearningPath, 'info');
        // Pass translated strings to content script for picker UI
        // Pre-translate course count strings for all paths
        const pickerStrings = {
            title: t.pickerTitle || 'Select a learning path to scrape',
            cancel: t.pickerCancel || 'Cancel',
            noPaths: t.pickerNoPaths || 'No learning paths found.',
            courseCounts: {}
        };
        // Pre-compute translated course count for each unique count
        const uniqueCounts = new Set(paths.map(p => p.courses?.length || 0));
        uniqueCounts.forEach(count => {
            pickerStrings.courseCounts[count] = t.pickerCourseCount(count) || `${count} course(s)`;
        });
        const choice = await sendMessageToTab(tabId, { action: 'chooseLearningPath', paths, pickerStrings });
        if (!choice || !choice.selectedId) {
            addLog(t.logUserCancelledPathSelection, 'warning');
            const result = await scrapeSingleCourseInternal(tabId, settings, t);
            autoScrapeState.isRunning = false;
            return;
        }

        const selected = paths.find(p => p.id === choice.selectedId);
        if (!selected) {
            addLog(t.logUserCancelledPathSelection, 'warning');
            const result = await scrapeSingleCourseInternal(tabId, settings, t);
            autoScrapeState.isRunning = false;
            return;
        }

        addLog(t.logSelectedLearningPath(selected.title, selected.courses.length), 'info');

        // Iterate courses in the selected path
        let grandTotal = 0;
        for (const course of selected.courses) {
            if (autoScrapeState.isCancelled) {
                addLog(t.logStopped, 'warning');
                autoScrapeState.isRunning = false;
                autoScrapeState.isCancelled = false;
                return; // stop entire flow immediately
            }
            addLog(t.logNavigatingToCourse(course.name || course.id), 'info');
            const navCourse = await navigateToURL(tabId, course.link, settings.navigationDelay || DEFAULT_NAVIGATION_DELAY);
            if (navCourse === 'cancelled') {
                addLog(t.logStopped, 'warning');
                autoScrapeState.isRunning = false;
                autoScrapeState.isCancelled = false;
                return;
            }
            const { totalScraped, assignmentCount, cancelled } = await scrapeSingleCourseInternal(tabId, settings, t);
            if (cancelled) {
                autoScrapeState.isRunning = false;
                autoScrapeState.isCancelled = false;
                return;
            }
            grandTotal += totalScraped;
            addLog(t.logCourseCompleted(course.name || course.id, totalScraped, assignmentCount), 'success');
        }

        addLog(t.logAllCoursesCompleted(selected.courses.length, grandTotal), 'success');
        autoScrapeState.isRunning = false;
    } catch (error) {
        console.error('Auto-scrape entry error:', error);
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
                
                performAutoScrapeEntry(tabs[0].id, message.settings || {})
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
