// JavaScript для управления боковым меню
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM полностью загружен и разобран');
    
    const menuBtn = document.getElementById('menuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogout = document.getElementById('cancelLogout');
    
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
            if (logoutModal) logoutModal.classList.remove('active');
            this.classList.remove('active');
        });
    }
    
    // Обработка кнопки выхода
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Клик по кнопке выхода');
            if (logoutModal) {
                logoutModal.classList.add('active');
                if (overlay) overlay.classList.add('active');
            }
        });
    }
    
    // Отмена выхода
    if (cancelLogout) {
        cancelLogout.addEventListener('click', function() {
            console.log('Отмена выхода');
            if (logoutModal) logoutModal.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        });
    }
    
    // Закрытие меню при нажатии Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (sideMenu && sideMenu.classList.contains('active')) {
                sideMenu.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
            if (logoutModal && logoutModal.classList.contains('active')) {
                logoutModal.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        }
    });
    
    console.log('Обработчики событий установлены');
});
