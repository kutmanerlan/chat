// Функции для работы с боковым меню
document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('menuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    
    // Открытие/закрытие бокового меню при клике на кнопку
    if (menuBtn) {
        menuBtn.addEventListener('click', function() {
            sideMenu.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }
    
    // Закрытие меню при клике на overlay
    if (overlay) {
        overlay.addEventListener('click', function() {
            sideMenu.classList.remove('active');
            this.classList.remove('active');
        });
    }
    
    // Закрытие меню при нажатии Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sideMenu.classList.contains('active')) {
            sideMenu.classList.remove('active');
            overlay.classList.remove('active');
        }
    });
});
