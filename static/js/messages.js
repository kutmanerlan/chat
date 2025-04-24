/**
 * Message handling functions
 */

/**
 * Load messages for a conversation
 */
function loadMessages(userId) {
  console.log(`[Messages] Loading messages for user ID: ${userId}`);
  
  const chatMessages = document.querySelector('.chat-messages');
  if (!chatMessages) {
    console.error('[Messages] Chat messages container not found');
    return Promise.reject(new Error('Chat messages container not found'));
  }
  
  // Show loading indicator
  chatMessages.innerHTML = '<div class="loading-messages">Loading messages...</div>';
  
  // Check if userId is valid
  if (!userId) {
    console.error('[Messages] Invalid user ID provided to loadMessages');
    chatMessages.innerHTML = '<div class="error-message">Error: Invalid conversation</div>';
    return Promise.reject(new Error('Invalid user ID'));
  }
  
  // Store pagination info
  if (typeof ChatApp !== 'undefined') {
    ChatApp.messagePage = 1;
    ChatApp.messageLimit = 30; // Load only 30 messages at a time
    ChatApp.hasMoreMessages = true;
    ChatApp.currentChatId = userId;
  } else {
    console.warn('[Messages] ChatApp not defined, falling back to local variables');
    window.messagePage = 1;
    window.messageLimit = 30;
    window.hasMoreMessages = true;
    window.currentChatId = userId;
  }
  
  // Fetch messages with pagination
  return fetchMessages(userId, 1, typeof ChatApp !== 'undefined' ? ChatApp.messageLimit : 30)
    .then(data => {
      console.log(`[Messages] Fetched ${data.messages ? data.messages.length : 0} messages`);
      
      // Clear loading indicator
      chatMessages.innerHTML = '';
      
      // Create messages container
      const messagesContainer = document.createElement('div');
      messagesContainer.className = 'messages-container';
      chatMessages.appendChild(messagesContainer);
      
      // Check if we have messages
      if (data.success && data.messages && data.messages.length > 0) {
        // Add load more button if needed
        if (data.messages.length >= (typeof ChatApp !== 'undefined' ? ChatApp.messageLimit : 30)) {
          addLoadMoreButton(chatMessages, userId);
        } else {
          if (typeof ChatApp !== 'undefined') {
            ChatApp.hasMoreMessages = false;
          } else {
            window.hasMoreMessages = false;
          }
        }
        
        renderMessages(data.messages, chatMessages);
      } else {
        // Show "no messages" placeholder
        const noMessages = document.createElement('div');
        noMessages.className = 'no-messages';
        noMessages.textContent = 'No messages yet';
        messagesContainer.appendChild(noMessages);
      }
      
      return data;
    })
    .catch(error => {
      console.error('[Messages] Error loading messages:', error);
      
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
 * Add "Load More" button for pagination
 */
function addLoadMoreButton(chatMessages, userId) {
  // Create container for the button
  const loadMoreContainer = document.createElement('div');
  loadMoreContainer.className = 'load-more-container';
  loadMoreContainer.style.textAlign = 'center';
  loadMoreContainer.style.padding = '15px 0';
  loadMoreContainer.style.marginBottom = '10px';
  
  // Create the button
  const loadMoreButton = document.createElement('button');
  loadMoreButton.className = 'load-more-btn';
  loadMoreButton.textContent = 'Load older messages';
  loadMoreButton.style.padding = '8px 15px';
  loadMoreButton.style.backgroundColor = '#333';
  loadMoreButton.style.border = 'none';
  loadMoreButton.style.borderRadius = '4px';
  loadMoreButton.style.color = 'white';
  loadMoreButton.style.cursor = 'pointer';
  
  // Add click handler
  loadMoreButton.addEventListener('click', function() {
    // Change button to loading state
    loadMoreButton.textContent = 'Loading...';
    loadMoreButton.disabled = true;
    
    // Load next page of messages
    ChatApp.messagePage++;
    
    fetchMessages(userId, ChatApp.messagePage, ChatApp.messageLimit)
      .then(data => {
        if (data.success && data.messages && data.messages.length > 0) {
          // Get current scroll position
          const scrollPos = chatMessages.scrollHeight - chatMessages.scrollTop;
          
          // Prepend messages to the beginning 
          const messagesContainer = chatMessages.querySelector('.messages-container');
          const oldHeight = chatMessages.scrollHeight;
          
          // Render messages at the top
          const fragment = document.createDocumentFragment();
          data.messages.forEach(message => {
            const messageEl = createMessageElement(message);
            messageEl.classList.add('message-visible'); // Make immediately visible
            fragment.appendChild(messageEl);
          });
          
          // Insert at the beginning, before the load more button
          messagesContainer.insertBefore(fragment, messagesContainer.firstChild);
          
          // Maintain scroll position
          chatMessages.scrollTop = chatMessages.scrollHeight - scrollPos;
          
          // Update load more button state
          if (data.messages.length < ChatApp.messageLimit) {
            // No more messages to load
            loadMoreContainer.remove();
            ChatApp.hasMoreMessages = false;
          } else {
            // Reset button state
            loadMoreButton.textContent = 'Load older messages';
            loadMoreButton.disabled = false;
          }
        } else {
          // No more messages
          loadMoreContainer.remove();
          ChatApp.hasMoreMessages = false;
        }
      })
      .catch(error => {
        console.error('Error loading more messages:', error);
        loadMoreButton.textContent = 'Failed to load. Try again';
        loadMoreButton.disabled = false;
      });
  });
  
  // Add button to container
  loadMoreContainer.appendChild(loadMoreButton);
  
  // Add to DOM
  const messagesContainer = chatMessages.querySelector('.messages-container') || chatMessages;
  messagesContainer.insertBefore(loadMoreContainer, messagesContainer.firstChild);
}

/**
 * Render messages in the chat
 */
function renderMessages(messages, chatMessages) {
  console.log(`[Messages] Rendering ${messages.length} messages`);
  
  // Create messages container if it doesn't exist
  let messagesContainer = chatMessages.querySelector('.messages-container');
  if (!messagesContainer) {
    messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    chatMessages.appendChild(messagesContainer);
  }
  
  // Clear any existing "no messages" elements
  const noMessagesElement = messagesContainer.querySelector('.no-messages');
  if (noMessagesElement) {
    messagesContainer.removeChild(noMessagesElement);
  }
  
  // Limit the number of DOM elements for performance
  const maxVisibleMessages = 100; // Maximum messages to keep in DOM
  const currentMessages = messagesContainer.querySelectorAll('.message');
  
  // If we already have too many messages, remove oldest ones
  if (currentMessages.length > maxVisibleMessages) {
    for (let i = 0; i < currentMessages.length - maxVisibleMessages; i++) {
      if (currentMessages[i] && currentMessages[i].parentNode) {
        currentMessages[i].parentNode.removeChild(currentMessages[i]);
      }
    }
  }
  
  // Create a document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  // Add each message to the fragment
  messages.forEach(message => {
    try {
      const messageEl = createMessageElement(message);
      fragment.appendChild(messageEl);
    } catch(err) {
      console.error('[Messages] Error creating message element:', err, message);
    }
  });
  
  // Append all messages at once
  messagesContainer.appendChild(fragment);
  
  // Use requestAnimationFrame for smoother scrolling
  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Make messages visible with a slight delay for animation
    setTimeout(() => {
      const newMessages = messagesContainer.querySelectorAll('.message:not(.message-visible)');
      newMessages.forEach(msg => msg.classList.add('message-visible'));
    }, 50);
  });
}

/**
 * Create a message element
 */
function createMessageElement(message) {
  const messageEl = document.createElement('div');
  
  // Determine if this is a sent or received message
  let isSent;
  
  // Handle case when ChatApp is not defined
  if (typeof ChatApp !== 'undefined' && ChatApp.currentUser) {
    isSent = parseInt(message.sender_id) === parseInt(ChatApp.currentUser.user_id);
  } else {
    // Fallback to session user_id if available
    const userId = document.body.getAttribute('data-user-id');
    isSent = userId && parseInt(message.sender_id) === parseInt(userId);
  }
  
  messageEl.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
  messageEl.dataset.messageId = message.id;
  messageEl.dataset.senderId = message.sender_id;
  
  // Format timestamp
  const timestamp = new Date(message.timestamp);
  const hours = String(timestamp.getHours()).padStart(2, '0');
  const minutes = String(timestamp.getMinutes()).padStart(2, '0');
  
  // Check if is_edited exists, default to false if not
  const isEdited = message.is_edited === true;
  
  // Check if this is a file message
  let contentHTML = '';
  
  if (message.content && message.content.startsWith('FILE:')) {
    // Parse file information
    const [prefix, filePath, fileName, isImage] = message.content.split(':');
    const isImageFile = isImage === 'true';
    
    // Append file class
    messageEl.classList.add('message-file');
    
    if (isImageFile) {
      // Display image
      contentHTML = `
        <div class="message-content">
          <div class="message-image">
            <img src="${filePath}" alt="${fileName}" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
          </div>
          <div class="message-file-name">${fileName}</div>
        </div>
      `;
    } else {
      // Create appropriate icon based on file extension
      const fileExt = fileName.split('.').pop().toLowerCase();
      let iconSvg = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      `;
      
      contentHTML = `
        <div class="message-content">
          <div class="message-file-icon">${iconSvg}</div>
          <div class="message-file-name">
            <a href="${filePath}" target="_blank" download="${fileName}">${fileName}</a>
          </div>
        </div>
      `;
    }
  } else {
    // Regular text message
    const content = message.content || '';
    contentHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
  }
  
  const timeHTML = `<div class="message-time">
    ${hours}:${minutes}
    ${isEdited ? '<span class="edited-indicator">· Edited</span>' : ''}
  </div>`;
  
  messageEl.innerHTML = contentHTML + timeHTML;
  
  // Add context menu event listener
  messageEl.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    if (typeof showMessageContextMenu === 'function') {
      showMessageContextMenu(e, message, messageEl);
    }
  });
  
  // Add appearance animation
  setTimeout(() => {
    messageEl.classList.add('message-visible');
  }, 10);
  
  return messageEl;
}

/**
 * Show message context menu
 */
function showMessageContextMenu(event, message, messageEl) {
  // Remove any existing message menu
  const existingMenu = document.getElementById('messageContextMenu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // Create menu element
  const contextMenu = document.createElement('div');
  contextMenu.id = 'messageContextMenu';
  contextMenu.className = 'message-context-menu';
  
  // Determine if this is the user's own message
  const isOwnMessage = parseInt(message.sender_id) === parseInt(ChatApp.currentUser.user_id);
  
  // Create menu options
  let menuOptions = '';
  
  // Edit option (only for own messages)
  if (isOwnMessage) {
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
  if (isOwnMessage) {
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
 * Enter edit mode for a message
 */
function enterEditMode(messageEl, originalContent) {
  // Get the message content element
  const contentEl = messageEl.querySelector('.message-content');
  if (!contentEl) return;
  
  // Create an input field
  const inputEl = document.createElement('div');
  inputEl.className = 'message-edit-input';
  inputEl.contentEditable = 'true';
  inputEl.textContent = originalContent;
  inputEl.spellcheck = true;
  
  // Replace content with input
  contentEl.replaceWith(inputEl);
  
  // Focus and position cursor at the end
  inputEl.focus();
  const range = document.createRange();
  range.selectNodeContents(inputEl);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Add buttons for save and cancel
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'message-edit-buttons';
  buttonContainer.innerHTML = `
    <button class="save-edit-btn">Save</button>
    <button class="cancel-edit-btn">Cancel</button>
  `;
  messageEl.appendChild(buttonContainer);
  
  // Save button click handler
  const saveBtn = buttonContainer.querySelector('.save-edit-btn');
  saveBtn.addEventListener('click', () => {
    saveMessageEdit(messageEl, inputEl.textContent);
  });
  
  // Cancel button click handler
  const cancelBtn = buttonContainer.querySelector('.cancel-edit-btn');
  cancelBtn.addEventListener('click', () => {
    cancelMessageEdit(messageEl, originalContent);
  });
  
  // Handle Enter key to save
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveMessageEdit(messageEl, inputEl.textContent);
    } else if (e.key === 'Escape') {
      cancelMessageEdit(messageEl, originalContent);
    }
  });
}

/**
 * Save edited message
 */
function saveMessageEdit(messageEl, newContent) {
  const messageId = messageEl.dataset.messageId;
  if (!messageId) return;
  
  // Don't save if content is empty
  if (!newContent.trim()) {
    showErrorNotification('Message cannot be empty');
    return;
  }
  
  // Show loading indicator
  const inputEl = messageEl.querySelector('.message-edit-input');
  const buttonContainer = messageEl.querySelector('.message-edit-buttons');
  if (inputEl) inputEl.setAttribute('disabled', 'true');
  if (buttonContainer) buttonContainer.classList.add('disabled');
  
  // Call API to update message
  editMessage(messageId, newContent)
    .then(data => {
      if (data.success) {
        updateMessageDisplay(messageEl, data.message);
      } else {
        throw new Error(data.error || 'Failed to edit message');
      }
    })
    .catch(error => {
      showErrorNotification(error.message || 'Failed to edit message');
      // Restore input
      if (inputEl) inputEl.removeAttribute('disabled');
      if (buttonContainer) buttonContainer.classList.remove('disabled');
    });
}

/**
 * Cancel message editing
 */
function cancelMessageEdit(messageEl, originalContent) {
  // Remove edit input and buttons
  const inputEl = messageEl.querySelector('.message-edit-input');
  const buttonContainer = messageEl.querySelector('.message-edit-buttons');
  
  if (inputEl) {
    // Create content element
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = originalContent;
    
    // Replace input with content
    inputEl.replaceWith(contentEl);
  }
  
  if (buttonContainer) {
    messageEl.removeChild(buttonContainer);
  }
}

/**
 * Update message display after edit
 */
function updateMessageDisplay(messageEl, message) {
  // Remove edit input and buttons
  const inputEl = messageEl.querySelector('.message-edit-input');
  const buttonContainer = messageEl.querySelector('.message-edit-buttons');
  
  if (inputEl) {
    // Create content element
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = message.content;
    
    // Replace input with content
    inputEl.replaceWith(contentEl);
  }
  
  if (buttonContainer) {
    messageEl.removeChild(buttonContainer);
  }
  
  // Update time element to include edited indicator
  const timeEl = messageEl.querySelector('.message-time');
  if (timeEl) {
    const timestamp = new Date(message.timestamp);
    const hours = String(timestamp.getHours()).padStart(2, '0');
    const minutes = String(timestamp.getMinutes()).padStart(2, '0');
    
    timeEl.innerHTML = `
      ${hours}:${minutes}
      ${message.is_edited ? '<span class="edited-indicator">· Edited</span>' : ''}
    `;
  }
}

/**
 * Handle sending a message
 * @param {string} text - The message text to send
 * @param {number} recipientId - The ID of the message recipient
 * @param {HTMLElement} chatMessages - The chat messages container element
 * @returns {Promise} - A promise that resolves when the message is sent
 */
function sendMessageHandler(text, recipientId, chatMessages) {
  if (!text.trim()) return;
  
  console.log(`Sending message to ${recipientId}: ${text}`);
  
  // Check if this might be the first message to this user
  const isNewContact = isFirstMessageToUser(recipientId);
  if (isNewContact) {
    console.log('This appears to be a new contact, ensuring contact is created first');
    // Add the user to contacts immediately before sending the message
    addUserToContacts(recipientId);
  }
  
  // Create a temporary message element to show immediately
  const tempMessage = createTempMessage(text);
  
  // Get or create messages container
  let messagesContainer = chatMessages.querySelector('.messages-container');
  if (!messagesContainer) {
    messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    chatMessages.appendChild(messagesContainer);
  }
  
  // Add the temp message to the chat
  messagesContainer.appendChild(tempMessage);
  
  // Scroll to the new message
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Clear input field immediately for better UX
  const inputField = document.querySelector('.message-input-field input');
  if (inputField) {
    inputField.value = '';
    
    // Update send button state
    const sendButton = document.querySelector('.send-button');
    if (sendButton) sendButton.classList.remove('active');
  }
  
  // Send the message to the server
  return fetch('/send_message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipient_id: recipientId,
      content: text
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Message sent successfully:', data);
    
    // Remove the temporary message
    if (tempMessage && tempMessage.parentNode) {
      tempMessage.parentNode.removeChild(tempMessage);
    }
    
    // Add the real message with server data
    if (data.success && data.message) {
      addMessageToChat(data.message, chatMessages);
      
      // If this was a new contact, refresh the sidebar to show the new chat
      if (isNewContact) {
        console.log('Refreshing sidebar after first message to new contact');
        // Force refresh the sidebar immediately
        if (typeof loadSidebar === 'function') {
          loadSidebar();
        }
        
        // Remove any error notifications that might have appeared
        if (typeof removeErrorNotificationByText === 'function') {
          removeErrorNotificationByText('Failed to send message');
        }
      } else {
        // Just update the single chat entry for existing contacts
        updateChatInSidebar(recipientId, text, data.message.timestamp);
      }
    } else {
      throw new Error(data.error || 'Failed to send message');
    }
    
    return data;
  })
  .catch(error => {
    console.error('Error sending message:', error);
    
    // Replace temp message with error message
    if (tempMessage && tempMessage.parentNode) {
      tempMessage.classList.add('message-error');
      const contentDiv = tempMessage.querySelector('.message-content');
      if (contentDiv) {
        contentDiv.innerHTML += '<div class="message-error-text">Failed to send</div>';
      }
    }
    
    // Show error notification
    if (typeof showErrorNotification === 'function') {
      showErrorNotification('Failed to send message. Please try again.');
    }
    
    return Promise.reject(error);
  });
}

/**
 * Check if this is the first message to a user
 * @param {number} userId - The user ID to check
 * @returns {boolean} - True if this is the first message to the user
 */
function isFirstMessageToUser(userId) {
  // Convert userId to string for comparison
  const userIdStr = userId.toString();
  
  // Check if user exists in the sidebar
  const contactItems = document.querySelectorAll('.contact-item');
  for (let item of contactItems) {
    if (item.dataset.userId === userIdStr) {
      return false; // User found in sidebar
    }
  }
  
  console.log(`User ${userId} not found in sidebar, likely first message`);
  return true; // User not found in sidebar
}

/**
 * Add a user to contacts
 * @param {number} userId - The user ID to add to contacts
 */
function addUserToContacts(userId) {
  console.log(`Adding user ${userId} to contacts before sending message`);
  
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
      console.log('Successfully added contact:', data);
      // Force refresh sidebar immediately
      if (typeof loadSidebar === 'function') {
        loadSidebar();
      }
    } else {
      console.warn('Failed to add contact or already exists:', data);
    }
  })
  .catch(error => {
    console.error('Error adding contact:', error);
  });
}

/**
 * Update a single chat in the sidebar after sending a message
 * @param {number} userId - The user ID to update
 * @param {string} lastMessage - The last message text
 * @param {string} timestamp - The message timestamp
 */
function updateChatInSidebar(userId, lastMessage, timestamp) {
  // Use updateSingleChat if it exists
  if (typeof updateSingleChat === 'function') {
    const chatData = {
      user_id: userId,
      last_message: lastMessage,
      last_message_time: timestamp,
      unread_count: 0 // It's our message, so no unread count
    };
    
    updateSingleChat(chatData);
  }
}

/**
 * Create a temporary message element
 * @param {string} text - The message text
 * @returns {HTMLElement} - The message element
 */
function createTempMessage(text) {
  const message = document.createElement('div');
  message.className = 'message message-sent message-pending';
  
  const timestamp = new Date();
  const hours = String(timestamp.getHours()).padStart(2, '0');
  const minutes = String(timestamp.getMinutes()).padStart(2, '0');
  
  message.innerHTML = `
    <div class="message-content">${escapeHtml(text)}</div>
    <div class="message-time">
      ${hours}:${minutes}
      <span class="message-status">Sending...</span>
    </div>
  `;
  
  return message;
}

/**
 * Handle file selection and send files
 */
function handleFileSelection(files, user) {
  if (!files || files.length === 0) return;
  
  // Get chat messages container
  const chatMessages = document.querySelector('.chat-messages');
  if (!chatMessages) return;
  
  // Process each file
  Array.from(files).forEach(file => {
    // Create a loading message placeholder
    const loadingMessage = createLoadingFileMessage(file);
    
    // Add to chat
    let messagesContainer = chatMessages.querySelector('.messages-container');
    if (!messagesContainer) {
      messagesContainer = document.createElement('div');
      messagesContainer.className = 'messages-container';
      chatMessages.appendChild(messagesContainer);
    }
    messagesContainer.appendChild(loadingMessage);
    
    // Scroll to the loading message
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('recipient_id', user.id);
    
    // Send file to server
    fetch('/upload_message_file', {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (!response.ok) throw new Error('Failed to upload file');
      return response.json();
    })
    .then(data => {
      if (data.success) {
        // Replace loading message with actual message
        messagesContainer.removeChild(loadingMessage);
        addMessageToChat(data.message, chatMessages);
        
        // Refresh sidebar
        loadSidebar();
      } else {
        throw new Error(data.error || 'Failed to upload file');
      }
    })
    .catch(error => {
      console.error('Error uploading file:', error);
      
      // Remove loading message
      messagesContainer.removeChild(loadingMessage);
      
      // Show error notification
      showErrorNotification('Failed to upload file: ' + error.message);
    });
  });
}

/**
 * Create a loading message for file upload
 */
function createLoadingFileMessage(file) {
  const message = document.createElement('div');
  message.className = 'message message-sent message-file message-loading';
  
  // Format timestamp
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  // Determine file type
  const isImage = file.type.startsWith('image/');
  const fileExt = file.name.split('.').pop().toLowerCase();
  
  // Create content based on file type
  let fileContent = '';
  
  if (isImage) {
    // For images, show a preview
    const imageUrl = URL.createObjectURL(file);
    fileContent = `
      <div class="message-content">
        <div class="message-image">
          <img src="${imageUrl}" alt="${file.name}" style="max-width: 200px; max-height: 200px; border-radius: 8px; opacity: 0.7;">
          <div class="upload-overlay">
            <div class="upload-spinner"></div>
          </div>
        </div>
        <div class="message-file-name">${file.name} (${formatFileSize(file.size)})</div>
      </div>
    `;
  } else {
    // For other files, show appropriate icon
    let iconSvg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
    `;
    
    fileContent = `
      <div class="message-content">
        <div class="message-file-icon">
          ${iconSvg}
          <div class="upload-overlay">
            <div class="upload-spinner"></div>
          </div>
        </div>
        <div class="message-file-name">${file.name} (${formatFileSize(file.size)})</div>
      </div>
    `;
  }
  
  // Add time
  message.innerHTML = `
    ${fileContent}
    <div class="message-time">${hours}:${minutes} · Uploading...</div>
  `;
  
  return message;
}

// Helper function for fetchMessages if it's missing
if (typeof fetchMessages !== 'function') {
  console.warn('[Messages] fetchMessages not found, creating fallback function');
  window.fetchMessages = function(userId, page = 1, limit = 30, lastMessageId = 0) {
    let url = `/get_messages?user_id=${userId}&page=${page}&limit=${limit}`;
    
    if (lastMessageId > 0) {
      url += `&last_message_id=${lastMessageId}`;
    }
    
    return fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        return response.json();
      });
  };
}

