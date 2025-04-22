/**
 * Core application functionality
 */

// Initialize the ChatApp object with improved structure
const ChatApp = {
    // Application state
    currentUser: null,
    activeChat: null,
    
    // Initialize the application
    init: function() {
        console.log('[ChatApp] Starting initialization');
        
        // Get current user information
        this.loadCurrentUser()
            .then(() => {
                console.log('[ChatApp] Current user loaded:', this.currentUser);
                
                // Load sidebar
                if (typeof loadSidebar === 'function') {
                    loadSidebar();
                } else {
                    console.warn('[ChatApp] loadSidebar function not available');
                }
            })
            .catch(error => {
                console.error('[ChatApp] Error initializing ChatApp:', error);
            });
            
        // Set up global event handler for fixing problematic interfaces
        window.addEventListener('error', function(e) {
            console.warn('[ChatApp] Captured error:', e.message);
            // If we have errors, try the emergency fix
            if (typeof fixMessageSending === 'function') {
                console.log('[ChatApp] Applying emergency fixes');
                fixMessageSending();
            }
        });
    },
    
    // Load current user information
    loadCurrentUser: function() {
        return fetch('/get_current_user_info')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch user info');
                }
                return response.json();
            })
            .then(userData => {
                this.currentUser = userData;
                return userData;
            });
    },
    
    // Open chat with a user - simplified for reliability
    openChat: function(userId, userName) {
        console.log(`[ChatApp] Opening chat with user ${userName} (ID: ${userId})`);
        
        // Store the active chat information
        this.activeChat = {
            userId: userId,
            userName: userName
        };
        
        // Find active contact in sidebar if it exists
        const contactItems = document.querySelectorAll('.contact-item');
        contactItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.userId === userId.toString()) {
                item.classList.add('active');
            }
        });
        
        // Create the chat interface - simplified for reliability
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;
        
        // Clear the current content
        mainContent.innerHTML = '';
        
        // Create a new chat container
        const chatContainer = document.createElement('div');
        chatContainer.className = 'chat-container';
        
        // Add chat header with user info
        chatContainer.innerHTML = `
            <div class="chat-header" data-user-id="${userId}">
                <div class="chat-user-info">
                    <div class="chat-user-avatar">
                        <div class="avatar-initials">${userName.charAt(0).toUpperCase()}</div>
                    </div>
                    <div class="chat-user-name">${userName}</div>
                </div>
                <button class="chat-menu-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                </button>
            </div>
            <div class="chat-messages">
                <div class="loading-messages">Loading messages...</div>
            </div>
            <div class="message-input-container">
                <div class="input-wrapper">
                    <div class="clip-button-container">
                        <button class="paperclip-button">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="message-input-field">
                        <input type="text" placeholder="Type a message">
                    </div>
                    <button class="send-button">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 2L11 13"></path>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        // Add the chat container to the main content
        mainContent.appendChild(chatContainer);
        
        // Try to undelete the chat in case it was deleted before
        this.undeleteChat(userId);
        
        // Load messages for this chat
        this.loadMessages(userId);
        
        // Try to set up the message sending functionality (as a backup)
        if (typeof fixMessageSending === 'function') {
            fixMessageSending();
        }
        
        // Make sure the user is added to contacts
        this.ensureUserIsContact(userId);
    },
    
    // Load messages for a chat
    loadMessages: function(userId) {
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages) return;
        
        // Try to use the loadMessages function if it exists
        if (typeof loadMessages === 'function') {
            loadMessages(userId).catch(error => {
                console.error('[ChatApp] Error loading messages with regular function:', error);
                this.fallbackLoadMessages(userId);
            });
        } else {
            // Use fallback if function not found
            this.fallbackLoadMessages(userId);
        }
    },
    
    // Fallback for loading messages
    fallbackLoadMessages: function(userId) {
        console.log('[ChatApp] Using fallback message loading for user:', userId);
        
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages) return;
        
        // Show loading indicator
        chatMessages.innerHTML = '<div class="loading-messages">Loading messages...</div>';
        
        // Fetch messages from server
        fetch(`/get_messages?user_id=${userId}&page=1&limit=30`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch messages');
                }
                return response.json();
            })
            .then(data => {
                // Create messages container
                chatMessages.innerHTML = '';
                const messagesContainer = document.createElement('div');
                messagesContainer.className = 'messages-container';
                chatMessages.appendChild(messagesContainer);
                
                // Show messages if we have them
                if (data.success && data.messages && data.messages.length > 0) {
                    data.messages.forEach(message => {
                        const messageEl = this.createMessageElement(message);
                        messagesContainer.appendChild(messageEl);
                    });
                    
                    // Scroll to bottom
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                } else {
                    // Show no messages text
                    messagesContainer.innerHTML = '<div class="no-messages">No messages yet. Send a message to start the conversation.</div>';
                }
            })
            .catch(error => {
                console.error('[ChatApp] Error loading messages:', error);
                chatMessages.innerHTML = '<div class="error-message">Failed to load messages. Please try again.</div>';
            });
    },
    
    // Create a message element
    createMessageElement: function(message) {
        const messageEl = document.createElement('div');
        
        // Determine if this is a sent or received message
        const isSent = parseInt(message.sender_id) === parseInt(this.currentUser?.user_id);
        
        messageEl.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
        messageEl.dataset.messageId = message.id;
        
        // Format timestamp
        const timestamp = new Date(message.timestamp);
        const hours = String(timestamp.getHours()).padStart(2, '0');
        const minutes = String(timestamp.getMinutes()).padStart(2, '0');
        
        // Regular text message
        messageEl.innerHTML = `
            <div class="message-content">${this.escapeHtml(message.content)}</div>
            <div class="message-time">${hours}:${minutes}</div>
        `;
        
        // Add animation class
        setTimeout(() => {
            messageEl.classList.add('message-visible');
        }, 10);
        
        return messageEl;
    },
    
    // Make sure a user is added to contacts
    ensureUserIsContact: function(userId) {
        // Check if user is already a contact
        fetch('/check_contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contact_id: userId })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.is_contact) {
                // Add user to contacts
                this.addUserToContacts(userId);
            }
        })
        .catch(error => {
            console.error('[ChatApp] Error checking contact status:', error);
        });
    },
    
    // Add a user to contacts
    addUserToContacts: function(userId) {
        fetch('/add_contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contact_id: userId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('[ChatApp] User added to contacts:', data);
                // Refresh the sidebar
                if (typeof loadSidebar === 'function') {
                    setTimeout(() => {
                        loadSidebar();
                    }, 1000);
                }
            }
        })
        .catch(error => {
            console.error('[ChatApp] Error adding user to contacts:', error);
        });
    },
    
    // Undelete a chat if it was deleted
    undeleteChat: function(userId) {
        fetch('/clear_deleted_chats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId })
        })
        .then(response => response.json())
        .then(data => {
            console.log('[ChatApp] Chat undeleted:', data);
        })
        .catch(error => {
            console.error('[ChatApp] Error undeleting chat:', error);
        });
    },
    
    // Utility to escape HTML
    escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Make openChat function globally available
window.openChat = function(userId, userName) {
    console.log(`[Global] openChat called for user ${userName} (ID: ${userId})`);
    
    // Handle missing ChatApp
    if (typeof ChatApp === 'undefined' || !ChatApp.openChat) {
        console.error('[Global] ChatApp not available, using fallback');
        
        // Simple fallback implementation
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="chat-container">
                    <div class="chat-header">
                        <div class="chat-user-info">
                            <div class="chat-user-avatar">
                                <div class="avatar-initials">${userName.charAt(0).toUpperCase()}</div>
                            </div>
                            <div class="chat-user-name">${userName}</div>
                        </div>
                    </div>
                    <div class="chat-messages">
                        <div class="loading-messages">Loading messages...</div>
                    </div>
                    <div class="message-input-container">
                        <div class="input-wrapper">
                            <div class="message-input-field">
                                <input type="text" placeholder="Type a message">
                            </div>
                            <button class="send-button">Send</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Try to apply fixes
            if (typeof fixMessageSending === 'function') {
                setTimeout(fixMessageSending, 100);
            }
        }
        return;
    }
    
    // Use the ChatApp implementation
    ChatApp.openChat(userId, userName);
};

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('[ChatApp] DOM ready, initializing ChatApp');
    if (typeof ChatApp !== 'undefined' && ChatApp.init) {
        ChatApp.init();
    } else {
        console.error('[ChatApp] ChatApp object not available or init method missing');
    }
});
