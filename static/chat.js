/**
 * Chat Application - Core Messaging System
 * A complete messaging system implementation with reliable message loading,
 * rendering, and state management
 */

// Store global application state
const ChatApp = {
  currentUser: null,
  activeChat: null,
  conversations: [],
  contacts: []
};

/**
 * Initialize the Chat Application
 */
function initializeChat() {
  console.log('Initializing chat application...');
  
  // Fetch current user information first
  fetchCurrentUser()
    .then(() => {
      loadContacts();
      loadRecentConversations();
      setupEventListeners();
    })
    .catch(error => {
      console.error('Failed to initialize chat:', error);
      showErrorNotification('Failed to initialize chat. Please refresh the page.');
    });
}

/**
 * Fetch current user information
 */
function fetchCurrentUser() {
  return fetch('/get_current_user_info', {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to fetch user info');
    return response.json();
  })
  .then(data => {
    ChatApp.currentUser = data;
    console.log('Current user loaded:', ChatApp.currentUser);
    
    // Update UI with user information
    updateUserInterface(data);
    return data;
  });
}

/**
 * Update user interface with user data
 */
function updateUserInterface(userData) {
  // Update profile section
  const userNameElements = document.querySelectorAll('.user-info h3');
  userNameElements.forEach(el => {
    el.textContent = userData.user_name;
  });
  
  // Update user status
  const userStatusElements = document.querySelectorAll('.side-menu .user-status');
  userStatusElements.forEach(el => {
    el.textContent = userData.bio || 'No status';
    el.style.display = 'block';
    el.style.visibility = 'visible';
  });
  
  // Update avatar
  updateAvatar(userData);
}

/**
 * Update user avatar
 */
