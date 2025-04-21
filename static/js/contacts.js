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
  
  // Add debug button to the sidebar (not inside the contacts list)
  addDebugButton();
  
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
 * Add debug button to the sidebar
 */
function addDebugButton() {
  // Remove existing button if it exists
  const existingBtn = document.getElementById('debugDatabaseBtn');
  if (existingBtn) {
    existingBtn.remove();
  }
  
  // Create fixed debug button container
  const debugBtnContainer = document.createElement('div');
  debugBtnContainer.className = 'debug-btn-container';
  debugBtnContainer.style.position = 'fixed';
  debugBtnContainer.style.bottom = '10px';
  debugBtnContainer.style.left = '10px';
  debugBtnContainer.style.zIndex = '1000';
  debugBtnContainer.style.width = '120px';
  
  // Create debug button
  const debugBtn = document.createElement('div');
  debugBtn.id = 'debugDatabaseBtn';
  debugBtn.className = 'debug-db-btn';
  debugBtn.textContent = 'Debug Database';
  debugBtn.style.padding = '8px';
  debugBtn.style.textAlign = 'center';
  debugBtn.style.background = '#333';
  debugBtn.style.borderRadius = '4px';
  debugBtn.style.cursor = 'pointer';
  debugBtn.style.fontSize = '12px';
  debugBtn.style.color = '#fff';
  debugBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
  
  // Add click event
  debugBtn.addEventListener('click', function() {
    debugDatabaseState();
  });
  
  // Add to container
  debugBtnContainer.appendChild(debugBtn);
  
  // Add to document body
  document.body.appendChild(debugBtnContainer);
}

/**
 * Debug database state - get detailed info on what's in the database
 */
function debugDatabaseState() {
  // Show a loading notification
  showNotification('Checking database state...', 'info', 2000);
  
  // Call the debug endpoint
  fetch('/debug/database', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log('Database debug data:', data);
    
    // Show a more detailed modal with the information
    let debugModal = document.createElement('div');
    debugModal.className = 'modal';
    debugModal.id = 'debugDatabaseModal';
    
    // Format the debug data for display
    const messageInfo = `Messages: ${data.message_counts.total} (${data.message_counts.sent} sent, ${data.message_counts.received} received)`;
    const deletedInfo = `Deleted chats: ${data.deleted_chats.count} (IDs: ${data.deleted_chats.user_ids.join(', ') || 'none'})`;
    const chatUsersInfo = `Chat partners: ${data.chat_users.count}`;
    
    // List chat users if there are any
    let chatUsersList = '';
    if (data.chat_users.users && data.chat_users.users.length > 0) {
      chatUsersList = '<ul style="text-align: left; margin: 10px 0; padding-left: 20px;">';
      data.chat_users.users.forEach(user => {
        const isDeleted = data.deleted_chats.user_ids.includes(user.id);
        chatUsersList += `<li>${user.name} (ID: ${user.id})${isDeleted ? ' - <span style="color:#e74c3c">DELETED</span>' : ''}</li>`;
      });
      chatUsersList += '</ul>';
    } else {
      chatUsersList = '<p>No chat partners found</p>';
    }
    
    // Create the modal content
    debugModal.innerHTML = `
      <div class="modal-content" style="width: 80%; max-width: 500px;">
        <h3>Database Debug Info</h3>
        <div style="text-align: left; margin: 15px 0;">
          <p>${messageInfo}</p>
          <p>${deletedInfo}</p>
          <p>${chatUsersInfo}</p>
          <hr style="margin: 15px 0; border-color: #444;">
          <h4 style="margin: 10px 0;">Chat Partners:</h4>
          ${chatUsersList}
        </div>
        <div class="modal-buttons">
          <button id="testServerDeleteBtn" class="btn-secondary">Test Server Delete</button>
          <button id="closeDebugModalBtn" class="btn-primary">Close</button>
        </div>
        <p style="margin-top: 15px; font-size: 12px; color: #888;">To fix missing chats, ensure the database has the DeletedChat table and messages exist.</p>
      </div>
    `;
    
    document.body.appendChild(debugModal);
    
    // Show the modal and overlay
    debugModal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
    
    // Close button handler
    document.getElementById('closeDebugModalBtn').addEventListener('click', function() {
      debugModal.classList.remove('active');
      document.getElementById('overlay').classList.remove('active');
      setTimeout(() => {
        debugModal.remove();
      }, 300);
    });
    
    // Test server-side deletion button
    document.getElementById('testServerDeleteBtn').addEventListener('click', function() {
      // Only enable if we have chat partners
      if (data.chat_users.users && data.chat_users.users.length > 0) {
        const firstUser = data.chat_users.users[0];
        testServerDelete(firstUser.id, firstUser.name);
      } else {
        showErrorNotification('No chat partners to test deletion with');
      }
    });
  })
  .catch(error => {
    console.error('Error getting database debug info:', error);
    showErrorNotification('Failed to get database information');
  });
}

