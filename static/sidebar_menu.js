// JavaScript для управления боковым меню
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM полностью загружен и разобран');
    
    const menuBtn = document.getElementById('menuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    
    // Проверяем, что все элементы найдены
    if (!menuBtn) console.error('Элемент menuBtn не найден');
    if (!sideMenu) console.error('Элемент sideMenu не найден');
    if (!overlay) console.error('Элемент overlay не найден');
    
    // Обработка клика по кнопке меню
    if (menuBtn) {
        menuBtn.addEventListener('click', function() {
            console.log('Клик по кнопке меню');
            sideMenu.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    // Закрытие меню при клике на подложку
    if (overlay) {
        overlay.addEventListener('click', function() {
            console.log('Клик по подложке');
            sideMenu.classList.remove('active');
            this.classList.remove('active');
        });
    }
    
    // Закрытие меню при нажатии Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sideMenu && sideMenu.classList.contains('active')) {
            sideMenu.classList.remove('active');
            overlay.classList.remove('active');
        }
    });
    
    console.log('Обработчики событий установлены');
});