function updateAvatar(userData) {
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');
  if (!avatarPlaceholder) return;
  
  // Clear existing content
  avatarPlaceholder.innerHTML = '';
  
  if (userData.avatar_path) {
    // Create and add image
    const img = document.createElement('img');
    img.src = userData.avatar_path;
    img.alt = userData.user_name;
    img.className = 'avatar-image';
    avatarPlaceholder.appendChild(img);
  } else {
    // Create initials avatar
    const initialsDiv = document.createElement('div');
    initialsDiv.className = 'avatar-initials';
    initialsDiv.textContent = userData.user_name.charAt(0);
    avatarPlaceholder.appendChild(initialsDiv);
  }
  
  // Add upload icon
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

/**
 * Load user contacts
 */
function loadContacts() {
  return fetch('/get_contacts', {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to load contacts');
    return response.json();
  })
  .then(data => {
    if (!data.contacts) return;
    
    ChatApp.contacts = data.contacts;
    renderContacts(data.contacts);
  })
  .catch(error => {
    console.error('Error loading contacts:', error);
  });
}

/**
 * Render contacts in the sidebar
 */
function renderContacts(contacts) {
  const contactsList = document.getElementById('contactsList');
  const noContactsMessage = document.querySelector('.no-contacts-message');
  
  if (!contactsList) return;
  
  // Remove existing contacts but keep the no-contacts message
  Array.from(contactsList.children).forEach(child => {
    if (!child.classList.contains('no-contacts-message') && 
        !child.classList.contains('conversations-section')) {
      contactsList.removeChild(child);
    }
  });
  
  if (contacts && contacts.length > 0) {
    // Hide "no contacts" message
    if (noContactsMessage) noContactsMessage.style.display = 'none';
    
    // Sort contacts by name
    contacts.sort((a, b) => a.name.localeCompare(b.name));
    
    // Create a container for contacts if needed
    let contactsSection = document.querySelector('.contacts-section');
    if (!contactsSection) {
      contactsSection = document.createElement('div');
      contactsSection.className = 'contacts-section';
      
      const sectionTitle = document.createElement('div');
      sectionTitle.className = 'section-title';
      sectionTitle.textContent = 'Contacts';
      contactsSection.appendChild(sectionTitle);
      
      // Add it after conversations section or at the beginning
      const conversationsSection = document.querySelector('.conversations-section');
      if (conversationsSection) {
        contactsList.insertBefore(contactsSection, conversationsSection.nextSibling);
      } else {
        contactsList.appendChild(contactsSection);
      }
    }
    
    // Create and add contact elements
    contacts.forEach(contact => {
      const contactItem = createContactElement(contact);
      contactsSection.appendChild(contactItem);
    });
  } else {
    // Show "no contacts" message
    if (noContactsMessage) noContactsMessage.style.display = 'block';
  }
}

/**
 * Create a contact element
 */
function createContactElement(contact) {
  const contactItem = document.createElement('div');
  contactItem.className = 'contact-item';
  contactItem.dataset.contactId = contact.id;
  
  // Avatar
  const contactAvatar = document.createElement('div');
  contactAvatar.className = 'contact-avatar';
  
  if (contact.avatar_path) {
    contactAvatar.innerHTML = `<img src="${contact.avatar_path}" alt="${contact.name}">`;
  } else {
    contactAvatar.innerHTML = `<div class="avatar-initials">${contact.name.charAt(0)}</div>`;
  }
  
  // Contact info
  const contactInfo = document.createElement('div');
  contactInfo.className = 'contact-info';
  
  const contactName = document.createElement('div');
  contactName.className = 'contact-name';
  contactName.textContent = contact.name;
  
  const contactBio = document.createElement('div');
  contactBio.className = 'contact-bio';
  contactBio.textContent = contact.bio || '';
  
  // Assemble the elements
  contactInfo.appendChild(contactName);
  contactInfo.appendChild(contactBio);
  
  contactItem.appendChild(contactAvatar);
  contactItem.appendChild(contactInfo);
  
  // Add click handler
  contactItem.addEventListener('click', () => {
    openChatWithUser(contact.id, contact.name);
    
    // Highlight active contact
    document.querySelectorAll('.contact-item').forEach(item => {
      item.classList.remove('active');
    });
    contactItem.classList.add('active');
  });
  
  return contactItem;
}

/**
 * Load recent conversations
 */
function loadRecentConversations() {
  return fetch('/get_recent_conversations', {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to load conversations');
    return response.json();
  })
  .then(data => {
    if (!data.conversations) return;
    
    ChatApp.conversations = data.conversations;
    renderConversations(data.conversations);
  })
  .catch(error => {
    console.error('Error loading conversations:', error);
  });
}

/**
 * Render conversations in the sidebar
 */
function renderConversations(conversations) {
  const contactsList = document.getElementById('contactsList');
  if (!contactsList) return;
  
  // Create or find the conversations section
  let conversationsSection = document.querySelector('.conversations-section');
  if (!conversationsSection) {
    conversationsSection = document.createElement('div');
    conversationsSection.className = 'conversations-section';
    
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = 'Recent Chats';
    conversationsSection.appendChild(sectionTitle);
    
    // Add at the beginning
    if (contactsList.firstChild) {
      contactsList.insertBefore(conversationsSection, contactsList.firstChild);
    } else {
      contactsList.appendChild(conversationsSection);
    }
  }
  
  // Remove existing conversations but keep the title
  Array.from(conversationsSection.children).forEach(child => {
    if (!child.classList.contains('section-title')) {
      conversationsSection.removeChild(child);
    }
  });
  
  if (conversations && conversations.length > 0) {
    // Hide the no contacts message
    const noContactsMessage = document.querySelector('.no-contacts-message');
    if (noContactsMessage) noContactsMessage.style.display = 'none';
    
    // Add conversations
    conversations.forEach(conversation => {
      const conversationItem = createConversationElement(conversation);
      conversationsSection.appendChild(conversationItem);
    });
  }
}

/**
 * Create a conversation element
 */
function createConversationElement(conversation) {
  const conversationItem = document.createElement('div');
  conversationItem.className = 'contact-item conversation-item';
  conversationItem.dataset.userId = conversation.user_id;
  
  // Avatar
  const userAvatar = document.createElement('div');
  userAvatar.className = 'contact-avatar';
  
  if (conversation.avatar_path) {
    userAvatar.innerHTML = `<img src="${conversation.avatar_path}" alt="${conversation.name}">`;
  } else {
    userAvatar.innerHTML = `<div class="avatar-initials">${conversation.name.charAt(0)}</div>`;
  }
  
  // User info
  const userInfo = document.createElement('div');
  userInfo.className = 'contact-info';
  
  const userName = document.createElement('div');
  userName.className = 'contact-name';
  userName.textContent = conversation.name;
  
  // Last message preview
  const lastMessage = document.createElement('div');
  lastMessage.className = 'last-message';
  
  // Truncate message if needed
  let messagePreview = conversation.last_message;
  if (messagePreview.length > 25) {
    messagePreview = messagePreview.substring(0, 25) + '...';
  }
  lastMessage.textContent = messagePreview;
  
  // Unread badge
  if (conversation.unread_count > 0) {
    const unreadBadge = document.createElement('div');
    unreadBadge.className = 'unread-badge';
    unreadBadge.textContent = conversation.unread_count;
    conversationItem.appendChild(unreadBadge);
  }
  
  // Assemble elements
  userInfo.appendChild(userName);
  userInfo.appendChild(lastMessage);
  
  conversationItem.appendChild(userAvatar);
  conversationItem.appendChild(userInfo);
  
  // Add click handler
  conversationItem.addEventListener('click', () => {
    openChatWithUser(conversation.user_id, conversation.name);
    
    // Highlight this conversation
    document.querySelectorAll('.contact-item').forEach(item => {
      item.classList.remove('active');
    });
    conversationItem.classList.add('active');
    
    // Remove unread badge
    const badge = conversationItem.querySelector('.unread-badge');
    if (badge) conversationItem.removeChild(badge);
  });
  
  return conversationItem;
}

/**
 * Open a chat with a user
 */
function openChatWithUser(userId, userName) {
  // Store active chat info
  ChatApp.activeChat = { id: userId, name: userName };
  
  // Get user info first
  return fetch(`/get_user_info?user_id=${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to get user info');
    return response.json();
  })
  .then(userData => {
    // Create the chat interface
    createChatInterface(userData);
    
    // Load messages
    loadMessages(userId);
  })
  .catch(error => {
    console.error('Error opening chat:', error);
    showErrorNotification('Failed to open chat. Please try again.');
  });
}

/**
 * Create the chat interface
 */
function createChatInterface(user) {
  console.log('Creating chat interface for:', user);
  
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
  
  // Remove the dropdown from being created here
  // Instead, we'll handle it in a separate function
  
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
  
  // Create a hidden file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.accept = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar';
  fileInput.style.display = 'none';
  fileInput.id = 'chatFileInput';
  document.body.appendChild(fileInput);
  
  // Add click event to paperclip button
  paperclipButton.addEventListener('click', function() {
    showFileMenu(fileInput, user);
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
      sendMessage(inputField.value, user.id, chatMessages);
    }
  });
  
  // Add enter key handler
  inputField.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && this.value.trim()) {
      e.preventDefault();
      sendMessage(this.value, user.id, chatMessages);
    }
  });
  
  // Assemble the UI
  userInfo.appendChild(userAvatar);
  userInfo.appendChild(userName);
  
  chatHeader.appendChild(userInfo);
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
  setTimeout(() => inputField.focus(), 0);
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
  
  // Check if user is a contact before showing the menu
  checkContactStatus(user.id)
    .then(isContact => {
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
          removeFromContacts(user.id);
          contactMenu.style.display = 'none';
        });
      } else {
        document.getElementById('addContactOption').addEventListener('click', function() {
          addToContacts(user.id, user.name);
          contactMenu.style.display = 'none';
        });
      }
    })
    .catch(error => {
      console.error('Error checking contact status:', error);
      contactMenu.style.display = 'none';
    });
}

/**
 * Show file menu when paperclip button is clicked
 */
function showFileMenu(fileInput, user) {
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
  const paperclipButton = event.target.closest('.paperclip-button');
  if (!paperclipButton) return;
  
  const buttonRect = paperclipButton.getBoundingClientRect();
  
  // Position the menu above the input area, not at the bottom of the screen
  fileMenu.style.display = 'block';
  fileMenu.style.position = 'absolute';
  fileMenu.style.left = `${buttonRect.left}px`;
  fileMenu.style.top = `${buttonRect.top - fileMenu.offsetHeight - 10}px`; // Position above the button
  fileMenu.style.zIndex = '1000';
  
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

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

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
  return fetch(`/get_messages?user_id=${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to load messages');
    return response.json();
  })
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
 * Send a message
 */
function sendMessage(text, recipientId, chatMessages) {
  if (!text.trim()) return;
  
  console.log(`Sending message to ${recipientId}: ${text}`);
  
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
    if (!response.ok) throw new Error(`Failed to send message: ${response.status}`);
    return response.json();
  })
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
 * Check if a user is in contacts
 */
function checkContactStatus(userId) {
  return fetch('/check_contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contact_id: userId })
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to check contact status');
    return response.json();
  })
  .then(data => {
    return data.is_contact;
  })
  .catch(error => {
    console.error('Error checking contact status:', error);
    return false;
  });
}

