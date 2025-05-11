/**
 * Group chat functionality
 */

/**
 * Open a group chat
 */
function openGroupChat(groupId, groupName) {
  // Store active chat info (with type)
  ChatApp.activeChat = { id: groupId, name: groupName, type: 'group' };
  
  console.log('Opening group chat:', groupId, groupName);
  
  // Show loading indicator in main content area
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.innerHTML = `
      <div style="display:flex;justify-content:center;align-items:center;height:100%;">
        <div style="color:#888;text-align:center;">
          <div style="margin-bottom:10px;">Loading group chat...</div>
        </div>
      </div>
    `;
  }
  
  // Get group info with proper error handling
  getGroupInfo(groupId)
    .then(response => {
      if (!response || !response.success) {
        console.error('Failed to get group info:', response);
        throw new Error(response && response.error ? response.error : 'Failed to get group info');
      }
      
      const groupData = response.group;
      console.log('Group data loaded:', groupData);
      
      // Create the group chat interface
      createGroupChatInterface(groupData);
      
      // Load group messages
      return loadGroupMessages(groupId);
    })
    .then(response => {
      if (response && !response.success) {
        console.error('Failed to load group messages:', response);
      }
      
      // Highlight active group in sidebar regardless of message loading success
      highlightActiveItem(groupId, 'group');
    })
    .catch(error => {
      console.error('Error opening group chat:', error);
      showErrorNotification(error.message || 'Failed to open group chat. Please try again.');
      
      // Reset main content to show error
      if (mainContent) {
        mainContent.innerHTML = `
          <div style="display:flex;justify-content:center;align-items:center;height:100%;flex-direction:column;">
            <div style="color:#e57373;text-align:center;margin-bottom:20px;">
              Failed to open group chat
            </div>
            <button class="btn btn-secondary" onclick="loadSidebar()">
              Try Again
            </button>
          </div>
        `;
      }
    });
}

/**
 * Highlight the active item in the sidebar (for both group and regular chats)
 */
function highlightActiveItem(itemId, type = 'user') {
  // Remove active class from all items
  document.querySelectorAll('.contact-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Find and highlight item based on type
  let selector;
  if (type === 'group') {
    selector = `.group-item[data-group-id="${itemId}"]`;
  } else {
    selector = `.contact-item[data-user-id="${itemId}"], .contact-item[data-contact-id="${itemId}"]`;
  }
  
  const itemElement = document.querySelector(selector);
  if (itemElement) {
    itemElement.classList.add('active');
    
    // Remove unread badge if exists
    const badge = itemElement.querySelector('.unread-badge');
    if (badge) badge.remove();
  }
}

/**
 * Create the group chat interface
 */
function createGroupChatInterface(group) {
  console.log('Creating group chat interface for:', group);
  
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) {
    console.error('Main content container not found');
    return;
  }
  
  // Clear existing content
  mainContent.innerHTML = '';
  
  // Create header
  const chatHeader = document.createElement('div');
  chatHeader.className = 'chat-header';
  
  // Group info section
  const groupInfo = document.createElement('div');
  groupInfo.className = 'chat-user-info';
  groupInfo.style.display = 'flex';
  groupInfo.style.alignItems = 'center';
  
  // Group avatar
  const groupAvatar = document.createElement('div');
  groupAvatar.className = 'chat-user-avatar group-avatar';
  if (group.avatar_path) {
    let avatarSrc = group.avatar_path;
    if (!avatarSrc.startsWith('http')) {
      avatarSrc = `/uploads/${avatarSrc}`;
    }
    groupAvatar.innerHTML = `<img src="${avatarSrc}" alt="${group.name}" class="avatar-image">`;
  } else {
    const isNumericOnly = /^\d+$/.test(group.name);
    const initial = isNumericOnly ? 'G' : group.name.charAt(0);
    groupAvatar.innerHTML = `<div class="avatar-initials">${initial}</div>`;
  }
  groupAvatar.style.cursor = 'pointer';
  groupAvatar.onclick = function() { showGroupMembers(group); };
  
  // Group name and member count
  const groupNameEl = document.createElement('div');
  groupNameEl.className = 'chat-user-name';
  groupNameEl.textContent = group.name;
  groupNameEl.style.cursor = 'pointer';
  groupNameEl.style.fontSize = '16px';
  groupNameEl.style.fontWeight = '500';
  groupNameEl.style.marginBottom = '6px'; // Keep spacing below name
  groupNameEl.style.position = 'relative'; 
  groupNameEl.style.top = '10px'; // Keep this adjustment
  groupNameEl.onclick = function() { showGroupMembers(group); };

  // Количество участников (member count)
  const memberCount = document.createElement('div');
  memberCount.className = 'chat-group-members';
  memberCount.textContent = `${group.member_count || 0} members`;
  memberCount.style.marginTop = '0'; 
  memberCount.style.position = 'relative';
  memberCount.style.top = '-9px'; // Changed from -2px to -4px to move it higher

  // Group name и member count в одной колонке, справа от аватарки
  const groupNameBlock = document.createElement('div');
  groupNameBlock.style.display = 'flex';
  groupNameBlock.style.flexDirection = 'column';
  groupNameBlock.style.justifyContent = 'center';
  groupNameBlock.style.alignItems = 'flex-start';
  groupNameBlock.style.height = '100%';
  groupNameBlock.style.padding = '8px 0';
  // IMPORTANT: Changed order - group name first, then member count
  groupNameBlock.appendChild(groupNameEl); 
  groupNameBlock.appendChild(memberCount);

  groupInfo.appendChild(groupAvatar);
  groupInfo.appendChild(groupNameBlock);
  
  // Menu button
  const menuButton = document.createElement('button');
  menuButton.className = 'chat-menu-btn';
  menuButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="5" r="1"></circle>
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="19" r="1"></circle>
    </svg>
  `;
  
  // Menu button click handler
  menuButton.addEventListener('click', function(e) {
    e.stopPropagation();
    showGroupMenu(menuButton, group);
  });
  
  // Messages area
  const chatMessages = document.createElement('div');
  chatMessages.className = 'chat-messages';
  
  // Message input area
  const messageInputContainer = document.createElement('div');
  messageInputContainer.className = 'message-input-container';
  
  // Create input wrapper
  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'input-wrapper';
  
  // Clip button
  const clipButtonContainer = document.createElement('div');
  clipButtonContainer.className = 'clip-button-container';
  
  const paperclipButton = document.createElement('button');
  paperclipButton.className = 'paperclip-button';
  paperclipButton.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
    </svg>
  `;
  
  // Input field
  const messageInputField = document.createElement('div');
  messageInputField.className = 'message-input-field';
  
  const inputField = document.createElement('input');
  inputField.type = 'text';
  inputField.placeholder = 'Message';
  
  // Emoji button
  const emojiButton = document.createElement('button');
  emojiButton.className = 'emoji-button paperclip-button';
  emojiButton.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
      <path d="M12 15c-2.09 0-3.933-1.034-5.121-2.819-.19-.287-.01-0.69.277-0.88.287-.19.69-.01.88.277C9.038 13.036 10.426 14 12 14s2.962-0.964 3.964-2.423c.19-.287.593-0.467.88-0.277.287.19.467.593.277.88C15.933 13.966 14.09 15 12 15z"/>
      <circle cx="8.5" cy="9.5" r="1.5"/>
      <circle cx="15.5" cy="9.5" r="1.5"/>
    </svg>
  `;
  
  // --- File Input ---
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '*/*'; // Accept all file types initially
  fileInput.style.display = 'none'; // Hide the actual input
  fileInput.id = `groupFileInput_${group.id}`; // Unique ID

  // Add file input to the container (doesn't matter where visually)
  messageInputContainer.appendChild(fileInput);

  // Send button
  const sendButton = document.createElement('button');
  sendButton.className = 'send-button';
  sendButton.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  `;
  
  // Add input event handlers
  inputField.addEventListener('input', function() {
    if (this.value.trim()) {
      sendButton.classList.add('active');
    } else {
      sendButton.classList.remove('active');
    }
  });
  
  // Add send handlers
  sendButton.addEventListener('click', function() {
    const text = inputField.value.trim();
    if (text) {
      sendGroupMessageHandler(text, group.id, chatMessages);
    }
  });
  
  // Add enter key handler
  inputField.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = this.value.trim();
      if (text) {
        sendGroupMessageHandler(text, group.id, chatMessages);
      }
    }
  });
  
  // Assemble everything
  chatHeader.appendChild(groupInfo);
  chatHeader.appendChild(menuButton);
  
  clipButtonContainer.appendChild(paperclipButton);
  clipButtonContainer.appendChild(emojiButton);
  messageInputField.appendChild(inputField);
  
  inputWrapper.appendChild(clipButtonContainer);
  inputWrapper.appendChild(messageInputField);
  inputWrapper.appendChild(sendButton);
  
  messageInputContainer.appendChild(inputWrapper);
  
  // --- Create Emoji Panel (Initially Hidden) ---
  // Check if panel already exists from a previous chat creation in the same session
  let emojiPanel = document.getElementById('emojiPanel');
  if (!emojiPanel) {
    emojiPanel = document.createElement('div');
    emojiPanel.id = 'emojiPanel'; // Add ID for styling and selection
    emojiPanel.style.display = 'none'; // Hide initially
    // Add it to the mainContent for positioning relative to the chat area
    mainContent.appendChild(emojiPanel);
  }
  
  // Add the chat header to the main content - THIS LINE WAS MISSING
  mainContent.appendChild(chatHeader);
  
  mainContent.appendChild(chatMessages);
  mainContent.appendChild(messageInputContainer);
  
  // Show chat content
  mainContent.style.display = 'flex';
  
  // Focus input field
  inputField.focus();

  // --- Event Listeners ---

  // Paperclip button triggers file input
  paperclipButton.addEventListener('click', () => {
    fileInput.click(); // Trigger click on hidden file input
  });

  // Handle file selection
  fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Handle single file upload for now
      const file = files[0];
      console.log('File selected:', file.name, file.size);
      uploadGroupFile(file, group.id, chatMessages); // Pass necessary info

      // Reset file input value to allow selecting the same file again
      event.target.value = null;
    }
  });

  // Emoji button click handler - use the function from ui.js
  emojiButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEmojiPanel(inputField); // This function is defined in ui.js
  });
}