/**
 * Test server-side deletion directly with API
 */
function testServerDelete(userId, userName) {
  console.log(`Testing server deletion for user ${userId} (${userName})`);
  
  // Make a direct fetch call to the delete_chat endpoint
  fetch('/delete_chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: userId })
  })
  .then(response => response.json())
  .then(data => {
    console.log('Server delete response:', data);
    
    if (data.success) {
      showSuccessNotification(`Successfully tested delete for ${userName}`);
      
      // Close the debug modal
      const debugModal = document.getElementById('debugDatabaseModal');
      if (debugModal) {
        debugModal.classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
        setTimeout(() => {
          debugModal.remove();
        }, 300);
      }
      
      // Reload sidebar to see changes
      loadSidebar();
    } else {
      showErrorNotification(`Server delete test failed: ${data.error || 'Unknown error'}`);
    }
  })
  .catch(error => {
    console.error('Error testing server delete:', error);
    showErrorNotification('Failed to test server delete');
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
  
  // Log contact status for debugging
  console.log(`Chat item for ${chat.name} (${chat.user_id}):`, {
    is_contact: chat.is_contact,
    is_blocked_by_you: chat.is_blocked_by_you,
    has_blocked_you: chat.has_blocked_you
  });
  
  // Priority: Show block indicator first, then contact indicator if not blocked
  if (chat.is_blocked_by_you) {
    const blockIndicator = document.createElement('span');
    blockIndicator.className = 'block-indicator blocked-by-you';
    blockIndicator.textContent = 'B';
    blockIndicator.setAttribute('data-tooltip', 'You have blocked this user');
    
    // Add event listeners for showing/hiding tooltip
    blockIndicator.addEventListener('mouseenter', showTooltip);
    blockIndicator.addEventListener('mouseleave', hideTooltip);
    
    chatItem.appendChild(blockIndicator);
    console.log(`Added block indicator (you blocked) for ${chat.name}`);
  } else if (chat.has_blocked_you) {
    const blockIndicator = document.createElement('span');
    blockIndicator.className = 'block-indicator blocked-you';
    blockIndicator.textContent = 'B';
    blockIndicator.setAttribute('data-tooltip', 'This user has blocked you');
    
    // Add event listeners for showing/hiding tooltip
    blockIndicator.addEventListener('mouseenter', showTooltip);
    blockIndicator.addEventListener('mouseleave', hideTooltip);
    
    chatItem.appendChild(blockIndicator);
    console.log(`Added block indicator (blocked you) for ${chat.name}`);
  } else if (chat.is_contact) {
    // Only show contact indicator if not blocked
    const contactIndicator = document.createElement('span');
    contactIndicator.className = 'contact-indicator';
    contactIndicator.textContent = 'C';
    contactIndicator.setAttribute('data-tooltip', 'This user is in your contacts');
    
    // Add event listeners for showing/hiding tooltip
    contactIndicator.addEventListener('mouseenter', showTooltip);
    contactIndicator.addEventListener('mouseleave', hideTooltip);
    
    chatItem.appendChild(contactIndicator);
    console.log(`Added contact indicator for ${chat.name}`);
  }
  
  // Assemble elements
  userInfo.appendChild(userName);
  userInfo.appendChild(lastMessage);
  
  chatItem.appendChild(userAvatar);
  chatItem.appendChild(userInfo);
  
  // Add click handler with debugging
  chatItem.addEventListener('click', function(e) {
    console.log('Chat item clicked:', chat.user_id, chat.name);
    e.stopPropagation(); // Prevent event bubbling
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
 * Update block indicators in the sidebar
 * @param {number} userId - The user ID to update indicators for
 * @param {object} blockStatus - The block status object
 */
function updateBlockIndicators(userId, blockStatus) {
  console.log(`Updating block indicators for user ${userId}:`, blockStatus);
  
  // Find the contact item for this user using more specific selector
  const contactItem = document.querySelector(`.contact-item[data-user-id="${userId}"]`);
  if (!contactItem) {
    console.warn(`Contact item for user ${userId} not found in sidebar`);
    return;
  }
  
  // Remove any existing indicators first
  const existingIndicator = contactItem.querySelector('.block-indicator, .contact-indicator');
  if (existingIndicator) {
    console.log(`Removing existing indicator: ${existingIndicator.className}`);
    existingIndicator.remove();
  }
  
  // Add the appropriate indicator based on block status
  if (blockStatus.isBlocked) {
    // You blocked this user
    const blockIndicator = document.createElement('span');
    blockIndicator.className = 'block-indicator blocked-by-you';
    blockIndicator.textContent = 'B';
    blockIndicator.setAttribute('data-tooltip', 'You have blocked this user');
    
    // Add event listeners for tooltip
    blockIndicator.addEventListener('mouseenter', showTooltip);
    blockIndicator.addEventListener('mouseleave', hideTooltip);
    
    contactItem.appendChild(blockIndicator);
    console.log(`Added 'you blocked' indicator for user ${userId}`);
  } else if (blockStatus.hasBlockedYou) {
    // User blocked you
    const blockIndicator = document.createElement('span');
    blockIndicator.className = 'block-indicator blocked-you';
    blockIndicator.textContent = 'B';
    blockIndicator.setAttribute('data-tooltip', 'This user has blocked you');
    
    // Add event listeners for tooltip
    blockIndicator.addEventListener('mouseenter', showTooltip);
    blockIndicator.addEventListener('mouseleave', hideTooltip);
    
    contactItem.appendChild(blockIndicator);
    console.log(`Added 'blocked you' indicator for user ${userId}`);
  } else {
    // Check if this was a contact and add the contact indicator if needed
    checkContactStatus(userId).then(isContact => {
      if (isContact) {
        const contactIndicator = document.createElement('span');
        contactIndicator.className = 'contact-indicator';
        contactIndicator.textContent = 'C';
        contactIndicator.setAttribute('data-tooltip', 'This user is in your contacts');
        
        // Add event listeners for tooltip
        contactIndicator.addEventListener('mouseenter', showTooltip);
        contactIndicator.addEventListener('mouseleave', hideTooltip);
        
        // Make sure contact item still exists before appending
        if (document.body.contains(contactItem)) {
          contactItem.appendChild(contactIndicator);
          console.log(`Added contact indicator for user ${userId}`);
        }
      }
    });
  }
}

/**
 * Handler for blocking a user
 */
function blockUserHandler(userId, userName) {
  console.log(`Blocking user ${userId} (${userName})`);
  
  blockUser(userId)
    .then(data => {
      if (data.success) {
        showNotification(`You have blocked ${userName}`, 'block-user');
        
        // Update block indicator in sidebar without full reload
        updateBlockIndicators(userId, { isBlocked: true, hasBlockedYou: false });
        
        // Force an immediate sidebar refresh to ensure the block shows up
        loadSidebar();
        
        // If currently chatting with blocked user, reopen the chat with the blocked state
        if (ChatApp.activeChat && ChatApp.activeChat.id == userId) {
          openChatWithUser(userId, userName);
        }
      }
    })
    .catch(error => {
      console.error('Error blocking user:', error);
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
        // Show success notification
        showSuccessNotification(`You have unblocked ${userName}`);
        
        // Update block indicator in sidebar without full reload
        updateBlockIndicators(userId, { isBlocked: false, hasBlockedYou: false });
        
        // If we're in an active chat with this user, update the interface
        if (ChatApp.activeChat && ChatApp.activeChat.id == userId) {
          // Remove any blocking message elements
          const blockingMessage = document.querySelector('.blocking-message');
          if (blockingMessage) {
            blockingMessage.remove();
          }
          
          // Update the chat interface with the user now unblocked
          getUserInfo(userId)
            .then(userData => {
              // Get fresh block status
              return Promise.all([userData, checkBlockStatus(userId)]);
            })
            .then(([userData, blockStatus]) => {
              // Recreate the chat interface with updated block status
              createChatInterface(userData, blockStatus);
              
              // Reload messages
              loadMessages(userId);
            });
        }
      } else {
        showErrorNotification('Failed to unblock user. Please try again.');
      }
    })
    .catch(error => {
      console.error('Error unblocking user:', error);
      showErrorNotification('Failed to unblock user. Please try again.');
    });
}

/**
 * Execute chat deletion after confirmation
 */
function executeDeleteChat(userId, userName) {
  // First, remove this chat from the sidebar immediately (client-side)
  const chatItem = document.querySelector(`.contact-item[data-user-id="${userId}"]`);
  if (chatItem && chatItem.parentNode) {
    chatItem.parentNode.removeChild(chatItem);
  }
  
  // Then notify the server
  deleteChat(userId)
    .then(data => {
      if (data.success) {
        showNotification(`Chat with ${userName} deleted`, 'delete-chat');
        
        // Reset main content area
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
          mainContent.innerHTML = '';
          
          // Show a placeholder message
          const emptyChat = document.createElement('div');
          emptyChat.className = 'empty-chat-container';
          emptyChat.innerHTML = '<div class="empty-chat-message">Select a chat to start messaging</div>';
          
          mainContent.appendChild(emptyChat);
        }
        
        // Reset active chat
        ChatApp.activeChat = null;
        
        // Stop any active polling
        cleanupPolling();
      } else {
        // If server deletion failed, reload sidebar to restore the chat
        loadSidebar();
        showErrorNotification('Failed to delete chat on server. Please try again.');
      }
    })
    .catch(error => {
      console.error('Error deleting chat:', error);
      // Reload sidebar to restore the chat
      loadSidebar();
      showErrorNotification('Failed to delete chat. Please try again.');
    });
}
