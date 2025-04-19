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
    
    // Удаляем следующий код:
    /*
    // Функция для автоматического изменения размера textarea
    function autoResizeTextarea(textarea) {
        // Сбрасываем высоту к минимальной, чтобы корректно определить новую высоту
        textarea.style.height = 'auto';
        
        // Устанавливаем высоту по содержимому, но не более максимальной
        const newHeight = Math.min(300, Math.max(100, textarea.scrollHeight));
        textarea.style.height = newHeight + 'px';
        
        // Принудительно устанавливаем цвет текста
        textarea.style.color = '#bbb';
    }
    
    // Обработчик изменения содержимого textarea
    const profileBioTextarea = document.getElementById('profileBio');
    if (profileBioTextarea) {
        // Инициализация при загрузке
        autoResizeTextarea(profileBioTextarea);
        
        // Обработчик для изменения размера при вводе текста
        profileBioTextarea.addEventListener('input', function() {
            autoResizeTextarea(this);
        });
        
        // Обработчик для изменения размера после загрузки данных
        profileBioTextarea.addEventListener('change', function() {
            autoResizeTextarea(this);
        });
    }
    
    // Добавляем код для задания цвета сразу после загрузки страницы
    const bioTextarea = document.getElementById('profileBio');
    if (bioTextarea) {
        bioTextarea.style.color = '#bbb';
        
        // Также добавляем обработчик события focus и blur для контроля цвета
        bioTextarea.addEventListener('focus', function() {
            this.style.color = '#ccc'; // Немного светлее при фокусе
        });
        
        bioTextarea.addEventListener('blur', function() {
            this.style.color = '#bbb'; // Вернуть обратно приглушенный цвет
        });
    }
    */
    
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
        menuBtn.addEventListener('click', function(e) {
            console.log('Клик по кнопке меню');
            sideMenu.classList.toggle('active');
            overlay.classList.toggle('active');
            e.stopPropagation(); // Предотвращаем всплытие события
        });
    }

    // Закрытие меню при клике на подложку
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            console.log('Клик по подложке');
            sideMenu.classList.remove('active');
            editProfileSidebar.classList.remove('active'); // Также закрываем панель редактирования
            if (logoutModal) logoutModal.classList.remove('active');
            this.classList.remove('active');
            e.stopPropagation(); // Предотвращаем всплытие события
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
    
    // Предотвращаем закрытие меню при клике внутри самого меню
    if (sideMenu) {
        sideMenu.addEventListener('click', function(e) {
            e.stopPropagation(); // Предотвращаем всплытие события
        });
    }

    // Предотвращаем закрытие панели редактирования при клике внутри нее
    if (editProfileSidebar) {
        editProfileSidebar.addEventListener('click', function(e) {
            e.stopPropagation(); // Предотвращаем всплытие события
        });
    }

    // Добавляем обработчик клика на body для закрытия меню
    document.body.addEventListener('click', function() {
        if (sideMenu && sideMenu.classList.contains('active')) {
            sideMenu.classList.remove('active');
            overlay.classList.remove('active');
        }
        
        if (editProfileSidebar && editProfileSidebar.classList.contains('active')) {
            editProfileSidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    });

    // Добавляем обработчик для поиска пользователей
    const searchInput = document.getElementById('searchInput');
    const searchContainer = document.querySelector('.search-container');
    
    if (searchInput) {
        // Создаем контейнер для результатов поиска
        const searchResults = document.createElement('div');
        searchResults.className = 'search-results';
        searchResults.style.display = 'none';
        
        // Добавляем контейнер после поля поиска
        if (searchContainer) {
            searchContainer.parentNode.insertBefore(searchResults, searchContainer.nextSibling);
        }
        
        // Функция для выполнения поиска с задержкой
        let searchTimeout;
        
        function performSearch() {
            const query = searchInput.value.trim();
            
            // Очищаем предыдущий таймаут
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // Если запрос пустой или слишком короткий, скрываем результаты
            if (!query || query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }
            
            // Устанавливаем задержку перед отправкой запроса (300мс)
            searchTimeout = setTimeout(() => {
                // Отправляем запрос на сервер
                fetch(`/search_users?query=${encodeURIComponent(query)}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    // Очищаем контейнер результатов
                    searchResults.innerHTML = '';
                    
                    if (data.users && data.users.length > 0) {
                        // Заголовок результатов
                        const resultsHeader = document.createElement('div');
                        resultsHeader.className = 'search-results-header';
                        resultsHeader.textContent = 'Пользователи';
                        searchResults.appendChild(resultsHeader);
                        
                        // Добавляем каждого пользователя в результаты
                        data.users.forEach(user => {
                            const userItem = document.createElement('div');
                            userItem.className = 'search-user-item';
                            userItem.dataset.userId = user.id;
                            
                            // Создаем аватар пользователя
                            const userAvatar = document.createElement('div');
                            userAvatar.className = 'search-user-avatar';
                            
                            if (user.avatar_path) {
                                userAvatar.innerHTML = `<img src="${user.avatar_path}" alt="${user.name}">`;
                            } else {
                                userAvatar.innerHTML = `<div class="avatar-initials">${user.name.charAt(0)}</div>`;
                            }
                            
                            // Создаем блок информации о пользователе
                            const userInfo = document.createElement('div');
                            userInfo.className = 'search-user-info';
                            
                            const userName = document.createElement('div');
                            userName.className = 'search-user-name';
                            userName.textContent = user.name;
                            
                            const userBio = document.createElement('div');
                            userBio.className = 'search-user-bio';
                            userBio.textContent = user.bio || 'Нет информации';
                            
                            userInfo.appendChild(userName);
                            userInfo.appendChild(userBio);
                            
                            // Добавляем все элементы в карточку пользователя
                            userItem.appendChild(userAvatar);
                            userItem.appendChild(userInfo);
                            
                            // Добавляем обработчик клика для создания диалога
                            userItem.addEventListener('click', function() {
                                startChatWithUser(user.id, user.name);
                            });
                            
                            // Добавляем пользователя в результаты
                            searchResults.appendChild(userItem);
                        });
                        
                        // Показываем результаты
                        searchResults.style.display = 'block';
                    } else {
                        // Если нет результатов, показываем сообщение
                        const noResults = document.createElement('div');
                        noResults.className = 'search-no-results';
                        noResults.textContent = 'Пользователи не найдены';
                        searchResults.appendChild(noResults);
                        searchResults.style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error('Ошибка при поиске пользователей:', error);
                    
                    // Показываем сообщение об ошибке
                    searchResults.innerHTML = '';
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'search-error';
                    errorMsg.textContent = 'Ошибка при поиске. Попробуйте позже.';
                    searchResults.appendChild(errorMsg);
                    searchResults.style.display = 'block';
                });
            }, 300);
        }
        
        // Обработчик события ввода в поле поиска
        searchInput.addEventListener('input', performSearch);
        
        // Функция для начала чата с выбранным пользователем
        function startChatWithUser(userId, userName) {
            console.log(`Начинаем чат с пользователем: ${userName} (ID: ${userId})`);
            
            // Здесь будет реализация создания чата с пользователем
            // Это будет добавлено позже при реализации чатов
            
            // Пока что просто закрываем результаты поиска
            searchResults.style.display = 'none';
            searchInput.value = '';
        }
        
        // Закрытие результатов при клике вне поля поиска
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }

    console.log('Обработчики событий установлены');
});