/**
 * Add a user to contacts
 */
function addToContacts(userId, userName) {
  return fetch('/add_contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contact_id: userId })
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to add contact');
    return response.json();
  })
  .then(data => {
    if (!data.success) throw new Error(data.error || 'Failed to add contact');
    
    console.log(`Added ${userName} to contacts`);
    
    // Refresh contacts list
    loadContacts();
    
    // Update dropdown menu
    const dropdown = document.querySelector('.chat-dropdown-menu');
    if (dropdown) {
      dropdown.innerHTML = `
        <div class="dropdown-item remove-contact" data-user-id="${userId}">
          Remove from contacts
        </div>
      `;
      
      // Update event handler
      dropdown.querySelector('.remove-contact').addEventListener('click', function(e) {
        e.stopPropagation();
        removeFromContacts(userId);
        dropdown.style.display = 'none';
      });
    }
    
    showSuccessNotification(`${userName} added to contacts`);
    return data;
  })
  .catch(error => {
    console.error('Error adding contact:', error);
    showErrorNotification('Failed to add contact. Please try again.');
    return Promise.reject(error);
  });
}

/**
 * Remove a user from contacts
 */
function removeFromContacts(userId) {
  return fetch('/remove_contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contact_id: userId })
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to remove contact');
    return response.json();
  })
  .then(data => {
    if (!data.success) throw new Error(data.error || 'Failed to remove contact');
    
    console.log(`Removed user from contacts`);
    
    // Refresh contacts list
    loadContacts();
    
    // Update dropdown menu
    const dropdown = document.querySelector('.chat-dropdown-menu');
    if (dropdown) {
      dropdown.innerHTML = `
        <div class="dropdown-option" id="addContactOption">
          <div class="dropdown-option-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14"></path>
              <path d="M5 12h14"></path>
            </svg>
          </div>
          <div class="dropdown-option-label">Add to contacts</div>
        </div>
      `;
      
      // Update event handler
      document.getElementById('addContactOption').addEventListener('click', function(e) {
        e.stopPropagation();
        const userName = document.querySelector('.chat-user-name').textContent;
        addToContacts(userId, userName);
        dropdown.style.display = 'none';
      });
    }
    
    // Use a special class for remove contact notifications
    showNotification('Contact removed', 'remove-contact');
    return data;
  })
  .catch(error => {
    console.error('Error removing contact:', error);
    showErrorNotification('Failed to remove contact. Please try again.');
    return Promise.reject(error);
  });
}

