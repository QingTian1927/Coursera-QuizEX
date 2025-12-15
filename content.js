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

        // Determine if the question was answered correctly
        const isCorrect = group.querySelector('[data-testid="icon-correct"]') !== null;

        results.push({ number, question: questionText, choices, correct: isCorrect });
    });

    return results;
}

// Extract learning paths from "My Learning" page
function extractLearningPaths() {
    // Only iterate top-level enrolled cards; avoid course cards within the path
    const enrolledCards = document.querySelectorAll('.rc-MultiCourseProductEnrolledCard');
    const seen = new Set();
    const paths = [];

    enrolledCards.forEach(card => {
        const header = card.querySelector('.rc-BadgeCardHeader .CourseAndPartnerName');
        if (!header) return;

        const id = header.getAttribute('id') || '';
        const titleEl = header.querySelector('.cds-144');
        const title = titleEl ? titleEl.textContent.trim() : header.textContent.trim();

        if (id && title && !seen.has(id)) {
            seen.add(id);

            // Extract course IDs from the circle menu
            const courseIds = [];
            const circleMenu = card.querySelector('.rc-MultiCourseProductCirclesMenu');
            if (circleMenu) {
                const menuItems = circleMenu.querySelectorAll('[data-e2e^="s12n-circles-menu-item~"]');
                menuItems.forEach(item => {
                    const dataE2e = item.getAttribute('data-e2e') || '';
                    const match = dataE2e.match(/s12n-circles-menu-item~(.+)/);
                    if (match && match[1]) {
                        courseIds.push(match[1]);
                    }
                });
            }

            // Extract course details for each course ID
            const courses = [];
            courseIds.forEach(courseId => {
                const courseCard = document.querySelector(`[data-e2e="CourseCard~${courseId}"]`);
                if (courseCard) {
                    const courseName = courseCard.querySelector('.CourseAndPartnerName .cds-144')?.textContent.trim() || '';
                    const courseLink = courseCard.querySelector('.CourseActionBox a')?.href || '';

                    if (courseName && courseLink) {
                        courses.push({
                            id: courseId,
                            name: courseName,
                            link: courseLink
                        });
                    }
                }
            });

            paths.push({ id, title, courses });
        }
    });

    return paths;
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

// Detect if on My Learning page with Completed tab selected
function isOnMyLearningCompleted() {
    try {
        const myLearningLink = document.querySelector('[data-testid="nav-link-grid-item-my_learning"]');
        const onMyLearning = !!myLearningLink && (
            myLearningLink.classList.contains('isCurrent') ||
            myLearningLink.getAttribute('aria-current') === 'page' ||
            (typeof location !== 'undefined' && location.pathname.includes('/my-learning'))
        );
        const completedChip = document.querySelector('[data-e2e="my-learning-tab-completed"][aria-selected="true"]');
        return !!(onMyLearning && completedChip);
    } catch (e) {
        return false;
    }
}

// Show a lightweight overlay to choose a learning path
function showLearningPathPicker(paths, pickerStrings) {
    return new Promise(resolve => {
        // Clean any existing overlay
        const existing = document.getElementById('cqex-learning-path-picker');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'cqex-learning-path-picker';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.35)';
        overlay.style.zIndex = '2147483647';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        const panel = document.createElement('div');
        panel.style.width = 'min(520px, 92vw)';
        panel.style.maxHeight = '80vh';
        panel.style.overflow = 'auto';
        panel.style.background = '#fff';
        panel.style.borderRadius = '12px';
        panel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
        panel.style.padding = '16px';
        panel.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
        panel.style.color = '#111';

        const title = document.createElement('div');
        title.textContent = pickerStrings.title;
        title.style.fontSize = '16px';
        title.style.fontWeight = '600';
        title.style.marginBottom = '12px';

        const list = document.createElement('div');
        list.style.display = 'grid';
        list.style.gap = '8px';
        list.style.width = '100%';

        if (!paths || paths.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = pickerStrings.noPaths;
            empty.style.padding = '12px';
            list.appendChild(empty);
        } else {
            paths.forEach(p => {
                const item = document.createElement('button');
                item.type = 'button';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.width = '100%';
                item.style.border = '1px solid #e5e7eb';
                item.style.borderRadius = '8px';
                item.style.padding = '10px 12px';
                item.style.background = '#fff';
                item.style.cursor = 'pointer';
                item.onmouseenter = () => { item.style.background = '#f9fafb'; };
                item.onmouseleave = () => { item.style.background = '#fff'; };

                const left = document.createElement('div');
                left.style.display = 'flex';
                left.style.flexDirection = 'column';
                left.style.gap = '2px';
                left.style.flex = '1';
                left.style.minWidth = '0';

                const name = document.createElement('div');
                name.textContent = p.title || p.id;
                name.style.fontWeight = '600';
                name.style.fontSize = '14px';
                name.style.textAlign = 'left';

                const meta = document.createElement('div');
                const courseCount = (p.courses?.length || 0);
                meta.textContent = pickerStrings.courseCounts[courseCount] || `${courseCount} course(s)`;
                meta.style.fontSize = '12px';
                meta.style.color = '#6b7280';
                meta.style.textAlign = 'left';

                left.appendChild(name);
                left.appendChild(meta);

                const right = document.createElement('div');
                right.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-right" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/></svg>';
                right.style.color = '#9ca3af';
                right.style.marginLeft = '12px';

                item.appendChild(left);
                item.appendChild(right);
                item.addEventListener('click', () => {
                    overlay.remove();
                    resolve({ selectedId: p.id });
                });
                list.appendChild(item);
            });
        }

        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.justifyContent = 'flex-end';
        footer.style.marginTop = '12px';

        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = pickerStrings.cancel;
        cancel.style.border = '1px solid #e5e7eb';
        cancel.style.background = '#fff';
        cancel.style.borderRadius = '8px';
        cancel.style.padding = '8px 12px';
        cancel.style.cursor = 'pointer';
        cancel.addEventListener('click', () => {
            overlay.remove();
            resolve({ selectedId: null });
        });

        panel.appendChild(title);
        panel.appendChild(list);
        panel.appendChild(footer);
        footer.appendChild(cancel);
        overlay.appendChild(panel);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve({ selectedId: null });
            }
        });

        document.body.appendChild(overlay);
    });
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
            const delay = msg.delay || 4000; // Default to 4 seconds if not specified
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

    if (msg && msg.action === "isOnMyLearningCompleted") {
        const isMyLearningCompleted = isOnMyLearningCompleted();
        sendResponse({ isMyLearningCompleted });
        return false;
    }

    if (msg && msg.action === "getLearningPaths") {
        const data = extractLearningPaths();
        sendResponse({ data });
        return false;
    }

    if (msg && msg.action === "chooseLearningPath") {
        const paths = msg.paths || [];
        const pickerStrings = msg.pickerStrings || {
            title: 'Select a learning path to scrape',
            cancel: 'Cancel',
            noPaths: 'No learning paths found.',
            courseCounts: {}
        };
        showLearningPathPicker(paths, pickerStrings).then(result => {
            sendResponse(result || { selectedId: null });
        }).catch(err => {
            console.error('Picker error:', err);
            sendResponse({ selectedId: null });
        });
        return true; // async response
    }
});
