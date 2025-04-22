/**
 * Core application functionality 
 * This file contains the main application logic, state management, and initialization
 */

// Application state and initialization
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
    
    // Initialize the application
    init: function() {
        console.log('Initializing ChatApp');
        
        // Initialize debugging tools
        initDebugPanel();
        
        // Set up UI components
        setupMenuButtons();
        setupAvatarUpload();
        
        // Load current user information
        this.loadCurrentUser()
            .then(() => {
                // Load sidebar with contacts and chats
                loadSidebar();
                
                // Start polling for new messages if user is logged in
                if (this.currentUser) {
                    this.startPolling();
                }
            })
            .catch(error => {
                console.error('Failed to initialize application:', error);
                showErrorNotification('Failed to load user information');
            });
    },
    
    // Load current user information
    loadCurrentUser: function() {
        return fetchCurrentUserInfo()
            .then(userData => {
                this.currentUser = userData;
                updateUserInterface(userData);
                return userData;
            });
    },
    
    // Start polling for new messages
    startPolling: function() {
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
        // Find the last message ID if there are messages
        let lastMessageId = 0;
        const messages = document.querySelectorAll('.message');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            lastMessageId = parseInt(lastMessage.dataset.messageId) || 0;
        }
        
        // Get new messages since the last message
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
                            addMessageToChat(message, chatMessages, true);
                        });
                    }
                }
            })
            .catch(error => {
                console.error('Error polling for new messages:', error);
            });
    },
    
    // Open chat with a user
    openChat: function(userId, userName) {
        console.log(`Opening chat with user ${userName} (ID: ${userId})`);
        
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
        
        // Create the chat interface
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;
        
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
                        <div class="avatar-initials">${userName.charAt(0)}</div>
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
            loadMessages(userId)
                .catch(error => {
                    console.error('Error loading messages:', error);
                });
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
                    sendMessageHandler(this.value, userId, chatMessages);
                }
            });
            
            // Handle send button click
            sendButton.addEventListener('click', function() {
                if (messageInput.value.trim()) {
                    sendMessageHandler(messageInput.value, userId, chatMessages);
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
                        handleFileSelection(this.files, ChatApp.activeChat);
                    }
                    // Remove the file input from the DOM
                    document.body.removeChild(fileInput);
                });
            });
        }
        
        // Check for contact status and update UI if needed
        fetch('/check_contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contact_id: userId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.is_contact) {
                console.log(`User ${userId} is already a contact`);
            } else if (!contactExists) {
                console.log(`User ${userId} is not a contact, adding to contacts`);
                // Add user to contacts if they aren't already
                addToContacts(userId);
            }
        })
        .catch(error => {
            console.error('Error checking contact status:', error);
        });
        
        // If this user was not in the sidebar before, refresh the sidebar
        if (!contactExists) {
            setTimeout(() => {
                loadSidebar();
            }, 1000);
        }
    }
};

// Make openChat available globally
window.openChat = function(userId, userName) {
    ChatApp.openChat(userId, userName);
};

// Helper function to fetch current user information
function fetchCurrentUserInfo() {
    return fetch('/get_current_user_info')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }
            return response.json();
        });
}

// Helper functions for date and time formatting
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return '';
        }
        
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    } catch (e) {
        console.error('Error formatting timestamp:', e);
        return '';
    }
}

function getInitials(name) {
    if (!name) return '?';
    
    // Split the name and get the first letter of each part
    const parts = name.split(' ');
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    } else {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
}

// Deep clone an object
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    
    const cloned = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    
    return cloned;
}

// Debounce function to limit function calls
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing ChatApp...');
    
    // Check if all required scripts are loaded - but don't block initialization
    const requiredFunctions = [
        'fetchCurrentUserInfo',
        'loadSidebar',
        'showErrorNotification',
        'showSuccessNotification'
    ];
    
    const missingFunctions = requiredFunctions.filter(
        fn => typeof window[fn] !== 'function'
    );
    
    if (missingFunctions.length > 0) {
        console.error('Missing required functions:', missingFunctions);
        // Log detailed function availability to help debugging
        console.log('Function availability check:');
        requiredFunctions.forEach(fn => {
            console.log(`- ${fn}: ${typeof window[fn]}`);
        });
        
        // Continue with initialization instead of showing an alert and blocking
        console.warn('Continuing initialization despite missing functions');
    }
    
    // Initialize the application anyway
    if (typeof ChatApp !== 'undefined') {
        ChatApp.init();
    } else {
        console.error('ChatApp is not defined. Check if core.js is loaded properly.');
    }
});
