/**
 * Contact management functions
 */

/**
 * Load user contacts and chats into the sidebar
 */
function loadSidebar() {
  console.log('Loading sidebar...');
  
  // Show loading indicator in sidebar
  const contactsList = document.getElementById('contactsList');
  if (contactsList) {
    contactsList.innerHTML = '<div class="loading-sidebar">Loading chats...</div>';
  }
  
  // Load both contacts and chats
  Promise.all([fetchContacts(), fetchChatList()])
    .then(([contactsData, chatsData]) => {
      // Debug output to console
      console.log('Contacts data:', contactsData);
      console.log('Chats data:', chatsData);
      
      // Store data in app state
      if (contactsData && contactsData.success) {
        ChatApp.contacts = contactsData.contacts || [];
      } else {
        console.warn('Invalid contacts data received');
        ChatApp.contacts = [];
      }
      
      if (chatsData && chatsData.success) {
        ChatApp.chats = chatsData.chats || [];
      } else {
        console.warn('Invalid chats data received');
        ChatApp.chats = [];
      }
      
      console.log(`Loaded ${ChatApp.contacts.length} contacts and ${ChatApp.chats.length} chats`);
      
      // Render sidebar items
      renderSidebar(ChatApp.contacts, ChatApp.chats);
    })
    .catch(error => {
      console.error('Error loading sidebar data:', error);
      
      // Show error in sidebar
      if (contactsList) {
        contactsList.innerHTML = `
          <div class="sidebar-error">
            Failed to load chats. 
            <a href="#" onclick="loadSidebar(); return false;">Retry</a>
          </div>
        `;
      }
    });
}

/**
 * Helper function to load sidebar data with retry
 */
function loadSidebarData(retryCount = 0) {
  Promise.all([fetchContacts(), fetchChatList()])
    .then(([contactsData, chatsData]) => {
      // Store data in app state - ensure we always have valid arrays
      ChatApp.contacts = contactsData.contacts || [];
      ChatApp.chats = chatsData.chats || [];
      
      console.log(`Retrieved ${ChatApp.contacts.length} contacts and ${ChatApp.chats.length} chats`);
      
      // Render sidebar items
      renderSidebar(ChatApp.contacts, ChatApp.chats);
      
      // Remove any error notifications about loading
      removeErrorNotificationByText('Failed to load contacts and chats');
    })
    .catch(error => {
      console.error('Error loading sidebar data:', error);
      
      // Show error in sidebar
      const contactsList = document.getElementById('contactsList');
      if (contactsList) {
        contactsList.innerHTML = '<div class="sidebar-error">Failed to load chats. <a href="#" onclick="loadSidebar(); return false;">Retry</a></div>';
      }
      
      if (retryCount < 2) {
        console.log(`Retrying sidebar data load (attempt ${retryCount + 1})`);
        setTimeout(() => loadSidebarData(retryCount + 1), 1000);
      } else {
        // After 3 attempts, show a notification
        showErrorNotification('Failed to load contacts and chats');
      }
    });
}

/**
 * Fetch contacts from the server
 */
function fetchContacts() {
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
  });
}

/**
 * Fetch chat list from the server
 */
function fetchChatList() {
  return fetch('/get_chat_list', {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to load chats');
    return response.json();
  });
}

/**
 * Render the sidebar with contacts and chats
 */