// Helper function to escape HTML if it's missing
if (typeof escapeHtml !== 'function') {
  console.warn('[Messages] escapeHtml not found, creating function');
  window.escapeHtml = function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };
}

// Helper function for formatFileSize if it's missing
if (typeof formatFileSize !== 'function') {
  console.warn('[Messages] formatFileSize not found, creating function');
  window.formatFileSize = function(bytes) {
    if (!bytes) return '0 bytes';
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
}

/**
 * Direct fix for message sending
 */
function fixMessageSending() {
  console.log('[FIX] Installing direct message sending fix');
  
  // Find all necessary elements
  const chatMessages = document.querySelector('.chat-messages');
  const messageInput = document.querySelector('.message-input-field input');
  const sendButton = document.querySelector('.send-button');
  
  if (!chatMessages || !messageInput || !sendButton) {
    console.error('[FIX] Could not find all required elements for message sending');
    return;
  }
  
  // Get the recipient ID from the active chat
  let recipientId = null;
  if (typeof ChatApp !== 'undefined' && ChatApp.activeChat) {
    recipientId = ChatApp.activeChat.userId;
  } else {
    // Try to extract recipient ID from the URL or data attributes
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader) {
      recipientId = chatHeader.getAttribute('data-user-id');
    }
  }
  
  if (!recipientId) {
    console.error('[FIX] Could not determine recipient ID');
    return;
  }
  
  console.log(`[FIX] Setting up message handlers for recipient ${recipientId}`);
  
  // Set up input handler
  messageInput.addEventListener('input', function() {
    if (this.value.trim()) {
      sendButton.classList.add('active');
    } else {
      sendButton.classList.remove('active');
    }
  });
  
  // Set up keydown handler
  messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey && this.value.trim()) {
      e.preventDefault();
      const text = this.value.trim();
      console.log(`[FIX] Sending message via Enter key: ${text}`);
      sendDirectMessage(text, recipientId, chatMessages);
    }
  });
  
  // Set up click handler
  sendButton.addEventListener('click', function() {
    const text = messageInput.value.trim();
    if (text) {
      console.log(`[FIX] Sending message via button click: ${text}`);
      sendDirectMessage(text, recipientId, chatMessages);
    }
  });
  
  console.log('[FIX] Message sending fix installed');
}

