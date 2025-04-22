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
 */
function sendMessageHandler(text, recipientId, chatMessages) {
  if (!text.trim()) return;
  
  console.log(`Sending message to ${recipientId}: ${text}`);
  
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
    const oldText = inputField.value;
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
      
      // Refresh sidebar to show updated chat list after a short delay
      setTimeout(() => {
        if (typeof loadSidebar === 'function') {
          loadSidebar();
        }
      }, 500);
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
 * Create a temporary message while sending
 */
function createTempMessage(text) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message message-sent message-pending';
  
  // Format timestamp for current time
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  // Add message content and time
  messageEl.innerHTML = `
    <div class="message-content">${escapeHtml(text)}</div>
    <div class="message-time">
      ${hours}:${minutes}
      <span class="message-status">Sending...</span>
    </div>
  `;
  
  // Add appearance animation
  setTimeout(() => {
    messageEl.classList.add('message-visible');
  }, 10);
  
  return messageEl;
}

/**
 * Add a new message to the chat
 * @param {Object} message - The message object
 * @param {Element} chatMessages - The chat messages container element
 * @param {boolean} isNewMessage - Whether this is a newly received message
 */
function addMessageToChat(message, chatMessages, isNewMessage = false) {
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
  
  // Create and add the message element
  const messageEl = createMessageElement(message);
  
  // If this is a new message that appeared during polling,
  // add a special animation class
  if (isNewMessage) {
    messageEl.classList.add('message-new');
    
    // Play notification sound if message is from other user
    if (parseInt(message.sender_id) !== parseInt(ChatApp.currentUser.user_id)) {
      playMessageSound();
    }
  }
  
  messagesContainer.appendChild(messageEl);
  
  // Scroll to the new message
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Play message notification sound
 */
function playMessageSound() {
  // Create audio element if it doesn't exist
  let messageSound = document.getElementById('message-notification-sound');
  if (!messageSound) {
    messageSound = document.createElement('audio');
    messageSound.id = 'message-notification-sound';
    messageSound.src = '/static/sounds/message.mp3'; // You'll need to add this file
    messageSound.volume = 0.5;
    document.body.appendChild(messageSound);
  }
  
  // Play the sound
  messageSound.play().catch(error => {
    console.log('Could not play notification sound:', error);
  });
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
