/**
 * Group chat functionality
 */

/**
 * API Functions - Core functionality for group chat
 */

/**
 * Get group information from the server
 */
function getGroupInfo(groupId) {
  console.log(`Making API request to /get_group_info?group_id=${groupId}`);
  return fetch(`/get_group_info?group_id=${groupId}`)
    .then(response => {
      if (!response.ok) {
        console.error(`Group info API returned status: ${response.status}`);
        throw new Error(`API error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Group info API data:', data);
      return data;
    })
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
 * Delete a group message
 */
function deleteGroupMessage(messageId) {
  return fetch('/delete_group_message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: messageId })
  }).then(r => r.json());
}

/**
 * Add members to a group
 */
function addGroupMembers(groupId, userIds) {
  return fetch('/add_group_members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: groupId, user_ids: userIds })
  }).then(r => r.json());
}

/**
 * Leave a group
 */
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

/**
 * Create a new group chat
 */
function createNewGroup(groupName, members) {
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
    showSuccessNotification('Group created successfully');
    
    const groupId = data.group_id || (data.group ? data.group.id : null);
    const groupName = data.group_name || groupName;
    
    if (groupId) {
      openGroupChat(groupId, groupName);
      if (typeof loadSidebar === 'function') loadSidebar();
    }
    
    return data;
  })
  .catch(error => {
    hideLoadingIndicator();
    console.error('Error creating group:', error);
    return Promise.reject(error);
  });
}

/**
 * Open a group chat
 */
function openGroupChat(groupId, groupName) {
  ChatApp.activeChat = { id: groupId, name: groupName, type: 'group' };
  
  console.log('Opening group chat:', groupId, groupName);
  
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) {
    console.error('Main content area not found - cannot open group chat');
    return;
  }
  
  mainContent.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;height:100%;">
      <div style="color:#888;text-align:center;">
        <div style="margin-bottom:10px;">Loading group chat...</div>
      </div>
    </div>
  `;
  
  console.log(`Fetching group info for group ${groupId}...`);
  getGroupInfo(groupId)
    .then(response => {
      console.log('Group info API response:', response);
      if (!response || !response.success) {
        console.error('Failed to get group info:', response);
        throw new Error(response && response.error ? response.error : 'Failed to get group info');
      }
      
      const groupData = response.group;
      console.log('Group data loaded:', groupData);
      
      if (!groupData) {
        throw new Error('Group data is missing from successful response');
      }
      
      try {
        console.log('Creating group chat interface...');
        createGroupChatInterface(groupData);
        console.log('Group chat interface created successfully');
      } catch (interfaceError) {
        console.error('Error creating group chat interface:', interfaceError);
        throw interfaceError;
      }
      
      console.log('Loading group messages...');
      return loadGroupMessages(groupId);
    })
    .then(response => {
      console.log('Group messages loaded:', response);
      if (response && !response.success) {
        console.error('Failed to load group messages:', response);
      }
      
      console.log('Highlighting sidebar item for group:', groupId);
      highlightActiveItem(groupId, 'group');
    })
    .catch(error => {
      console.error('Error opening group chat:', error);
      showErrorNotification(error.message || 'Failed to open group chat. Please try again.');
      
      if (mainContent) {
        mainContent.innerHTML = `
          <div style="display:flex;justify-content:center;align-items:center;height:100%;flex-direction:column;">
            <div style="color:#e57373;text-align:center;margin-bottom:20px;">
              Failed to open group chat: ${error.message || 'Unknown error'}
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
 * Create the group chat interface
 */
function createGroupChatInterface(group) {
  console.log('Creating group chat interface for:', group);
  
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) {
    console.error('Main content container not found');
    showErrorNotification('UI error: Main content area not found');
    return;
  }
  
  try {
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
      if (!avatarSrc.startsWith('http') && !avatarSrc.startsWith('/static/')) {
        avatarSrc = `/static/${avatarSrc}`;
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
    groupNameEl.style.marginBottom = '6px';
    groupNameEl.style.position = 'relative'; 
    groupNameEl.style.top = '10px';
    groupNameEl.onclick = function() { showGroupMembers(group); };

    const memberCount = document.createElement('div');
    memberCount.className = 'chat-group-members';
    memberCount.textContent = `${group.member_count || 0} members`;
    memberCount.style.marginTop = '0'; 
    memberCount.style.position = 'relative';
    memberCount.style.top = '-9px';

    const groupNameBlock = document.createElement('div');
    groupNameBlock.style.display = 'flex';
    groupNameBlock.style.flexDirection = 'column';
    groupNameBlock.style.justifyContent = 'center';
    groupNameBlock.style.alignItems = 'flex-start';
    groupNameBlock.style.height = '100%';
    groupNameBlock.style.padding = '8px 0';
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
    
    // Clip button container
    const clipButtonContainer = document.createElement('div');
    clipButtonContainer.className = 'clip-button-container';
    
    // Paperclip button
    const paperclipButton = document.createElement('button');
    paperclipButton.className = 'paperclip-button';
    paperclipButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
      </svg>
    `;
    
    // Emoji button
    const emojiButton = document.createElement('button');
    emojiButton.className = 'emoji-button paperclip-button';
    emojiButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-3.589 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
        <path d="M12 15c-2.09 0-3.933-1.034-5.121-2.819-.19-.287-.01-0.69.277-0.88.287-.19.69-.01.88.277C9.038 13.036 10.426 14 12 14s2.962-0.964 3.964-2.423c.19-.287.593-0.467.88-0.277.287.19.467.593.277.88C15.933 13.966 14.09 15 12 15z"/>
        <circle cx="8.5" cy="9.5" r="1.5"/>
        <circle cx="15.5" cy="9.5" r="1.5"/>
      </svg>
    `;
    
    // File input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '*/*'; 
    fileInput.style.display = 'none';
    fileInput.id = `groupFileInput_${group.id}`;

    messageInputContainer.appendChild(fileInput);
    
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
    
    // Create Emoji Panel (Initially Hidden)
    let emojiPanel = document.getElementById('emojiPanel');
    if (!emojiPanel) {
      emojiPanel = document.createElement('div');
      emojiPanel.id = 'emojiPanel';
      emojiPanel.style.display = 'none';
      mainContent.appendChild(emojiPanel);
    }
    
    // Add components to main content
    mainContent.appendChild(chatHeader);
    mainContent.appendChild(chatMessages);
    mainContent.appendChild(messageInputContainer);
    
    // Show chat content
    mainContent.style.display = 'flex';
    
    // Setup event listeners
    paperclipButton.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        uploadGroupFile(file, group.id, chatMessages);
        event.target.value = null;
      }
    });

    emojiButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEmojiPanel(inputField);
    });

    // Focus input field
    setTimeout(() => {
      try {
        inputField.focus();
      } catch (e) {
        console.warn('Could not focus input field:', e);
      }
    }, 100);
    
    console.log('Group chat interface successfully created');
  } catch (error) {
    console.error('Error in createGroupChatInterface:', error);
    mainContent.innerHTML = `<div class="error-message">Failed to create chat interface: ${error.message}</div>`;
    throw error;
  }
}

/**
 * Upload a file to the group chat
 */
function uploadGroupFile(file, groupId, chatMessages) {
  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    showErrorNotification(`File is too large (max ${maxSize / 1024 / 1024} MB)`);
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('group_id', groupId);

  // Show temporary message
  const tempMsgId = `temp_upload_${Date.now()}`;
  const tempMsgElement = createTemporaryMessageElement(tempMsgId, `Uploading ${file.name}...`);
  addMessageElementToChat(tempMsgElement, chatMessages);

  fetch('/upload_group_file', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => {
        throw new Error(err.error || `HTTP error! status: ${response.status}`);
      }).catch(() => {
        throw new Error(`HTTP error! status: ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    removeMessageElement(tempMsgId, chatMessages);

    if (data.success && data.message) {
      addMessageToGroupChat(data.message, chatMessages);
      loadSidebar();
    } else {
      showErrorNotification(data.error || 'Failed to upload file.');
    }
  })
  .catch(error => {
    console.error('Error uploading file:', error);
    removeMessageElement(tempMsgId, chatMessages);
    showErrorNotification(`Upload failed: ${error.message}`);
  });
}

/**
 * Show group menu when chat menu button is clicked
 */
function showGroupMenu(menuButton, group) {
  let groupMenu = document.getElementById('groupDropdownMenu');
  if (!groupMenu) {
    groupMenu = document.createElement('div');
    groupMenu.id = 'groupDropdownMenu';
    groupMenu.className = 'dropdown-menu';
    document.body.appendChild(groupMenu);
  }
  
  groupMenu.innerHTML = '';
  
  const buttonRect = menuButton.getBoundingClientRect();
  
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
  groupMenu.style.left = `${buttonRect.left - 180}px`;
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
 * Load messages for a group conversation
 */
function loadGroupMessages(groupId) {
  const chatMessages = document.querySelector('.chat-messages');
  if (!chatMessages) return Promise.reject(new Error('Chat messages container not found'));
  
  chatMessages.innerHTML = '';
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'loading-messages';
  loadingIndicator.textContent = 'Loading messages...';
  loadingIndicator.style.textAlign = 'center';
  loadingIndicator.style.padding = '20px';
  loadingIndicator.style.color = '#888';
  chatMessages.appendChild(loadingIndicator);
  
  return fetchGroupMessages(groupId)
    .then(data => {
      console.log('Group messages loaded:', data);
      chatMessages.innerHTML = '';
      
      if (data.success && data.messages && data.messages.length > 0) {
        renderGroupMessages(data.messages, data.members, chatMessages);
      } else {
        const noMessages = document.createElement('div');
        noMessages.className = 'no-messages';
        noMessages.textContent = 'No messages yet';
        chatMessages.appendChild(noMessages);
      }
      
      return data;
    })
    .catch(error => {
      console.error('Error loading group messages:', error);
      
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
  
  // Map of user IDs to names
  const memberMap = {};
  members.forEach(member => {
    memberMap[member.id] = member.name;
  });
  
  // Keep track of date for separators
  let currentDate = '';
  
  // Add each message
  if (messages && messages.length > 0) {
    messages.forEach(message => {
      // Check if date changed for separators
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
 * Handle sending a message to a group
 */
function sendGroupMessageHandler(text, groupId, chatMessages) {
  if (!text.trim()) return;
  
  console.log(`Sending message to group ${groupId}: ${text}`);
  
  return sendGroupMessage(groupId, text)
    .then(data => {
      console.log('Message sent response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send message');
      }
      
      // Display new message and clean up
      addMessageToGroupChat(data.message, chatMessages);
      
      const inputField = document.querySelector('.message-input-field input');
      if (inputField) {
        inputField.value = '';
        inputField.focus();
        
        const sendButton = document.querySelector('.send-button');
        if (sendButton) sendButton.classList.remove('active');
      }
      
      // Refresh sidebar for group last message
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

// Utility/helper functions

/**
 * Creates a temporary message element (e.g., for upload status)
 */
function createTemporaryMessageElement(id, text) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message message-sent message-temporary';
  messageEl.dataset.messageId = id;
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
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

/**
 * Create a group message element
 */
function createGroupMessageElement(message, memberMap) {
  // Check if it's a system message
  const isSystem = /added|removed|admin|changed|set group|left the group|joined the group|назначен|снят|добавил|удалил|покинул|сменил|изменил|аватар|описание|название/i.test(message.content) && !message.message_type;

  if (isSystem) {
    const el = document.createElement('div');
    el.className = 'system-divider';
    el.innerHTML = `<span>${escapeHtml(message.content)}</span>`;
    return el;
  }

  const messageEl = document.createElement('div');

  // Determine if sent or received
  const currentUserIdStr = String(ChatApp.currentUser.user_id);
  const senderIdStr = String(message.sender_id);
  const isSent = senderIdStr === currentUserIdStr;

  messageEl.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
  messageEl.dataset.messageId = message.id;
  messageEl.dataset.senderId = message.sender_id;

  // Format timestamp
  const timestamp = new Date(message.timestamp);
  const timeFormatted = `${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`;

  const isEdited = message.is_edited === true;

  // Add sender name for received messages
  let senderNameHTML = '';
  if (!isSent) {
    const senderName = memberMap[message.sender_id] || message.sender_name || 'Unknown';
    senderNameHTML = `<div class="message-sender">${escapeHtml(String(senderName))}</div>`;
  }

  // Create message content based on type
  let messageContentHTML = '';
  if (message.message_type === 'file' && message.mime_type && message.original_filename && message.file_path) {
      const fileUrl = `/uploads/${message.file_path}`; 

      if (message.mime_type.startsWith('image/')) {
          messageContentHTML = `
              <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="message-image-link">
                  <img src="${fileUrl}" alt="${escapeHtml(message.original_filename)}" class="message-image-attachment" loading="lazy">
              </a>
              ${message.content ? `<div class="message-text-caption">${escapeHtml(message.content)}</div>` : ''}
          `;
      } else if (message.mime_type.startsWith('video/')) {
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
          messageContentHTML = `
              <a href="${fileUrl}" download="${escapeHtml(message.original_filename)}" class="message-file-link">
                  <div class="file-icon">📄</div>
                  <div class="file-info">
                      <div class="file-name">${escapeHtml(message.original_filename)}</div>
                  </div>
              </a>
              ${message.content && message.content !== `File: ${message.original_filename} (Upload OK, DB disabled)` ? `<div class="message-text-caption">${escapeHtml(message.content)}</div>` : ''}
          `;
      }
  } else {
      // Check if content is an image URL
      const imgLinkRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))|<a[^>]+>[^<]*\.(jpg|jpeg|png|gif|webp)<\/a>|(\w+\.(png|jpg|jpeg|gif|webp))/i;
      
      if (message.content && imgLinkRegex.test(message.content)) {
        let imageUrl = message.content;
        
        if (message.content.includes('<a href=')) {
          const hrefMatch = message.content.match(/href=["']([^"']+)["']/);
          if (hrefMatch && hrefMatch[1]) {
            imageUrl = hrefMatch[1];
          }
        }
        
        if (!/^https?:\/\//.test(imageUrl) && !/^\/uploads\//.test(imageUrl)) {
          imageUrl = `/uploads/${imageUrl}`;
        }
        
        messageContentHTML = `
          <a href="${imageUrl}" target="_blank" rel="noopener noreferrer" class="message-image-link">
            <img src="${imageUrl}" alt="Image" class="message-image-attachment" loading="lazy">
          </a>
        `;
      } else {
        messageContentHTML = escapeHtml(String(message.content || ''));
      }
  }

  messageEl.innerHTML = `
    ${senderNameHTML}
    <div class="message-content">${messageContentHTML}</div>
    <div class="message-footer">
      <div class="message-time">${timeFormatted}${isEdited ? ' <span class="edited-indicator">· Edited</span>' : ''}</div>
    </div>
  `;

  // Add context menu event listener
  messageEl.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      showGroupMessageContextMenu(e, message, messageEl, isSent);
  });

  return messageEl;
}

/**
 * Show context menu for group messages
 */
function showGroupMessageContextMenu(event, message, messageEl, isSent) {
  const existingMenu = document.getElementById('messageContextMenu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  const contextMenu = document.createElement('div');
  contextMenu.id = 'messageContextMenu';
  contextMenu.className = 'message-context-menu';
  
  let menuOptions = '';
  
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
  
  contextMenu.innerHTML = menuOptions;
  
  contextMenu.style.position = 'fixed';
  contextMenu.style.left = `${event.clientX}px`;
  contextMenu.style.top = `${event.clientY}px`;
  
  document.body.appendChild(contextMenu);
  
  // Adjust position if needed
  const menuRect = contextMenu.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) {
    contextMenu.style.left = `${window.innerWidth - menuRect.width - 5}px`;
  }
  if (menuRect.bottom > window.innerHeight) {
    contextMenu.style.top = `${window.innerHeight - menuRect.height - 5}px`;
  }
  
  // Add event listeners
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
  
  // Close on click outside
  document.addEventListener('click', function closeMenu(e) {
    if (!contextMenu.contains(e.target)) {
      contextMenu.remove();
      document.removeEventListener('click', closeMenu);
    }
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
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