/**
 * Direct message sending implementation
 */
function sendDirectMessage(text, recipientId, chatMessages) {
  // Create a temporary message immediately
  const tempMessageEl = document.createElement('div');
  tempMessageEl.className = 'message message-sent message-pending';
  
  // Format timestamp
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  // Add content
  tempMessageEl.innerHTML = `
    <div class="message-content">${escapeHtml(text)}</div>
    <div class="message-time">
      ${hours}:${minutes}
      <span class="message-status">Sending...</span>
    </div>
  `;
  
  // Find or create messages container
  let messagesContainer = chatMessages.querySelector('.messages-container');
  if (!messagesContainer) {
    console.log('[FIX] Creating messages container as it does not exist');
    messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    chatMessages.appendChild(messagesContainer);
  }
  
  // Add the temp message
  messagesContainer.appendChild(tempMessageEl);
  
  // Make it visible
  setTimeout(() => {
    tempMessageEl.classList.add('message-visible');
  }, 10);
  
  // Scroll to the new message
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Clear the input field
  const messageInput = document.querySelector('.message-input-field input');
  if (messageInput) {
    messageInput.value = '';
    
    // Update send button state
    const sendButton = document.querySelector('.send-button');
    if (sendButton) sendButton.classList.remove('active');
  }
  
  // Send the actual message to the server
  fetch('/send_message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipient_id: recipientId,
      content: text
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('[FIX] Message sent successfully:', data);
    
    // Remove the temporary message
    if (tempMessageEl && tempMessageEl.parentNode) {
      tempMessageEl.parentNode.removeChild(tempMessageEl);
    }
    
    // Add the real message with server data
    if (data.success && data.message) {
      addMessageToChat(data.message, chatMessages);
      
      // Update sidebar chat entry without refreshing the whole sidebar
      if (typeof updateSingleChat === 'function') {
        // Create updated chat object for the sidebar
        const chatData = {
          user_id: recipientId,
          last_message: text,
          last_message_time: data.message.timestamp,
          unread_count: 0 // It's our message, so no unread count
        };
        
        updateSingleChat(chatData);
      } else {
        // Fallback to old method
        setTimeout(() => {
          console.log('[FIX] Refreshing sidebar after successful message');
          if (typeof loadSidebar === 'function') {
            loadSidebar();
          }
        }, 500);
      }
    } else {
      throw new Error(data.error || 'Failed to send message');
    }
  })
  .catch(error => {
    console.error('[FIX] Error sending message:', error);
    
    // Show error on temporary message
    if (tempMessageEl && tempMessageEl.parentNode) {
      tempMessageEl.classList.add('message-error');
      const contentDiv = tempMessageEl.querySelector('.message-content');
      if (contentDiv) {
        contentDiv.innerHTML += '<div class="message-error-text">Failed to send</div>';
      }
    }
    
    // Show error notification
    if (typeof showErrorNotification === 'function') {
      showErrorNotification('Failed to send message. Please try again.');
    }
  });
}