/**
 * Setup event listeners for search, avatar upload, etc.
 */
function setupEventListeners() {
  // Avatar upload
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');
  const avatarInput = document.getElementById('avatarInput');
  
  if (avatarPlaceholder && avatarInput) {
    avatarPlaceholder.addEventListener('click', () => {
      avatarInput.click();
    });
    
    avatarInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        uploadAvatar(this.files[0]);
      }
    });
  }
  
  // Search functionality
  setupSearch();
  
  // UI menu buttons
  setupMenuButtons();
}

/**
 * Setup search functionality
 */
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchContainer = document.querySelector('.search-container');
  
  if (!searchInput || !searchContainer) return;
  
  // Create search results container if it doesn't exist
  let searchResults = document.querySelector('.search-results');
  if (!searchResults) {
    searchResults = document.createElement('div');
    searchResults.className = 'search-results';
    searchResults.style.display = 'none';
    searchContainer.parentNode.insertBefore(searchResults, searchContainer.nextSibling);
  }
  
  // Search with debounce
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);
    
    // If query is empty or too short, hide results
    if (!query || query.length < 2) {
      searchResults.style.display = 'none';
      return;
    }
    
    // Set delay before sending request
    searchTimeout = setTimeout(() => {
      fetch(`/search_users?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(response => {
        if (!response.ok) throw new Error('Search failed');
        return response.json();
      })
      .then(data => {
        // Clear results
        searchResults.innerHTML = '';
        
        if (data.users && data.users.length > 0) {
          // Add header
          const resultsHeader = document.createElement('div');
          resultsHeader.className = 'search-results-header';
          resultsHeader.textContent = 'Users';
          searchResults.appendChild(resultsHeader);
          
          // Add each user
          data.users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'search-user-item';
            userItem.dataset.userId = user.id;
            
            // User avatar
            const userAvatar = document.createElement('div');
            userAvatar.className = 'search-user-avatar';
            
            if (user.avatar_path) {
              userAvatar.innerHTML = `<img src="${user.avatar_path}" alt="${user.name}">`;
            } else {
              userAvatar.innerHTML = `<div class="avatar-initials">${user.name.charAt(0)}</div>`;
            }
            
            // User info
            const userInfo = document.createElement('div');
            userInfo.className = 'search-user-info';
            
            const userName = document.createElement('div');
            userName.className = 'search-user-name';
            userName.textContent = user.name;
            
            const userBio = document.createElement('div');
            userBio.className = 'search-user-bio';
            userBio.textContent = user.bio || 'No information';
            
            // Assemble elements
            userInfo.appendChild(userName);
            userInfo.appendChild(userBio);
            
            userItem.appendChild(userAvatar);
            userItem.appendChild(userInfo);
            
            // Add click handler
            userItem.addEventListener('click', () => {
              // Reset search
              searchInput.value = '';
              searchResults.style.display = 'none';
              
              // Open chat
              openChatWithUser(user.id, user.name);
            });
            
            searchResults.appendChild(userItem);
          });
          
          // Show results
          searchResults.style.display = 'block';
        } else {
          // Show "no results" message
          const noResults = document.createElement('div');
          noResults.className = 'search-no-results';
          noResults.textContent = 'No users found';
          searchResults.appendChild(noResults);
          searchResults.style.display = 'block';
        }
      })
      .catch(error => {
        console.error('Search error:', error);
        
        // Show error message
        searchResults.innerHTML = '';
        const errorMsg = document.createElement('div');
        errorMsg.className = 'search-error';
        errorMsg.textContent = 'Search failed. Please try again.';
        searchResults.appendChild(errorMsg);
        searchResults.style.display = 'block';
      });
    }, 300);
  });
  
  // Hide search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && 
        !searchResults.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  });
}

/**
 * Setup menu buttons
 */
function setupMenuButtons() {
  const menuBtn = document.getElementById('menuBtn');
  const sideMenu = document.getElementById('sideMenu');
  const overlay = document.getElementById('overlay');
  const closeMenuBtn = document.getElementById('closeMenuBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutModal = document.getElementById('logoutModal');
  const cancelLogout = document.getElementById('cancelLogout');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const editProfileSidebar = document.getElementById('editProfileSidebar');
  const backToMainMenu = document.getElementById('backToMainMenu');
  const editProfileForm = document.getElementById('editProfileForm');
  
  // Menu button click
  if (menuBtn && sideMenu && overlay) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sideMenu.classList.toggle('active');
      overlay.classList.toggle('active');
    });
  }
  
  // Close menu button
  if (closeMenuBtn && sideMenu && overlay) {
    closeMenuBtn.addEventListener('click', () => {
      sideMenu.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
  
  // Overlay click
  if (overlay && sideMenu) {
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      sideMenu.classList.remove('active');
      if (editProfileSidebar) editProfileSidebar.classList.remove('active');
      if (logoutModal) logoutModal.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
  
  // Logout button
  if (logoutBtn && logoutModal && overlay) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutModal.classList.add('active');
      overlay.classList.add('active');
    });
  }
  
  // Cancel logout
  if (cancelLogout && logoutModal && overlay) {
    cancelLogout.addEventListener('click', () => {
      logoutModal.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
  
  // Edit profile button
  if (editProfileBtn && editProfileSidebar && sideMenu && overlay) {
    editProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sideMenu.classList.remove('active');
      editProfileSidebar.classList.add('active');
      overlay.classList.add('active');
    });
  }
  
  // Back to main menu
  if (backToMainMenu && editProfileSidebar && sideMenu) {
    backToMainMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      editProfileSidebar.classList.remove('active');
      sideMenu.classList.add('active');
    });
  }
  
  // Profile form submission
  if (editProfileForm) {
    editProfileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      updateProfile(new FormData(editProfileForm));
    });
  }
  
  // Escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (sideMenu && sideMenu.classList.contains('active')) {
        sideMenu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
      }
      if (editProfileSidebar && editProfileSidebar.classList.contains('active')) {
        editProfileSidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
      }
      if (logoutModal && logoutModal.classList.contains('active')) {
        logoutModal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
      }
    }
  });
  
  // Stop propagation for menu content
  if (sideMenu) {
    sideMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  if (editProfileSidebar) {
    editProfileSidebar.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
}

/**
 * Upload avatar
 */
function uploadAvatar(file) {
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showErrorNotification('File is too large. Maximum size is 5MB.');
    return;
  }
  
  // Create form data
  const formData = new FormData();
  formData.append('avatar', file);
  
  // Send to server
  return fetch('/upload_avatar', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to upload avatar');
    return response.json();
  })
  .then(data => {
    if (!data.success) throw new Error(data.error || 'Failed to upload avatar');
    
    // Refresh user info
    fetchCurrentUser();
    
    showSuccessNotification('Avatar updated successfully');
    return data;
  })
  .catch(error => {
    console.error('Error uploading avatar:', error);
    showErrorNotification('Failed to upload avatar. Please try again.');
    return Promise.reject(error);
  });
}

/**
 * Update user profile
 */
function updateProfile(formData) {
  return fetch('/update_profile', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  })
  .then(data => {
    if (!data.success) throw new Error(data.error || 'Failed to update profile');
    
    // Update interface
    updateUserInterface(data);
    
    // Close edit profile sidebar
    const editProfileSidebar = document.getElementById('editProfileSidebar');
    const overlay = document.getElementById('overlay');
    
    if (editProfileSidebar) editProfileSidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    
    showSuccessNotification('Profile updated successfully');
    return data;
  })
  .catch(error => {
    console.error('Error updating profile:', error);
    showErrorNotification('Failed to update profile. Please try again.');
    return Promise.reject(error);
  });
}

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The notification type ('success', 'error', 'info', 'remove-contact')
 * @param {number} duration - How long to show the notification in ms
 */
function showNotification(message, type, duration = 3000) {
  const notification = createNotification(message, type);
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('hide');
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

/**
 * Show success notification
 */
function showSuccessNotification(message, duration = 3000) {
  showNotification(message, 'success', duration);
}

/**
 * Show error notification
 */
function showErrorNotification(message, duration = 5000) {
  showNotification(message, 'error', duration);
}

/**
 * Create notification element
 */
function createNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'notification-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => {
    notification.classList.add('hide');
    setTimeout(() => notification.remove(), 300);
  });
  
  notification.appendChild(closeBtn);
  
  return notification;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize the chat application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeChat);
