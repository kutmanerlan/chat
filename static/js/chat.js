/**
 * Chat interface and message display functions
 */

/**
 * Open a chat with a user
 * @param {number} userId - the ID of the user to chat with
 * @param {string} userName - the name of the user to chat with
 */
function openChat(userId, userName) {
  console.log(`Opening chat with ${userName} (${userId})`);
  
  // Store the current chat info in application state
  ChatApp.currentChat = {
    userId: userId,
    userName: userName
  };
  
  // Get container for chat
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) {
    console.error('Main content container not found');
    return;
  }
  
  // Clear any existing chat
  mainContent.innerHTML = '';
  
  // Check if user is blocked
  checkBlockStatus(userId)
    .then(blockStatus => {
      // Create chat UI
      createChatUI(userId, userName, blockStatus);
      
      // Load messages
      loadMessages(userId);
      
      // Update active chat in sidebar
      updateActiveChatInSidebar(userId);
      
      // Mark chat as active
      markChatAsActive(userId);
    })
    .catch(error => {
      console.error('Error checking block status:', error);
      // Create chat UI without block info
      createChatUI(userId, userName, {
        is_blocked_by_you: false,
        has_blocked_you: false
      });
      
      // Load messages anyway
      loadMessages(userId);
      
      // Update active chat in sidebar
      updateActiveChatInSidebar(userId);
      
      // Mark chat as active
      markChatAsActive(userId);
    });
}

/**
 * Highlight the active contact in the sidebar
 */
