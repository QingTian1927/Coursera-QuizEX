/* ---------------- INTERNATIONALIZATION (i18n) ---------------- */

// Detect browser language and return 'en' or 'vi'
function detectBrowserLanguage() {
    const browserLang = chrome.i18n.getUILanguage().toLowerCase();
    // If browser is set to Vietnamese, use 'vi', otherwise default to 'en'
    return browserLang.startsWith('vi') ? 'vi' : 'en';
}

// Messages cache - will be populated by loading messages.json files
let messagesCache = {
    en: null,
    vi: null
};

// Load messages for a specific locale
async function loadMessages(locale) {
    if (messagesCache[locale]) {
        return messagesCache[locale];
    }
    
    try {
        const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
        console.log(`Loading messages from: ${url}`);
        const response = await fetch(url);
        const messages = await response.json();
        console.log(`Loaded ${Object.keys(messages).length} messages for locale ${locale}`, Object.keys(messages).slice(0, 5));
        messagesCache[locale] = messages;
        return messages;
    } catch (error) {
        console.error(`Failed to load messages for locale ${locale}:`, error);
        // Fallback to English if loading fails
        if (locale !== 'en') {
            return loadMessages('en');
        }
        return {};
    }
}

// Promise to track when messages are loaded
const messagesLoaded = (async function initMessages() {
    console.log('initMessages() starting...');
    try {
        await Promise.all([
            loadMessages('en'),
            loadMessages('vi')
        ]);
        console.log('initMessages() completed, cache:', messagesCache);
    } catch (error) {
        console.error('initMessages() failed:', error);
    }
})();

// Helper function to get message from loaded messages
function getMessageFromCache(messageName, locale, substitutions) {
    const messages = messagesCache[locale] || messagesCache['en'];
    if (!messages || !messages[messageName]) {
        console.warn(`Message not found: ${messageName} for locale: ${locale}`);
        return messageName; // Fallback to message name if not found
    }
    
    let message = messages[messageName].message;
    
    // Handle substitutions/placeholders
    if (substitutions && Array.isArray(substitutions) && substitutions.length > 0) {
        const placeholders = messages[messageName].placeholders;
        
        if (placeholders) {
            // Handle named placeholders like $COUNT$, $TOTAL$, etc.
            Object.keys(placeholders).forEach((key) => {
                const placeholderDef = placeholders[key];
                // Extract the number from content like "$1", "$2", etc.
                const match = placeholderDef.content.match(/\$(\d+)/);
                if (match) {
                    const subIndex = parseInt(match[1]) - 1; // Convert $1 to index 0
                    if (subIndex >= 0 && subIndex < substitutions.length) {
                        // Replace $KEY$ format - key is lowercase in JSON but uppercase in message
                        const upperKey = key.toUpperCase();
                        const pattern = `$${upperKey}$`;
                        message = message.split(pattern).join(substitutions[subIndex]);
                    }
                }
            });
        }
        
        // Also handle direct $1, $2, etc. placeholders (fallback)
        substitutions.forEach((sub, index) => {
            const pattern = `$${index + 1}`;
            message = message.split(pattern).join(sub);
        });
    }
    
    return message;
}

