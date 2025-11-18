/* ---------------- BACKGROUND SERVICE WORKER ---------------- */

// Clear data when browser starts up
chrome.runtime.onStartup.addListener(() => {
    console.log('Browser started - clearing scraped data');
    chrome.storage.local.set({ scrapedData: [] });
});

// Initialize storage on installation (first time only)
chrome.runtime.onInstalled.addListener(() => {
    console.log('Coursera Scraper Extension Installed');
    
    // Initialize storage with empty array
    chrome.storage.local.set({ scrapedData: [] });
});

// Handle messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);

    switch (message.action) {
        case 'getScrapedData':
            // Return stored data to popup
            chrome.storage.local.get(['scrapedData'], (result) => {
                sendResponse({ data: result.scrapedData || [] });
            });
            return true; // Keeps the message channel open for async response

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

        default:
            sendResponse({ error: 'Unknown action' });
            return false;
    }
});
