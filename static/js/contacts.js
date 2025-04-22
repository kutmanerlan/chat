/**
 * Contact management functions
 */

/**
 * Load contacts and chats in sidebar
 */
function loadSidebar() {
    console.log('Loading sidebar data...');
    
    // Show loading indicator in contacts list
    const contactsList = document.getElementById('contactsList');
    if (contactsList) {
        contactsList.innerHTML = '<div class="loading-sidebar">Loading contacts and chats...</div>';
    }
    
    // Load contacts and conversations with retry
    loadSidebarData();
}

/**
 * Helper function to load sidebar data with retry
 */
function loadSidebarData(retryCount = 0) {
    console.log(`Attempting to load sidebar data (attempt ${retryCount + 1})`);
    
    // Fetch contacts and chats in parallel
    Promise.all([fetchContacts(), fetchChatList()])
        .then(([contactsResponse, chatsResponse]) => {
            // Process responses
            if (contactsResponse.success && chatsResponse.success) {
                console.log(`Loaded ${contactsResponse.contacts.length} contacts and ${chatsResponse.chats.length} chats`);
                renderSidebar(contactsResponse.contacts, chatsResponse.chats);
            } else {
                console.error('Failed to load sidebar data:', 
                    contactsResponse.success ? '' : 'Contacts error', 
                    chatsResponse.success ? '' : 'Chats error');
                
                throw new Error('Failed to load sidebar data');
            }
        })
        .catch(error => {
            console.error('Error loading sidebar data:', error);
            
            // Show error message in contacts list
            const contactsList = document.getElementById('contactsList');
            if (contactsList) {
                if (retryCount < 2) {
                    // Try again after a short delay
                    setTimeout(() => {
                        loadSidebarData(retryCount + 1);
                    }, 2000);
                    
                    contactsList.innerHTML = '<div class="loading-sidebar">Retrying...</div>';
                } else {
                    // Give up after 3 attempts
                    contactsList.innerHTML = `
                        <div class="sidebar-error">
                            Failed to load contacts.
                            <a href="#" onclick="loadSidebar(); return false;">Retry</a>
                        </div>
                    `;
                }
            }
        });
}

/**
 * Fetch contacts from the server
 */
function fetchContacts() {
    console.log('Fetching contacts from server...');
    return fetch('/get_contacts')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        });
}

/**
 * Fetch chat list from the server
 */
function fetchChatList() {
    console.log('Fetching chat list from server...');
    
    // Try the main chat list endpoint
    return fetch('/get_chat_list')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .catch(error => {
            console.warn('Error using primary chat list endpoint, trying fallback:', error);
            
            // If the main endpoint fails, try the alternate endpoint
            return fetch('/get_chat_list_with_deleted')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                });
        });
}

/**
 * Render sidebar with contacts and chats
 */
function renderSidebar(contacts, chats) {
    console.log('Rendering sidebar with:', contacts.length, 'contacts and', chats.length, 'chats');
    
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) {
        console.error('Contacts list element not found');
        return;
    }
    
    // Clear the list
    contactsList.innerHTML = '';
    
    // Create a container for conversations if we have any
    if (chats.length > 0) {
        const conversationsSection = document.createElement('div');
        conversationsSection.className = 'conversations-section';
        
        const conversationsTitle = document.createElement('div');
        conversationsTitle.className = 'section-title';
        conversationsTitle.textContent = 'Recent Chats';
        conversationsSection.appendChild(conversationsTitle);
        
        // Add conversations
        chats.forEach(chat => {
            // Create chat element
            const chatElement = createChatElement(chat);
            conversationsSection.appendChild(chatElement);
        });
        
        contactsList.appendChild(conversationsSection);
    }
    
    // Create a container for contacts if we have any
    if (contacts.length > 0) {
        const contactsSection = document.createElement('div');
        contactsSection.className = 'contacts-section';
        
        const contactsTitle = document.createElement('div');
        contactsTitle.className = 'section-title';
        contactsTitle.textContent = 'Contacts';
        contactsSection.appendChild(contactsTitle);
        
        // Add contacts
        contacts.forEach(contact => {
            // Skip contacts that are already in chats to avoid duplication
            const isInChats = chats.some(chat => chat.user_id === contact.id);
            if (!isInChats) {
                // Create contact element
                const contactElement = createContactElement(contact);
                contactsSection.appendChild(contactElement);
            }
        });
        
        // Only add the section if there are unique contacts
        if (contactsSection.childElementCount > 1) {
            contactsList.appendChild(contactsSection);
        }
    }
    
    // If no contacts or chats, show a message
    if (contacts.length === 0 && chats.length === 0) {
        const noContactsMessage = document.createElement('div');
        noContactsMessage.className = 'no-contacts-message';
        noContactsMessage.textContent = 'No contacts or chats yet. Search for users to start chatting.';
        noContactsMessage.style.display = 'block';
        contactsList.appendChild(noContactsMessage);
    }
    
    // Debug any issues with sidebar rendering
    console.log('Sidebar rendering complete');
    
    // Call debug function if it exists
    if (typeof debugIndicators === 'function') {
        setTimeout(debugIndicators, 500);
    }
}

// Add a new function to refresh just the contacts part
function refreshContacts() {
    console.log('Refreshing contacts...');
    fetchContacts()
        .then(response => {
            if (response.success) {
                console.log('Successfully fetched contacts:', response.contacts.length);
                
                // Find or create the contacts section
                let contactsSection = document.querySelector('.contacts-section');
                if (!contactsSection) {
                    const contactsList = document.getElementById('contactsList');
                    if (!contactsList) return;
                    
                    contactsSection = document.createElement('div');
                    contactsSection.className = 'contacts-section';
                    
                    const contactsTitle = document.createElement('div');
                    contactsTitle.className = 'section-title';
                    contactsTitle.textContent = 'Contacts';
                    contactsSection.appendChild(contactsTitle);
                    
                    contactsList.appendChild(contactsSection);
                } else {
                    // Clear existing contacts, keeping the title
                    const title = contactsSection.querySelector('.section-title');
                    contactsSection.innerHTML = '';
                    contactsSection.appendChild(title);
                }
                
                // Add contacts
                response.contacts.forEach(contact => {
                    const contactElement = createContactElement(contact);
                    contactsSection.appendChild(contactElement);
                });
            } else {
                console.error('Failed to refresh contacts');
            }
        })
        .catch(error => {
            console.error('Error refreshing contacts:', error);
        });
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