function highlightActiveContact(userId) {
  // Remove active class from all contacts
  document.querySelectorAll('.contact-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Find and highlight contact
  const contactElement = document.querySelector(`.contact-item[data-contact-id="${userId}"], .contact-item[data-user-id="${userId}"]`);
  if (contactElement) {
    contactElement.classList.add('active');
    
    // Remove unread badge if exists
    const badge = contactElement.querySelector('.unread-badge');
    if (badge) contactElement.removeChild(badge);
  }
}

/**
 * Create the chat UI
 * @param {number} userId - ID of the user to chat with
 * @param {string} userName - Name of the user to chat with
 * @param {Object} blockStatus - Block status object
 */
function createChatUI(userId, userName, blockStatus) {
  // Get user info from the server for complete details
  getUserInfo(userId)
    .then(user => {
      // Mark this chat as the active chat
      ChatApp.activeChat = {
        id: userId,
        name: userName
      };
      
      // Create chat interface with user info
      createChatInterface(user, {
        isBlocked: blockStatus.is_blocked_by_you,
        hasBlockedYou: blockStatus.has_blocked_you
      });
      
      // Start polling for new messages
      startMessagePolling(userId);
    })
    .catch(error => {
      console.error('Error getting user info:', error);
      
      // Create chat interface with basic info
      createChatInterface({
        id: userId,
        name: userName,
        avatar_path: null
      }, {
        isBlocked: blockStatus.is_blocked_by_you,
        hasBlockedYou: blockStatus.has_blocked_you
      });
      
      // Start polling for new messages
      startMessagePolling(userId);
    });
}

/**
 * Create the chat interface
 */
function createChatInterface(user, blockStatus) {
  console.log('Creating chat interface for:', user);
  
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) {
    console.error('Main content container not found');
    return;
  }
  
  // Clear existing content
  mainContent.innerHTML = '';
  
  // Determine if messaging is blocked
  const isBlocked = blockStatus.isBlocked || blockStatus.hasBlockedYou;
  const blockMessage = blockStatus.isBlocked ? 
    `You have blocked ${user.name}` : 
    blockStatus.hasBlockedYou ? `${user.name} has blocked you` : '';
  
  // Create header
  const chatHeader = document.createElement('div');
  chatHeader.className = 'chat-header';
  
  // User info section
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
  
  // User name
  const userName = document.createElement('div');
  userName.className = 'chat-user-name';
  userName.textContent = user.name;
  
  // Menu button (three dots menu)
  const menuButton = document.createElement('button');
  menuButton.className = 'chat-menu-btn';
  menuButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="5" r="2"></circle>
      <circle cx="12" cy="12" r="2"></circle>
      <circle cx="12" cy="19" r="2"></circle>
    </svg>
  `;
  
  // Add click handler for menu button
  menuButton.addEventListener('click', function(e) {
    e.stopPropagation(); // Prevent click from bubbling to document
    showChatMenu(this, user);
  });
  
  // Assemble the header
  userInfo.appendChild(userAvatar);
  userInfo.appendChild(userName);
  chatHeader.appendChild(userInfo);
  chatHeader.appendChild(menuButton);
  
  // Messages area
  const chatMessages = document.createElement('div');
  chatMessages.className = 'chat-messages';
  
  // Message input area
  const messageInputContainer = document.createElement('div');
  messageInputContainer.className = 'message-input-container';
  
  if (isBlocked) {
    // Show blocked state
    messageInputContainer.innerHTML = `
      <div class="blocking-message">
        <span>${blockMessage}</span>
      </div>
    `;
  } else {
    // Regular input for non-blocked users
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
    
    // Add click event to paperclip button
    paperclipButton.addEventListener('click', function() {
      showFileMenu(null, user);
    });
    
    // Input field
    const messageInputField = document.createElement('div');
    messageInputField.className = 'message-input-field';
    
    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.id = 'messageInput';
    inputField.placeholder = 'Type a message';
    
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
      if (this.classList.contains('active')) {
        sendMessageHandler(inputField.value, user.id, chatMessages);
        inputField.value = '';
        sendButton.classList.remove('active');
      }
    });
    
    // Add enter key handler
    inputField.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && this.value.trim()) {
        e.preventDefault();
        sendMessageHandler(this.value, user.id, chatMessages);
        this.value = '';
        sendButton.classList.remove('active');
      }
    });
    
    clipButtonContainer.appendChild(paperclipButton);
    messageInputField.appendChild(inputField);
    
    inputWrapper.appendChild(clipButtonContainer);
    inputWrapper.appendChild(messageInputField);
    inputWrapper.appendChild(sendButton);
    
    messageInputContainer.appendChild(inputWrapper);
  }
  
  // Assemble the full UI
  mainContent.appendChild(chatHeader);
  mainContent.appendChild(chatMessages);
  mainContent.appendChild(messageInputContainer);
  
  // Show chat content
  mainContent.style.display = 'flex';
  
  // Focus input field if not blocked
  if (!isBlocked) {
    const inputField = document.querySelector('.message-input-field input');
    if (inputField) {
      setTimeout(() => inputField.focus(), 0);
    }
  }
}

/**
 * Show the chat menu (three dots menu)
 * @param {HTMLElement} button - The button that was clicked
 * @param {Object} user - The user object for the current chat
 */
function showChatMenu(button, user) {
  // Remove any existing dropdown menus
  const existingMenu = document.getElementById('chatDropdownMenu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // Create the dropdown menu
  const dropdownMenu = document.createElement('div');
  dropdownMenu.id = 'chatDropdownMenu';
  dropdownMenu.className = 'dropdown-menu';
  
  // Get the button position
  const buttonRect = button.getBoundingClientRect();
  
  // Set the menu position initially
  dropdownMenu.style.position = 'fixed';
  dropdownMenu.style.top = buttonRect.bottom + 'px';
  dropdownMenu.style.right = (window.innerWidth - buttonRect.right) + 'px';
  dropdownMenu.style.zIndex = '1000';
  
  // Add the menu to the DOM so we can get its dimensions
  document.body.appendChild(dropdownMenu);
  
  // Check if we should show contact status
  checkContactStatus(user.id).then(isContact => {
    // Check if user is blocked
    checkBlockStatus(user.id).then(blockStatus => {
      // Create menu items container
      const menuItems = document.createElement('div');
      menuItems.className = 'dropdown-menu-options';
      
      // Add/Remove contact option
      if (isContact) {
        menuItems.innerHTML += `
          <div class="dropdown-option" data-action="remove-contact">
            <div class="dropdown-option-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="18" y1="8" x2="23" y2="13"></line>
                <line x1="23" y1="8" x2="18" y2="13"></line>
              </svg>
            </div>
            <div class="dropdown-option-label">Remove from contacts</div>
          </div>
        `;
      } else {
        menuItems.innerHTML += `
          <div class="dropdown-option" data-action="add-contact">
            <div class="dropdown-option-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="18" y1="8" x2="23" y2="13"></line>
                <line x1="18" y1="13" x2="23" y2="8"></line>
              </svg>
            </div>
            <div class="dropdown-option-label">Add to contacts</div>
          </div>
        `;
      }
      
      // Block/Unblock option
      if (blockStatus.is_blocked_by_you) {
        menuItems.innerHTML += `
          <div class="dropdown-option" data-action="unblock-user">
            <div class="dropdown-option-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
              </svg>
            </div>
            <div class="dropdown-option-label">Unblock user</div>
          </div>
        `;
      } else {
        menuItems.innerHTML += `
          <div class="dropdown-option" data-action="block-user">
            <div class="dropdown-option-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
              </svg>
            </div>
            <div class="dropdown-option-label">Block user</div>
          </div>
        `;
      }
      
      // Add menu items to dropdown
      dropdownMenu.appendChild(menuItems);
      
      // Add click event listeners to menu options
      const options = dropdownMenu.querySelectorAll('.dropdown-option');
      options.forEach(option => {
        option.addEventListener('click', function() {
          const action = this.getAttribute('data-action');
          
          // Handle the action
          switch (action) {
            case 'add-contact':
              addToContacts(user.id).then(() => {
                showSuccessNotification(`Added ${user.name} to contacts`);
                dropdownMenu.remove();
                // Refresh sidebar to update contacts
                loadSidebar();
              });
              break;
              
            case 'remove-contact':
              removeFromContacts(user.id).then(() => {
                showSuccessNotification(`Removed ${user.name} from contacts`);
                dropdownMenu.remove();
                // Refresh sidebar to update contacts
                loadSidebar();
              });
              break;
              
            case 'block-user':
              showBlockConfirmation(user.id, user.name);
              dropdownMenu.remove();
              break;
              
            case 'unblock-user':
              unblockUser(user.id).then(() => {
                showSuccessNotification(`Unblocked ${user.name}`);
                dropdownMenu.remove();
                // Reopen chat to show unblocked state
                openChat(user.id, user.name);
              });
              break;
          }
        });
      });
      
      // Add event listener to close menu when clicking outside
      document.addEventListener('click', function closeMenu(e) {
        if (!dropdownMenu.contains(e.target) && e.target !== button) {
          dropdownMenu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
      
      // Add event listener to close menu when pressing escape
      document.addEventListener('keydown', function escClose(e) {
        if (e.key === 'Escape') {
          dropdownMenu.remove();
          document.removeEventListener('keydown', escClose);
        }
      });
    });
  });
}

/**
 * Check if a user is in your contacts
 * @param {number} userId - The user ID to check
 * @returns {Promise<boolean>} - Promise resolving to true if user is a contact
 */
function checkContactStatus(userId) {
  return fetch('/check_contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contact_id: userId })
  })
  .then(response => response.json())
  .then(data => {
    return data.is_contact;
  })
  .catch(error => {
    console.error('Error checking contact status:', error);
    return false;
  });
}

/**
 * Remove user from contacts
 * @param {number} userId - The user ID to remove
 * @returns {Promise<boolean>} - Promise resolving to true if successful
 */
function removeFromContacts(userId) {
  return fetch('/remove_contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contact_id: userId })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Reload sidebar to update contacts list
      loadSidebar();
      return true;
    } else {
      throw new Error(data.error || 'Failed to remove contact');
    }
  })
  .catch(error => {
    console.error('Error removing contact:', error);
    showErrorNotification('Failed to remove contact');
    return false;
  });
}

/**
 * Block a user
 * @param {number} userId - The user ID to block
 * @returns {Promise<boolean>} - Promise resolving to true if successful
 */
function blockUser(userId) {
  return fetch('/block_user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: userId })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      return true;
    } else {
      throw new Error(data.error || 'Failed to block user');
    }
  })
  .catch(error => {
    console.error('Error blocking user:', error);
    showErrorNotification('Failed to block user');
    return false;
  });
}

/**
 * Handle blocking a user (with UI updates)
 * @param {number} userId - The user ID to block
 * @param {string} userName - The name of the user
 */
function blockUserHandler(userId, userName) {
  blockUser(userId).then(success => {
    if (success) {
      showSuccessNotification(`You have blocked ${userName}`);
      
      // Update UI to show blocked state
      const blockMessage = document.createElement('div');
      blockMessage.className = 'block-message';
      blockMessage.innerHTML = `
        <div class="block-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
        </div>
        <p>You've blocked this user</p>
        <button class="unblock-button">Unblock</button>
      `;
      
      // Replace message area with block message
      const chatMessages = document.querySelector('.chat-messages');
      if (chatMessages) {
        chatMessages.innerHTML = '';
        chatMessages.appendChild(blockMessage);
      }
      
      // Add unblock button handler
      const unblockButton = document.querySelector('.unblock-button');
      if (unblockButton) {
        unblockButton.addEventListener('click', function() {
          unblockUser(userId).then(() => {
            showSuccessNotification(`Unblocked ${userName}`);
            openChat(userId, userName);
          });
        });
      }
      
      // Disable input area
      const messageInputContainer = document.querySelector('.message-input-container');
      if (messageInputContainer) {
        messageInputContainer.innerHTML = `
          <div class="blocking-message">
            <span>You have blocked ${userName}</span>
          </div>
        `;
      }
      
      // Update sidebar
      loadSidebar();
    }
  });
}

/**
 * Unblock a user
 * @param {number} userId - The user ID to unblock
 * @returns {Promise<boolean>} - Promise resolving to true if successful
 */
function unblockUser(userId) {
  return fetch('/unblock_user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: userId })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Refresh sidebar to update the blocked indicators
      loadSidebar();
      return true;
    } else {
      throw new Error(data.error || 'Failed to unblock user');
    }
  })
  .catch(error => {
    console.error('Error unblocking user:', error);
    showErrorNotification('Failed to unblock user');
    return false;
  });
}

/**
 * Delete a chat
 * @param {number} userId - The user ID to delete chat with
 * @returns {Promise<Object>} - Promise resolving to response data
 */
function deleteChat(userId) {
  // This function has been removed as the delete chat feature is no longer needed
}

/**
 * Get user info from the server
 * @param {number} userId - The user ID to get info for
 * @returns {Promise<Object>} - Promise resolving to user data
 */
function getUserInfo(userId) {
  return fetch(`/get_user_info?user_id=${userId}`)
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        throw new Error(data.error);
      }
      return data;
    });
}

/**
 * Show block confirmation modal
 */
function showBlockConfirmation(userId, userName) {
  // Create the modal if it doesn't exist
  let blockModal = document.getElementById('blockUserModal');
  if (!blockModal) {
    blockModal = document.createElement('div');
    blockModal.id = 'blockUserModal';
    blockModal.className = 'modal';
    blockModal.innerHTML = `
      <div class="modal-content">
        <h3>Block User</h3>
        <p>Do you want to block <strong id="blockUserName"></strong>?</p>
        <p class="modal-description">Blocked users won't be able to send you messages.</p>
        <div class="modal-buttons">
          <button id="cancelBlock" class="btn-secondary">Cancel</button>
          <button id="confirmBlock" class="btn-primary" style="background-color: #e74c3c;">Block</button>
        </div>
      </div>
    `;
    document.body.appendChild(blockModal);
    
    // Cancel button handler
    document.getElementById('cancelBlock').addEventListener('click', function() {
      blockModal.classList.remove('active');
      document.getElementById('overlay').classList.remove('active');
    });
  }
  
  // Update user name in the modal
  document.getElementById('blockUserName').textContent = userName;
  
  // Add confirm handler
  const confirmBtn = document.getElementById('confirmBlock');
  // Remove existing event listeners to prevent duplicates
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  newConfirmBtn.addEventListener('click', function() {
    blockUserHandler(userId, userName);
    blockModal.classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
  });
  
  // Show the modal
  blockModal.classList.add('active');
  document.getElementById('overlay').classList.add('active');
}

/**
 * Show file menu when paperclip button is clicked
 */
function showFileMenu(fileInput, user) {
  // Create or get the file input
  if (!fileInput) {
    fileInput = document.getElementById('chatFileInput');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.accept = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar';
      fileInput.style.display = 'none';
      fileInput.id = 'chatFileInput';
      document.body.appendChild(fileInput);
    }
  }
  
  // Create menu if it doesn't exist
  let fileMenu = document.getElementById('fileUploadMenu');
  if (!fileMenu) {
    fileMenu = document.createElement('div');
    fileMenu.id = 'fileUploadMenu';
    fileMenu.className = 'file-upload-menu';
    fileMenu.innerHTML = `
      <div class="file-menu-options">
        <div class="file-option" id="photoOption">
          <div class="file-option-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <div class="file-option-label">Photo</div>
        </div>
        <div class="file-option" id="documentOption">
          <div class="file-option-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div class="file-option-label">Document</div>
        </div>
      </div>
    `;
    document.body.appendChild(fileMenu);
    
    // Add event listeners to menu options
    document.getElementById('photoOption').addEventListener('click', function() {
      fileInput.accept = 'image/*';
      fileInput.click();
      fileMenu.style.display = 'none';
    });
    
    document.getElementById('documentOption').addEventListener('click', function() {
      fileInput.accept = '.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar';
      fileInput.click();
      fileMenu.style.display = 'none';
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (fileMenu && !fileMenu.contains(e.target) && 
          !e.target.classList.contains('paperclip-button') && 
          !e.target.closest('.paperclip-button')) {
        fileMenu.style.display = 'none';
      }
    });
  }
  
  // Get the paperclip button position
  const paperclipButton = document.querySelector('.paperclip-button');
  if (!paperclipButton) return;
  
  const buttonRect = paperclipButton.getBoundingClientRect();
  
  // Position the menu above the input area
  fileMenu.style.display = 'block';
  fileMenu.style.position = 'fixed';
  fileMenu.style.left = `${buttonRect.left}px`;
  fileMenu.style.top = `${buttonRect.top - fileMenu.offsetHeight - 10}px`;
  fileMenu.style.zIndex = '10000';
  
  // If menu would go off the top of the screen, position it below instead
  if (parseFloat(fileMenu.style.top) < 0) {
    fileMenu.style.top = `${buttonRect.bottom + 10}px`;
  }
  
  // Set up file selection handler if not already done
  if (!fileInput.hasEventListener) {
    fileInput.addEventListener('change', function() {
      if (this.files && this.files.length > 0) {
        handleFileSelection(this.files, user);
        this.value = ''; // Reset for next selection
      }
    });
    fileInput.hasEventListener = true;
  }
}

/**
 * Start polling for new messages
 */
function startMessagePolling(userId) {
  // Clear any existing polling interval
  if (ChatApp.messagePollingInterval) {
    clearInterval(ChatApp.messagePollingInterval);
    ChatApp.messagePollingInterval = null;
  }
  
  // Store the last poll time to implement adaptive polling
  ChatApp.lastPollTime = Date.now();
  ChatApp.pollInterval = 3000; // Start with 3 seconds (faster initial response)
  ChatApp.maxPollInterval = 8000; // Max interval of 8 seconds (reduced from 10s)
  ChatApp.minPollInterval = 2000; // Min interval of 2 seconds (reduced from 3s)
  ChatApp.inactiveTime = 0;
  ChatApp.consecutiveEmptyPolls = 0;
  
  // Always check block status immediately when opening a chat
  ChatApp.lastBlockCheck = 0; // Set to 0 to force immediate check
  
  const resetInactiveTime = function() {
    if (ChatApp.inactiveTime > 3000) { // If user was inactive for more than 3s (reduced from 5s)
      // User is back, do immediate checks
      if (ChatApp.activeChat && ChatApp.activeChat.id == userId) {
        checkForNewMessages(userId);
        checkForBlockUpdates(userId); // Always check for block status when user returns
      }
    }
    ChatApp.inactiveTime = 0;
    ChatApp.pollInterval = ChatApp.minPollInterval; // Reset to fastest polling
    ChatApp.consecutiveEmptyPolls = 0; // Reset empty poll counter
  };
  
  // Add activity listeners with proper cleanup management
  if (!ChatApp.eventListenersActive) {
    document.addEventListener('mousemove', resetInactiveTime);
    document.addEventListener('keydown', resetInactiveTime);
    document.addEventListener('click', resetInactiveTime);
    ChatApp.eventListenersActive = true;
    
    // Store references to remove later
    ChatApp.resetInactiveTimeFunc = resetInactiveTime;
  }
  
  // Set the polling interval with dynamic adjustment
  ChatApp.messagePollingInterval = setInterval(() => {
    // Only poll if chat is still active
    if (ChatApp.activeChat && ChatApp.activeChat.id == userId) {
      // Increase inactive time
      ChatApp.inactiveTime += ChatApp.pollInterval;
      
      // Dynamic polling adjustment
      if (ChatApp.inactiveTime > 15000) { // After 15s of inactivity (reduced from 20s)
        // Slow down polling when inactive
        ChatApp.pollInterval = Math.min(ChatApp.pollInterval * 1.2, ChatApp.maxPollInterval);
      }
      
      // Slow down if we keep getting no new messages
      if (ChatApp.consecutiveEmptyPolls > 3) {
        ChatApp.pollInterval = Math.min(ChatApp.pollInterval * 1.1, ChatApp.maxPollInterval);
      }
      
      // Always check for new messages
      checkForNewMessages(userId).then(hasNewMessages => {
        if (hasNewMessages) {
          ChatApp.consecutiveEmptyPolls = 0;
        } else {
          ChatApp.consecutiveEmptyPolls++;
        }
      });
      
      // Check block status more frequently - every 5 seconds
      const currentTime = Date.now();
      if (currentTime - ChatApp.lastBlockCheck > 5000) { // Reduced from 10s to 5s
        ChatApp.lastBlockCheck = currentTime;
        checkForBlockUpdates(userId);
      }
      
      // Update debug info if enabled
      if (typeof updateDebugInfo === 'function') {
        updateDebugInfo(`Poll (interval: ${ChatApp.pollInterval}ms)`);
      }
    } else {
      cleanupPolling();
    }
  }, ChatApp.pollInterval);
  
  console.log(`Started message polling for user ${userId}`);
  
  // Force an immediate check for block status
  checkForBlockUpdates(userId);
  ChatApp.lastBlockCheck = Date.now();
}

/**
 * Clean up polling resources
 */
function cleanupPolling() {
  // Stop polling if chat is no longer active
  if (ChatApp.messagePollingInterval) {
    clearInterval(ChatApp.messagePollingInterval);
    ChatApp.messagePollingInterval = null;
  }
  
  // Remove activity listeners to prevent memory leaks
  if (ChatApp.eventListenersActive && ChatApp.resetInactiveTimeFunc) {
    document.removeEventListener('mousemove', ChatApp.resetInactiveTimeFunc);
    document.removeEventListener('keydown', ChatApp.resetInactiveTimeFunc);
    document.removeEventListener('click', ChatApp.resetInactiveTimeFunc);
    ChatApp.eventListenersActive = false;
  }
}

/**
 * Check for new messages
 * @returns {Promise<boolean>} Whether new messages were found
 */
function checkForNewMessages(userId) {
  // Find the last message ID in the chat
  const messages = document.querySelectorAll('.message');
  let lastMessageId = 0;
  
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    lastMessageId = lastMessage.dataset.messageId;
  }
  
  // Fetch new messages
  return fetchNewMessages(userId, lastMessageId)
    .then(data => {
      const hasNewMessages = data.success && data.messages && data.messages.length > 0;
      
      if (hasNewMessages) {
        // Add new messages to chat
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
          data.messages.forEach(message => {
            addMessageToChat(message, chatMessages, true);
          });
          
          // Update sidebar to reflect the latest message
          loadSidebar();
          
          // Add to debug counter if enabled
          if (typeof logNewMessages === 'function') {
            logNewMessages(data.messages.length);
          }
        }
      }
      
      return hasNewMessages;
    })
    .catch(error => {
      console.error('Error checking for new messages:', error);
      return false;
    });
}

/**
 * Check for block status updates
 */
function checkForBlockUpdates(userId) {
  console.log(`Checking block status for user ${userId}`);
  
  checkBlockStatus(userId)
    .then(blockStatus => {
      console.log(`Block status for ${userId}:`, blockStatus);
      
      // Get current block state
      const currentBlockState = {
        isBlocked: document.querySelector('.blocking-message') !== null,
        blockMessage: document.querySelector('.blocking-message span')?.textContent || ''
      };
      
      // Determine if block state changed
      const blockStateChanged = 
        (blockStatus.isBlocked || blockStatus.hasBlockedYou) !== currentBlockState.isBlocked;
      
      // Update debug counter if enabled
      if (typeof logBlockCheck === 'function') {
        logBlockCheck(blockStateChanged);
      }
      
      // Update block indicators in the sidebar regardless of changes
      if (typeof updateBlockIndicators === 'function') {
        updateBlockIndicators(userId, blockStatus);
      }
      
      // Update UI if block state changed
      if (blockStateChanged) {
        console.log(`Block state changed for user ${userId}, updating UI`);
        
        // Reopen the chat with updated block status
        getUserInfo(userId)
          .then(userData => {
            createChatInterface(userData, blockStatus);
            loadMessages(userId);
          });
      }
    })
    .catch(error => {
      console.error('Error checking block status:', error);
    });
}

/**
 * Chat interaction functionality
 */

/**
 * Add the selected user to contacts
 * @returns {Promise<boolean>} - Promise resolving to true if successful, false otherwise
 */
function addToContacts(userId) {
    console.log('Adding user to contacts:', userId);
    
    // Return a promise to allow the caller to know when this completes
    return new Promise((resolve, reject) => {
        // API call to add user to contacts
        fetch('/add_contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contact_id: userId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('User added to contacts:', data.contact);
                showSuccessNotification('User added to your contacts');
                
                // Add the contact to the contact list in the sidebar if needed
                const contactsList = document.getElementById('contactsList');
                if (contactsList && data.contact) {
                    const contactsSection = contactsList.querySelector('.contacts-section');
                    if (contactsSection) {
                        // Create a new contact element
                        const contactElement = createContactElement(data.contact);
                        
                        // Check if "no contacts" message exists and remove it
                        const noContactsMessage = contactsList.querySelector('.no-contacts-message');
                        if (noContactsMessage) {
                            noContactsMessage.style.display = 'none';
                        }
                        
                        // Add the new contact element to the contacts section
                        contactsSection.appendChild(contactElement);
                    } else {
                        // If no contacts section exists, we should create one
                        console.log('Creating new contacts section');
                        const newContactsSection = document.createElement('div');
                        newContactsSection.className = 'contacts-section';
                        
                        const sectionTitle = document.createElement('div');
                        sectionTitle.className = 'section-title';
                        sectionTitle.textContent = 'Contacts';
                        newContactsSection.appendChild(sectionTitle);
                        
                        // Create and add the contact element
                        const contactElement = createContactElement(data.contact);
                        newContactsSection.appendChild(contactElement);
                        
                        // Add to contacts list
                        contactsList.appendChild(newContactsSection);
                    }
                }
                
                // Resolve the promise with success
                resolve(true);
            } else {
                console.error('Failed to add user to contacts:', data.error);
                showErrorNotification('Failed to add user to contacts');
                resolve(false);
            }
        })
        .catch(error => {
            console.error('Error adding user to contacts:', error);
            showErrorNotification('Failed to add user to contacts');
            resolve(false);
        });
    });
}

/**
 * Create a contact element for the sidebar
 */
function createContactElement(contact) {
    const contactElement = document.createElement('div');
    contactElement.className = 'contact-item';
    contactElement.setAttribute('data-user-id', contact.id);
    
    // Create avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'contact-avatar';
    
    if (contact.avatar_path) {
        const img = document.createElement('img');
        img.src = contact.avatar_path;
        img.alt = contact.name;
        img.onerror = function() {
            this.remove();
            const initials = document.createElement('div');
            initials.className = 'avatar-initials';
            initials.textContent = getInitials(contact.name);
            avatarDiv.appendChild(initials);
        };
        avatarDiv.appendChild(img);
    } else {
        const initials = document.createElement('div');
        initials.className = 'avatar-initials';
        initials.textContent = getInitials(contact.name);
        avatarDiv.appendChild(initials);
    }
    
    // Create contact info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'contact-info';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'contact-name';
    nameDiv.textContent = contact.name;
    infoDiv.appendChild(nameDiv);
    
    // Assemble the contact element
    contactElement.appendChild(avatarDiv);
    contactElement.appendChild(infoDiv);
    
    // Add click event to open chat
    contactElement.addEventListener('click', function() {
        openChat(contact.id, contact.name);
    });
    
    return contactElement;
}

/**
 * Create a chat element for the sidebar
 */
function createChatElement(chat) {
    const chatElement = document.createElement('div');
    chatElement.className = 'contact-item conversation-item';
    chatElement.setAttribute('data-user-id', chat.user_id);
    
    // Create avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'contact-avatar';
    
    if (chat.avatar_path) {
        const img = document.createElement('img');
        img.src = chat.avatar_path;
        img.alt = chat.name;
        img.onerror = function() {
            this.remove();
            const initials = document.createElement('div');
            initials.className = 'avatar-initials';
            initials.textContent = getInitials(chat.name);
            avatarDiv.appendChild(initials);
        };
        avatarDiv.appendChild(img);
    } else {
        const initials = document.createElement('div');
        initials.className = 'avatar-initials';
        initials.textContent = getInitials(chat.name);
        avatarDiv.appendChild(initials);
    }
    
    // Create chat info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'contact-info';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'contact-name';
    nameDiv.textContent = chat.name;
    infoDiv.appendChild(nameDiv);
    
    // Format last message timestamp
    const lastMessageTime = new Date(chat.last_message_time);
    const timeStr = formatChatTime(lastMessageTime);
    
    // Last message with timestamp
    const lastMessageDiv = document.createElement('div');
    lastMessageDiv.className = 'last-message';
    
    const messageTextDiv = document.createElement('div');
    messageTextDiv.className = 'message-text';
    messageTextDiv.textContent = chat.last_message;
    lastMessageDiv.appendChild(messageTextDiv);
    
    const messageTimeDiv = document.createElement('div');
    messageTimeDiv.className = 'message-time';
    messageTimeDiv.textContent = timeStr;
    lastMessageDiv.appendChild(messageTimeDiv);
    
    infoDiv.appendChild(lastMessageDiv);
    
    // Add unread badge if there are unread messages
    if (chat.unread_count > 0) {
        const unreadBadge = document.createElement('div');
        unreadBadge.className = 'unread-badge';
        unreadBadge.textContent = chat.unread_count > 99 ? '99+' : chat.unread_count;
        chatElement.appendChild(unreadBadge);
    }
    
    // Assemble the chat element
    chatElement.appendChild(avatarDiv);
    chatElement.appendChild(infoDiv);
    
    // Add click event to open chat
    chatElement.addEventListener('click', function() {
        openChat(chat.user_id, chat.name);
    });
    
    return chatElement;
}

/**
 * Helper function to get initials from a name
 */
function getInitials(name) {
    if (!name) return '?';
    
    const parts = name.split(' ');
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    } else {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
}

/**
 * Format chat time for display
 */
function formatChatTime(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date >= today) {
        // Today - show time only
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date >= yesterday) {
        // Yesterday
        return 'Yesterday';
    } else {
        // Earlier - show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

// Chat functionality

/**
 * Open a chat with a user
 */
function openChat(userId, userName) {
    console.log(`Opening chat with user ${userName} (ID: ${userId})`);
    
    // Update active user in global state
    if (typeof ChatApp !== 'undefined') {
        ChatApp.activeChat = {
            userId: userId,
            userName: userName
        };
    }
    
    // Find and mark active contact in sidebar
    document.querySelectorAll('.contact-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.userId === userId.toString()) {
            item.classList.add('active');
        }
    });
    
    // Get the main content area
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    // Create the chat interface
    mainContent.innerHTML = `
        <div class="chat-container">
            <div class="chat-header" data-user-id="${userId}">
                <div class="chat-user-info">
                    <div class="chat-user-avatar">
                        <div class="avatar-initials">${userName.charAt(0).toUpperCase()}</div>
                    </div>
                    <div class="chat-user-name">${userName}</div>
                </div>
                <button class="chat-menu-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                </button>
            </div>
            <div class="chat-messages">
                <div class="loading-messages">Loading messages...</div>
            </div>
            <div class="message-input-container">
                <div class="input-wrapper">
                    <div class="clip-button-container">
                        <button class="paperclip-button">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="message-input-field">
                        <input type="text" placeholder="Type a message">
                    </div>
                    <button class="send-button">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 2L11 13"></path>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Ensure the user is added to contacts immediately if it's a new contact
    ensureUserIsContact(userId);
    
    // Load messages
    loadMessages(userId);
    
    // Add event listener to chat menu button
    const chatMenuBtn = mainContent.querySelector('.chat-menu-btn');
    if (chatMenuBtn) {
        chatMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showChatMenu(e, userId, userName);
        });
    }
    
    // Set up message input
    setupMessageInput(userId);
    
    // Set up file attachment
    setupFileUpload(userId, userName);
}

