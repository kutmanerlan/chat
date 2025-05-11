/**
 * Message handling functions
 */

/**
 * Load messages for a conversation
 */
function loadMessages(userId) {
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
  return fetchMessages(userId)
    .then(data => {
      console.log('Messages loaded:', data);
      
      // Clear loading indicator
      chatMessages.innerHTML = '';
      
      // Render messages
      if (data.success && data.messages && data.messages.length > 0) {
        renderMessages(data.messages, chatMessages);
      } else {
        // Show "no messages" placeholder
        const noMessages = document.createElement('div');
        noMessages.className = 'no-messages';
        noMessages.textContent = 'No messages yet';
        chatMessages.appendChild(noMessages);
      }
    })
    .catch(error => {
      console.error('Error loading messages:', error);
      
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
 * Render messages in the chat
 */
function renderMessages(messages, chatMessages) {
  // Create messages container
  const messagesContainer = document.createElement('div');
  messagesContainer.className = 'messages-container';
  chatMessages.appendChild(messagesContainer);
  
  // Keep track of date to show date separators
  let currentDate = '';
  
  // Add each message
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
    
    const messageEl = createMessageElement(message);
    messagesContainer.appendChild(messageEl);
  });
  
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
 * Create a message element
 */
function createMessageElement(message) {
  const messageEl = document.createElement('div');
  const isSent = parseInt(message.sender_id) === parseInt(ChatApp.currentUser.user_id);
  messageEl.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
  messageEl.dataset.messageId = message.id;
  messageEl.dataset.senderId = message.sender_id;

  // Format timestamp
  const timestamp = new Date(message.timestamp);
  const hours = String(timestamp.getHours()).padStart(2, '0');
  const minutes = String(timestamp.getMinutes()).padStart(2, '0');
  const timeFormatted = `${hours}:${minutes}`;
  const isEdited = message.is_edited === true;

  // --- Unified file/image display logic ---
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
    // Default to text content if type is not 'file' or data is missing
    const imgLinkRegex = /(https?:\/\/[\S]+\.(jpg|jpeg|png|gif|webp))|<a[^>]+>[^<]*\.(jpg|jpeg|png|gif|webp)<\/a>|(\w+\.(png|jpg|jpeg|gif|webp))/i;
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
  // --- End unified logic ---

  messageEl.innerHTML = `
    <div class="message-content">${messageContentHTML}</div>
    <div class="message-footer">
      <div class="message-time">${timeFormatted}${isEdited ? ' <span class="edited-indicator">· Edited</span>' : ''}</div>
    </div>
  `;

  messageEl.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    showMessageContextMenu(e, message, messageEl);
  });

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
  if (isOwnMessage) {
    const editOption = contextMenu.querySelector('.edit-option');
    if (editOption) {
      editOption.addEventListener('click', () => {
        enterEditMode(messageEl, message.content);
        contextMenu.remove();
      });
    }
    // Delete message
    const deleteOption = contextMenu.querySelector('.delete-option');
    if (deleteOption) {
      deleteOption.addEventListener('click', () => {
        deleteMessage(message.id)
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
  
  return sendMessage(recipientId, text)
    .then(data => {
      if (!data.success) throw new Error(data.error || 'Failed to send message');
      
      // Display the new message
      addMessageToChat(data.message, chatMessages);
      
      // Clear input field
      const inputField = document.querySelector('.message-input-field input');
      if (inputField) {
        inputField.value = '';
        inputField.focus();
        
        // Update send button state
        const sendButton = document.querySelector('.send-button');
        if (sendButton) sendButton.classList.remove('active');
      }
      
      // Refresh sidebar to show updated chat list
      loadSidebar();
      
      return data;
    })
    .catch(error => {
      console.error('Error sending message:', error);
      showErrorNotification('Failed to send message. Please try again.');
      return Promise.reject(error);
    });
}

/**
 * Add a new message to the chat
 */
function addMessageToChat(message, chatMessages) {
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
  messagesContainer.appendChild(messageEl);
  
  // Scroll to the new message
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Handle file selection and send files
 */
function handleFileSelection(files, user) {
  if (!files || files.length === 0) return;
  
  // Get chat messages container
  const chatMessages = document.querySelector('.chat-messages');
  if (!chatMessages) return;
  
  // Get or create messages container
  let messagesContainer = chatMessages.querySelector('.messages-container');
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
  
  // Process each file
  Array.from(files).forEach(file => {
    // Show temporary uploading message
    const tempMsgId = `temp_upload_${Date.now()}_${Math.random()}`;
    const tempMsgElement = document.createElement('div');
    tempMsgElement.className = 'message message-sent message-temporary';
    tempMsgElement.dataset.messageId = tempMsgId;
    tempMsgElement.innerHTML = `<div class="message-content">Uploading ${file.name}...</div><div class="message-footer"><div class="message-time">Sending...</div></div>`;
    messagesContainer.appendChild(tempMsgElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Prepare FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('recipient_id', user.id);
    // Optionally, add a caption field if you want to support it
    // formData.append('caption', '');

    // Upload to backend
    fetch('/upload_direct_file', {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => { throw new Error(err.error || `HTTP error! status: ${response.status}`); });
      }
      return response.json();
    })
    .then(data => {
      // Remove temporary message
      tempMsgElement.remove();
      if (data.success && data.message) {
        addMessageToChat(data.message, chatMessages);
      } else {
        showErrorNotification(data.error || 'Failed to upload file.');
      }
    })
    .catch(error => {
      tempMsgElement.remove();
      showErrorNotification(`Upload failed: ${error.message}`);
    });
  });
}

function deleteMessage(messageId) {
  return fetch('/delete_message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: messageId })
  }).then(r => r.json());
}
