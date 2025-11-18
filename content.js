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

// Single listener: reply with structured data
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === "scrape") {
        const data = scrapeCoursera();
        sendResponse({ data });
    }
    // note: synchronous sendResponse used - no 'return true' needed here
});