function renderSidebar(contacts, chats) {
  console.log('Rendering sidebar...');
  const contactsList = document.getElementById('contactsList');
  
  if (!contactsList) {
    console.error('Contact list element not found');
    return;
  }
  
  // Clear existing items
  contactsList.innerHTML = '';
  
  // Create chats section
  const chatSection = document.createElement('div');
  chatSection.className = 'sidebar-section chats-section';
  
  const chatTitle = document.createElement('div');
  chatTitle.className = 'section-title';
  chatTitle.textContent = 'Chats';
  chatSection.appendChild(chatTitle);
  
  // Add chats
  if (chats && chats.length > 0) {
    console.log(`Adding ${chats.length} chats to sidebar`);
    chats.forEach(chat => {
      console.log('Processing chat:', chat);
      try {
        const chatItem = createChatElement(chat);
        chatSection.appendChild(chatItem);
      } catch (e) {
        console.error('Error creating chat element:', e, chat);
      }
    });
  } else {
    // If no chats, show a message
    console.log('No chats to display');
    const noChatsMsg = document.createElement('div');
    noChatsMsg.className = 'no-items-message';
    noChatsMsg.textContent = 'No chats yet. Start by searching for a user.';
    chatSection.appendChild(noChatsMsg);
  }
  
  // Add the chats section to the sidebar
  contactsList.appendChild(chatSection);
  
  // Create contacts section if there are contacts
  if (contacts && contacts.length > 0) {
    console.log(`Adding ${contacts.length} contacts to sidebar`);
    const contactsSection = document.createElement('div');
    contactsSection.className = 'sidebar-section contacts-section';
    
    const contactsTitle = document.createElement('div');
    contactsTitle.className = 'section-title';
    contactsTitle.textContent = 'Contacts';
    contactsSection.appendChild(contactsTitle);
    
    contacts.forEach(contact => {
      try {
        const contactItem = createContactElement(contact);
        contactsSection.appendChild(contactItem);
      } catch (e) {
        console.error('Error creating contact element:', e, contact);
      }
    });
    
    contactsList.appendChild(contactsSection);
  } else {
    console.log('No contacts to display');
  }
  
  // Hide "no contacts" message if we have either chats or contacts
  const noContactsMessage = document.querySelector('.no-contacts-message');
  if (noContactsMessage) {
    if ((chats && chats.length > 0) || (contacts && contacts.length > 0)) {
      noContactsMessage.style.display = 'none';
    } else {
      noContactsMessage.style.display = 'block';
    }
  }
}

/**
 * Highlight the search feature after clearing database
 */
function highlightSearchFeature() {
  // Add a visual indicator around search for new users
  const searchContainer = document.querySelector('.search-container');
  if (searchContainer) {
    searchContainer.classList.add('highlight-search');
    
    // Remove highlight after a few seconds
    setTimeout(() => {
      searchContainer.classList.remove('highlight-search');
    }, 3000);
  }
}

/**
 * Create a contact element
 */
function createContactElement(contact) {
  // ...existing code...
}

/**
 * Create a chat element for the sidebar
 */
