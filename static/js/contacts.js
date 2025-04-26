/**
 * Contact management functions
 */

/**
 * Load user contacts, groups and chats
 */
function loadSidebar() {
  console.log('Loading sidebar data');
  
  // Load contacts, groups and chats
  Promise.all([fetchContacts(), fetchUserGroups(), fetchChatList()])
    .then(([contactsData, groupsData, chatsData]) => {
      console.log('Contacts data:', contactsData);
      console.log('Groups data:', groupsData);
      console.log('Chats data:', chatsData);
      
      // Store data in app state
      if (contactsData.contacts) {
        ChatApp.contacts = contactsData.contacts;
      }
      
      if (groupsData.success && groupsData.groups) {
        ChatApp.groups = groupsData.groups;
      } else {
        ChatApp.groups = [];
      }
      
      if (chatsData.chats) {
        ChatApp.chats = chatsData.chats;
      }
      
      // Render sidebar items
      renderSidebar(ChatApp.contacts, ChatApp.groups, ChatApp.chats);
    })
    .catch(error => {
      console.error('Error loading sidebar data:', error);
      showErrorNotification('Failed to load contacts and chats');
    });
}

/**
 * Render the sidebar with contacts, groups and chats
 */
function renderSidebar(contacts, groups, chats) {
  const contactsList = document.getElementById('contactsList');
  const noContactsMessage = document.querySelector('.no-contacts-message');
  
  if (!contactsList) return;
  
  // Clear existing items
  contactsList.innerHTML = '';
  
  // Create groups section
  if (groups && groups.length > 0) {
    const groupSection = document.createElement('div');
    groupSection.className = 'sidebar-section groups-section';
    
    const groupTitle = document.createElement('div');
    groupTitle.className = 'section-title';
    groupTitle.textContent = 'Groups';
    groupSection.appendChild(groupTitle);
    
    // Add groups
    groups.forEach(group => {
      const groupItem = createGroupElement(group);
      groupSection.appendChild(groupItem);
    });
    
    contactsList.appendChild(groupSection);
    
    // Add separator
    const separator1 = document.createElement('div');
    separator1.className = 'sidebar-separator';
    contactsList.appendChild(separator1);
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
}

/**
 * Create a group element
 */
function createGroupElement(group) {
  const groupItem = document.createElement('div');
  groupItem.className = 'contact-item group-item';
  groupItem.dataset.groupId = group.id;
  
  // Group avatar
  const groupAvatar = document.createElement('div');
  groupAvatar.className = 'contact-avatar group-avatar';
  
  // Check if group has an avatar path
  if (group.avatar_path) {
    // Fix avatar path - ensure it starts with /static/ if needed
    let avatarSrc = group.avatar_path;
    if (!avatarSrc.startsWith('http') && !avatarSrc.startsWith('/static/')) {
      avatarSrc = `/static/${avatarSrc}`;
    }
    groupAvatar.innerHTML = `<img src="${avatarSrc}" alt="${group.name}" class="avatar-image">`;
  } else {
    // For numeric group names, use 'G' as the initial instead of a number
    const isNumericOnly = /^\d+$/.test(group.name);
    const initial = isNumericOnly ? 'G' : group.name.charAt(0);
    groupAvatar.innerHTML = `<div class="avatar-initials">${initial}</div>`;
  }
  
  // Group info
  const groupInfo = document.createElement('div');
  groupInfo.className = 'contact-info';
  groupInfo.style.display = 'flex';
  groupInfo.style.flexDirection = 'column';
  groupInfo.style.justifyContent = 'center';
  
  // Название и индикатор G в одной строке
  const groupNameRow = document.createElement('div');
  groupNameRow.style.display = 'flex';
  groupNameRow.style.alignItems = 'center';
  groupNameRow.style.width = '100%';

  const groupName = document.createElement('div');
  groupName.className = 'contact-name';
  groupName.innerHTML = `<span class="name-text">${group.name}</span>`;
  groupNameRow.appendChild(groupName);

  const groupIndicator = document.createElement('span');
  groupIndicator.className = 'group-indicator';
  groupIndicator.textContent = 'G';
  groupIndicator.style.marginLeft = '8px';
  groupNameRow.appendChild(groupIndicator);

  // Последнее сообщение и время
  const groupDetailsRow = document.createElement('div');
  groupDetailsRow.className = 'chat-details-row';
  groupDetailsRow.style.display = 'flex';
  groupDetailsRow.style.alignItems = 'center';
  groupDetailsRow.style.width = '100%';
  groupDetailsRow.style.minHeight = '20px';

  const lastMessagePreview = document.createElement('span');
  lastMessagePreview.className = 'last-message'; // Используем тот же класс для стилей
  lastMessagePreview.style.flex = '1 1 auto';
  lastMessagePreview.style.overflow = 'hidden';
  lastMessagePreview.style.textOverflow = 'ellipsis';
  lastMessagePreview.style.whiteSpace = 'nowrap';
  lastMessagePreview.style.display = 'inline-block';
  lastMessagePreview.style.verticalAlign = 'middle';

  const lastTime = document.createElement('span');
  lastTime.className = 'last-time';
  lastTime.style.display = 'inline-block';
  lastTime.style.verticalAlign = 'middle';

  if (group.last_message) {
    let messagePreviewText = group.last_message.content;
    if (messagePreviewText.length > 25) {
      messagePreviewText = messagePreviewText.substring(0, 25) + '...';
    }
    const senderName = group.last_message.sender_name || 'Someone';
    lastMessagePreview.textContent = `${senderName}: ${messagePreviewText}`;
    lastTime.textContent = formatMessageTime(group.last_message.timestamp);
  } else {
    lastMessagePreview.textContent = `${group.member_count || 0} members`; // Если нет сообщений, показываем кол-во участников
    lastTime.textContent = '';
  }

  groupDetailsRow.appendChild(lastMessagePreview);
  groupDetailsRow.appendChild(lastTime);

  groupInfo.appendChild(groupNameRow);
  groupInfo.appendChild(groupDetailsRow);

  groupItem.appendChild(groupAvatar);
  groupItem.appendChild(groupInfo);

  // Unread badge
  if (group.unread_count && group.unread_count > 0) {
    const unreadBadge = document.createElement('div');
    unreadBadge.className = 'unread-badge';
    unreadBadge.textContent = group.unread_count;
    groupItem.appendChild(unreadBadge);
  }

  groupItem.addEventListener('click', () => {
    openGroupChat(group.id, group.name);
  });
  
  return groupItem;
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
  chatItem.className = 'contact-item';
  chatItem.dataset.userId = chat.user_id;

  // Аватар
  const chatAvatar = document.createElement('div');
  chatAvatar.className = 'contact-avatar';
  if (chat.avatar_path) {
    chatAvatar.innerHTML = `<img src="${chat.avatar_path}" alt="${chat.name}">`;
  } else {
    chatAvatar.innerHTML = `<div class="avatar-initials">${chat.name.charAt(0)}</div>`;
  }

  // Контейнер для имени и последнего сообщения
  const chatInfo = document.createElement('div');
  chatInfo.className = 'contact-info';
  chatInfo.style.display = 'flex';
  chatInfo.style.flexDirection = 'column';
  chatInfo.style.justifyContent = 'center';

  // Имя и индикатор в одной строке, выровнены по вертикали
  const chatNameRow = document.createElement('div');
  chatNameRow.style.display = 'flex';
  chatNameRow.style.alignItems = 'center';
  chatNameRow.style.width = '100%';

  const chatName = document.createElement('div');
  chatName.className = 'contact-name';
  chatName.innerHTML = chat.name;
  chatNameRow.appendChild(chatName);

  // Индикатор контакта/блокировки
  let indicator = null;
  if (chat.is_blocked_by_you) {
    indicator = document.createElement('span');
    indicator.className = 'block-indicator blocked-by-you';
    indicator.textContent = 'B';
    indicator.setAttribute('data-tooltip', 'You have blocked this user');
    indicator.addEventListener('mouseenter', showTooltip);
    indicator.addEventListener('mouseleave', hideTooltip);
  } else if (chat.has_blocked_you) {
    indicator = document.createElement('span');
    indicator.className = 'block-indicator blocked-you';
    indicator.textContent = 'B';
    indicator.setAttribute('data-tooltip', 'This user has blocked you');
    indicator.addEventListener('mouseenter', showTooltip);
    indicator.addEventListener('mouseleave', hideTooltip);
  } else if (chat.is_contact) {
    indicator = document.createElement('span');
    indicator.className = 'contact-indicator';
    indicator.textContent = 'C';
    indicator.setAttribute('data-tooltip', 'This user is in your contacts');
    indicator.addEventListener('mouseenter', showTooltip);
    indicator.addEventListener('mouseleave', hideTooltip);
  }
  if (indicator) {
    indicator.style.marginLeft = 'auto'; // Смещаем вправо
    indicator.style.paddingLeft = '8px';
    chatNameRow.appendChild(indicator);
  }

  // Последнее сообщение и время в одной строке (flex), выровнены по вертикали
  const chatDetailsRow = document.createElement('div');
  chatDetailsRow.className = 'chat-details-row';
  chatDetailsRow.style.display = 'flex';
  chatDetailsRow.style.alignItems = 'center';
  chatDetailsRow.style.width = '100%';
  chatDetailsRow.style.minHeight = '20px';

  const lastMessage = document.createElement('span');
  lastMessage.className = 'last-message';
  lastMessage.textContent = chat.last_message || '';
  lastMessage.style.flex = '1 1 auto';
  lastMessage.style.overflow = 'hidden';
  lastMessage.style.textOverflow = 'ellipsis';
  lastMessage.style.whiteSpace = 'nowrap';
  lastMessage.style.display = 'inline-block';
  lastMessage.style.verticalAlign = 'middle';

  const lastTime = document.createElement('span');
  lastTime.className = 'last-time';
  lastTime.textContent = chat.last_timestamp ? formatMessageTime(chat.last_timestamp) : '';
  lastTime.style.display = 'inline-block';
  lastTime.style.verticalAlign = 'middle';
  lastTime.style.marginLeft = 'auto'; // Время всегда справа
  lastTime.style.paddingLeft = '8px';

  chatDetailsRow.appendChild(lastMessage);
  chatDetailsRow.appendChild(lastTime);

  chatInfo.appendChild(chatNameRow);
  chatInfo.appendChild(chatDetailsRow);

  chatItem.appendChild(chatAvatar);
  chatItem.appendChild(chatInfo);

  // Клик по чату
  chatItem.addEventListener('click', () => {
    openChatWithUser(chat.user_id, chat.name);
  });

  return chatItem;
}

/**
 * Format message timestamp for the sidebar, similar to Telegram
 * - Shows time (HH:MM) for today
 * - Shows day of week for this week
 * - Shows date (MM/DD) for older messages
 */
function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  // Format time as HH:MM
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeString = `${hours}:${minutes}`;
  
  // If it's today, return just the time
  if (date >= today) {
    return timeString;
  }
  
  // If it's yesterday, return "Yesterday"
  if (date >= yesterday) {
    return 'Yesterday';
  }
  
  // If it's within the last week, return day of week
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);
  if (date >= weekAgo) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }
  
  // For older messages, return MM/DD
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
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
          // Instead of clearing the interface, reopen the chat with the blocked state
          // This will ensure the header with avatar and name remains visible
          openChatWithUser(userId, userName);
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
