/**
 * Contact management functions
 */

/**
 * Load user contacts and chats
 */
function loadSidebar() {
  // Load both contacts and chats
  Promise.all([fetchContacts(), fetchChatList()])
    .then(([contactsData, chatsData]) => {
      // Store data in app state
      if (contactsData.contacts) {
        ChatApp.contacts = contactsData.contacts;
      }
      
      if (chatsData.chats) {
        ChatApp.chats = chatsData.chats;
      }
      
      // Render sidebar items
      renderSidebar(ChatApp.contacts, ChatApp.chats);
    })
    .catch(error => {
      console.error('Error loading sidebar data:', error);
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
  
  // Create chats section
  const chatSection = document.createElement('div');
  chatSection.className = 'sidebar-section chats-section';
  
  const chatTitle = document.createElement('div');
  chatTitle.className = 'section-title';
  chatTitle.textContent = 'Chats';
  chatSection.appendChild(chatTitle);
  
  // Add chats
  if (chats && chats.length > 0) {
    chats.forEach(chat => {
      const chatItem = createChatElement(chat);
      chatSection.appendChild(chatItem);
    });
    contactsList.appendChild(chatSection);
    
    // Hide "no contacts" message
    if (noContactsMessage) noContactsMessage.style.display = 'none';
  } else {
    // If no chats, show a message in the section
    const noChatsMsg = document.createElement('div');
    noChatsMsg.className = 'no-items-message';
    noChatsMsg.textContent = 'No chats yet';
    chatSection.appendChild(noChatsMsg);
    contactsList.appendChild(chatSection);
  }
  
  // Removed: Separator and contacts section
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
  
  // Add "C" indicator for contacts
  contactName.innerHTML = `${contact.name} <span class="contact-indicator">C</span>`;
  
  // Assemble elements
  contactInfo.appendChild(contactName);
  
  contactItem.appendChild(contactAvatar);
  contactItem.appendChild(contactInfo);
  
  // Add click handler
  contactItem.addEventListener('click', () => {
    openChatWithUser(contact.id, contact.name);
  });
  
  return contactItem;
}

/**
 * Create a chat element
 */
function createChatElement(chat) {
  const chatItem = document.createElement('div');
  chatItem.className = 'contact-item chat-item';
  chatItem.dataset.userId = chat.user_id;
  
  // Avatar
  const userAvatar = document.createElement('div');
  userAvatar.className = 'contact-avatar';
  
  if (chat.avatar_path) {
    userAvatar.innerHTML = `<img src="${chat.avatar_path}" alt="${chat.name}">`;
  } else {
    userAvatar.innerHTML = `<div class="avatar-initials">${chat.name.charAt(0)}</div>`;
  }
  
  // User info
  const userInfo = document.createElement('div');
  userInfo.className = 'contact-info';
  
  const userName = document.createElement('div');
  userName.className = 'contact-name';
  userName.textContent = chat.name;  // Just set the name text, without the indicator
  
  // Last message preview
  const lastMessage = document.createElement('div');
  lastMessage.className = 'last-message';
  
  // Truncate message if needed
  let messagePreview = chat.last_message;
  if (messagePreview.length > 25) {
    messagePreview = messagePreview.substring(0, 25) + '...';
  }
  lastMessage.textContent = messagePreview;
  
  // Unread badge
  if (chat.unread_count > 0) {
    const unreadBadge = document.createElement('div');
    unreadBadge.className = 'unread-badge';
    unreadBadge.textContent = chat.unread_count;
    chatItem.appendChild(unreadBadge);
  }
  
  // Add contact indicator if this user is a contact
  if (chat.is_contact) {
    const contactIndicator = document.createElement('span');
    contactIndicator.className = 'contact-indicator';
    contactIndicator.textContent = 'C';
    contactIndicator.setAttribute('data-tooltip', 'This user is in your contacts');
    
    // Add event listeners for showing/hiding tooltip
    contactIndicator.addEventListener('mouseenter', showTooltip);
    contactIndicator.addEventListener('mouseleave', hideTooltip);
    
    chatItem.appendChild(contactIndicator);
  }
  
  // Add block indicators if applicable
  if (chat.is_blocked_by_you) {
    const blockIndicator = document.createElement('span');
    blockIndicator.className = 'block-indicator blocked-by-you';
    blockIndicator.textContent = 'B';
    blockIndicator.setAttribute('data-tooltip', 'You have blocked this user');
    
    // Add event listeners for showing/hiding tooltip
    blockIndicator.addEventListener('mouseenter', showTooltip);
    blockIndicator.addEventListener('mouseleave', hideTooltip);
    
    chatItem.appendChild(blockIndicator);
  } else if (chat.has_blocked_you) {
    const blockIndicator = document.createElement('span');
    blockIndicator.className = 'block-indicator blocked-you';
    blockIndicator.textContent = 'B';
    blockIndicator.setAttribute('data-tooltip', 'This user has blocked you');
    
    // Add event listeners for showing/hiding tooltip
    blockIndicator.addEventListener('mouseenter', showTooltip);
    blockIndicator.addEventListener('mouseleave', hideTooltip);
    
    chatItem.appendChild(blockIndicator);
  }
  
  // Assemble elements
  userInfo.appendChild(userName);
  userInfo.appendChild(lastMessage);
  
  chatItem.appendChild(userAvatar);
  chatItem.appendChild(userInfo);
  
  // Add click handler
  chatItem.addEventListener('click', () => {
    openChatWithUser(chat.user_id, chat.name);
  });
  
  return chatItem;
}

/**
 * Show tooltip when hovering over contact indicator
 */
function showTooltip(event) {
  // Remove any existing tooltips
  hideAllTooltips();
  
  const targetElement = event.currentTarget;
  const tooltipText = targetElement.getAttribute('data-tooltip');
  
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'dynamic-tooltip';
  tooltip.textContent = tooltipText;
  tooltip.id = 'contact-tooltip';
  document.body.appendChild(tooltip);
  
  // Position tooltip above the indicator
  const rect = targetElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  tooltip.style.left = `${centerX}px`;
  tooltip.style.top = `${rect.top - 40}px`; // Position above with some margin
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
  addToContacts(userId)
    .then(data => {
      if (data.success) {
        showSuccessNotification(`${userName} added to contacts`);
        loadSidebar(); // Reload to show updated contacts
        
        // Update menu in chat interface
        updateContactMenu(userId, true);
      }
    })
    .catch(error => {
      showErrorNotification('Failed to add contact. Please try again.');
    });
}

/**
 * Handler for removing a contact
 */
function removeContactHandler(userId) {
  removeFromContacts(userId)
    .then(data => {
      if (data.success) {
        showNotification('Contact removed', 'remove-contact');
        loadSidebar(); // Reload to show updated contacts
        
        // Update menu in chat interface
        updateContactMenu(userId, false);
      }
    })
    .catch(error => {
      showErrorNotification('Failed to remove contact. Please try again.');
    });
}

/**
 * Update contact menu after adding/removing contact
 */
function updateContactMenu(userId, isAdded) {
  const dropdown = document.getElementById('contactDropdownMenu');
  if (!dropdown) return;
  
  if (isAdded) {
    dropdown.innerHTML = `
      <div class="dropdown-menu-options">
        <div class="dropdown-option" id="removeContactOption">
          <div class="dropdown-option-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 7l-10 10"></path>
              <path d="M7 7l10 10"></path>
            </svg>
          </div>
          <div class="dropdown-option-label">Remove from contacts</div>
        </div>
      </div>
    `;
    
    document.getElementById('removeContactOption').addEventListener('click', function() {
      removeContactHandler(userId);
      dropdown.style.display = 'none';
    });
  } else {
    dropdown.innerHTML = `
      <div class="dropdown-menu-options">
        <div class="dropdown-option" id="addContactOption">
          <div class="dropdown-option-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14"></path>
              <path d="M5 12h14"></path>
            </svg>
          </div>
          <div class="dropdown-option-label">Add to contacts</div>
        </div>
      </div>
    `;
    
    document.getElementById('addContactOption').addEventListener('click', function() {
      const userName = document.querySelector('.chat-user-name').textContent;
      addContactHandler(userId, userName);
      dropdown.style.display = 'none';
    });
  }
}

/**
 * Handler for blocking a user
 */
function blockUserHandler(userId, userName) {
  blockUser(userId)
    .then(data => {
      if (data.success) {
        showNotification(`You have blocked ${userName}`, 'block-user');
        loadSidebar(); // Reload to show updated UI
        
        // Redirect to main screen if currently chatting with blocked user
        if (ChatApp.activeChat && ChatApp.activeChat.id == userId) {
          // Clear main area and return to empty state
          const mainContent = document.querySelector('.main-content');
          if (mainContent) {
            mainContent.innerHTML = '';
            // Remove the block message UI completely
            
            // Optional: Show a minimal message without the block UI
            const emptyStateMessage = document.createElement('div');
            emptyStateMessage.className = 'no-messages';
            emptyStateMessage.textContent = 'Select a chat to start messaging';
            mainContent.appendChild(emptyStateMessage);
          }
        }
      }
    })
    .catch(error => {
      showErrorNotification('Failed to block user. Please try again.');
    });
}

/**
 * Handler for unblocking a user
 */
function unblockUserHandler(userId, userName) {
  unblockUser(userId)
    .then(data => {
      if (data.success) {
        showSuccessNotification(`${userName} has been unblocked`);
        loadSidebar(); // Reload to show updated UI
        
        // If we're in the block message screen, reload the chat
        const blockMessage = document.querySelector('.block-message');
        if (blockMessage && ChatApp.activeChat && ChatApp.activeChat.id == userId) {
          openChatWithUser(userId, userName);
        }
      }
    })
    .catch(error => {
      showErrorNotification('Failed to unblock user. Please try again.');
    });
}