function createChatElement(chat) {
  console.log('Creating chat element for:', chat);
  
  // Basic validation to prevent errors
  if (!chat || typeof chat !== 'object') {
    console.error('Invalid chat object:', chat);
    return document.createElement('div'); // Return empty div to prevent errors
  }
  
  const lastMessage = chat.last_message || 'No messages yet';
  const lastMessageTime = formatTimestamp(chat.last_message_time);
  
  // Create container
  const chatItem = document.createElement('div');
  chatItem.className = 'contact-item conversation-item';
  chatItem.setAttribute('data-user-id', chat.user_id);
  chatItem.addEventListener('click', () => openChat(chat.user_id, chat.name));
  
  // Create avatar
  const avatar = document.createElement('div');
  avatar.className = 'contact-avatar';
  
  if (chat.avatar_path) {
    const img = document.createElement('img');
    img.src = chat.avatar_path;
    img.alt = chat.name;
    img.onerror = function() {
      // If image fails to load, fall back to initials
      this.remove();
      const initials = document.createElement('div');
      initials.className = 'avatar-initials';
      initials.textContent = getInitials(chat.name);
      avatar.appendChild(initials);
    };
    avatar.appendChild(img);
  } else {
    // No avatar path, use initials
    const initials = document.createElement('div');
    initials.className = 'avatar-initials';
    initials.textContent = getInitials(chat.name);
    avatar.appendChild(initials);
  }
  
  // Info container
  const info = document.createElement('div');
  info.className = 'contact-info';
  
  // Name
  const name = document.createElement('div');
  name.className = 'contact-name';
  name.textContent = chat.name;
  
  // Last message container
  const messageContainer = document.createElement('div');
  messageContainer.className = 'last-message';
  
  // Message text
  const messageText = document.createElement('div');
  messageText.className = 'message-text';
  messageText.textContent = lastMessage;
  
  // Message time
  const messageTime = document.createElement('div');
  messageTime.className = 'message-time';
  messageTime.textContent = lastMessageTime;
  
  // Assemble elements
  messageContainer.appendChild(messageText);
  messageContainer.appendChild(messageTime);
  
  info.appendChild(name);
  info.appendChild(messageContainer);
  
  chatItem.appendChild(avatar);
  chatItem.appendChild(info);
  
  // Add unread badge if there are unread messages
  if (chat.unread_count && chat.unread_count > 0) {
    const unreadBadge = document.createElement('div');
    unreadBadge.className = 'unread-badge';
    unreadBadge.textContent = chat.unread_count > 99 ? '99+' : chat.unread_count;
    chatItem.appendChild(unreadBadge);
  }
  
  // Add indicators for contacts/blocks
  if (chat.is_contact) {
    const contactIndicator = document.createElement('div');
    contactIndicator.className = 'contact-indicator';
    contactIndicator.textContent = 'C';
    contactIndicator.title = 'Contact';
    chatItem.appendChild(contactIndicator);
  }
  
  if (chat.is_blocked_by_you) {
    const blockIndicator = document.createElement('div');
    blockIndicator.className = 'block-indicator blocked-by-you';
    blockIndicator.textContent = 'B';
    blockIndicator.title = 'You blocked this user';
    chatItem.appendChild(blockIndicator);
  } else if (chat.has_blocked_you) {
    const blockIndicator = document.createElement('div');
    blockIndicator.className = 'block-indicator blocked-you';
    blockIndicator.textContent = 'B';
    blockIndicator.title = 'This user blocked you';
    chatItem.appendChild(blockIndicator);
  }
  
  return chatItem;
}

/**
 * Show tooltip when hovering over contact indicator
 */
function showTooltip(event) {
  // ...existing code...
}

/**
 * Hide tooltip when not hovering
 */
function hideTooltip() {
  hideAllTooltips();
}

/**
 * Helper to remove all tooltips
 */
function hideAllTooltips() {
  const existingTooltip = document.getElementById('contact-tooltip');
  if (existingTooltip) {
    document.body.removeChild(existingTooltip);
  }
}

/**
 * Handler for adding a contact
 */
function addContactHandler(userId, userName) {
  console.log('Adding user to contacts:', userId, userName);
  
  addToContacts(userId)
    .then(response => {
      if (response.success) {
        showSuccessNotification(`Added ${userName} to contacts`);
        
        // Update UI and data structures
        updateContactMenu(userId, true);
        
        // Force refresh sidebar to show updated contacts
        loadSidebar();
      } else {
        throw new Error(response.error || 'Failed to add contact');
      }
    })
    .catch(error => {
      console.error('Error adding contact:', error);
      showErrorNotification(`Error adding contact: ${error.message}`);
    });
}

/**
 * Handler for removing a contact
 */
function removeContactHandler(userId) {
  // ...existing code...
}

/**
 * Update contact menu after adding/removing contact
 */
function updateContactMenu(userId, isAdded) {
  // ...existing code...
}

/**
 * Update block indicators in the sidebar
 * @param {number} userId - The user ID to update indicators for
 * @param {object} blockStatus - The block status object
 */
function updateBlockIndicators(userId, blockStatus) {
  // ...existing code...
}

/**
 * Handler for blocking a user
 */
function blockUserHandler(userId, userName) {
  // ...existing code...
}

/**
 * Handler for unblocking a user
 */
function unblockUserHandler(userId, userName) {
  // ...existing code...
}
