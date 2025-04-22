/**
 * Contact management functions
 */

/**
 * Load user contacts and chats
 */
function loadSidebar() {
  console.log('Loading sidebar...');
  
  // First, check if we have any contacts in the DOM already
  const currentChats = document.querySelectorAll('.contact-item');
  const hasExistingChats = currentChats.length > 0;
  
  // Show loading indicator in sidebar if it's empty
  const contactsList = document.getElementById('contactsList');
  if (contactsList && !hasExistingChats) {
    contactsList.innerHTML = '<div class="loading-sidebar">Loading chats...</div>';
  }
  
  // Load both contacts and chats
  Promise.all([fetchContacts(), fetchChatList()])
    .then(([contactsData, chatsData]) => {
      // Store data in app state
      if (contactsData.contacts) {
        ChatApp.contacts = contactsData.contacts;
      }
      
      if (chatsData.chats) {
        ChatApp.chats = chatsData.chats;
        console.log(`Retrieved ${chatsData.chats.length} chats`);
      } else {
        console.warn('No chats data returned from API');
        ChatApp.chats = [];
      }
      
      // Render sidebar items
      renderSidebar(ChatApp.contacts, ChatApp.chats);
    })
    .catch(error => {
      console.error('Error loading sidebar data:', error);
      
      // Show error in sidebar
      if (contactsList) {
        contactsList.innerHTML = '<div class="sidebar-error">Failed to load chats. <a href="#" onclick="loadSidebar(); return false;">Retry</a></div>';
      }
      
      showErrorNotification('Failed to load contacts and chats');
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
  const contactsList = document.getElementById('contactsList');
  const noContactsMessage = document.querySelector('.no-contacts-message');
  
  if (!contactsList) return;
  
  // Clear existing items
  contactsList.innerHTML = '';
  
  // Debug the received data
  console.log('Rendering sidebar with data:', {
    contacts: contacts ? contacts.length : 0,
    chats: chats ? chats.length : 0
  });
  
  if (chats && chats.length > 0) {
    console.log('First few chats:', chats.slice(0, 3));
  }
  
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
      const chatItem = createChatElement(chat);
      chatSection.appendChild(chatItem);
    });
    contactsList.appendChild(chatSection);
    
    // Hide "no contacts" message
    if (noContactsMessage) noContactsMessage.style.display = 'none';
  } else {
    // If no chats, show a message in the section
    console.warn('No chats to display in sidebar');
    
    const noChatsMsg = document.createElement('div');
    noChatsMsg.className = 'no-items-message';
    noChatsMsg.textContent = 'No chats yet';
    chatSection.appendChild(noChatsMsg);
    contactsList.appendChild(chatSection);
  }
}

/**
 * Create a contact element
 */
function createContactElement(contact) {
  // ...existing code...
}

/**
 * Create a chat element
 */
function createChatElement(chat) {
  // ...existing code...
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
  // ...existing code...
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
