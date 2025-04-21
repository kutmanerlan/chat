/**
 * Contact management functions
 */

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
  });
  
  return contactItem;
}

/**
 * Load recent conversations
 */
function loadRecentConversations() {
  console.log('Loading recent conversations...');
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
    console.log('Recent conversations loaded:', data);
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

    // Make the section visible even if there are no formal contacts
    conversationsSection.style.display = 'block';
  } else {
    // If no conversations, hide the section
    conversationsSection.style.display = 'none';
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
  });
  
  return conversationItem;
}

/**
 * Handler for adding a contact
 */
function addContactHandler(userId, userName) {
  addToContacts(userId)
    .then(data => {
      if (data.success) {
        showSuccessNotification(`${userName} added to contacts`);
        loadContacts();
        
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
        loadContacts();
        
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
