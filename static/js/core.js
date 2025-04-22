/**
 * Core application functionality
 */

// Global ChatApp object to manage application state
const ChatApp = {
    // Application state
    currentUser: null,
    activeChat: null,
    activeContact: null,
    messagePage: 1,
    messageLimit: 30,
    hasMoreMessages: true,
    polling: null,
    pollingInterval: 3000, // 3 seconds
    
    // Debug flag
    debug: true,
    
    // Initialize the application
    init: function() {
        console.log('[ChatApp] Initializing application');
        
        // Add verbose error handler for chat initialization
        window.addEventListener('error', function(e) {
            console.error('[ChatApp] Global error:', e.message, 'at', e.filename, 'line', e.lineno);
        });
        
        // Set up UI components
        this.setupCoreComponents();
        
        // Load current user information
        this.loadCurrentUser()
            .then(userData => {
                console.log('[ChatApp] Current user loaded successfully:', userData.user_name);
                
                // Load sidebar with contacts and chats
                if (typeof loadSidebar === 'function') {
                    loadSidebar();
                } else {
                    console.error('[ChatApp] loadSidebar function not available');
                }
                
                // Start polling for new messages if user is logged in
                if (this.currentUser) {
                    this.startPolling();
                }
            })
            .catch(error => {
                console.error('[ChatApp] Failed to initialize application:', error);
                if (typeof showErrorNotification === 'function') {
                    showErrorNotification('Failed to load user information');
                }
            });
    },
    
    // Set up core components
    setupCoreComponents: function() {
        // Initialize debugging tools if available
        if (typeof initDebugPanel === 'function') {
            try {
                initDebugPanel();
                console.log('[ChatApp] Debug panel initialized');
            } catch(e) {
                console.warn('[ChatApp] Debug panel initialization failed:', e);
            }
        }
        
        // Set up menu buttons if available
        if (typeof setupMenuButtons === 'function') {
            try {
                setupMenuButtons();
                console.log('[ChatApp] Menu buttons initialized');
            } catch(e) {
                console.warn('[ChatApp] Menu setup failed:', e);
            }
        }
        
        // Set up avatar upload if available
        if (typeof setupAvatarUpload === 'function') {
            try {
                setupAvatarUpload();
                console.log('[ChatApp] Avatar upload initialized');
            } catch(e) {
                console.warn('[ChatApp] Avatar upload setup failed:', e);
            }
        }
    },
    
    // Load current user information
    loadCurrentUser: function() {
        console.log('[ChatApp] Loading current user information');
        return fetch('/get_current_user_info')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.status);
                }
                return response.json();
            })
            .then(userData => {
                this.currentUser = userData;
                
                // Update UI with user data if function exists
                if (typeof updateUserInterface === 'function') {
                    updateUserInterface(userData);
                } else {
                    console.warn('[ChatApp] updateUserInterface function not available');
                }
                
                return userData;
            });
    },
    
    // Start polling for new messages
    startPolling: function() {
        console.log('[ChatApp] Starting message polling');
        if (this.polling) {
            clearInterval(this.polling);
        }
        
        this.polling = setInterval(() => {
            this.pollForUpdates();
        }, this.pollingInterval);
    },
    
    // Stop polling
    stopPolling: function() {
        if (this.polling) {
            clearInterval(this.polling);
            this.polling = null;
            console.log('[ChatApp] Message polling stopped');
        }
    },
    
    // Poll for updates (new messages, status changes)
    pollForUpdates: function() {
        // Only poll if we have an active chat
        if (this.activeChat) {
            this.checkForNewMessages();
        }
    },
    
    // Check for new messages in current chat
    checkForNewMessages: function() {
        if (!this.activeChat || !this.activeChat.userId) {
            console.warn('[ChatApp] Cannot check for new messages: No active chat');
            return;
        }
        
        // Find the last message ID if there are messages
        let lastMessageId = 0;
        const messages = document.querySelectorAll('.message');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            lastMessageId = parseInt(lastMessage.dataset.messageId) || 0;
        }
        
        // Get new messages since the last message
        if (typeof fetchMessages !== 'function') {
            console.error('[ChatApp] fetchMessages function not available');
            return;
        }
        
        fetchMessages(this.activeChat.userId, 1, 100, lastMessageId)
            .then(data => {
                if (data.success && data.messages && data.messages.length > 0) {
                    // Log in debug if enabled
                    if (typeof logNewMessages === 'function') {
                        logNewMessages(data.messages.length);
                    }
                    
                    // Add new messages to the chat
                    const chatMessages = document.querySelector('.chat-messages');
                    if (chatMessages) {
                        data.messages.forEach(message => {
                            if (typeof addMessageToChat === 'function') {
                                addMessageToChat(message, chatMessages, true);
                            } else {
                                console.error('[ChatApp] addMessageToChat function not available');
                            }
                        });
                    }
                }
            })
            .catch(error => {
                console.error('[ChatApp] Error polling for new messages:', error);
            });
    },
    
    // Open chat with a user
    openChat: function(userId, userName) {
        console.log(`[ChatApp] Opening chat with user ${userName} (ID: ${userId})`);
        
        if (!userId) {
            console.error('[ChatApp] Cannot open chat: Invalid user ID');
            return;
        }
        
        // Convert userId to a number to ensure consistency
        userId = parseInt(userId, 10);
        
        // Store the active chat information
        this.activeChat = {
            userId: userId,
            userName: userName
        };
        
        // Find and activate the corresponding contact item if it exists
        const contactItems = document.querySelectorAll('.contact-item');
        let contactExists = false;
        
        contactItems.forEach(item => {
            if (item.dataset.userId === userId.toString()) {
                contactExists = true;
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        if (!contactExists) {
            console.log(`[ChatApp] User ${userId} not found in current contacts list, will add to contacts`);
        }
        
        // Create the chat interface
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error('[ChatApp] Main content element not found');
            return;
        }
        
        // Clear the main content
        mainContent.innerHTML = '';
        
        // Create the chat container
        const chatContainer = document.createElement('div');
        chatContainer.className = 'chat-container';
        
        // Add chat header
        chatContainer.innerHTML = `
            <div class="chat-header">
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
                <!-- Messages will be loaded here -->
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
        
        mainContent.appendChild(chatContainer);
        
        // Load chat messages
        const chatMessages = chatContainer.querySelector('.chat-messages');
        if (chatMessages) {
            if (typeof loadMessages === 'function') {
                loadMessages(userId)
                    .catch(error => {
                        console.error('[ChatApp] Error loading messages:', error);
                    });
            } else {
                console.error('[ChatApp] loadMessages function not available');
                chatMessages.innerHTML = '<div class="no-messages">Failed to load messages. loadMessages function not found.</div>';
            }
        }
        
        // Set up message input handlers
        const messageInput = chatContainer.querySelector('.message-input-field input');
        const sendButton = chatContainer.querySelector('.send-button');
        const attachButton = chatContainer.querySelector('.paperclip-button');
        
        if (messageInput && sendButton) {
            // Enable/disable send button based on input content
            messageInput.addEventListener('input', function() {
                if (this.value.trim()) {
                    sendButton.classList.add('active');
                } else {
                    sendButton.classList.remove('active');
                }
            });
            
            // Handle enter key in input field
            messageInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey && this.value.trim()) {
                    e.preventDefault();
                    if (typeof sendMessageHandler === 'function') {
                        sendMessageHandler(this.value, userId, chatMessages);
                    } else {
                        console.error('[ChatApp] sendMessageHandler function not available');
                    }
                }
            });
            
            // Handle send button click
            sendButton.addEventListener('click', function() {
                if (messageInput.value.trim()) {
                    if (typeof sendMessageHandler === 'function') {
                        sendMessageHandler(messageInput.value, userId, chatMessages);
                    } else {
                        console.error('[ChatApp] sendMessageHandler function not available');
                    }
                }
            });
        }
        
        // Set up file attachment
        if (attachButton) {
            attachButton.addEventListener('click', function() {
                // Create a file input element
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);
                
                // Trigger click on the file input
                fileInput.click();
                
                // Handle file selection
                fileInput.addEventListener('change', function() {
                    if (this.files && this.files.length > 0) {
                        if (typeof handleFileSelection === 'function') {
                            handleFileSelection(this.files, ChatApp.activeChat);
                        } else {
                            console.error('[ChatApp] handleFileSelection function not available');
                        }
                    }
                    // Remove the file input from the DOM
                    document.body.removeChild(fileInput);
                });
            });
        }
        
        // Check for contact status and update UI if needed
        console.log('[ChatApp] Checking contact status for user:', userId);
        fetch('/check_contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contact_id: userId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('[ChatApp] Contact status response:', data);
            if (data.is_contact) {
                console.log(`[ChatApp] User ${userId} is already a contact`);
            } else if (!contactExists) {
                console.log(`[ChatApp] User ${userId} is not a contact, adding to contacts`);
                // Add user to contacts if they aren't already
                if (typeof addToContacts === 'function') {
                    addToContacts(userId)
                        .then(success => {
                            if (success) {
                                console.log('[ChatApp] Successfully added to contacts, refreshing sidebar');
                                // If we successfully added to contacts, refresh the sidebar
                                if (typeof refreshContacts === 'function') {
                                    refreshContacts();
                                } else if (typeof loadSidebar === 'function') {
                                    loadSidebar();
                                } else {
                                    console.error('[ChatApp] Neither refreshContacts nor loadSidebar function available');
                                }
                            } else {
                                console.warn('[ChatApp] Failed to add user to contacts');
                            }
                        });
                } else {
                    console.error('[ChatApp] addToContacts function not available');
                }
            }
        })
        .catch(error => {
            console.error('[ChatApp] Error checking contact status:', error);
        });
        
        // If this user was not in the sidebar before, refresh the sidebar
        if (!contactExists) {
            console.log('[ChatApp] Contact not found in sidebar, scheduling refresh');
            setTimeout(() => {
                if (typeof loadSidebar === 'function') {
                    loadSidebar();
                } else {
                    console.error('[ChatApp] loadSidebar function not available for delayed refresh');
                }
            }, 1000);
        }
    }
};

// Add methods to diagnose missing functions
ChatApp.diagnoseFunctions = function() {
    const requiredFunctions = [
        'fetchMessages', 'loadMessages', 'sendMessageHandler', 'addMessageToChat',
        'handleFileSelection', 'addToContacts', 'loadSidebar', 'refreshContacts',
        'updateUserInterface', 'showErrorNotification'
    ];
    
    console.group('[ChatApp] Function Diagnostics:');
    let allFunctionsAvailable = true;
    
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✓ ${funcName}: Available`);
        } else {
            console.error(`✗ ${funcName}: Not available`);
            allFunctionsAvailable = false;
        }
    });
    
    if (!allFunctionsAvailable) {
        console.warn('[ChatApp] Some required functions are missing. The application may not work correctly.');
    } else {
        console.log('[ChatApp] All required functions are available.');
    }
    console.groupEnd();
    
    return allFunctionsAvailable;
};

// Run diagnostics after a short delay to ensure all scripts are loaded
setTimeout(() => {
    ChatApp.diagnoseFunctions();
}, 1000);

// Make openChat available globally
window.openChat = function(userId, userName) {
    console.log(`[Global] openChat called for user ${userName} (ID: ${userId})`);
    if (!userId) {
        console.error('[Global] openChat called with invalid userId');
        return;
    }
    ChatApp.openChat(userId, userName);
};

// Check if document is ready and auto-initialize
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('[ChatApp] Document already ready, initializing immediately');
    ChatApp.init();
} else {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[ChatApp] DOMContentLoaded event, initializing');
        ChatApp.init();
    });
}