// Create language-aware UI_TEXT object
const UI_TEXT = {
    _currentLang: 'en',
    
    setLanguage(lang) {
        this._currentLang = lang;
    },
    
    // Simple messages
    get title() { return getMessageFromCache('title', this._currentLang); },
    get scrape() { return getMessageFromCache('scrape', this._currentLang); },
    get autoScrape() { return getMessageFromCache('autoScrape', this._currentLang); },
    get cancelAutoScrape() { return getMessageFromCache('cancelAutoScrape', this._currentLang); },
    get clear() { return getMessageFromCache('clear', this._currentLang); },
    get noData() { return getMessageFromCache('noData', this._currentLang); },
    get preview() { return getMessageFromCache('preview', this._currentLang); },
    get download() { return getMessageFromCache('download', this._currentLang); },
    get format() { return getMessageFromCache('format', this._currentLang); },
    get copied() { return getMessageFromCache('copied', this._currentLang); },
    get about() { return getMessageFromCache('about', this._currentLang); },
    
    // Settings Modal
    get modalTitle() { return getMessageFromCache('modalTitle', this._currentLang); },
    get labelDefaultFormat() { return getMessageFromCache('labelDefaultFormat', this._currentLang); },
    get hintDefaultFormat() { return getMessageFromCache('hintDefaultFormat', this._currentLang); },
    get labelSeparator() { return getMessageFromCache('labelSeparator', this._currentLang); },
    get hintSeparator() { return getMessageFromCache('hintSeparator', this._currentLang); },
    get labelChoice() { return getMessageFromCache('labelChoice', this._currentLang); },
    get hintChoice() { return getMessageFromCache('hintChoice', this._currentLang); },
    get labelAnswer() { return getMessageFromCache('labelAnswer', this._currentLang); },
    get hintAnswer() { return getMessageFromCache('hintAnswer', this._currentLang); },
    get labelSuffix() { return getMessageFromCache('labelSuffix', this._currentLang); },
    get hintSuffix() { return getMessageFromCache('hintSuffix', this._currentLang); },
    get labelNavigationDelay() { return getMessageFromCache('labelNavigationDelay', this._currentLang); },
    get hintNavigationDelay() { return getMessageFromCache('hintNavigationDelay', this._currentLang); },
    get labelFeedbackDelay() { return getMessageFromCache('labelFeedbackDelay', this._currentLang); },
    get hintFeedbackDelay() { return getMessageFromCache('hintFeedbackDelay', this._currentLang); },
    get cancel() { return getMessageFromCache('cancel', this._currentLang); },
    get save() { return getMessageFromCache('save', this._currentLang); },
    
    // Info Panel
    get infoVersion() { return getMessageFromCache('infoVersion', this._currentLang); },
    get infoAuthor() { return getMessageFromCache('infoAuthor', this._currentLang); },
    get infoGitHub() { return getMessageFromCache('infoGitHub', this._currentLang); },
    get infoHelp() { return getMessageFromCache('infoHelp', this._currentLang); },
    
    // Alerts
    get alertTabError() { return getMessageFromCache('alertTabError', this._currentLang); },
    get alertNotOnCoursePage() { return getMessageFromCache('alertNotOnCoursePage', this._currentLang); },
    get alertNoAssignments() { return getMessageFromCache('alertNoAssignments', this._currentLang); },
    get alertConnectionError() { return getMessageFromCache('alertConnectionError', this._currentLang); },
    alertAutoScrapeComplete(total, count) { return getMessageFromCache('alertAutoScrapeComplete', this._currentLang, [total.toString(), count.toString()]); },
    get alertAutoScrapeCancelled() { return getMessageFromCache('alertAutoScrapeCancelled', this._currentLang); },
    alertAutoScrapeError(error) { return getMessageFromCache('alertAutoScrapeError', this._currentLang, [error]); },
    
    // Log Panel
    get logPanelTitle() { return getMessageFromCache('logPanelTitle', this._currentLang); },
    get logStarting() { return getMessageFromCache('logStarting', this._currentLang); },
    get logGettingFirstContent() { return getMessageFromCache('logGettingFirstContent', this._currentLang); },
    get logNavigatingToContent() { return getMessageFromCache('logNavigatingToContent', this._currentLang); },
    get logAlreadyOnModulePage() { return getMessageFromCache('logAlreadyOnModulePage', this._currentLang); },
    get logExtractingAssignments() { return getMessageFromCache('logExtractingAssignments', this._currentLang); },
    logFoundAssignments(count) { return getMessageFromCache('logFoundAssignments', this._currentLang, [count.toString()]); },
    logProcessingAssignment(current, total, title) { return getMessageFromCache('logProcessingAssignment', this._currentLang, [current.toString(), total.toString(), title]); },
    get logNavigatingToAssignment() { return getMessageFromCache('logNavigatingToAssignment', this._currentLang); },
    get logCheckingFeedback() { return getMessageFromCache('logCheckingFeedback', this._currentLang); },
    get logNoFeedbackButton() { return getMessageFromCache('logNoFeedbackButton', this._currentLang); },
    get logClickingFeedback() { return getMessageFromCache('logClickingFeedback', this._currentLang); },
    get logScrapingQuestions() { return getMessageFromCache('logScrapingQuestions', this._currentLang); },
    logScrapedQuestions(count) { return getMessageFromCache('logScrapedQuestions', this._currentLang, [count.toString()]); },
    get logNoQuestionsFound() { return getMessageFromCache('logNoQuestionsFound', this._currentLang); },
    get logSavingData() { return getMessageFromCache('logSavingData', this._currentLang); },
    logCompleted(total, count) { return getMessageFromCache('logCompleted', this._currentLang, [total.toString(), count.toString()]); },
    logError(error) { return getMessageFromCache('logError', this._currentLang, [error]); },
    get logNoAssignments() { return getMessageFromCache('logNoAssignments', this._currentLang); },
    get logStopped() { return getMessageFromCache('logStopped', this._currentLang); },

    // Multi-course (Learning Paths)
    get logCheckingMyLearning() { return getMessageFromCache('logCheckingMyLearning', this._currentLang); },
    get logOnMyLearningCompleted() { return getMessageFromCache('logOnMyLearningCompleted', this._currentLang); },
    get logNotOnMyLearning() { return getMessageFromCache('logNotOnMyLearning', this._currentLang); },
    logFoundLearningPaths(count) { return getMessageFromCache('logFoundLearningPaths', this._currentLang, [count.toString()]); },
    get logPromptSelectLearningPath() { return getMessageFromCache('logPromptSelectLearningPath', this._currentLang); },
    get logUserCancelledPathSelection() { return getMessageFromCache('logUserCancelledPathSelection', this._currentLang); },
    logSelectedLearningPath(title, count) { return getMessageFromCache('logSelectedLearningPath', this._currentLang, [title, count.toString()]); },
    logNavigatingToCourse(name) { return getMessageFromCache('logNavigatingToCourse', this._currentLang, [name]); },
    logCourseCompleted(name, total, count) { return getMessageFromCache('logCourseCompleted', this._currentLang, [name, total.toString(), count.toString()]); },
    logAllCoursesCompleted(courses, total) { return getMessageFromCache('logAllCoursesCompleted', this._currentLang, [courses.toString(), total.toString()]); },
    
    // Picker strings (for passing to content script)
    get pickerTitle() { return getMessageFromCache('pickerTitle', this._currentLang); },
    get pickerCancel() { return getMessageFromCache('pickerCancel', this._currentLang); },
    get pickerNoPaths() { return getMessageFromCache('pickerNoPaths', this._currentLang); },
    pickerCourseCount(count) { return getMessageFromCache('pickerCourseCount', this._currentLang, [count.toString()]); },
    
    // Question Status
    get correct() { return getMessageFromCache('correct', this._currentLang); },
    get incorrect() { return getMessageFromCache('incorrect', this._currentLang); },
    
    // Format Options
    get formatNormal() { return getMessageFromCache('formatNormal', this._currentLang); },
    get formatFormatted() { return getMessageFromCache('formatFormatted', this._currentLang); },
    get formatJson() { return getMessageFromCache('formatJson', this._currentLang); }
};
