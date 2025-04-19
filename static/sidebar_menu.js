// JavaScript для управления боковым меню
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM полностью загружен и разобран');
    
    const menuBtn = document.getElementById('menuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogout = document.getElementById('cancelLogout');
    
    // Элементы для работы с аватаром
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    const avatarInput = document.getElementById('avatarInput');
    
    // Проверяем, что все элементы найдены
    if (!menuBtn) console.error('Элемент menuBtn не найден');
    if (!sideMenu) console.error('Элемент sideMenu не найден');
    if (!overlay) console.error('Элемент overlay не найден');
    if (!avatarPlaceholder) console.error('Элемент avatarPlaceholder не найден');
    if (!avatarInput) console.error('Элемент avatarInput не найден');
    
    // Принудительно обновляем информацию о пользователе при каждой загрузке страницы
    // через асинхронный запрос к серверу
    function refreshUserInfo() {
        fetch('/get_current_user_info', {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.user_name) {
                // Обновляем имя пользователя
                const userNameElements = document.querySelectorAll('.user-info h3');
                userNameElements.forEach(el => {
                    el.textContent = data.user_name;
                });
                
                // Обновляем аватар пользователя
                if (data.avatar_path) {
                    // Если есть путь к аватару, показываем изображение
                    const avatarInitials = document.getElementById('avatarInitials');
                    if (avatarInitials) {
                        // Заменяем инициалы на изображение
                        const parent = avatarInitials.parentElement;
                        avatarInitials.remove();
                        
                        const img = document.createElement('img');
                        img.src = data.avatar_path;
                        img.alt = data.user_name;
                        img.className = 'avatar-image';
                        parent.prepend(img);
                    }
                    
                    // Если изображение уже есть, обновляем его src
                    const avatarImage = document.querySelector('.avatar-image');
                    if (avatarImage) {
                        avatarImage.src = data.avatar_path;
                    }
                } else {
                    // Если нет пути к аватару, показываем инициалы
                    const avatarInitials = document.getElementById('avatarInitials');
                    if (avatarInitials) {
                        avatarInitials.textContent = data.user_name.charAt(0);
                    } else {
                        // Если нет элемента с инициалами, но есть изображение - меняем на инициалы
                        const avatarImage = document.querySelector('.avatar-image');
                        if (avatarImage) {
                            const parent = avatarImage.parentElement;
                            avatarImage.remove();
                            
                            const initialsDiv = document.createElement('div');
                            initialsDiv.id = 'avatarInitials';
                            initialsDiv.className = 'avatar-initials';
                            initialsDiv.textContent = data.user_name.charAt(0);
                            parent.prepend(initialsDiv);
                        }
                    }
                }
            }
        })
        .catch(error => console.error('Ошибка при получении информации о пользователе:', error));
    }
    
    // Запускаем обновление информации при загрузке страницы
    refreshUserInfo();
    
    // Обработчик нажатия на аватарку для загрузки фотографии
    if (avatarPlaceholder) {
        avatarPlaceholder.addEventListener('click', function() {
            if (avatarInput) {
                avatarInput.click();
            }
        });
    }
    
    // Обработчик выбора файла для загрузки аватара
    if (avatarInput) {
        avatarInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                
                // Проверяем размер файла (макс. 5 МБ)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Файл слишком большой. Максимальный размер 5 МБ');
                    return;
                }
                
                // Создаем объект FormData для отправки файла
                const formData = new FormData();
                formData.append('avatar', file);
                
                // Отправляем файл на сервер
                fetch('/upload_avatar', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Обновляем аватар на странице
                        refreshUserInfo();
                    } else {
                        console.error('Ошибка загрузки аватара:', data.error);
                        alert('Произошла ошибка при загрузке аватара. Попробуйте снова.');
                    }
                })
                .catch(error => {
                    console.error('Ошибка при загрузке аватара:', error);
                    alert('Произошла ошибка при загрузке аватара. Проверьте соединение с сервером.');
                });
            }
        });
    }
    
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
