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
    
    // Элементы для редактирования профиля
    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileSidebar = document.getElementById('editProfileSidebar');
    const backToMainMenu = document.getElementById('backToMainMenu');
    const editProfileForm = document.getElementById('editProfileForm');
    
    // Проверяем, что все элементы найдены
    if (!menuBtn) console.error('Элемент menuBtn не найден');
    if (!sideMenu) console.error('Элемент sideMenu не найден');
    if (!overlay) console.error('Элемент overlay не найден');
    if (!avatarPlaceholder) console.error('Элемент avatarPlaceholder не найден');
    if (!avatarInput) console.error('Элемент avatarInput не найден');
    if (!editProfileBtn) console.error('Элемент editProfileBtn не найден');
    if (!editProfileSidebar) console.error('Элемент editProfileSidebar не найден');
    if (!backToMainMenu) console.error('Элемент backToMainMenu не найден');
    if (!editProfileForm) console.error('Элемент editProfileForm не найден');
    
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
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.user_name) {
                // Обновляем имя пользователя
                const userNameElements = document.querySelectorAll('.user-info h3');
                userNameElements.forEach(el => {
                    el.textContent = data.user_name;
                });
                
                // Обновляем информацию о пользователе
                const userStatusElements = document.querySelectorAll('.user-status');
                userStatusElements.forEach(el => {
                    el.textContent = data.bio || 'Нет информации';
                });
                
                // Также обновляем информацию в форме редактирования
                const profileNameInput = document.getElementById('profileName');
                const profileBioInput = document.getElementById('profileBio');
                
                if (profileNameInput) {
                    profileNameInput.value = data.user_name;
                }
                
                if (profileBioInput) {
                    profileBioInput.value = data.bio || '';
                }
                
                // Обновляем аватар пользователя - полностью переписанный код
                if (data.avatar_path) {
                    // Убедимся, что у нас есть аватар-плейсхолдер
                    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
                    
                    if (avatarPlaceholder) {
                        // Очищаем содержимое плейсхолдера
                        avatarPlaceholder.innerHTML = '';
                        
                        // Создаем новое изображение
                        const img = document.createElement('img');
                        img.src = data.avatar_path;
                        img.alt = data.user_name;
                        img.className = 'avatar-image';
                        
                        // Добавляем изображение в плейсхолдер
                        avatarPlaceholder.appendChild(img);
                        
                        // Добавляем иконку загрузки обратно
                        const uploadIcon = document.createElement('div');
                        uploadIcon.className = 'avatar-upload-icon';
                        uploadIcon.innerHTML = `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5V19" stroke="white" stroke-width="2" stroke-linecap="round"/>
                                <path d="M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        `;
                        avatarPlaceholder.appendChild(uploadIcon);
                    }
                } else {
                    // Если аватара нет, показываем инициалы
                    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
                    
                    if (avatarPlaceholder) {
                        // Очищаем содержимое плейсхолдера
                        avatarPlaceholder.innerHTML = '';
                        
                        // Создаем div с инициалами
                        const initialsDiv = document.createElement('div');
                        initialsDiv.id = 'avatarInitials';
                        initialsDiv.className = 'avatar-initials';
                        initialsDiv.textContent = data.user_name.charAt(0);
                        
                        // Добавляем инициалы в плейсхолдер
                        avatarPlaceholder.appendChild(initialsDiv);
                        
                        // Добавляем иконку загрузки обратно
                        const uploadIcon = document.createElement('div');
                        uploadIcon.className = 'avatar-upload-icon';
                        uploadIcon.innerHTML = `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5V19" stroke="white" stroke-width="2" stroke-linecap="round"/>
                                <path d="M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        `;
                        avatarPlaceholder.appendChild(uploadIcon);
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
    
    // Показать панель редактирования профиля
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            sideMenu.classList.remove('active'); // Скрываем основное меню
            editProfileSidebar.classList.add('active'); // Показываем панель редактирования
            overlay.classList.add('active'); // Оставляем подложку активной
        });
    }
    
    // Вернуться к основному меню
    if (backToMainMenu) {
        backToMainMenu.addEventListener('click', function() {
            editProfileSidebar.classList.remove('active'); // Скрываем панель редактирования
            sideMenu.classList.add('active'); // Показываем основное меню
        });
    }
    
    // Обработка формы редактирования профиля
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            fetch('/update_profile', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Обновляем информацию о пользователе на странице
                    const userNameElements = document.querySelectorAll('.user-info h3');
                    userNameElements.forEach(el => {
                        el.textContent = data.user_name;
                    });
                    
                    const userStatusElements = document.querySelectorAll('.user-status');
                    userStatusElements.forEach(el => {
                        el.textContent = data.bio || 'Нет информации';
                    });
                    
                    // Закрываем панель редактирования
                    editProfileSidebar.classList.remove('active');
                    overlay.classList.remove('active');
                } else {
                    console.error('Ошибка при обновлении профиля:', data.error);
                    alert('Произошла ошибка при обновлении профиля. Попробуйте снова.');
                }
            })
            .catch(error => {
                console.error('Ошибка при отправке данных профиля:', error);
                alert('Произошла ошибка при обновлении профиля. Проверьте соединение с сервером.');
            });
        });
    }
    
    console.log('Обработчики событий установлены');
});
