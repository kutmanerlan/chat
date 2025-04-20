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
  
  // Add each message
  messages.forEach(message => {
    const messageEl = createMessageElement(message);
    messagesContainer.appendChild(messageEl);
  });
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Create a message element
 */
function createMessageElement(message) {
  const messageEl = document.createElement('div');
  
  // Determine if this is a sent or received message
  const isSent = parseInt(message.sender_id) === parseInt(ChatApp.currentUser.user_id);
  messageEl.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
  messageEl.dataset.messageId = message.id;
  
  // Format timestamp
  const timestamp = new Date(message.timestamp);
  const hours = String(timestamp.getHours()).padStart(2, '0');
  const minutes = String(timestamp.getMinutes()).padStart(2, '0');
  
  // Add message content
  messageEl.innerHTML = `
    <div class="message-content">${escapeHtml(message.content)}</div>
    <div class="message-time">${hours}:${minutes}</div>
  `;
  
  return messageEl;
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
      
      // Refresh conversations list
      loadRecentConversations();
      
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
    // Create message element to show the file
    const message = document.createElement('div');
    message.className = 'message message-sent message-file';
    
    // Format timestamp
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    // Determine file type and create content
    const isImage = file.type.startsWith('image/');
    let fileContent;
    
    if (isImage) {
      const imageUrl = URL.createObjectURL(file);
      fileContent = `
        <div class="message-image">
          <img src="${imageUrl}" alt="${file.name}" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
        </div>
        <div class="message-file-name">${file.name} (${formatFileSize(file.size)})</div>
      `;
    } else {
      // Icon based on file type
      let iconSvg = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      `;
      
      fileContent = `
        <div class="message-file-icon">${iconSvg}</div>
        <div class="message-file-name">${file.name} (${formatFileSize(file.size)})</div>
      `;
    }
    
    // Add content to message
    message.innerHTML = `
      ${fileContent}
      <div class="message-time">${hours}:${minutes}</div>
    `;
    
    // Add message to container
    messagesContainer.appendChild(message);
    
    // Scroll to new message
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // TODO: Send file to server (implement server-side handling)
    // This would involve using FormData and fetch to upload the file
  });
}
