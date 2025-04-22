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
  
  // Show loading indicator in sidebar
  const contactsList = document.getElementById('contactsList');
  if (contactsList && !hasExistingChats) {
    contactsList.innerHTML = '<div class="loading-sidebar">Loading chats...</div>';
  }
  
  // Load both contacts and chats with retry capability
  loadSidebarData();
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
    console.log('No chats to display in sidebar');
    
    const noChatsMsg = document.createElement('div');
    noChatsMsg.className = 'no-items-message';
    noChatsMsg.textContent = 'No chats yet. Start by searching for a user.';
    chatSection.appendChild(noChatsMsg);
    contactsList.appendChild(chatSection);
    
    // Show the search UI more prominently if no chats
    highlightSearchFeature();
  }

  // Create contacts section
  if (contacts && contacts.length > 0) {
    const contactsSection = document.createElement('div');
    contactsSection.className = 'sidebar-section contacts-section';
    
    const contactsTitle = document.createElement('div');
    contactsTitle.className = 'section-title';
    contactsTitle.textContent = 'Contacts';
    contactsSection.appendChild(contactsTitle);
    
    contacts.forEach(contact => {
      const contactItem = createContactElement(contact);
      contactsSection.appendChild(contactItem);
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
