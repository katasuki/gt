// script.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Boot Sequence Logic
    const bootScreen = document.getElementById('boot-screen');
    const bootText = document.getElementById('boot-text');
    const mainUI = document.getElementById('main-ui');

    // Nội dung khởi động của hệ thống KAVASK
    const bootMessages = [
        "INITIALIZING KAVASK v2.0.77...",
        "CHECKING NEURAL LINK...",
        "NEURAL LINK: ESTABLISHED.",
        "LOADING AIM METRICS [||||||||||] 100%",
        "SYNCING WITH GLOBAL DATABASE...",
        "ACCESS GRANTED. WELCOME, OPERATOR."
    ];

    let messageIndex = 0;

    function displayNextMessage() {
        if (messageIndex < bootMessages.length) {
            bootText.innerHTML += bootMessages[messageIndex] + "<br>";
            messageIndex++;
            // Tốc độ đánh chữ ngẫu nhiên để tạo cảm giác terminal thật
            setTimeout(displayNextMessage, Math.random() * 200 + 100);
        } else {
            // Khi xong, ẩn boot screen và hiện UI chính
            setTimeout(() => {
                bootScreen.style.opacity = '0';
                setTimeout(() => {
                    bootScreen.style.display = 'none';
                    mainUI.style.display = 'block';
                }, 500); // Đợi CSS transition chạy xong
            }, 500);
        }
    }

    // Bắt đầu chuỗi khởi động
    displayNextMessage();

    // 2. Sound Effects Logic
    const hoverSound = document.getElementById('hover-sound');
    const clickSound = document.getElementById('click-sound');

    // Giảm âm lượng để không làm chói tai
    hoverSound.volume = 0.2;
    clickSound.volume = 0.4;

    const hoverElements = document.querySelectorAll('.cp-sound-hover, .cp-btn');
    const clickElements = document.querySelectorAll('.cp-sound-click, .cp-btn');

    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            // Reset âm thanh về đầu và phát
            hoverSound.currentTime = 0;
            hoverSound.play().catch(e => console.log("Audio play prevented by browser policy"));
        });
    });

    clickElements.forEach(el => {
        el.addEventListener('click', () => {
            clickSound.currentTime = 0;
            clickSound.play().catch(e => console.log("Audio play prevented by browser policy"));
        });
    });
});