// Make sure to add this CSS to the page for the fixing
function addFixStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .message-pending {
      opacity: 0.7;
    }
    .message-status {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.6);
      margin-left: 5px;
    }
    .message-error .message-content {
      position: relative;
    }
    .message-error-text {
      color: #e57373;
      font-size: 11px;
      margin-top: 4px;
      font-style: italic;
    }
    .message {
      max-width: 50%;
      padding: 10px 12px;
      position: relative;
      margin-bottom: 6px;
      line-height: 1.4;
      border-radius: 8px;
      animation: fadeIn 0.2s ease-out;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.2s ease-out, transform 0.2s ease-out;
    }
    .message-visible {
      opacity: 1;
      transform: translateY(0);
    }
    .message-sent {
      background-color: #b4b4b4;
      color: white;
      align-self: flex-end;
      border-radius: 8px 8px 2px 8px;
      margin-left: auto;
    }
    .message-received {
      background-color: #222222;
      color: white;
      align-self: flex-start;
      border-radius: 8px 8px 8px 2px;
      margin-right: auto;
    }
    .messages-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }
  `;
  document.head.appendChild(styleEl);
}

// Call this function when DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for other scripts to initialize
  setTimeout(() => {
    // Add the fix styles first
    addFixStyles();
    
    // Set up a mutation observer to detect when chat is opened
    const observer = new MutationObserver(function(mutations) {
      for (let mutation of mutations) {
        if (mutation.addedNodes.length) {
          // Check if a chat container was added
          const chatContainer = document.querySelector('.chat-container');
          if (chatContainer) {
            console.log('[FIX] Detected chat container, applying message sending fix');
            fixMessageSending();
          }
        }
      }
    });
    
    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also try to fix immediately if chat is already open
    const existingChat = document.querySelector('.chat-container');
    if (existingChat) {
      console.log('[FIX] Found existing chat container, applying message sending fix');
      fixMessageSending();
    }
  }, 500);
});
