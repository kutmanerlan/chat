/**
 * UI components and interface management
 */

/**
 * Update the user interface with user data
 */
function updateUserInterface(userData) {
  // Update profile section
  const userNameElements = document.querySelectorAll('.user-info h3');
  userNameElements.forEach(el => {
    el.textContent = userData.user_name;
  });
  
  // Update user status
  const userStatusElements = document.querySelectorAll('.side-menu .user-status');
  userStatusElements.forEach(el => {
    el.textContent = userData.bio || 'No status';
    el.style.display = 'block';
    el.style.visibility = 'visible';
  });
  
  // Only update avatar if there's avatar data
  // This prevents clearing the avatar when only updating the status
  if (userData.avatar_path) {
    updateAvatar(userData.avatar_path);
  }
}

/**
 * Update avatar display
 */
function updateAvatar(avatarPath) {
  const avatarElements = document.querySelectorAll('.user-avatar img, .chat-user-avatar img, .user-info-avatar img');
  avatarElements.forEach(img => {
    if (avatarPath) {
      let src = avatarPath;
      if (!src.startsWith('http')) {
        src = `/uploads/${src}`;
      }
      img.src = src;
    } else {
      const initials = img.alt ? img.alt.charAt(0) : '?';
      img.parentElement.innerHTML = `<div class="avatar-initials">${initials}</div>`;
    }
  });
}

/**
 * Setup menu buttons
 */
function setupMenuButtons() {
  const menuBtn = document.getElementById('menuBtn');
  const sideMenu = document.getElementById('sideMenu');
  const overlay = document.getElementById('overlay');
  const closeMenuBtn = document.getElementById('closeMenuBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutModal = document.getElementById('logoutModal');
  const cancelLogout = document.getElementById('cancelLogout');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const editProfileSidebar = document.getElementById('editProfileSidebar');
  const backToMainMenu = document.getElementById('backToMainMenu');
  const editProfileForm = document.getElementById('editProfileForm');
  
  // Menu button click
  if (menuBtn && sideMenu && overlay) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sideMenu.classList.toggle('active');
      overlay.classList.toggle('active');
    });
  }
  
  // Close menu button
  if (closeMenuBtn && sideMenu && overlay) {
    closeMenuBtn.addEventListener('click', () => {
      sideMenu.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
  
  // Overlay click
  if (overlay && sideMenu) {
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      sideMenu.classList.remove('active');
      if (editProfileSidebar) editProfileSidebar.classList.remove('active');
      if (logoutModal) logoutModal.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
  
  // Logout button
  if (logoutBtn && logoutModal && overlay) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutModal.classList.add('active');
      overlay.classList.add('active');
    });
  }
  
  // Cancel logout
  if (cancelLogout && logoutModal && overlay) {
    cancelLogout.addEventListener('click', () => {
      logoutModal.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
  
  // Edit profile button
  if (editProfileBtn && editProfileSidebar && sideMenu && overlay) {
    editProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sideMenu.classList.remove('active');
      editProfileSidebar.classList.add('active');
      overlay.classList.add('active');
    });
  }
  
  // Back to main menu
  if (backToMainMenu && editProfileSidebar && sideMenu) {
    backToMainMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      editProfileSidebar.classList.remove('active');
      sideMenu.classList.add('active');
    });
  }
  
  // Profile form submission
  if (editProfileForm) {
    editProfileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      updateProfile(new FormData(editProfileForm))
        .then(data => {
          if (data.success) {
            updateUserInterface(data);
            editProfileSidebar.classList.remove('active');
            overlay.classList.remove('active');
            showSuccessNotification('Profile updated successfully');
          }
        })
        .catch(error => {
          showErrorNotification('Failed to update profile');
        });
    });
  }
  
  // Escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (sideMenu && sideMenu.classList.contains('active')) {
        sideMenu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
      }
      if (editProfileSidebar && editProfileSidebar.classList.contains('active')) {
        editProfileSidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
      }
      if (logoutModal && logoutModal.classList.contains('active')) {
        logoutModal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
      }
    }
  });
  
  // Stop propagation for menu content
  if (sideMenu) {
    sideMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  if (editProfileSidebar) {
    editProfileSidebar.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
}

/**
 * Setup avatar upload
 */
function setupAvatarUpload() {
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');
  const avatarInput = document.getElementById('avatarInput');
  
  if (avatarPlaceholder && avatarInput) {
    avatarPlaceholder.addEventListener('click', () => {
      avatarInput.click();
    });
    
    avatarInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        uploadAvatar(this.files[0])
          .then(data => {
            if (data.success) {
              // Refresh current user info
              fetchCurrentUser()
                .then(userData => {
                  // Directly update sidebar avatar
                  updateSidebarAvatar(userData.avatar_path);
                });
              showSuccessNotification('Avatar updated successfully');
            }
          })
          .catch(error => {
            showErrorNotification('Failed to upload avatar');
          });
      }
    });
  }
}

/**
 * Update sidebar avatar directly after upload
 */
