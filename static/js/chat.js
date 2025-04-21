/**
 * Chat interface and message display functions
 */

/**
 * Open a chat with a user
 */
function openChatWithUser(userId, userName) {
  // Store active chat info
  ChatApp.activeChat = { id: userId, name: userName };
  
  // Get user info and check block status
  Promise.all([getUserInfo(userId), checkBlockStatus(userId)])
    .then(([userData, blockStatus]) => {
      // Create the chat interface with block status
      createChatInterface(userData, blockStatus);
      
      // Load messages
      loadMessages(userId);
      
      // Highlight active contact in sidebar
      highlightActiveContact(userId);
      
      // Start polling for new messages
      startMessagePolling(userId);
    })
    .catch(error => {
      console.error('Error opening chat:', error);
      showErrorNotification('Failed to open chat. Please try again.');
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
  
  // Menu button
  const menuButton = document.createElement('button');
  menuButton.className = 'chat-menu-btn';
  menuButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="5" r="1"></circle>
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="19" r="1"></circle>
    </svg>
  `;
  
  // Menu button click handler
  menuButton.addEventListener('click', function(e) {
    e.stopPropagation();
    showContactMenu(menuButton, user);
  });
  
  // Messages area
  const chatMessages = document.createElement('div');
  chatMessages.className = 'chat-messages';
  
  // Message input area
  const messageInputContainer = document.createElement('div');
  messageInputContainer.className = 'message-input-container';
  
  // IMPORTANT: Assemble the header first, regardless of block status
  userInfo.appendChild(userAvatar);
  userInfo.appendChild(userName);
  chatHeader.appendChild(userInfo);
  chatHeader.appendChild(menuButton);
  
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
    inputField.placeholder = 'Message';
    
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
      }
    });
    
    // Add enter key handler
    inputField.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && this.value.trim()) {
        e.preventDefault();
        sendMessageHandler(this.value, user.id, chatMessages);
      }
    });
    
    clipButtonContainer.appendChild(paperclipButton);
    messageInputField.appendChild(inputField);
    
    inputWrapper.appendChild(clipButtonContainer);
    inputWrapper.appendChild(messageInputField);
    inputWrapper.appendChild(sendButton);
    
    messageInputContainer.appendChild(inputWrapper);
  }
  
  // Assemble the full UI (always include header)
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
 * Show contact menu when chat menu button is clicked
 */
function showContactMenu(menuButton, user) {
  // Create menu if it doesn't exist
  let contactMenu = document.getElementById('contactDropdownMenu');
  if (!contactMenu) {
    contactMenu = document.createElement('div');
    contactMenu.id = 'contactDropdownMenu';
    contactMenu.className = 'dropdown-menu';
    document.body.appendChild(contactMenu);
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (contactMenu && !contactMenu.contains(e.target) && 
          !e.target.classList.contains('chat-menu-btn') && 
          !e.target.closest('.chat-menu-btn')) {
        contactMenu.style.display = 'none';
      }
    });
  }
  
  // Get the button position
  const buttonRect = menuButton.getBoundingClientRect();
  
  // Check if user is a contact and if the user is blocked
  Promise.all([checkContactStatus(user.id), checkBlockStatus(user.id)])
    .then(([isContact, blockStatus]) => {
      // Update menu content
      contactMenu.innerHTML = `
        <div class="dropdown-menu-options">
          ${isContact ? 
            `<div class="dropdown-option" id="removeContactOption">
              <div class="dropdown-option-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 7l-10 10"></path>
                  <path d="M7 7l10 10"></path>
                </svg>
              </div>
              <div class="dropdown-option-label">Remove from contacts</div>
            </div>` : 
            `<div class="dropdown-option" id="addContactOption">
              <div class="dropdown-option-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14"></path>
                  <path d="M5 12h14"></path>
                </svg>
              </div>
              <div class="dropdown-option-label">Add to contacts</div>
            </div>`
          }
          
          <!-- Block/Unblock option -->
          <div class="dropdown-option ${blockStatus.isBlocked ? 'unblock-option' : 'block-option'}" id="${blockStatus.isBlocked ? 'unblockUserOption' : 'blockUserOption'}">
            <div class="dropdown-option-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${blockStatus.isBlocked ? 'currentColor' : '#e74c3c'}" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
              </svg>
            </div>
            <div class="dropdown-option-label" style="color: ${blockStatus.isBlocked ? 'inherit' : '#e74c3c'}">
              ${blockStatus.isBlocked ? 'Unblock user' : 'Block user'}
            </div>
          </div>
        </div>
      `;
      
      // Position the menu
      contactMenu.style.display = 'block';
      contactMenu.style.position = 'fixed';
      contactMenu.style.left = `${buttonRect.left - contactMenu.offsetWidth + buttonRect.width}px`;
      contactMenu.style.top = `${buttonRect.bottom + 5}px`;
      contactMenu.style.zIndex = '10000';
      
      // Add event listeners
      if (isContact) {
        document.getElementById('removeContactOption').addEventListener('click', function() {
          removeContactHandler(user.id);
          contactMenu.style.display = 'none';
        });
      } else {
        document.getElementById('addContactOption').addEventListener('click', function() {
          addContactHandler(user.id, user.name);
          contactMenu.style.display = 'none';
        });
      }
      
      // Add block/unblock event listener
      if (blockStatus.isBlocked) {
        document.getElementById('unblockUserOption').addEventListener('click', function() {
          unblockUserHandler(user.id, user.name);
          contactMenu.style.display = 'none';
        });
      } else {
        document.getElementById('blockUserOption').addEventListener('click', function() {
          showBlockConfirmation(user.id, user.name);
          contactMenu.style.display = 'none';
        });
      }
    })
    .catch(error => {
      console.error('Error checking contact/block status:', error);
      contactMenu.style.display = 'none';
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
  }
  
  // Set the polling interval - increased from 3000ms to 5000ms for PythonAnywhere
  ChatApp.messagePollingInterval = setInterval(() => {
    // Only poll if chat is still activewith 5 seconds
    if (ChatApp.activeChat && ChatApp.activeChat.id == userId) {
      checkForNewMessages(userId);// Min interval of 5 seconds
      checkForBlockUpdates(userId);
      
      // Update debug info if enabledlling frequency
      if (typeof updateDebugInfo === 'function') {tiveTime);
        updateDebugInfo('Automatic poll');etInactiveTime);
      }ent.addEventListener('click', resetInactiveTime);
    } else {
      // Stop polling if chat is no longer active
      clearInterval(ChatApp.messagePollingInterval);as inactive for more than 10s
      ChatApp.messagePollingInterval = null;
    } if (ChatApp.activeChat && ChatApp.activeChat.id == userId) {
  }, 5000); // Check every 5 seconds (increased from 3s for PythonAnywhere)
        checkForBlockUpdates(userId);
  console.log(`Started message polling for user ${userId}`);
}   }
    ChatApp.inactiveTime = 0;
/** ChatApp.pollInterval = ChatApp.minPollInterval; // Reset to fastest polling
 * Check for new messages
 */
function checkForNewMessages(userId) {amic adjustment
  // Find the last message ID in the chaterval(() => {
  const messages = document.querySelectorAll('.message');
  let lastMessageId = 0;at && ChatApp.activeChat.id == userId) {
      // Increase inactive time
  if (messages.length > 0) {= ChatApp.pollInterval;
    const lastMessage = messages[messages.length - 1];
    lastMessageId = lastMessage.dataset.messageId;
  }   if (ChatApp.inactiveTime > 30000) { // After 30s of inactivity
        ChatApp.pollInterval = Math.min(ChatApp.pollInterval * 1.5, ChatApp.maxPollInterval);
  // Fetch new messages
  fetchNewMessages(userId, lastMessageId)
    .then(data => {ssages(userId);
      if (data.success && data.messages && data.messages.length > 0) {
        // Add new messages to chat
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {gInfo === 'function') {
          data.messages.forEach(message => {hatApp.pollInterval}ms)`);
            addMessageToChat(message, chatMessages, true);
          });
          top polling if chat is no longer active
          // Update sidebar to reflect the latest message
          loadSidebar();lingInterval = null;
          
          // Add to debug counter if enabled
          if (typeof logNewMessages === 'function') {InactiveTime);
            logNewMessages(data.messages.length);etInactiveTime);
          }ent.removeEventListener('click', resetInactiveTime);
        }
      }atApp.pollInterval);
    })
    .catch(error => {d message polling for user ${userId}`);
      console.error('Error checking for new messages:', error);
    });
}**
 * Check for new messages
/**
 * Check for block status updatesId) {
 *// Find the last message ID in the chat
function checkForBlockUpdates(userId) {orAll('.message');
  checkBlockStatus(userId)
    .then(blockStatus => {
      // Get current block state
      const currentBlockState = {messages.length - 1];
        isBlocked: document.querySelector('.blocking-message') !== null,
        blockMessage: document.querySelector('.blocking-message span')?.textContent || ''
      };
      etch new messages
      // Determine if block state changed
      const blockStateChanged = 
        (blockStatus.isBlocked || blockStatus.hasBlockedYou) !== currentBlockState.isBlocked;
        // Add new messages to chat
      // Update debug counter if enablederySelector('.chat-messages');
      if (typeof logBlockCheck === 'function') {
        logBlockCheck(blockStateChanged);> {
      }     addMessageToChat(message, chatMessages, true);
          });
      // Update block indicators in the sidebar regardless of changes
      if (typeof updateBlockIndicators === 'function') { reflect the latest message
        updateBlockIndicators(userId, blockStatus);
      }
      nter if enabled
      // Update UI if block state changed
      if (blockStateChanged) {essages.length);
        // Reopen the chat with updated block status
        getUserInfo(userId) }
          .then(userData => {}
            createChatInterface(userData, blockStatus);
            loadMessages(userId);
          });onsole.error('Error checking for new messages:', error);
      }   });
    })}





}    });      console.error('Error checking block status:', error);    .catch(error => {
/**
 * Check for block status updates
 */
function checkForBlockUpdates(userId) {
  checkBlockStatus(userId)
    .then(blockStatus => {
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
      
      // Update UI if block state changed
      if (blockStateChanged) {
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
