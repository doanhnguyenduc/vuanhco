'use strict';
        
function toggleMenu() {
    const menu = document.getElementById('navMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

// Gắn sự kiện (event listener) cho nút mà không dùng onclick trong HTML
document.addEventListener('DOMContentLoaded', () => {
    // 1. Gắn sự kiện cho nút mobile toggle
    const toggleButton = document.getElementById('mobileToggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleMenu);
    }
    
    // 2. Cải thiện UX: Đóng menu khi nhấp vào liên kết (nếu menu đang mở)
    const navLinks = document.querySelectorAll('#navMenu a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const menu = document.getElementById('navMenu');
            // Kiểm tra xem menu có đang active không trước khi đóng
            if (menu && menu.classList.contains('active')) {
                menu.classList.remove('active');
            }
        });
    });
});
