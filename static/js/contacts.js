/**
 * Contact management functions
 */

/**
 * Load contacts and chats in sidebar
 */
function loadSidebar() {
    console.log('Loading sidebar...');
    
    // Show loading indicator
    const contactsList = document.getElementById('contactsList');
    if (contactsList) {
        contactsList.innerHTML = '<div class="loading-sidebar">Loading chats...</div>';
    }
    
    // Get chats first - this is the critical function
    fetchChatList()
        .then(chatsData => {
            console.log(`Successfully loaded ${chatsData.chats.length} chats`);
            
            // Now get contacts
            return fetchContacts()
                .then(contactsData => {
                    return { 
                        chats: chatsData.chats || [], 
                        contacts: contactsData.contacts || [] 
                    };
                })
                .catch(error => {
                    // If contacts fail, still render with chats
                    console.error('Error loading contacts:', error);
                    return { 
                        chats: chatsData.chats || [], 
                        contacts: [] 
                    };
                });
        })
        .then(data => {
            console.log('Rendering sidebar with:', data);
            
            // Store data in application state
            if (typeof ChatApp !== 'undefined') {
                ChatApp.chats = data.chats;
                ChatApp.contacts = data.contacts;
            }
            
            // Render the sidebar with available data
            renderSidebar(data.contacts, data.chats);
        })
        .catch(error => {
            console.error('Error loading sidebar:', error);
            
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
 * Render sidebar with contacts and chats
 */
function renderSidebar(contacts, chats) {
    console.log('Rendering sidebar with contacts and chats:', { 
        contactsCount: contacts ? contacts.length : 0,
        chatsCount: chats ? chats.length : 0 
    });
    
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) {
        console.error('Contacts list element not found');
        return;
    }
    
    // Clear existing content
    contactsList.innerHTML = '';
    
    // Handle empty state
    if ((!chats || chats.length === 0) && (!contacts || contacts.length === 0)) {
        contactsList.innerHTML = `
            <div class="no-items-message">
                No chats or contacts yet. Search for users to start chatting.
            </div>
        `;
        return;
    }
    
    // Render chats section if we have chats
    if (chats && chats.length > 0) {
        const chatsSection = document.createElement('div');
        chatsSection.className = 'sidebar-section chats-section';
        
        const chatsTitle = document.createElement('div');
        chatsTitle.className = 'section-title';
        chatsTitle.textContent = 'Chats';
        chatsSection.appendChild(chatsTitle);
        
        chats.forEach(chat => {
            try {
                const chatElement = createChatElement(chat);
                chatsSection.appendChild(chatElement);
            } catch (e) {
                console.error('Error creating chat element:', e);
            }
        });
        
        contactsList.appendChild(chatsSection);
    }
    
    // Render contacts section if we have contacts
    if (contacts && contacts.length > 0) {
        const contactsSection = document.createElement('div');
        contactsSection.className = 'sidebar-section contacts-section';
        
        const contactsTitle = document.createElement('div');
        contactsTitle.className = 'section-title';
        contactsTitle.textContent = 'Contacts';
        contactsSection.appendChild(contactsTitle);
        
        contacts.forEach(contact => {
            try {
                const contactElement = createContactElement(contact);
                contactsSection.appendChild(contactElement);
            } catch (e) {
                console.error('Error creating contact element:', e);
            }
        });
        
        contactsList.appendChild(contactsSection);
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