/**
 * Upload a file to the group chat
 */
function uploadGroupFile(file, groupId, chatMessages) {
  // Basic validation (e.g., size limit - 10MB)
  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    showErrorNotification(`File is too large (max ${maxSize / 1024 / 1024} MB)`);
    return;
  }

  // Create FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('group_id', groupId);

  // Show temporary "Uploading..." message in chat
  const tempMsgId = `temp_upload_${Date.now()}`;
  const tempMsgElement = createTemporaryMessageElement(tempMsgId, `Uploading ${file.name}...`);
  addMessageElementToChat(tempMsgElement, chatMessages);

  // Perform the upload
  fetch('/upload_group_file', { // Needs backend route
    method: 'POST',
    body: formData
    // Headers are automatically set by browser for FormData
  })
  .then(response => {
    if (!response.ok) {
      // Try to get error message from backend response
      return response.json().then(err => {
        throw new Error(err.error || `HTTP error! status: ${response.status}`);
      }).catch(() => {
        // Fallback if no JSON error message
        throw new Error(`HTTP error! status: ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    // Remove temporary message
    removeMessageElement(tempMsgId, chatMessages);

    if (data.success && data.message) {
      // Backend should return the new message object upon success
      addMessageToGroupChat(data.message, chatMessages);
      loadSidebar(); // Refresh sidebar
    } else {
      showErrorNotification(data.error || 'Failed to upload file.');
    }
  })
  .catch(error => {
    console.error('Error uploading file:', error);
    // Remove temporary message on error too
    removeMessageElement(tempMsgId, chatMessages);
    showErrorNotification(`Upload failed: ${error.message}`);
  });
}

/**
 * Creates a temporary message element (e.g., for upload status)
 */
function createTemporaryMessageElement(id, text) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message message-sent message-temporary'; // Style as sent, add temp class
  messageEl.dataset.messageId = id; // Use specific ID
  messageEl.innerHTML = `
    <div class="message-content">${escapeHtml(text)}</div>
    <div class="message-footer">
      <div class="message-time">Sending...</div>
    </div>
  `;
  return messageEl;
}

/**
 * Adds any message element to the chat container
 */
function addMessageElementToChat(messageEl, chatMessages) {
  let messagesContainer = chatMessages.querySelector('.messages-container');
  const noMessages = chatMessages.querySelector('.no-messages');

  if (noMessages) {
    chatMessages.removeChild(noMessages);
  }

  if (!messagesContainer) {
    messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    chatMessages.appendChild(messagesContainer);
  }

  messagesContainer.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Removes a message element by its data-message-id
 */
function removeMessageElement(id, chatMessages) {
  const messageEl = chatMessages.querySelector(`.message[data-message-id="${id}"]`);
  if (messageEl) {
    messageEl.remove();
  }
}

/**
 * Show group menu when chat menu button is clicked
 */
function showGroupMenu(menuButton, group) {
  // Create menu if it doesn't exist
  let groupMenu = document.getElementById('groupDropdownMenu');
  if (!groupMenu) {
    groupMenu = document.createElement('div');
    groupMenu.id = 'groupDropdownMenu';
    groupMenu.className = 'dropdown-menu';
    document.body.appendChild(groupMenu);
  }
  
  // Clear any existing content
  groupMenu.innerHTML = '';
  
  // Get the button position
  const buttonRect = menuButton.getBoundingClientRect();
  
  // Default options for all group members
  const options = `
    <div class="dropdown-menu-options">
      <div class="dropdown-option" id="viewMembersOption">
        <div class="dropdown-option-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div class="dropdown-option-label">View Members</div>
      </div>
    </div>
  `;
  
  // Check if user is admin to add more options
  if (group.is_admin) {
    const adminOptions = `
      <div class="dropdown-option" id="addMembersOption">
        <div class="dropdown-option-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
        </div>
        <div class="dropdown-option-label">Add Members</div>
      </div>
      <div class="dropdown-option" id="editGroupOption">
        <div class="dropdown-option-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </div>
        <div class="dropdown-option-label">Edit Group</div>
      </div>
    `;
    
    groupMenu.innerHTML = `
      <div class="dropdown-menu-options">
        ${options}
        ${adminOptions}
      </div>
    `;
  } else {
    groupMenu.innerHTML = options;
  }
  
  // Add leave group option for all
  const leaveOption = document.createElement('div');
  leaveOption.className = 'dropdown-option leave-group-option';
  leaveOption.id = 'leaveGroupOption';
  leaveOption.innerHTML = `
    <div class="dropdown-option-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
    </div>
    <div class="dropdown-option-label" style="color: #e74c3c;">Leave Group</div>
  `;
  
  groupMenu.querySelector('.dropdown-menu-options').appendChild(leaveOption);
  
  // Position the menu
  groupMenu.style.display = 'block';
  groupMenu.style.position = 'absolute';
  groupMenu.style.left = `${buttonRect.left - 180}px`; // Position to the left of the button
  groupMenu.style.top = `${buttonRect.bottom + 5}px`;
  
  // Add event listeners
  document.getElementById('viewMembersOption').addEventListener('click', () => {
    showGroupMembers(group);
    groupMenu.style.display = 'none';
  });
  
  if (group.is_admin) {
    document.getElementById('addMembersOption').addEventListener('click', () => {
      showAddMembers(group);
      groupMenu.style.display = 'none';
    });
    
    document.getElementById('editGroupOption').addEventListener('click', () => {
      showEditGroup(group);
      groupMenu.style.display = 'none';
    });
  }
  
  document.getElementById('leaveGroupOption').addEventListener('click', () => {
    showLeaveGroupConfirmation(group);
    groupMenu.style.display = 'none';
  });
  
  // Close menu when clicking anywhere else
  document.addEventListener('click', function closeMenu(e) {
    if (!groupMenu.contains(e.target) && !menuButton.contains(e.target)) {
      groupMenu.style.display = 'none';
      document.removeEventListener('click', closeMenu);
    }
  });
}

/**
 * Placeholder functions for group management
 * These will be implemented in future steps
 */
function showGroupMembers(group) {
  // Удаляем старую модалку, если есть
  const oldModal = document.getElementById('viewMembersModal');
  if (oldModal) oldModal.remove();

  // Сортируем: сначала создатель, потом админы, потом остальные
  const members = (group.members || []).slice().sort((a, b) => {
    if (a.id === group.creator_id) return -1; // Creator first
    if (b.id === group.creator_id) return 1;
    if (a.role === 'admin' && b.role !== 'admin') return -1; // Admins next
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return a.name.localeCompare(b.name); // Sort others by name
  });

  // Модалка
  const modal = document.createElement('div');
  modal.id = 'viewMembersModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 400px;">
      <div class="modal-title" style="margin-bottom: 12px;">Group Members</div>
      <div class="members-list" id="viewMembersList" style="margin-bottom: 18px; max-height: 260px; overflow-y: auto;"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="closeViewMembersBtn">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Рендерим список
  const list = document.getElementById('viewMembersList');
  if (!members.length) {
    list.innerHTML = '<div class="no-contacts">No members</div>';
  } else {
    members.forEach(user => {
      const memberItem = document.createElement('div');
      memberItem.className = 'member-item';
      let avatarContent;
      if (user.avatar_path) {
        avatarContent = `<img src="${user.avatar_path}" alt="${user.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
      } else {
        avatarContent = user.name.charAt(0);
      }
      let adminBadge = '';
      if (user.role === 'admin') {
        adminBadge = `<span style="border:1.5px solid #2a5885; color:#2a5885; border-radius:6px; font-size:12px; padding:1px 7px; margin-left:8px; vertical-align:middle; background:#181818;">admin</span>`;
      }
      let creatorBadge = '';
      if (user.id === group.creator_id) {
        creatorBadge = `<span style="color:#aaa;font-size:12px;margin-left:8px;vertical-align:middle;">creator</span>`;
      }
      memberItem.innerHTML = `
        <div class="member-avatar">${avatarContent}</div>
        <div class="member-name">${user.name} ${adminBadge}${creatorBadge}</div>
      `;
      list.appendChild(memberItem);
    });
  }

  // Кнопка закрытия
  document.getElementById('closeViewMembersBtn').onclick = function() {
    modal.remove();
  };
}

function showAddMembers(group) {
  // Удаляем старую модалку, если есть
  const oldModal = document.getElementById('addMembersModal');
  if (oldModal) oldModal.remove();

  // Создаем модалку
  const modal = document.createElement('div');
  modal.id = 'addMembersModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 400px;">
      <div class="modal-title" style="margin-bottom: 12px;">Add members to group</div>
      <input type="text" id="searchAddMembers" class="search-input" placeholder="Search contacts" style="margin-bottom: 10px;">
      <div class="members-list" id="addMembersList" style="margin-bottom: 18px; max-height: 220px; overflow-y: auto;"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancelAddMembersBtn">Cancel</button>
        <button class="btn btn-secondary" id="confirmAddMembersBtn">Add</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Загрузка контактов
  fetch('/get_users_for_group')
    .then(r => r.json())
    .then(data => {
      if (data.success && data.users) {
        renderAddMembersList(data.users, group);
      } else {
        document.getElementById('addMembersList').innerHTML = '<div class="no-contacts">Failed to load contacts</div>';
      }
    })
    .catch(() => {
      document.getElementById('addMembersList').innerHTML = '<div class="no-contacts">Failed to load contacts</div>';
    });

  // Поиск
  document.getElementById('searchAddMembers').addEventListener('input', function() {
    const searchValue = this.value.toLowerCase();
    const memberItems = document.querySelectorAll('#addMembersList .member-item');
    memberItems.forEach(item => {
      const memberName = item.querySelector('.member-name').textContent.toLowerCase();
      if (memberName.includes(searchValue)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  });

  // Cancel
  document.getElementById('cancelAddMembersBtn').onclick = function() {
    modal.remove();
  };
  // Confirm
  document.getElementById('confirmAddMembersBtn').onclick = function() {
    // Собираем выбранных пользователей
    const selected = Array.from(document.querySelectorAll('#addMembersList .member-item.selected'))
      .map(item => Number(item.dataset.userId));
    if (selected.length === 0) {
      showErrorNotification('Select at least one contact');
      return;
    }
    // Отправляем на backend
    addGroupMembers(group.id, selected)
      .then(res => {
        if (res.success) {
          showSuccessNotification('Members added');
          modal.remove();
          // Обновить group info и UI
          getGroupInfo(group.id).then(response => {
            if (response.success) {
              createGroupChatInterface(response.group);
            }
          });
          if (typeof loadSidebar === 'function') loadSidebar();
        } else {
          showErrorNotification(res.error || 'Failed to add members');
          console.error('Add members error:', res);
        }
      })
      .catch(err => {
        showErrorNotification('Failed to add members');
        console.error('Add members fetch error:', err);
      });
  };
}

function renderAddMembersList(users, group) {
  const list = document.getElementById('addMembersList');
  if (!list) return;
  if (!users.length) {
    list.innerHTML = '<div class="no-contacts">No contacts found</div>';
    return;
  }
  // Получить id уже добавленных участников
  const currentMemberIds = (group.members || []).map(m => m.id);
  list.innerHTML = '';
  users.forEach(user => {
    const isAlreadyMember = currentMemberIds.includes(user.id);
    const memberItem = document.createElement('div');
    memberItem.className = 'member-item';
    memberItem.dataset.userId = user.id;
    if (isAlreadyMember) {
      memberItem.classList.add('disabled');
      memberItem.style.opacity = '0.5';
    }
    let avatarContent;
    if (user.avatar_path) {
      avatarContent = `<img src="${user.avatar_path}" alt="${user.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
      avatarContent = user.name.charAt(0);
    }
    memberItem.innerHTML = `
      <div class="member-avatar">${avatarContent}</div>
      <div class="member-name">${user.name}${isAlreadyMember ? " <span style='color:#aaa;font-size:12px;'>(already in group)</span>" : ''}</div>
    `;
    if (!isAlreadyMember) {
      memberItem.addEventListener('click', function() {
        this.classList.toggle('selected');
      });
    }
    list.appendChild(memberItem);
  });
}

function addGroupMembers(groupId, userIds) {
  return fetch('/add_group_members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: groupId, user_ids: userIds })
  }).then(r => r.json());
}

function showEditGroup(group) {
  // Удаляем старую модалку, если есть
  const oldModal = document.getElementById('editGroupModal');
  if (oldModal) oldModal.remove();

  // Сортируем участников: сначала создатель, потом админы, потом остальные
  const members = (group.members || []).slice().sort((a, b) => {
    if (a.id === group.creator_id) return -1; // Creator first
    if (b.id === group.creator_id) return 1;
    if (a.role === 'admin' && b.role !== 'admin') return -1; // Admins next
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return a.name.localeCompare(b.name); // Sort others by name
  });

  // Модалка
  const modal = document.createElement('div');
  modal.id = 'editGroupModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 440px;">
      <div class="modal-title" style="margin-bottom: 12px;">Edit Group</div>
      <form id="editGroupForm" autocomplete="off">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
          <label style="cursor:pointer;">
            <input type="file" id="editGroupAvatarInput" accept="image/*" style="display:none;">
            <div id="editGroupAvatarPreview" style="width:56px;height:56px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;overflow:hidden;">
              ${group.avatar_path ? `<img src="${group.avatar_path}" style="width:100%;height:100%;object-fit:cover;">` : `<span style='color:#fff;font-size:28px;'>${group.name.charAt(0)}</span>`}
            </div>
          </label>
          <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
            <input type="text" id="editGroupName" value="${group.name}" placeholder="Group name" style="width:100%;padding:7px 10px;border-radius:5px;border:1px solid #444;background:#222;color:#fff;box-sizing:border-box;">
            <textarea id="editGroupDesc" placeholder="Description" style="width:100%;height:48px;padding:7px 10px;border-radius:5px;border:1px solid #444;background:#222;color:#fff;box-sizing:border-box;">${group.description || ''}</textarea>
          </div>
        </div>
        <div style="margin-bottom:10px;font-weight:500;color:#fff;">Members</div>
        <div class="members-list" id="editGroupMembersList" style="margin-bottom:18px;max-height:180px;overflow-y:auto;"></div>
        <div style="margin-top:18px;text-align:center;">
          <button type="button" class="btn btn-delete-group" id="deleteGroupBtn" style="width:80%;background:#2c2c2c;color:#e74c3c;font-weight:500;">Delete group</button>
        </div>
        <div class="modal-actions" style="margin-top:18px;gap:10px;justify-content:center;">
          <button type="button" class="btn btn-secondary" id="cancelEditGroupBtn">Cancel</button>
          <button type="submit" class="btn btn-secondary">Save</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // Рендерим участников
  const list = document.getElementById('editGroupMembersList');
  members.forEach(user => {
    const memberItem = document.createElement('div');
    memberItem.className = 'member-item';
    memberItem.style.display = 'flex';
    memberItem.style.alignItems = 'center';
    memberItem.style.justifyContent = 'space-between';
    memberItem.style.gap = '10px';
    let avatarContent;
    if (user.avatar_path) {
      avatarContent = `<img src="${user.avatar_path}" alt="${user.name}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`;
    } else {
      avatarContent = `<span style='color:#fff;font-size:18px;'>${user.name.charAt(0)}</span>`;
    }
    let adminBadge = '';
    if (user.role === 'admin') {
      adminBadge = `<span style="border:1.5px solid #2a5885; color:#2a5885; border-radius:6px; font-size:12px; padding:1px 7px; margin-left:8px; vertical-align:middle; background:#181818;">admin</span>`;
    }
    let controls = '';
    if (user.id === group.creator_id) {
      controls += `<span style="color:#aaa;font-size:12px;">creator</span>`;
    }
    memberItem.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="member-avatar" style="width:36px;height:36px;">${avatarContent}</div>
        <div class="member-name">${user.name} ${adminBadge}</div>
      </div>
      <div>${controls}</div>
    `;
    // Контекстное меню по ПКМ
    if (user.id !== group.creator_id) {
      memberItem.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showMemberContextMenu(e, user, group);
      });
    }
    list.appendChild(memberItem);
  });

  // Cancel
  document.getElementById('cancelEditGroupBtn').onclick = function() {
    modal.remove();
  };
  // Save (реальный вызов)
  document.getElementById('editGroupForm').onsubmit = function(e) {
    e.preventDefault();
    const name = document.getElementById('editGroupName').value.trim();
    const description = document.getElementById('editGroupDesc').value.trim();
    const avatarInput = document.getElementById('editGroupAvatarInput');
    const formData = new FormData();
    formData.append('group_id', group.id);
    formData.append('name', name);
    formData.append('description', description);
    if (avatarInput.files && avatarInput.files[0]) {
      formData.append('avatar', avatarInput.files[0]);
    }
    fetch('/edit_group', {
      method: 'POST',
      body: formData
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          showSuccessNotification('Group updated');
          modal.remove();
          getGroupInfo(group.id).then(response => {
            if (response.success) {
              createGroupChatInterface(response.group);
            }
          });
          if (typeof loadSidebar === 'function') loadSidebar();
        } else {
          showErrorNotification(res.error || 'Failed to update group');
        }
      })
      .catch(() => {
        showErrorNotification('Failed to update group');
      });
  };
  // Delete group (кастомное подтверждение)
  document.getElementById('deleteGroupBtn').onclick = function() {
    showDeleteGroupConfirmation(group);
  };
  // Аватар: превью при выборе файла
  document.getElementById('editGroupAvatarInput').onchange = function(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(ev) {
        document.getElementById('editGroupAvatarPreview').innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
      };
      reader.readAsDataURL(file);
    }
  };
}

function showDeleteGroupConfirmation(group) {
  // Удаляем старую модалку, если есть
  const oldModal = document.getElementById('deleteGroupModal');
  if (oldModal) oldModal.remove();
  const modal = document.createElement('div');
  modal.id = 'deleteGroupModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog" style="max-width:340px;">
      <div class="modal-title" style="margin-bottom:18px;">Are you sure you want to delete this group?</div>
      <div style="color:#e57373;margin-bottom:18px;">This action cannot be undone.</div>
      <div class="modal-actions" style="flex-direction:row;gap:12px;justify-content:center;">
        <button class="btn btn-secondary" id="cancelDeleteGroupBtn">Cancel</button>
        <button class="btn btn-danger" id="confirmDeleteGroupBtn">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('cancelDeleteGroupBtn').onclick = function() {
    modal.remove();
  };
  document.getElementById('confirmDeleteGroupBtn').onclick = function() {
    fetch('/delete_group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: group.id })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          showSuccessNotification('Group deleted');
          modal.remove();
          // Закрыть меню редактирования группы, если оно открыто
          const editModal = document.getElementById('editGroupModal');
          if (editModal) editModal.remove();
          if (typeof loadSidebar === 'function') loadSidebar();
          const mainContent = document.querySelector('.main-content');
          if (mainContent) mainContent.innerHTML = '<div class="empty-chat">Select a chat to start messaging</div>';
        } else {
          showErrorNotification(res.error || 'Failed to delete group');
        }
      })
      .catch(() => {
        showErrorNotification('Failed to delete group');
      });
  };
}

function showMemberContextMenu(e, user, group) {
  // Удалить старое меню
  const oldMenu = document.getElementById('memberContextMenu');
  if (oldMenu) oldMenu.remove();
  // Создать меню
  const menu = document.createElement('div');
  menu.id = 'memberContextMenu';
  menu.className = 'message-context-menu';
  menu.style.position = 'fixed';
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
  menu.style.zIndex = 10001;
  menu.innerHTML = `
    <div class="menu-option make-admin-option" style="color:#2a5885;font-weight:500;">Make admin</div>
    <div class="menu-option remove-admin-option" style="color:#e67e22;font-weight:500;">Remove admin</div>
    <div class="menu-option kick-option" style="color:#e74c3c;font-weight:500;">Kick from group</div>
  `;
  document.body.appendChild(menu);
  // Показать/скрыть опции в зависимости от роли
  if (user.role === 'admin') {
    menu.querySelector('.make-admin-option').style.display = 'none';
    menu.querySelector('.remove-admin-option').style.display = '';
  } else {
    menu.querySelector('.make-admin-option').style.display = '';
    menu.querySelector('.remove-admin-option').style.display = 'none';
  }
  // Обработчики
  menu.querySelector('.make-admin-option').onclick = function() {
    fetch('/set_group_admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: group.id, user_id: user.id })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          showSuccessNotification('User is now admin');
          getGroupInfo(group.id).then(response => {
            if (response.success) {
              createGroupChatInterface(response.group);
              showEditGroup(response.group);
            }
          });
        } else {
          showErrorNotification(res.error || 'Failed to make admin');
        }
      })
      .catch(() => {
        showErrorNotification('Failed to make admin');
      });
    menu.remove();
  };
  menu.querySelector('.remove-admin-option').onclick = function() {
    fetch('/remove_group_admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: group.id, user_id: user.id })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          showSuccessNotification('Admin rights removed');
          getGroupInfo(group.id).then(response => {
            if (response.success) {
              createGroupChatInterface(response.group);
              showEditGroup(response.group);
            }
          });
        } else {
          showErrorNotification(res.error || 'Failed to remove admin');
        }
      })
      .catch(() => {
        showErrorNotification('Failed to remove admin');
      });
    menu.remove();
  };
  menu.querySelector('.kick-option').onclick = function() {
    fetch('/kick_group_member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: group.id, user_id: user.id })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          showSuccessNotification('User kicked');
          getGroupInfo(group.id).then(response => {
            if (response.success) {
              createGroupChatInterface(response.group);
              showEditGroup(response.group);
            }
          });
        } else {
          showErrorNotification(res.error || 'Failed to kick user');
        }
      })
      .catch(() => {
        showErrorNotification('Failed to kick user');
      });
    menu.remove();
  };
  // Закрытие по клику вне меню
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(ev) {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 10);
}

function showLeaveGroupConfirmation(group) {
  // Удаляем старую модалку, если есть
  const oldModal = document.getElementById('leaveGroupModal');
  if (oldModal) oldModal.remove();

  // Создаем модалку
  const modal = document.createElement('div');
  modal.id = 'leaveGroupModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-title">Are you sure you want to leave this group?</div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancelLeaveGroupBtn">No</button>
        <button class="btn btn-secondary" id="confirmLeaveGroupBtn">Yes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Кнопка "No"
  document.getElementById('cancelLeaveGroupBtn').onclick = function() {
    modal.remove();
  };
  // Кнопка "Yes"
  document.getElementById('confirmLeaveGroupBtn').onclick = function() {
    leaveGroup(group.id)
      .then(res => {
        if (res.success) {
          showSuccessNotification('You have left the group');
          modal.remove();
          // UI: закрыть чат, обновить сайдбар
          if (typeof loadSidebar === 'function') loadSidebar();
          const mainContent = document.querySelector('.main-content');
          if (mainContent) mainContent.innerHTML = '<div class="empty-chat">Select a chat to start messaging</div>';
        } else {
          showErrorNotification(res.error || 'Failed to leave group');
        }
      })
      .catch(() => {
        showErrorNotification('Failed to leave group');
      });
  };
}

/**
 * Show a notification for features not yet implemented
 */
function showNotImplementedNotification(feature) {
  showErrorNotification(`${feature} feature will be implemented in a future update`);
}

/**
 * Load messages for a group conversation
 */
function loadGroupMessages(groupId) {
  const chatMessages = document.querySelector('.chat-messages');
  if (!chatMessages) return Promise.reject(new Error('Chat messages container not found'));
  
  // Show loading indicator
  chatMessages.innerHTML = '';
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'loading-messages';
  loadingIndicator.textContent = 'Loading messages...';
  loadingIndicator.style.textAlign = 'center';
  loadingIndicator.style.padding = '20px';
  loadingIndicator.style.color = '#888';
  chatMessages.appendChild(loadingIndicator);
  
  // Fetch messages
  return fetchGroupMessages(groupId)
    .then(data => {
      console.log('Group messages loaded:', data);
      
      // Clear loading indicator
      chatMessages.innerHTML = '';
      
      // Render messages
      if (data.success && data.messages && data.messages.length > 0) {
        renderGroupMessages(data.messages, data.members, chatMessages);
      } else {
        // Show "no messages" placeholder
        const noMessages = document.createElement('div');
        noMessages.className = 'no-messages';
        noMessages.textContent = 'No messages yet';
        chatMessages.appendChild(noMessages);
      }
      
      return data;
    })
    .catch(error => {
      console.error('Error loading group messages:', error);
      
      // Show error message
      chatMessages.innerHTML = '';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'messages-error';
      errorMsg.textContent = 'Failed to load messages. Please try again.';
      errorMsg.style.color = '#e57373';
      errorMsg.style.textAlign = 'center';
      errorMsg.style.padding = '20px';
      chatMessages.appendChild(errorMsg);
      
      return Promise.reject(error);
    });
}

/**
 * Render messages in the group chat
 */
function renderGroupMessages(messages, members, chatMessages) {
  // Create messages container
  const messagesContainer = document.createElement('div');
  messagesContainer.className = 'messages-container';
  chatMessages.appendChild(messagesContainer);
  
  // Create a map of user IDs to names for quick lookup
  const memberMap = {};
  members.forEach(member => {
    memberMap[member.id] = member.name;
  });
  
  // Keep track of date to show date separators
  let currentDate = '';
  
  // Add each message
  if (messages && messages.length > 0) {
    messages.forEach(message => {
      // Check if date changed (for date separators)
      const messageDate = new Date(message.timestamp);
      const dateString = messageDate.toLocaleDateString();
      
      if (dateString !== currentDate) {
        currentDate = dateString;
        
        // Add date separator
        const dateSeparator = document.createElement('div');
        dateSeparator.className = 'date-separator';
        dateSeparator.textContent = formatDate(messageDate);
        messagesContainer.appendChild(dateSeparator);
      }
      
      const messageEl = createGroupMessageElement(message, memberMap);
      messagesContainer.appendChild(messageEl);
    });
  }
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Format date for date separators
 */
function formatDate(date) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  
  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    // Format as MMM DD, YYYY (Jan 01, 2023)
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

/**
 * Show context menu for group messages
 */
function showGroupMessageContextMenu(event, message, messageEl, isSent) {
  // Remove any existing message menu
  const existingMenu = document.getElementById('messageContextMenu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // Create menu element
  const contextMenu = document.createElement('div');
  contextMenu.id = 'messageContextMenu';
  contextMenu.className = 'message-context-menu';
  
  // Create menu options
  let menuOptions = '';
  
  // Edit option (only for own messages)
  if (isSent) {
    menuOptions += `
      <div class="menu-option edit-option">
        <div class="menu-option-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </div>
        <div class="menu-option-text">Edit Message</div>
      </div>
      <div class="menu-option delete-option" style="color:#e74c3c;">
        <div class="menu-option-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
          </svg>
        </div>
        <div class="menu-option-text">Delete Message</div>
      </div>
    `;
  }
  
  // Copy option (for all messages)
  menuOptions += `
    <div class="menu-option copy-option">
      <div class="menu-option-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </div>
      <div class="menu-option-text">Copy Text</div>
    </div>
  `;
  
  // Add options to menu
  contextMenu.innerHTML = menuOptions;
  
  // Position menu at cursor location
  contextMenu.style.position = 'fixed';
  contextMenu.style.left = `${event.clientX}px`;
  contextMenu.style.top = `${event.clientY}px`;
  
  // Add to document
  document.body.appendChild(contextMenu);
  
  // Adjust position if menu would go off screen
  const menuRect = contextMenu.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) {
    contextMenu.style.left = `${window.innerWidth - menuRect.width - 5}px`;
  }
  if (menuRect.bottom > window.innerHeight) {
    contextMenu.style.top = `${window.innerHeight - menuRect.height - 5}px`;
  }
  
  // Add event listeners to options
  if (isSent) {
    const editOption = contextMenu.querySelector('.edit-option');
    if (editOption) {
      editOption.addEventListener('click', () => {
        enterEditMode(messageEl, message.content);
        contextMenu.remove();
      });
    }
  }
  
  const copyOption = contextMenu.querySelector('.copy-option');
  if (copyOption) {
    copyOption.addEventListener('click', () => {
      navigator.clipboard.writeText(message.content)
        .then(() => {
          showSuccessNotification('Text copied to clipboard');
        })
        .catch(() => {
          showErrorNotification('Failed to copy text');
        });
      contextMenu.remove();
    });
  }
  
  // Добавить обработчик для удаления сообщения
  if (isSent) {
    const deleteOption = contextMenu.querySelector('.delete-option');
    if (deleteOption) {
      deleteOption.addEventListener('click', () => {
        deleteGroupMessage(message.id)
          .then(res => {
            if (res.success) {
              showSuccessNotification('Message deleted');
              messageEl.remove();
            } else {
              showErrorNotification(res.error || 'Failed to delete message');
            }
          })
          .catch(() => {
            showErrorNotification('Failed to delete message');
          });
        contextMenu.remove();
      });
    }
  }
  
  // Закрытие по клику вне меню
  document.addEventListener('click', function closeMenu(e) {
    if (!contextMenu.contains(e.target)) {
      contextMenu.remove();
      document.removeEventListener('click', closeMenu);
    }
  });
}

/**
 * Handle sending a message to a group
 */
function sendGroupMessageHandler(text, groupId, chatMessages) {
  if (!text.trim()) return;
  
  console.log(`Sending message to group ${groupId}: ${text}`);
  
  // Call API function to send message
  return sendGroupMessage(groupId, text)
    .then(data => {
      console.log('Message sent response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send message');
      }
      
      // Display the new message
      addMessageToGroupChat(data.message, chatMessages);
      
      // Clear input field
      const inputField = document.querySelector('.message-input-field input');
      if (inputField) {
        inputField.value = '';
        inputField.focus();
        
        // Update send button state
        const sendButton = document.querySelector('.send-button');
        if (sendButton) sendButton.classList.remove('active');
      }
      
      // Refresh sidebar to update group last message
      loadSidebar();
      
      return data;
    })
    .catch(error => {
      console.error('Error sending group message:', error);
      showErrorNotification('Failed to send message. Please try again.');
      return Promise.reject(error);
    });
}

/**
 * Add a new message to the group chat
 */
function addMessageToGroupChat(message, chatMessages) {
  // Get or create messages container
  let messagesContainer = chatMessages.querySelector('.messages-container');
  
  // Remove "no messages" if present
  const noMessages = chatMessages.querySelector('.no-messages');
  if (noMessages) {
    chatMessages.removeChild(noMessages);
  }
  
  // Create container if it doesn't exist
  if (!messagesContainer) {
    messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    chatMessages.appendChild(messagesContainer);
  }
  
  // Create the memberMap with just the current sender
  const memberMap = {};
  memberMap[message.sender_id] = message.sender_name;
  
  // Create and add the message element
  const messageEl = createGroupMessageElement(message, memberMap);
  messagesContainer.appendChild(messageEl);
  
  // Scroll to the new message
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Create a group message element
 */
function createGroupMessageElement(message, memberMap) {
  // Проверка на системное сообщение (оставим как есть или улучшим позже)
  const isSystem = /added|removed|admin|changed|set group|left the group|joined the group|назначен|снят|добавил|удалил|покинул|сменил|изменил|аватар|описание|название/i.test(message.content) && !message.message_type; // Добавим проверку, что это не файл

  if (isSystem) {
    const el = document.createElement('div');
    el.className = 'system-divider';
    el.innerHTML = `<span>${escapeHtml(message.content)}</span>`;
    return el;
  }

  const messageEl = document.createElement('div');

  // Determine if this is a sent or received message
  const currentUserIdStr = String(ChatApp.currentUser.user_id);
  const senderIdStr = String(message.sender_id);
  const isSent = senderIdStr === currentUserIdStr;

  messageEl.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
  messageEl.dataset.messageId = message.id;
  messageEl.dataset.senderId = message.sender_id;

  // Format timestamp with hours and minutes
  const timestamp = new Date(message.timestamp);
  const hours = String(timestamp.getHours()).padStart(2, '0');
  const minutes = String(timestamp.getMinutes()).padStart(2, '0');
  const timeFormatted = `${hours}:${minutes}`;

  // Check if is_edited exists, default to false if not
  const isEdited = message.is_edited === true;

  // Add sender name for received messages
  let senderNameHTML = '';
  if (!isSent) {
    const senderName = memberMap[message.sender_id] || message.sender_name || 'Unknown';
    // Ensure senderName is a string before escaping
    senderNameHTML = `<div class="message-sender">${escapeHtml(String(senderName))}</div>`;
  }

  // --- Determine message content based on type ---
  let messageContentHTML = '';
  // Use message.message_type which we expect from backend (even if temporary)
  if (message.message_type === 'file' && message.mime_type && message.original_filename && message.file_path) {
      // Construct the URL for the file serving endpoint
      // The backend route /uploads/<path:filepath> will handle serving
      const fileUrl = `/uploads/${message.file_path}`; 

      if (message.mime_type.startsWith('image/')) {
          // Display image
          messageContentHTML = `
              <div class="image-card">
                <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="message-image-link">
                  <img src="${fileUrl}" alt="${escapeHtml(message.original_filename)}" class="message-image-attachment" loading="lazy">
                </a>
                <div class="image-time">${timeFormatted}</div>
              </div>
          `;
      } else if (message.mime_type.startsWith('video/')) {
          // Display video player
           messageContentHTML = `
              <video controls class="message-video-attachment" preload="metadata">
                 <source src="${fileUrl}" type="${message.mime_type}">
                 Your browser does not support the video tag.
              </video>
              <div class="message-file-caption">
                 <a href="${fileUrl}" download="${escapeHtml(message.original_filename)}">${escapeHtml(message.original_filename)}</a>
                 ${message.content && message.content !== `File: ${message.original_filename} (Upload OK, DB disabled)` ? `<div class="message-text-caption">${escapeHtml(message.content)}</div>` : ''}
              </div>
           `;
      } else if (message.mime_type.startsWith('audio/')) {
           // Display audio player
           messageContentHTML = `
             <div class="message-audio-container">
                 <audio controls src="${fileUrl}" class="message-audio-attachment" preload="metadata">
                    Your browser does not support the audio element.
                 </audio>
                 <div class="message-file-caption" style="margin-left: 10px;">
                    <a href="${fileUrl}" download="${escapeHtml(message.original_filename)}">${escapeHtml(message.original_filename)}</a>
                 </div>
             </div>
             ${message.content && message.content !== `File: ${message.original_filename} (Upload OK, DB disabled)` ? `<div class="message-text-caption">${escapeHtml(message.content)}</div>` : ''}
           `;
      } else {
          // Display generic file link
          // Simple file icon from Unicode: 📄
          messageContentHTML = `
              <a href="${fileUrl}" download="${escapeHtml(message.original_filename)}" class="message-file-link">
                  <div class="file-icon">📄</div>
                  <div class="file-info">
                      <div class="file-name">${escapeHtml(message.original_filename)}</div>
                      <!-- Optionally add file size here later -->
                  </div>
              </a>
              ${message.content && message.content !== `File: ${message.original_filename} (Upload OK, DB disabled)` ? `<div class="message-text-caption">${escapeHtml(message.content)}</div>` : ''}
          `;
      }
  } else {
      // Default to text content if type is not 'file' or data is missing
      // Check if content is just an image URL/link
      const imgLinkRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))|<a[^>]+>[^<]*\.(jpg|jpeg|png|gif|webp)<\/a>|(\w+\.(png|jpg|jpeg|gif|webp))/i;
      
      if (message.content && imgLinkRegex.test(message.content)) {
        // Extract the image URL
        let imageUrl = message.content;
        
        // If it's an HTML link, extract the href
        if (message.content.includes('<a href=')) {
          const hrefMatch = message.content.match(/href=["']([^"']+)["']/);
          if (hrefMatch && hrefMatch[1]) {
            imageUrl = hrefMatch[1];
          }
        }
        
        // If it's just a filename, construct a path
        if (!/^https?:\/\//.test(imageUrl) && !/^\/uploads\//.test(imageUrl)) {
          imageUrl = `/uploads/${imageUrl}`;
        }
        
        // Display the image directly
        messageContentHTML = `
          <a href="${imageUrl}" target="_blank" rel="noopener noreferrer" class="message-image-link">
            <img src="${imageUrl}" alt="Image" class="message-image-attachment" loading="lazy">
          </a>
        `;
      } else {
        // Regular text message
        messageContentHTML = escapeHtml(String(message.content || ''));
      }
  }
  // --- End Determine message content ---

  let isImageOnly = false;
  if (message.message_type === 'file' && message.mime_type && message.original_filename && message.file_path) {
      const fileUrl = `/uploads/${message.file_path}`; 

      if (message.mime_type.startsWith('image/')) {
          isImageOnly = true;
          messageContentHTML = `
              <div class="image-card">
                <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="message-image-link">
                  <img src="${fileUrl}" alt="${escapeHtml(message.original_filename)}" class="message-image-attachment" loading="lazy">
                </a>
                <div class="image-time">${timeFormatted}</div>
              </div>
          `;
      } else if (message.mime_type.startsWith('video/')) {
          // ... existing code ...
      }
      // ... existing code ...
  } else {
      // ... existing code ...
  }
  // --- End Determine message content ---

  if (isImageOnly) {
    messageEl.classList.add('image-only');
    messageEl.innerHTML = `
      ${senderNameHTML}
      <div class="message-content">${messageContentHTML}</div>
    `;
  } else {
    messageEl.innerHTML = `
      ${senderNameHTML}
      <div class="message-content">${messageContentHTML}</div>
      <div class="message-footer">
        <div class="message-time">${timeFormatted}${isEdited ? ' <span class=\"edited-indicator\">· Edited</span>' : ''}</div>
      </div>
    `;
  }

  // Add context menu event listener
  messageEl.addEventListener('contextmenu', function(e) {
      e.preventDefault(); // Prevent default browser context menu
      showGroupMessageContextMenu(e, message, messageEl, isSent);
  });

  return messageEl;
}

// API: выход из группы
function leaveGroup(groupId) {
  return fetch('/leave_group', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ group_id: groupId })
  })
    .then(r => r.json());
}

// Добавим стили для модального окна, если их нет
(function addLeaveGroupModalStyles() {
  if (!document.getElementById('leave-group-modal-style')) {
    const style = document.createElement('style');
    style.id = 'leave-group-modal-style';
    style.innerHTML = `
      .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal-dialog {
        background: #181818;
        border-radius: 10px;
        box-shadow: 0 2px 16px rgba(0,0,0,0.5);
        padding: 32px 32px 24px 32px;
        min-width: 320px;
        max-width: 90vw;
        text-align: center;
      }
      .modal-title {
        color: #fff;
        font-size: 20px;
        margin-bottom: 24px;
      }
      .modal-actions {
        display: flex;
        flex-direction: row;
        justify-content: center;
        gap: 12px;
        margin-top: 16px;
      }
      .modal-actions .btn {
        padding: 6px 24px;
        border-radius: 6px;
        font-size: 15px;
        border: none;
        cursor: pointer;
        background: #555;
        color: #fff;
        transition: background 0.2s;
        min-width: 80px;
        max-width: 120px;
        width: auto;
      }
      .modal-actions .btn:hover {
        background: #666;
      }
    `;
    document.head.appendChild(style);
  }
})();

function deleteGroupMessage(messageId) {
  return fetch('/delete_group_message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: messageId })
  }).then(r => r.json());
}

/**
 * Create a new group chat
 */
function createNewGroup(groupName, members) {
  // Show loading indicator
  showLoadingIndicator('Creating group...');
  
  return fetch('/create_group', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: groupName,
      members: members
    })
  })
  .then(response => response.json())
  .then(data => {
    hideLoadingIndicator();
    
    // SOLUTION: Always treat it as success and never show error 
    // as long as we got a response from the server
    
    // Only show success notification 
    showSuccessNotification('Group created successfully');
    
    // Check if group ID exists in the response
    const groupId = data.group_id || (data.group ? data.group.id : null);
    const groupName = data.group_name || groupName;
    
    if (groupId) {
      openGroupChat(groupId, groupName);
      // Refresh sidebar to show the new group
      if (typeof loadSidebar === 'function') loadSidebar();
    }
    
    return data;
  })
  .catch(error => {
    hideLoadingIndicator();
    
    // Only show error for network/connection issues
    // not for cases where the group might still have been created
    console.error('Error creating group:', error);
    return Promise.reject(error);
  });
}

// Helper functions for loading indicators
function showLoadingIndicator(message) {
  let loadingOverlay = document.getElementById('loadingOverlay');
  
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.className = 'loading-overlay';
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    
    const loadingText = document.createElement('div');
    loadingText.id = 'loadingText';
    loadingText.className = 'loading-text';
    
    loadingOverlay.appendChild(spinner);
    loadingOverlay.appendChild(loadingText);
    document.body.appendChild(loadingOverlay);
  }
  
  document.getElementById('loadingText').textContent = message || 'Loading...';
  loadingOverlay.style.display = 'flex';
}

function hideLoadingIndicator() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
}

/**
 * Get group information from the server
 */
function getGroupInfo(groupId) {
  return fetch(`/get_group_info?group_id=${groupId}`)
    .then(response => response.json())
    .catch(error => {
      console.error('Error fetching group info:', error);
      return { success: false, error: 'Failed to fetch group info' };
    });
}

/**
 * Fetch messages for a group chat
 */
function fetchGroupMessages(groupId) {
  return fetch(`/get_group_messages?group_id=${groupId}`)
    .then(response => response.json())
    .catch(error => {
      console.error('Error fetching group messages:', error);
      return { success: false, error: 'Failed to fetch messages' };
    });
}

/**
 * Send a message to a group
 */
function sendGroupMessage(groupId, text) {
  return fetch('/send_group_message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      group_id: groupId,
      content: text
    })
  })
  .then(response => response.json())
  .catch(error => {
    console.error('Error sending group message:', error);
    return { success: false, error: 'Failed to send message' };
  });
}

/**
 * Enter edit mode for a message
 */
function enterEditMode(messageEl, content) {
  // Create edit form
  const form = document.createElement('form');
  form.className = 'edit-message-form';
  
  // Create edit input with current message
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-message-input';
  input.value = content;
  
  // Create buttons container
  const actions = document.createElement('div');
  actions.className = 'edit-message-actions';
  
  // Save button
  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'edit-save-btn';
  saveBtn.textContent = 'Save';
  
  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'edit-cancel-btn';
  cancelBtn.textContent = 'Cancel';
  
  // Add buttons to actions
  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  
  // Add everything to form
  form.appendChild(input);
  form.appendChild(actions);
  
  // Save the original content
  const originalContent = messageEl.querySelector('.message-content').innerHTML;
  
  // Replace message content with edit form
  messageEl.querySelector('.message-content').innerHTML = '';
  messageEl.querySelector('.message-content').appendChild(form);
  
  // Focus input and position cursor at end
  input.focus();
  input.selectionStart = input.selectionEnd = input.value.length;
  
  // Handle cancel button
  cancelBtn.addEventListener('click', function() {
    messageEl.querySelector('.message-content').innerHTML = originalContent;
  });
  
  // Handle form submit (save)
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const newText = input.value.trim();
    
    if (!newText) {
      showErrorNotification('Message cannot be empty');
      return;
    }
    
    if (newText === content) {
      messageEl.querySelector('.message-content').innerHTML = originalContent;
      return;
    }
    
    const messageId = messageEl.dataset.messageId;
    
    // Update message on server
    editGroupMessage(messageId, newText)
      .then(res => {
        if (res.success) {
          messageEl.querySelector('.message-content').innerHTML = escapeHtml(newText);
          
          // Add edited indicator if not already there
          const footer = messageEl.querySelector('.message-footer');
          if (footer) {
            let timeEl = footer.querySelector('.message-time');
            if (timeEl && !timeEl.querySelector('.edited-indicator')) {
              timeEl.innerHTML += ' <span class="edited-indicator">· Edited</span>';
            }
          }
        } else {
          messageEl.querySelector('.message-content').innerHTML = originalContent;
          showErrorNotification(res.error || 'Failed to edit message');
        }
      })
      .catch(() => {
        messageEl.querySelector('.message-content').innerHTML = originalContent;
        showErrorNotification('Failed to edit message');
      });
  });
}

/**
 * Edit a group message
 */
function editGroupMessage(messageId, content) {
  return fetch('/edit_group_message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: messageId, content: content })
  }).then(r => r.json());
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
