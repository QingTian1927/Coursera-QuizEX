/* ---------------- INTERNATIONALIZATION (i18n) ---------------- */

const UI_TEXT = {
    EN: {
        // UI Labels
        title: "Coursera QuizEX",
        scrape: "Scrape Page",
        autoScrape: "Auto-Scrape",
        cancelAutoScrape: "Cancel",
        clear: "Clear Data",
        noData: "No data yet…",
        preview: "Preview",
        download: "Download",
        format: "Format:",
        copied: "Copied!",
        about: "About",
        
        // Settings Modal
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
        
        // Info Panel
        infoVersion: "Version:",
        infoAuthor: "Author:",
        infoGitHub: "GitHub:",
        infoHelp: "Help:",
        
        // Alerts
        alertTabError: "Error: Could not access current tab",
        alertNotOnCoursePage: "Are you on the course welcome page?\n\nPlease navigate to the course main page where you can see all modules and lessons.",
        alertNoAssignments: "No assignments or quizzes could be found on this page.\n\nPlease make sure you're on a page that shows the course modules.",
        alertConnectionError: "Could not connect to the page.\n\nPlease refresh the page and try again.",
        alertAutoScrapeComplete: (total, count) => `Auto-scrape completed!\n\nTotal questions scraped: ${total}\nAssignments processed: ${count}`,
        alertAutoScrapeCancelled: "Auto-scrape has been cancelled.",
        alertAutoScrapeError: (error) => `An error occurred during auto-scrape:\n\n${error}`,
        
        // Log Panel
        logPanelTitle: "Auto-Scrape Log",
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
        logStopped: "Auto-scrape cancelled by user",
        
        // Question Status
        correct: "answered correctly",
        incorrect: "answered incorrectly"
    },
    VI: {
        // UI Labels
        title: "Coursera QuizEX",
        scrape: "Quét trang",
        autoScrape: "Tự động quét",
        cancelAutoScrape: "Hủy",
        clear: "Xóa dữ liệu",
        noData: "Chưa có dữ liệu…",
        preview: "Xem trước",
        download: "Tải xuống",
        format: "Định dạng:",
        copied: "Đã sao chép!",
        about: "Thông tin",
        
        // Settings Modal
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
        
        // Info Panel
        infoVersion: "Phiên bản:",
        infoAuthor: "Tác giả:",
        infoGitHub: "GitHub:",
        infoHelp: "Trợ giúp:",
        
        // Alerts
        alertTabError: "Lỗi: Không thể truy cập tab hiện tại",
        alertNotOnCoursePage: "Bạn có đang ở trang chào mừng khóa học không?\n\nVui lòng điều hướng đến trang chính của khóa học nơi bạn có thể thấy tất cả các mô-đun và bài học.",
        alertNoAssignments: "Không tìm thấy bài tập hoặc bài kiểm tra nào trên trang này.\n\nVui lòng đảm bảo bạn đang ở trang hiển thị các mô-đun khóa học.",
        alertConnectionError: "Không thể kết nối với trang.\n\nVui lòng làm mới trang và thử lại.",
        alertAutoScrapeComplete: (total, count) => `Tự động quét hoàn tất!\n\nTổng số câu hỏi đã quét: ${total}\nBài tập đã xử lý: ${count}`,
        alertAutoScrapeCancelled: "Tự động quét đã bị hủy.",
        alertAutoScrapeError: (error) => `Đã xảy ra lỗi trong quá trình tự động quét:\n\n${error}`,
        
        // Log Panel
        logPanelTitle: "Nhật ký tự động quét",
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
        logStopped: "Tự động quét đã bị hủy bởi người dùng",
        
        // Question Status
        correct: "trả lời đúng",
        incorrect: "trả lời sai"
    }
};