function updateSidebarAvatar(avatarPath) {
  const sidebarAvatar = document.getElementById('avatarPlaceholder');
  if (sidebarAvatar) {
    // Clear existing avatar content
    sidebarAvatar.innerHTML = '';
    
    if (avatarPath) {
      let src = avatarPath;
      if (!src.startsWith('http')) {
        src = `/uploads/${src}`;
      }
      // Create and set the new avatar image
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'User Avatar';
      img.className = 'avatar-image';
      sidebarAvatar.appendChild(img);
    } else {
      // Create initials avatar if no avatar path
      const initialsDiv = document.createElement('div');
      initialsDiv.className = 'avatar-initials';
      initialsDiv.textContent = ChatApp.currentUser.user_name.charAt(0);
      sidebarAvatar.appendChild(initialsDiv);
    }
    
    // Re-add the upload icon
    const uploadIcon = document.createElement('div');
    uploadIcon.className = 'avatar-upload-icon';
    uploadIcon.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 5V19" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    sidebarAvatar.appendChild(uploadIcon);
  }
}

// --- Emoji Panel Logic ---

// Определение списка смайликов
const categorizedEmojis = {
  'Smileys & People': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
  'Animals & Nature': ['🙈', '🙉', '🙊', '🐒', '🐕', '🐶', '🐩', '🐺', '🦊', '🦝', '🐈', '🐱', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿️', '🦔', '🦇', '🐻', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🕊️', '🦅', '🦆', '🦢', '🦉', '🦩', '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🐞', '🦗', '🕷️', '🕸️', '🦂', '🦟', '🦠', '💐', '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃'],
  'Food & Drink': ['🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉', '🧊', '🥢', '🍽️', '🍴', '🥄'],
  'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗️', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'],
};

// Ссылка на обработчик клика вне панели для его последующего удаления
let closeEmojiPanelHandler = null;

/**
 * Toggles the visibility of the main emoji panel.
 */
function toggleEmojiPanel(inputField) {
  const emojiPanel = document.getElementById('emojiPanel');
  const emojiButton = document.querySelector('.emoji-button'); // Get the button for positioning/closing checks
  if (!emojiPanel || !emojiButton) {
      console.error("Emoji panel or button element not found!");
      return;
  }

  const isVisible = emojiPanel.style.display === 'flex'; // Use 'flex' or 'block' based on your CSS

  if (isVisible) {
    emojiPanel.style.display = 'none';
    if (closeEmojiPanelHandler) {
        document.removeEventListener('click', closeEmojiPanelHandler);
        closeEmojiPanelHandler = null;
    }
  } else {
    if (!emojiPanel.dataset.built) {
      buildEmojiPanelContent(emojiPanel, inputField);
      emojiPanel.dataset.built = 'true';
    }

    // --- Position Panel Directly Above Button --- V2
    const buttonRect = emojiButton.getBoundingClientRect();
    emojiPanel.style.position = 'fixed'; // Use fixed to position relative to viewport
    emojiPanel.style.bottom = `${window.innerHeight - buttonRect.top + 8}px`; // 8px offset above the button
    // Align panel's left edge with button's left edge
    emojiPanel.style.left = `${buttonRect.left}px`;
    // Reset potentially conflicting styles
    emojiPanel.style.right = 'auto';
    emojiPanel.style.transform = 'none';

    emojiPanel.style.display = 'flex'; // Show the panel
    // --- End Position Panel ---

    // Add listener to close when clicking outside
    closeEmojiPanelHandler = (event) => closeEmojiPanelOnClickOutside(event, emojiButton, closeEmojiPanelHandler);
    setTimeout(() => {
      document.addEventListener('click', closeEmojiPanelHandler);
    }, 0);
  }
}

/**
 * Builds the content (categories, grid) for the emoji panel.
 */
function buildEmojiPanelContent(panelElement, inputField) {
  panelElement.innerHTML = ''; // Clear previous content

  const gridContainer = document.createElement('div');
  gridContainer.className = 'emoji-grid-container';

  for (const category in categorizedEmojis) {
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'emoji-category-header';
    categoryHeader.textContent = category;
    gridContainer.appendChild(categoryHeader);

    categorizedEmojis[category].forEach(emoji => {
      const emojiBtn = document.createElement('button');
      emojiBtn.className = 'emoji-select-btn';
      emojiBtn.textContent = emoji;
      emojiBtn.type = 'button';
      emojiBtn.onclick = (e) => {
        e.stopPropagation();
        insertEmoji(inputField, emoji);
      };
      gridContainer.appendChild(emojiBtn);
    });
  }
  panelElement.appendChild(gridContainer);
}

/**
 * Closes the emoji panel if a click occurs outside of it and not on the toggle button.
 */
function closeEmojiPanelOnClickOutside(event, emojiButton, handlerRef) {
  const emojiPanel = document.getElementById('emojiPanel');

  // Check if elements exist and click is outside panel AND outside button
  if (emojiPanel && emojiButton && !emojiPanel.contains(event.target) && !emojiButton.contains(event.target)) {
    emojiPanel.style.display = 'none';
    if (handlerRef) {
        document.removeEventListener('click', handlerRef);
        closeEmojiPanelHandler = null; // Reset global handler reference as well
    }
  }
}

/**
 * Insert emoji into the input field.
 */
function insertEmoji(inputField, emoji) {
  const start = inputField.selectionStart;
  const end = inputField.selectionEnd;
  const text = inputField.value;

  inputField.value = text.substring(0, start) + emoji + text.substring(end);
  const newCursorPos = start + emoji.length;
  inputField.selectionStart = inputField.selectionEnd = newCursorPos;

  inputField.dispatchEvent(new Event('input', { bubbles: true }));
  inputField.focus();
}

// --- End Emoji Panel Logic ---
