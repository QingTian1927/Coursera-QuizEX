// content.js
function scrapeCoursera() {
    const groups = document.querySelectorAll('[data-testid="part-Submission_GradedMultipleChoiceQuestion"]');
    const results = [];

    groups.forEach((group, i) => {
        const number =
            group.querySelector('h3 span')?.innerText.trim() ||
            (i + 1).toString();

        const questionText =
            group.querySelector('[data-testid="legend"] .rc-CML p')?.innerText.trim() ||
            "UNKNOWN QUESTION";

        const choiceNodes = group.querySelectorAll('.rc-Option label');
        const choices = [...choiceNodes].map(label => {
            const text = label.querySelector('.rc-CML p')?.innerText.trim() || "";
            const isSelected = label.classList.contains('cui-isChecked') ||
                label.querySelector('input')?.checked;

            return { text, selected: isSelected };
        });

        results.push({ number, question: questionText, choices });
    });

    return results;
}

function getFirstCourseContent() {
    try {
        // Find the first module lesson list
        const firstLessonList = document.querySelector('.rc-NamedItemListRefresh ul');
        if (!firstLessonList) return null;

        // Find the first item in the list
        const firstItem = firstLessonList.querySelector('li');
        if (!firstItem) return null;

        // Extract the item name and href link
        const itemName = firstItem.querySelector('[data-test="rc-ItemName"]')?.innerText.trim() || '';
        const itemLink = firstItem.querySelector('a')?.href || '';

        return {
            name: itemName,
            url: itemLink
        };
    } catch (err) {
        console.error('Error extracting first course content:', err);
        return null;
    }
}

function extractAssignments() {
    const modules = document.querySelectorAll('.cds-AccordionRoot-container'); // all modules
    const results = [];

    modules.forEach(module => {
        const moduleHeader = module.querySelector('.css-695r00');
        const moduleName = moduleHeader ? moduleHeader.textContent.trim() : "Unknown Module";

        const items = module.querySelectorAll('li a');
        items.forEach(item => {
            const typeElement = item.querySelector('.css-1rhvk9j');
            if (!typeElement) return;

            const typeText = typeElement.textContent.trim();
            // Only keep assignments/quizzes
            if (/Assignment|Quiz/i.test(typeText)) {
                results.push({
                    module: moduleName,
                    title: item.querySelector('.css-u7fh1q')?.textContent.trim(),
                    type: typeText,
                    url: item.href
                });
            }
        });
    });

    return results;
}

function getViewFeedbackButton() {
    // Select the container div with the data-test attribute
    const feedbackDiv = document.querySelector('[data-test="view-feedback-button"]');

    if (!feedbackDiv) return null; // Button not found

    // Get the actual button element inside the div
    const button = feedbackDiv.querySelector('button');

    return button; // returns the DOM element
}

// Message listener for various actions
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === "scrape") {
        const data = scrapeCoursera();
        sendResponse({ data });
        return false;
    }
    
    if (msg && msg.action === "getFirstCourseContent") {
        const data = getFirstCourseContent();
        sendResponse({ data });
        return false;
    }
    
    if (msg && msg.action === "extractAssignments") {
        const data = extractAssignments();
        sendResponse({ data });
        return false;
    }
    
    if (msg && msg.action === "getViewFeedbackButton") {
        const button = getViewFeedbackButton();
        sendResponse({ hasButton: button !== null });
        return false;
    }
    
    if (msg && msg.action === "clickViewFeedbackButton") {
        const button = getViewFeedbackButton();
        if (button) {
            button.click();
            // Wait for the page to load feedback, then scrape (using delay from message)
            const delay = msg.delay || 2000; // Default to 2 seconds if not specified
            setTimeout(() => {
                const data = scrapeCoursera();
                sendResponse({ success: true, data });
            }, delay);
            return true; // Keep channel open for async response
        } else {
            sendResponse({ success: false, data: [] });
            return false;
        }
    }
});
