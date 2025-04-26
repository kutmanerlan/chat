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
  
  // Get group info
  getGroupInfo(groupId)
    .then(response => {
      if (!response.success) {
        console.error('Failed to get group info:', response);
        throw new Error(response.error || 'Failed to get group info');
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
        throw new Error(response.error || 'Failed to load group messages');
      }
      
      // Highlight active group in sidebar
      highlightActiveItem(groupId, 'group');
    })
    .catch(error => {
      console.error('Error opening group chat:', error);
      showErrorNotification('Failed to open group chat. Please try again.');
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
  
  // Group avatar
  const groupAvatar = document.createElement('div');
  groupAvatar.className = 'chat-user-avatar group-avatar';
  
  // Use avatar path if available
  if (group.avatar_path) {
    // Make sure the avatar path is correctly formatted with URL prefix if needed
    let avatarSrc = group.avatar_path;
    // Check if the path needs a static URL prefix
    if (!avatarSrc.startsWith('http') && !avatarSrc.startsWith('/static/')) {
      avatarSrc = `/static/${avatarSrc}`;
    }
    groupAvatar.innerHTML = `<img src="${avatarSrc}" alt="${group.name}" class="avatar-image">`;
  } else {
    // For numeric group names, use 'G' as the initial instead of a number
    const isNumericOnly = /^\d+$/.test(group.name);
    const initial = isNumericOnly ? 'G' : group.name.charAt(0);
    groupAvatar.innerHTML = `<div class="avatar-initials">${initial}</div>`;
  }
  
  // Group name and member count
  const groupNameEl = document.createElement('div');
  groupNameEl.className = 'chat-user-name';
  groupNameEl.textContent = group.name;
  
  const memberCount = document.createElement('div');
  memberCount.className = 'chat-group-members';
  memberCount.textContent = `${group.member_count || 0} members`;
  
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
  groupInfo.appendChild(groupAvatar);
  groupInfo.appendChild(groupNameEl);
  groupInfo.appendChild(memberCount);
  
  chatHeader.appendChild(groupInfo);
  chatHeader.appendChild(menuButton);
  
  clipButtonContainer.appendChild(paperclipButton);
  messageInputField.appendChild(inputField);
  
  inputWrapper.appendChild(clipButtonContainer);
  inputWrapper.appendChild(messageInputField);
  inputWrapper.appendChild(sendButton);
  
  messageInputContainer.appendChild(inputWrapper);
  
  mainContent.appendChild(chatHeader);
  mainContent.appendChild(chatMessages);
  mainContent.appendChild(messageInputContainer);
  
  // Show chat content
  mainContent.style.display = 'flex';
  
  // Focus input field
  inputField.focus();
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
  console.log('View members for group:', group.id);
  showNotImplementedNotification('View members');
}

function showAddMembers(group) {
  console.log('Add members to group:', group.id);
  showNotImplementedNotification('Add members');
}

function showEditGroup(group) {
  console.log('Edit group:', group.id);
  showNotImplementedNotification('Edit group');
}

function showLeaveGroupConfirmation(group) {
  console.log('Leave group:', group.id);
  showNotImplementedNotification('Leave group');
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
  
  // Close menu when clicking elsewhere
  document.addEventListener('click', function closeMenu(e) {
    if (!contextMenu.contains(e.target)) {
      contextMenu.remove();
      document.removeEventListener('click', closeMenu);
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      contextMenu.remove();
      document.removeEventListener('keydown', escHandler);
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
  const messageEl = document.createElement('div');
  
  // Determine if this is a sent or received message
  const isSent = parseInt(message.sender_id) === parseInt(ChatApp.currentUser.user_id);
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
    senderNameHTML = `<div class="message-sender">${escapeHtml(senderName)}</div>`;
  }
  
  // Using a completely direct approach to ensure time displays
  messageEl.innerHTML = `
    ${senderNameHTML}
    <div class="message-content">${escapeHtml(message.content)}</div>
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