/**
 * Make sure a user is added to contacts
 */
function ensureUserIsContact(userId) {
    console.log('Ensuring user is a contact:', userId);
    
    // Add the user to contacts immediately
    fetch('/add_contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contact_id: userId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('User added to contacts:', data);
            // Force refresh the sidebar immediately
            if (typeof loadSidebar === 'function') {
                setTimeout(loadSidebar, 100);
            }
        } else {
            console.log('User already in contacts or error adding contact:', data);
        }
    })
    .catch(error => {
        console.error('Error ensuring user is contact:', error);
    });
}

/**
 * Set up message input field
 */
function setupMessageInput(userId) {
    const inputField = document.querySelector('.message-input-field input');
    const sendButton = document.querySelector('.send-button');
    const chatMessages = document.querySelector('.chat-messages');
    
    if (!inputField || !sendButton || !chatMessages) return;
    
    // Update send button state based on input content
    inputField.addEventListener('input', function() {
        if (this.value.trim()) {
            sendButton.classList.add('active');
        } else {
            sendButton.classList.remove('active');
        }
    });
    
    // Send message on Enter key
    inputField.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && this.value.trim()) {
            e.preventDefault();
            const messageText = this.value;
            sendMessageHandler(messageText, userId, chatMessages);
        }
    });
    
    // Send message on button click
    sendButton.addEventListener('click', function() {
        if (inputField.value.trim()) {
            const messageText = inputField.value;
            sendMessageHandler(messageText, userId, chatMessages);
        }
    });
}

