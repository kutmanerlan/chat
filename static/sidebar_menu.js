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
            
            // Используем ту же функцию для открытия чата
            openChat(contactId, contactName);
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
        
        // Функция для создания интерфейса чата
        function createChatInterface(user) {
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) return;
            
            // Очищаем главный контент
            mainContent.innerHTML = '';
            
            // Создаем шапку чата
            const chatHeader = document.createElement('div');
            chatHeader.className = 'chat-header';
            
            // Информация о пользователе
            const userInfo = document.createElement('div');
            userInfo.className = 'chat-user-info';
            
            // Аватар пользователя
            const userAvatar = document.createElement('div');
            userAvatar.className = 'chat-user-avatar';
            
            if (user.avatar_path) {
                userAvatar.innerHTML = `<img src="${user.avatar_path}" alt="${user.name}">`;
            } else {
                userAvatar.innerHTML = `<div class="avatar-initials">${user.name.charAt(0)}</div>`;
            }
            
            // Имя пользователя
            const userName = document.createElement('div');
            userName.className = 'chat-user-name';
            userName.textContent = user.name;
            
            // Добавляем элементы в информацию о пользователе
            userInfo.appendChild(userAvatar);
            userInfo.appendChild(userName);
            
            // Кнопка с вертикальными тремя точками (меню)
            const menuButton = document.createElement('button');
            menuButton.className = 'chat-menu-btn';
            menuButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                </svg>
            `;
            
            // Создаем выпадающее меню
            const dropdown = document.createElement('div');
            dropdown.className = 'chat-dropdown-menu';
            dropdown.style.display = 'none';
            
            // Проверяем, является ли пользователь контактом
            fetch('/check_contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ contact_id: user.id })
            })
            .then(response => response.json())
            .then(data => {
                // Создаем элементы меню в зависимости от статуса контакта
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
                
                // Обработчики для пунктов меню
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
                console.error('Ошибка при проверке статуса контакта:', error);
                dropdown.innerHTML = `
                    <div class="dropdown-item add-contact" data-user-id="${user.id}">
                        Добавить в контакты
                    </div>
                `;
            });
            
            // Обработчик клика по кнопке меню
            menuButton.addEventListener('click', function(e) {
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            });
            
            // Закрытие меню при клике вне его
            document.addEventListener('click', function() {
                dropdown.style.display = 'none';
            });
            
            // Предотвращение закрытия меню при клике на само меню
            dropdown.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            
            // Создаем область сообщений
            const chatMessages = document.createElement('div');
            chatMessages.className = 'chat-messages';
            
            // Проверка на наличие сообщений
            const hasMessages = false; // Заменить на реальную проверку
            
            if (hasMessages) {
                // Добавляем контейнер для сообщений
                const messagesContainer = document.createElement('div');
                messagesContainer.className = 'messages-container';
                chatMessages.appendChild(messagesContainer);
                
                // Здесь будут добавляться реальные сообщения
            } else {
                // Добавляем заглушку "Нет сообщений"
                const noMessages = document.createElement('div');
                noMessages.className = 'no-messages';
                noMessages.textContent = 'Нет сообщений';
                chatMessages.appendChild(noMessages);
            }
            
            // НОВЫЙ КОД: Полностью переписанное поле ввода сообщений
            // =======================================================
            
            // Создаем основной контейнер для поля ввода
            const chatInput = document.createElement('div');
            chatInput.className = 'chat-input';
            
            // Создаем кнопку скрепки для прикрепления файлов
            const attachmentBtn = document.createElement('button');
            attachmentBtn.className = 'attachment-btn';
            attachmentBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
            `;
            
            // Создаем поле для ввода текста
            const textarea = document.createElement('textarea');
            textarea.placeholder = 'Сообщение';
            
            // Создаем кнопку отправки (скрытую по умолчанию)
            const sendBtn = document.createElement('button');
            sendBtn.className = 'send-btn';
            sendBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            `;
            
            // Добавляем элементы в контейнер поля ввода
            chatInput.appendChild(attachmentBtn);
            chatInput.appendChild(textarea);
            chatInput.appendChild(sendBtn);
            
            // Создаем модальное окно для выбора файлов
            const attachmentModal = document.createElement('div');
            attachmentModal.className = 'attachment-modal';
            
            attachmentModal.innerHTML = `
                <div class="attachment-modal-content">
                    <div class="attachment-modal-header">
                        <div class="attachment-modal-title">Выберите файл</div>
                        <button class="attachment-modal-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="attachment-modal-body">
                        <div class="attachment-grid">
                            <div class="attachment-item">
                                <img src="static/avatars/user_1_avatar.jpg" alt="File 1">
                                <div class="attachment-item-name">komnata.jpg</div>
                            </div>
                            <div class="attachment-item">
                                <img src="static/avatars/user_1_avatar.jpg" alt="File 2">
                                <div class="attachment-item-name">463788.png</div>
                            </div>
                            <div class="attachment-item">
                                <img src="static/avatars/user_1_avatar.jpg" alt="File 3">
                                <div class="attachment-item-name">463788.webp</div>
                            </div>
                        </div>
                        <button class="show-all-files-btn">Показать все файлы...</button>
                    </div>
                </div>
            `;
            
            // Скрытый input для выбора файлов через системный диалог
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.className = 'file-input';
            fileInput.multiple = true; // Разрешаем выбирать несколько файлов
            fileInput.accept = 'image/*,video/*,.doc,.docx,.pdf,.xls,.xlsx,.zip,.rar';
            
            // Добавляем модальное окно и скрытый input в body
            document.body.appendChild(attachmentModal);
            document.body.appendChild(fileInput);
            
            // Обработчики событий
            
            // 1. Показываем/скрываем кнопку отправки в зависимости от наличия текста
            textarea.addEventListener('input', function() {
                if (this.value.trim()) {
                    sendBtn.classList.add('visible');
                } else {
                    sendBtn.classList.remove('visible');
                }
                
                // Автоматически изменяем высоту textarea
                this.style.height = 'auto';
                const newHeight = Math.min(120, this.scrollHeight);
                this.style.height = newHeight + 'px';
            });
            
            // 2. Обработчик для кнопки скрепки (открывает модальное окно)
            attachmentBtn.addEventListener('click', function() {
                attachmentModal.classList.add('active');
            });
            
            // 3. Закрытие модального окна
            const closeModalBtn = attachmentModal.querySelector('.attachment-modal-close');
            closeModalBtn.addEventListener('click', function() {
                attachmentModal.classList.remove('active');
            });
            
            // 4. Закрытие модального окна при клике вне его
            attachmentModal.addEventListener('click', function(e) {
                if (e.target === attachmentModal) {
                    attachmentModal.classList.remove('active');
                }
            });
            
            // 5. Обработка клика "Показать все файлы"
            const showAllFilesBtn = attachmentModal.querySelector('.show-all-files-btn');
            showAllFilesBtn.addEventListener('click', function() {
                fileInput.click();
                attachmentModal.classList.remove('active');
            });
            
            // 6. Обработка выбора файлов через системный диалог
            fileInput.addEventListener('change', function() {
                if (this.files && this.files.length > 0) {
                    // Здесь можно добавить логику обработки выбранных файлов
                    console.log(`Выбрано ${this.files.length} файлов`);
                    
                    // Пример: Добавление сообщения о выбранных файлах
                    sendFileMessage(this.files, chatMessages, user);
                    
                    // Сбрасываем значение input для возможности повторного выбора тех же файлов
                    this.value = '';
                }
            });
            
            // 7. Обработчик выбора файла в модальном окне
            const attachmentItems = attachmentModal.querySelectorAll('.attachment-item');
            attachmentItems.forEach(item => {
                item.addEventListener('click', function() {
                    // Здесь логика для выбора конкретного файла из галереи
                    const fileName = this.querySelector('.attachment-item-name').textContent;
                    console.log(`Выбран файл: ${fileName}`);
                    
                    // Здесь можно добавить логику отправки выбранного файла
                    
                    attachmentModal.classList.remove('active');
                });
            });
            
            // 8. Отправка сообщения при клике на кнопку отправки
            sendBtn.addEventListener('click', function() {
                sendTextMessage(textarea, chatMessages, user);
            });
            
            // 9. Отправка сообщения при нажатии Enter (без Shift)
            textarea.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendTextMessage(textarea, chatMessages, user);
                }
            });
            
            // Добавляем все элементы в область чата
            chatHeader.appendChild(userInfo);
            chatHeader.appendChild(menuButton);
            chatHeader.appendChild(dropdown);
            
            mainContent.appendChild(chatHeader);
            mainContent.appendChild(chatMessages);
            mainContent.appendChild(chatInput);
            
            // Показываем основную область
            mainContent.style.display = 'flex';
            
            // Фокусируем поле ввода
            setTimeout(() => {
                textarea.focus();
            }, 0);
        }
        
        // Функция для отправки текстового сообщения
        function sendTextMessage(textarea, chatMessages, user) {
            const messageText = textarea.value.trim();
            if (messageText) {
                // Получаем или создаем контейнер для сообщений
                let messagesContainer = chatMessages.querySelector('.messages-container');
                
                // Удаляем сообщение "Нет сообщений" если оно есть
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
                
                // Создаем элемент сообщения
                const message = document.createElement('div');
                message.className = 'message message-sent';
                
                // Текущее время для сообщения
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                
                // Добавляем содержимое сообщения
                message.innerHTML = `
                    <div class="message-content">${messageText}</div>
                    <div class="message-time">${hours}:${minutes}</div>
                `;
                
                // Добавляем сообщение в контейнер
                messagesContainer.appendChild(message);
                
                // Очищаем поле ввода и скрываем кнопку отправки
                textarea.value = '';
                textarea.style.height = 'auto';
                document.querySelector('.send-btn').classList.remove('visible');
                
                // Прокручиваем чат вниз
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // TODO: Здесь будет отправка сообщения на сервер
                console.log(`Отправка сообщения пользователю ${user.name} (ID: ${user.id}):`, messageText);
            }
        }
        
        // Функция для отправки файлов
        function sendFileMessage(files, chatMessages, user) {
            if (!files || files.length === 0) return;
            
            // Получаем или создаем контейнер для сообщений
            let messagesContainer = chatMessages.querySelector('.messages-container');
            
            // Удаляем сообщение "Нет сообщений" если оно есть
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
            
            // Текущее время для сообщения
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            
            // Перебираем все выбранные файлы
            Array.from(files).forEach(file => {
                // Создаем элемент сообщения
                const message = document.createElement('div');
                message.className = 'message message-sent';
                
                // Определяем тип файла для правильного отображения
                const isImage = file.type.startsWith('image/');
                
                let fileContent;
                
                if (isImage) {
                    // Создаем URL для предпросмотра изображения
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
                    // Для неизображений просто показываем информацию о файле
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
                
                // Добавляем содержимое и время в сообщение
                message.innerHTML = `
                    ${fileContent}
                    <div class="message-time">${hours}:${minutes}</div>
                `;
                
                // Добавляем сообщение в контейнер
                messagesContainer.appendChild(message);
            });
            
            // Прокручиваем чат вниз
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // TODO: Здесь будет логика отправки файлов на сервер
            console.log(`Отправка ${files.length} файлов пользователю ${user.name} (ID: ${user.id})`);
        }
        
        // Вспомогательная функция для форматирования размера файла
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
                    
                    const contactBio = document.createElement('div');
                    contactBio.className = 'contact-bio';
                    contactBio.textContent = contact.bio || 'Нет информации';
                    
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
});
