// JavaScript для управления боковым меню
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM полностью загружен и разобран');
    
    const menuBtn = document.getElementById('menuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const closeMenuBtn = document.getElementById('closeMenuBtn'); // Add this line
    
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
                console.log("Обновляем информацию пользователя:", data);
                
                // Обновляем имя пользователя
                const userNameElements = document.querySelectorAll('.user-info h3');
                userNameElements.forEach(el => {
                    el.textContent = data.user_name;
                });
                
                // Обновляем статус пользователя - БОЛЕЕ ТОЧНО ВЫБИРАЕМ ЭЛЕМЕНТЫ
                const userStatusElements = document.querySelectorAll('.side-menu .user-status');
                userStatusElements.forEach(el => {
                    el.textContent = data.bio || 'Нет информации';
                    // Убедимся, что элемент видим
                    el.style.display = 'block';
                    el.style.visibility = 'visible';
                });
                
                // Также обновляем форму редактирования
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
                // After updating avatar, update the cross icon
                updateAvatarWithCrossIcon();
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
        editProfileBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Предотвращаем клик по основному меню
            sideMenu.classList.remove('active'); // Скрываем основное меню
            editProfileSidebar.classList.add('active'); // Показываем панель редактирования
            overlay.classList.add('active'); // Показываем затемняющую подложку
        });
    }
    
    // Вернуться к основному меню
    if (backToMainMenu) {
        backToMainMenu.addEventListener('click', function(e) {
            e.stopPropagation(); // Предотвращаем всплытие события
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
                    console.log("Профиль обновлен успешно:", data);
                    
                    // Обновляем имя пользователя на странице
                    const userNameElements = document.querySelectorAll('.user-info h3');
                    userNameElements.forEach(el => {
                        el.textContent = data.user_name;
                    });
                    
                    // Обновляем статус пользователя - БОЛЕЕ ТОЧНО ВЫБИРАЕМ ЭЛЕМЕНТЫ
                    const userStatusElements = document.querySelectorAll('.side-menu .user-status');
                    userStatusElements.forEach(el => {
                        el.textContent = data.bio || 'Нет информации';
                        // Убедимся, что элемент видим
                        el.style.display = 'block';
                        el.style.visibility = 'visible';
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
    document.body.addEventListener('click', function(e) {
        if (sideMenu && !sideMenu.contains(e.target) && sideMenu.classList.contains('active')) {
            sideMenu.classList.remove('active');
            overlay.classList.remove('active');
        }
        
        if (editProfileSidebar && !editProfileSidebar.contains(e.target) && 
            editProfileSidebar.classList.contains('active')) {
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
            console.log(`Открываем чат с пользователем: ${userName} (ID: ${userId})`);
            
            // Закрываем результаты поиска
            const searchResults = document.querySelector('.search-results');
            if (searchResults) {
                searchResults.style.display = 'none';
            }
            
            // Очищаем поле поиска
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
            }
            
            // Открываем чат с пользователем без добавления в контакты
            openChat(userId, userName);
        }
        
        // Функция для начала чата с выбранным пользователем
        function startChatWithUser(userId, userName) {
            console.log(`Открываем чат с пользователем: ${userName} (ID: ${userId})`);
            
            // Закрываем результаты поиска
            const searchResults = document.querySelector('.search-results');
            if (searchResults) {
                searchResults.style.display = 'none';
            }
            
            // Очищаем поле поиска
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
            }
            
            // Открываем чат с пользователем без добавления в контакты
            openChat(userId, userName);
        }
        
        // Функция для открытия чата с контактом (будет реализована позже)
        function openChatWithContact(contactId, contactName) {
            console.log(`Открываем чат с контактом: ${contactName} (ID: ${contactId})`);
            
            // Highlight the active contact in the sidebar
            document.querySelectorAll('.contact-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Find and highlight the clicked contact
            const contactElement = document.querySelector(`.contact-item[data-contact-id="${contactId}"]`);
            if (contactElement) {
                contactElement.classList.add('active');
            }
            
            // Get user info for chat display
            fetch(`/get_user_info?user_id=${contactId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(userData => {
                // Create or update the chat interface
                createChatInterface(userData);
            })
            .catch(error => {
                console.error('Ошибка при получении информации о пользователе:', error);
            });
        }
        
        // Общая функция для открытия чата
        function openChat(userId, userName) {
            // Получаем данные о пользователе
            fetch(`/get_user_info?user_id=${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(userData => {
                // Создаем или обновляем область чата
                createChatInterface(userData);
            })
            .catch(error => {
                console.error('Ошибка при получении информации о пользователе:', error);
            });
        }
        
        // Полностью переработанная функция создания интерфейса чата
        function createChatInterface(user) {
            console.log("Создаю интерфейс чата для пользователя:", user);
            
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) {
                console.error("Контейнер main-content не найден");
                return;
            }
            
            // Очищаем контент полностью
            mainContent.innerHTML = '';
            
            // Создаем базовую структуру с простыми div элементами
            const chatStructure = `
                <div class="chat-header">
                    <div class="chat-user-info">
                        <div class="chat-user-avatar">
                            ${user.avatar_path 
                                ? `<img src="${user.avatar_path}" alt="${user.name}">`
                                : `<div class="avatar-initials">${user.name.charAt(0)}</div>`}
                        </div>
                        <div class="chat-user-name">${user.name}</div>
                    </div>
                    <button class="chat-menu-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </button>
                </div>
                <div class="chat-messages">
                    <div class="no-messages">Нет сообщений</div>
                </div>
                <div class="message-input-container">
                    <div class="input-wrapper">
                        <div class="clip-button-container">
                            <button class="paperclip-button">
                                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="message-input-field">
                            <input type="text" placeholder="Сообщение">
                        </div>
                        <button class="send-button">
                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            
            // Вставляем структуру в основной контейнер
            mainContent.innerHTML = chatStructure;
            
            // Добавляем обработчики событий после создания DOM-структуры
            const inputField = mainContent.querySelector('.message-input-field input');
            const sendButton = mainContent.querySelector('.send-button');
            
            if (inputField && sendButton) {
                // Обработчик изменения содержимого поля ввода
                inputField.addEventListener('input', function() {
                    if (this.value.trim()) {
                        sendButton.classList.add('active');
                    } else {
                        sendButton.classList.remove('active');
                    }
                });
                
                // Обработчик нажатия Enter в поле ввода
                inputField.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && this.value.trim()) {
                        e.preventDefault();
                        sendTextMessage(this, mainContent.querySelector('.chat-messages'), user);
                    }
                });
                
                // Обработчик нажатия на кнопку отправки
                sendButton.addEventListener('click', function() {
                    if (this.classList.contains('active')) {
                        sendTextMessage(inputField, mainContent.querySelector('.chat-messages'), user);
                    }
                });
            }
            
            // Обработчик нажатия на кнопку меню
            const menuBtn = mainContent.querySelector('.chat-menu-btn');
            if (menuBtn) {
                menuBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    console.log("Клик по кнопке меню чата");
                    // Здесь будет логика открытия меню
                });
            }
            
            // Отображаем содержимое
            mainContent.style.display = 'flex';
        }
        
        // Function for creating chat interface
        function createChatInterface(user) {
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) return;
            
            // Clear the main content
            mainContent.innerHTML = '';
            
            // Create chat header
            const chatHeader = document.createElement('div');
            chatHeader.className = 'chat-header';
            
            // User info with correct horizontal layout
            const userInfo = document.createElement('div');
            userInfo.className = 'chat-user-info';
            
            // User avatar
            const userAvatar = document.createElement('div');
            userAvatar.className = 'chat-user-avatar';
            
            if (user.avatar_path) {
                userAvatar.innerHTML = `<img src="${user.avatar_path}" alt="${user.name}">`;
            } else {
                userAvatar.innerHTML = `<div class="avatar-initials">${user.name.charAt(0)}</div>`;
            }
            
            // User name - simple text without any extra elements
            const userName = document.createElement('div');
            userName.className = 'chat-user-name';
            userName.textContent = user.name;
            
            // Correctly add elements for horizontal layout
            userInfo.appendChild(userAvatar);
            userInfo.appendChild(userName);
            
            // Menu button (three vertical dots)
            const menuButton = document.createElement('button');
            menuButton.className = 'chat-menu-btn';
            menuButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                </svg>
            `;
            
            // Create dropdown menu
            const dropdown = document.createElement('div');
            dropdown.className = 'chat-dropdown-menu';
            dropdown.style.display = 'none';
            
            // Check if user is a contact
            fetch('/check_contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ contact_id: user.id })
            })
            .then(response => response.json())
            .then(data => {
                // Create menu items based on contact status
                if (data.is_contact) {
                    dropdown.innerHTML = `
                        <div class="dropdown-item remove-contact" data-user-id="${user.id}">
                            Удалить из контактов
                        </div>
                    `;
                } else {
                    dropdown.innerHTML = `
                        <div class="dropdown-item add-contact" data-user-id="${user.id}">
                            Добавить в контакты
                        </div>
                    `;
                }
                
                // Add event handlers for menu items
                dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                    item.addEventListener('click', function() {
                        if (item.classList.contains('add-contact')) {
                            addToContacts(user.id, user.name);
                        } else if (item.classList.contains('remove-contact')) {
                            removeFromContacts(user.id);
                        }
                        dropdown.style.display = 'none';
                    });
                });
            })
            .catch(error => {
                console.error('Error checking contact status:', error);
                dropdown.innerHTML = `
                    <div class="dropdown-item add-contact" data-user-id="${user.id}">
                        Добавить в контакты
                    </div>
                `;
            });
            
            // Menu button click handler
            menuButton.addEventListener('click', function(e) {
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', function() {
                dropdown.style.display = 'none';
            });
            
            // Prevent menu closing when clicking on menu
            dropdown.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            
            // Create messages area
            const chatMessages = document.createElement('div');
            chatMessages.className = 'chat-messages';
            
            // Check if there are messages
            const hasMessages = false; // Replace with actual check
            
            if (hasMessages) {
                // Add container for messages
                const messagesContainer = document.createElement('div');
                messagesContainer.className = 'messages-container';
                chatMessages.appendChild(messagesContainer);
                
                // Real messages will be added here
            } else {
                // Add "No messages" placeholder
                const noMessages = document.createElement('div');
                noMessages.className = 'no-messages';
                noMessages.textContent = 'Нет сообщений';
                chatMessages.appendChild(noMessages);
            }
            
            // ===== НОВОЕ ПОЛЕ ВВОДА СООБЩЕНИЙ =====
            
            // Главный контейнер для поля ввода с relative positioning
            const messageInputContainer = document.createElement('div');
            messageInputContainer.className = 'message-input-container';
            
            // Обертка для всех элементов поля ввода
            const inputWrapper = document.createElement('div');
            inputWrapper.className = 'input-wrapper';
            
            // Контейнер для кнопки скрепки с absolute positioning
            const clipButtonContainer = document.createElement('div');
            clipButtonContainer.className = 'clip-button-container';
            
            // Кнопка скрепки
            const paperclipButton = document.createElement('button');
            paperclipButton.className = 'paperclip-button';
            paperclipButton.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
            `;
            
            // Контейнер для поля ввода
            const messageInputField = document.createElement('div');
            messageInputField.className = 'message-input-field';
            
            // Поле ввода
            const inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.placeholder = 'Сообщение';
            
            // Кнопка отправки - изначально серая
            const sendButton = document.createElement('button');
            sendButton.className = 'send-button';
            sendButton.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            `;
            
            // Собираем новую структуру
            clipButtonContainer.appendChild(paperclipButton);
            messageInputField.appendChild(inputField);
            
            inputWrapper.appendChild(clipButtonContainer);
            inputWrapper.appendChild(messageInputField);
            inputWrapper.appendChild(sendButton);
            
            messageInputContainer.appendChild(inputWrapper);
            
            // Скрытый input для выбора файлов
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.multiple = true;
            fileInput.accept = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
            
            // Обработчик событий для поля ввода
            inputField.addEventListener('input', function() {
                if (this.value.trim()) {
                    // Если в поле есть текст - делаем кнопку активной и синей
                    sendButton.classList.add('active');
                } else {
                    // Если поле пустое - делаем кнопку неактивной и серой
                    sendButton.classList.remove('active');
                }
            });
            
            // Отправка сообщения нажатием на кнопку
            sendButton.addEventListener('click', function() {
                // Отправляем сообщение только если кнопка активна
                if (this.classList.contains('active')) {
                    sendTextMessage(inputField, chatMessages, user);
                }
            });
            
            // Отправка нажатием Enter
            inputField.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendTextMessage(inputField, chatMessages, user);
                }
            });
            
            // Открытие диалога выбора файла
            paperclipButton.addEventListener('click', function() {
                fileInput.click();
            });
            
            // Обработка выбранных файлов
            fileInput.addEventListener('change', function() {
                if (this.files && this.files.length > 0) {
                    sendFileMessage(this.files, chatMessages, user);
                    this.value = ''; // Сбрасываем значение для повторного выбора
                }
            });
            
            // Добавляем элементы в интерфейс
            chatHeader.appendChild(userInfo);
            chatHeader.appendChild(menuButton);
            chatHeader.appendChild(dropdown);
            
            mainContent.appendChild(chatHeader);
            mainContent.appendChild(chatMessages);
            mainContent.appendChild(messageInputContainer);
            
            // Показываем содержимое
            mainContent.style.display = 'flex';
            
            // Фокус на поле ввода после отрисовки
            setTimeout(() => {
                inputField.focus();
            }, 0);
        }
        
        // Functions for sending messages
        function sendTextMessage(inputField, chatMessages, user) {
            const messageText = inputField.value.trim();
            if (messageText) {
                // Get or create messages container
                let messagesContainer = chatMessages.querySelector('.messages-container');
                
                // Remove "No messages" if it exists
                const noMessages = chatMessages.querySelector('.no-messages');
                if (noMessages) {
                    chatMessages.removeChild(noMessages);
                    messagesContainer = document.createElement('div');
                    messagesContainer.className = 'messages-container';
                    chatMessages.appendChild(messagesContainer);
                }
                
                if (!messagesContainer) {
                    messagesContainer = document.createElement('div');
                    messagesContainer.className = 'messages-container';
                    chatMessages.appendChild(messagesContainer);
                }
                
                // Create message element
                const message = document.createElement('div');
                message.className = 'message message-sent';
                
                // Current time for the message
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                
                // Add message content with proper handling for very long text
                message.innerHTML = `
                    <div class="message-content">${messageText}</div>
                    <div class="message-time">${hours}:${minutes}</div>
                `;
                
                // Add message to container
                messagesContainer.appendChild(message);
                
                // Clear input
                inputField.value = '';
                inputField.focus();
                
                // Scroll chat down
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // TODO: Send message to server
                console.log(`Sending message to ${user.name} (ID: ${user.id}):`, messageText);
                
                // После отправки сообщения делаем кнопку серой снова
                const sendButton = document.querySelector('.send-button');
                if (sendButton) {
                    sendButton.classList.remove('active');
                }
            }
        }
        
        function sendFileMessage(files, chatMessages, user) {
            if (!files || files.length === 0) return;
            
            // Get or create messages container
            let messagesContainer = chatMessages.querySelector('.messages-container');
            
            // Remove "No messages" if it exists
            const noMessages = chatMessages.querySelector('.no-messages');
            if (noMessages) {
                chatMessages.removeChild(noMessages);
                messagesContainer = document.createElement('div');
                messagesContainer.className = 'messages-container';
                chatMessages.appendChild(messagesContainer);
            }
            
            if (!messagesContainer) {
                messagesContainer = document.createElement('div');
                messagesContainer.className = 'messages-container';
                chatMessages.appendChild(messagesContainer);
            }
            
            // Current time for the message
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            
            // Process each file
            Array.from(files).forEach(file => {
                // Create message element
                const message = document.createElement('div');
                message.className = 'message message-sent';
                
                // Determine file type for proper display
                const isImage = file.type.startsWith('image/');
                
                let fileContent;
                
                if (isImage) {
                    // Create URL for image preview
                    const imageUrl = URL.createObjectURL(file);
                    fileContent = `
                        <div class="message-image">
                            <img src="${imageUrl}" alt="${file.name}" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                        </div>
                        <div class="message-content">
                            ${file.name} (${formatFileSize(file.size)})
                        </div>
                    `;
                } else {
                    // For non-images just show file info
                    fileContent = `
                        <div class="message-content">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="margin-right: 5px; vertical-align: middle;">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            ${file.name} (${formatFileSize(file.size)})
                        </div>
                    `;
                }
                
                // Add content and time to message
                message.innerHTML = `
                    ${fileContent}
                    <div class="message-time">${hours}:${minutes}</div>
                `;
                
                // Add message to container
                messagesContainer.appendChild(message);
            });
            
            // Scroll chat down
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // TODO: Send files to server
            console.log(`Sending ${files.length} files to ${user.name} (ID: ${user.id})`);
        }
        
        // Helper function for formatting file size
        function formatFileSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
            else return (bytes / 1048576).toFixed(1) + ' MB';
        }
        
        // Функция для добавления пользователя в контакты
        function addToContacts(userId, userName) {
            fetch('/add_contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contact_id: userId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log(`Пользователь ${userName} добавлен в контакты`);
                    
                    // Перезагружаем список контактов
                    loadContacts();
                    
                    // Обновляем меню в интерфейсе чата
                    const dropdown = document.querySelector('.chat-dropdown-menu');
                    if (dropdown) {
                        dropdown.innerHTML = `
                            <div class="dropdown-item remove-contact" data-user-id="${userId}">
                                Удалить из контактов
                            </div>
                        `;
                        
                        // Обновляем обработчик события
                        dropdown.querySelector('.remove-contact').addEventListener('click', function() {
                            removeFromContacts(userId);
                            dropdown.style.display = 'none';
                        });
                    }
                } else {
                    console.error('Ошибка при добавлении контакта:', data.error);
                }
            })
            .catch(error => {
                console.error('Ошибка при добавлении контакта:', error);
            });
        }
        
        // Функция для удаления пользователя из контактов
        function removeFromContacts(userId) {
            fetch('/remove_contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contact_id: userId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log(`Пользователь удален из контактов`);
                    
                    // Перезагружаем список контактов
                    loadContacts();
                    
                    // Обновляем меню в интерфейсе чата
                    const dropdown = document.querySelector('.chat-dropdown-menu');
                    if (dropdown) {
                        dropdown.innerHTML = `
                            <div class="dropdown-item add-contact" data-user-id="${userId}">
                                Добавить в контакты
                            </div>
                        `;
                        
                        // Обновляем обработчик события
                        dropdown.querySelector('.add-contact').addEventListener('click', function() {
                            addToContacts(userId, document.querySelector('.chat-user-name').textContent);
                            dropdown.style.display = 'none';
                        });
                    }
                } else {
                    console.error('Ошибка при удалении контакта:', data.error);
                }
            })
            .catch(error => {
                console.error('Ошибка при удалении контакта:', error);
            });
        }
        
        // Закрытие результатов при клике вне поля поиска
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }

    // Функция для загрузки и отображения контактов
    function loadContacts() {
        fetch('/get_contacts', {
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
            const contactsList = document.getElementById('contactsList');
            const noContactsMessage = document.querySelector('.no-contacts-message');
            
            // Очищаем текущий список контактов (кроме сообщения об отсутствии контактов)
            Array.from(contactsList.children).forEach(child => {
                if (!child.classList.contains('no-contacts-message')) {
                    contactsList.removeChild(child);
                }
            });
            
            if (data.contacts && data.contacts.length > 0) {
                // Показываем контакты и скрываем сообщение
                noContactsMessage.style.display = 'none';
                
                // Сортируем контакты по имени
                data.contacts.sort((a, b) => a.name.localeCompare(b.name));
                
                // Создаем элемент для каждого контакта
                data.contacts.forEach(contact => {
                    const contactItem = document.createElement('div');
                    contactItem.className = 'contact-item';
                    contactItem.dataset.contactId = contact.id;
                    
                    // Создаем аватар
                    const contactAvatar = document.createElement('div');
                    contactAvatar.className = 'contact-avatar';
                    
                    if (contact.avatar_path) {
                        contactAvatar.innerHTML = `<img src="${contact.avatar_path}" alt="${contact.name}">`;
                    } else {
                        contactAvatar.innerHTML = `<div class="avatar-initials">${contact.name.charAt(0)}</div>`;
                    }
                    
                    // Создаем блок информации о контакте
                    const contactInfo = document.createElement('div');
                    contactInfo.className = 'contact-info';
                    
                    const contactName = document.createElement('div');
                    contactName.className = 'contact-name';
                    contactName.textContent = contact.name;
                    
                    // Создаем элемент для био информации (вместо времени)
                    const contactBio = document.createElement('div');
                    contactBio.className = 'contact-bio';
                    contactBio.textContent = contact.bio || ''; // Показываем био если есть, иначе пустая строка
                    
                    // Собираем элемент контакта
                    contactInfo.appendChild(contactName);
                    contactInfo.appendChild(contactBio);
                    
                    contactItem.appendChild(contactAvatar);
                    contactItem.appendChild(contactInfo);
                    
                    // Добавляем обработчик клика
                    contactItem.addEventListener('click', function() {
                        // Открыть чат с контактом
                        openChatWithContact(contact.id, contact.name);
                        
                        // Подсветить активный контакт
                        document.querySelectorAll('.contact-item').forEach(item => {
                            item.classList.remove('active');
                        });
                        contactItem.classList.add('active');
                    });
                    
                    // Добавляем контакт в список
                    contactsList.appendChild(contactItem);
                });
            } else {
                // Если контактов нет, показываем сообщение
                noContactsMessage.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Ошибка при загрузке контактов:', error);
        });
    }
    
    // Функция для открытия чата с контактом (будет реализована позже)
    function openChatWithContact(contactId, contactName) {
        console.log(`Открываем чат с пользователем: ${contactName} (ID: ${contactId})`);
        // Здесь будет код для отображения чата
    }
    
    // Загружаем контакты при загрузке страницы
    loadContacts();
    
    console.log('Обработчики событий установлены');
    
    updateAvatarWithCrossIcon();
    
    // Add event listener for the close menu button
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', function() {
            sideMenu.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
});

// Update the avatar upload icon to be a plus instead of a cross
function updateAvatarWithCrossIcon() {
    // Get all avatar placeholders with upload icons
    const avatarPlaceholders = document.querySelectorAll('#avatarPlaceholder');
    
    avatarPlaceholders.forEach(placeholder => {
        // Find existing upload icon if any
        let uploadIcon = placeholder.querySelector('.avatar-upload-icon');
        
        // If no icon exists, create it
        if (!uploadIcon) {
            uploadIcon = document.createElement('div');
            uploadIcon.className = 'avatar-upload-icon';
            placeholder.appendChild(uploadIcon);
        }
        
        // Update the icon to be a plus (+) instead of a cross (X)
        uploadIcon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <path d="M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
    });
}