/**
 * Show chat menu (dropdown)
 */
function showChatMenu(event, userId, userName) {
    // Remove any existing dropdown
    const existingMenu = document.querySelector('.dropdown-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create menu
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'dropdown-menu';
    
    // Add menu options
    dropdownMenu.innerHTML = `
        <div class="dropdown-menu-options">
            <div class="dropdown-option search-in-chat">
                <div class="dropdown-option-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <div class="dropdown-option-label">Search in chat</div>
            </div>
            <div class="dropdown-option view-profile">
                <div class="dropdown-option-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div class="dropdown-option-label">View profile</div>
            </div>
            <div class="dropdown-option block-user">
                <div class="dropdown-option-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                </div>
                <div class="dropdown-option-label">Block user</div>
            </div>
        </div>
    `;
    
    // Position menu
    const rect = event.currentTarget.getBoundingClientRect();
    dropdownMenu.style.position = 'absolute';
    dropdownMenu.style.top = `${rect.bottom + 5}px`;
    dropdownMenu.style.right = `20px`;
    
    // Add to DOM
    document.body.appendChild(dropdownMenu);
    
    // Close when clicking outside
    document.addEventListener('click', function closeMenu(e) {
        if (!dropdownMenu.contains(e.target) && e.target !== event.currentTarget) {
            dropdownMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
    
    // Option click handlers
    dropdownMenu.querySelector('.search-in-chat').addEventListener('click', function() {
        dropdownMenu.remove();
        // Add search functionality here
        showSearchInChat();
    });
    
    dropdownMenu.querySelector('.view-profile').addEventListener('click', function() {
        dropdownMenu.remove();
        // Add profile view functionality here
        showUserProfile(userId, userName);
    });
    
    dropdownMenu.querySelector('.block-user').addEventListener('click', function() {
        dropdownMenu.remove();
        // Add block functionality here
        showBlockConfirmation(userId, userName);
    });
}

/**
 * Set up file upload for messages
 */
function setupFileUpload(userId, userName) {
    const paperclipButton = document.querySelector('.paperclip-button');
    if (!paperclipButton) return;
    
    paperclipButton.addEventListener('click', function(e) {
        // Create and show file menu
        showFileMenu(e, userId, userName);
    });
}

/**
 * Show file upload menu
 */
function showFileMenu(event, userId, userName) {
    // Remove any existing menu
    const existingMenu = document.querySelector('.file-upload-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create menu
    const fileMenu = document.createElement('div');
    fileMenu.className = 'file-upload-menu';
    
    // Add menu options
    fileMenu.innerHTML = `
        <div class="file-menu-options">
            <div class="file-option photo-option">
                <div class="file-option-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </div>
                <div class="file-option-label">Photo or Video</div>
            </div>
            <div class="file-option document-option">
                <div class="file-option-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </div>
                <div class="file-option-label">Document</div>
            </div>
        </div>
    `;
    
    // Position menu
    const rect = event.currentTarget.getBoundingClientRect();
    fileMenu.style.position = 'absolute';
    fileMenu.style.bottom = `${window.innerHeight - rect.top + 5}px`;
    fileMenu.style.left = `${rect.left}px`;
    
    // Add to DOM
    document.body.appendChild(fileMenu);
    
    // Close when clicking outside
    document.addEventListener('click', function closeMenu(e) {
        if (!fileMenu.contains(e.target) && e.target !== event.currentTarget) {
            fileMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
    
    // Handle photo/video upload
    const photoOption = fileMenu.querySelector('.photo-option');
    photoOption.addEventListener('click', function() {
        fileMenu.remove();
        
        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,video/*';
        fileInput.multiple = false;
        fileInput.style.display = 'none';
        
        // Add to DOM
        document.body.appendChild(fileInput);
        
        // Trigger click
        fileInput.click();
        
        // Handle file selection
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                handleFileSelection(this.files, { id: userId, name: userName });
            }
            
            // Remove input
            document.body.removeChild(fileInput);
        });
    });
    
    // Handle document upload
    const documentOption = fileMenu.querySelector('.document-option');
    documentOption.addEventListener('click', function() {
        fileMenu.remove();
        
        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx';
        fileInput.multiple = false;
        fileInput.style.display = 'none';
        
        // Add to DOM
        document.body.appendChild(fileInput);
        
        // Trigger click
        fileInput.click();
        
        // Handle file selection
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                handleFileSelection(this.files, { id: userId, name: userName });
            }
            
            // Remove input
            document.body.removeChild(fileInput);
        });
    });
}

/**
 * Show search in chat interface
 */
function showSearchInChat() {
    // Placeholder for future implementation
    showNotification('Search in chat is not implemented yet', 'info');
}

/**
 * Show user profile
 */
function showUserProfile(userId, userName) {
    // Placeholder for future implementation
    showNotification('User profile view is not implemented yet', 'info');
}

/**
 * Show block confirmation dialog
 */
function showBlockConfirmation(userId, userName) {
    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'blockUserModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Block User</h3>
            <p>Are you sure you want to block ${userName}?</p>
            <p class="modal-description">You won't receive messages or notifications from this user.</p>
            <div class="modal-buttons">
                <button id="cancelBlock" class="btn-secondary">Cancel</button>
                <button id="confirmBlock" class="btn-primary">Block</button>
            </div>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(modal);
    
    // Cancel button
    const cancelBtn = document.getElementById('cancelBlock');
    cancelBtn.addEventListener('click', function() {
        modal.remove();
    });
    
    // Confirm button
    const confirmBtn = document.getElementById('confirmBlock');
    confirmBtn.addEventListener('click', function() {
        // Call API to block user
        blockUser(userId).then(data => {
            if (data.success) {
                showNotification(`You have blocked ${userName}`, 'block-user');
                // Refresh sidebar
                if (typeof loadSidebar === 'function') {
                    loadSidebar();
                }
                // Show blocked interface in chat
                showBlockedInterface(userId, userName);
            } else {
                showErrorNotification(data.error || 'Failed to block user');
            }
        }).catch(error => {
            showErrorNotification('Failed to block user');
        }).finally(() => {
            modal.remove();
        });
    });
}

/**
 * Show blocked interface in chat
 */
function showBlockedInterface(userId, userName) {
    const chatMessages = document.querySelector('.chat-messages');
    const inputContainer = document.querySelector('.message-input-container');
    
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="block-message">
                <div class="block-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                </div>
                <div>You've blocked ${userName}</div>
                <button class="unblock-button">Unblock</button>
            </div>
        `;
        
        // Add unblock button handler
        const unblockBtn = chatMessages.querySelector('.unblock-button');
        if (unblockBtn) {
            unblockBtn.addEventListener('click', function() {
                unblockUser(userId).then(data => {
                    if (data.success) {
                        showNotification(`You've unblocked ${userName}`, 'success');
                        // Reload the chat
                        openChat(userId, userName);
                        // Refresh sidebar
                        if (typeof loadSidebar === 'function') {
                            loadSidebar();
                        }
                    } else {
                        showErrorNotification(data.error || 'Failed to unblock user');
                    }
                }).catch(error => {
                    showErrorNotification('Failed to unblock user');
                });
            });
        }
    }
    
    // Disable input field
    if (inputContainer) {
        inputContainer.innerHTML = `
            <div class="blocking-message">
                <span>You can't send messages to users you've blocked</span>
            </div>
        `;
    }
}

/**
 * Check if this is the first message to a user
 */
function isFirstMessageToUser(userId) {
    // Check if the user exists in the sidebar
    const contactItems = document.querySelectorAll('.contact-item');
    for (let item of contactItems) {
        if (item.dataset.userId === userId.toString()) {
            return false; // User found in contacts
        }
    }
    return true; // User not found in contacts
}

// Empty function for backwards compatibility
// This should be kept to avoid errors (it's no longer used)
function deleteChat() {
    // This functionality has been removed
    console.warn('deleteChat function called but this feature has been removed');
}
