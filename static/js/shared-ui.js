/**
 * Shared UI functions for both direct and group chats
 */

/**
 * Show file upload menu
 */
function showFileUploadMenu(button, context) {
  // Create menu if it doesn't exist
  let fileMenu = document.getElementById('fileUploadMenu');
  if (!fileMenu) {
    fileMenu = document.createElement('div');
    fileMenu.id = 'fileUploadMenu';
    fileMenu.className = 'file-upload-menu';
    document.body.appendChild(fileMenu);
  }
  
  // Clear any existing content
  fileMenu.innerHTML = '';
  
  // Get the button position
  const buttonRect = button.getBoundingClientRect();
  
  // Create file input to be used by the menu options
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'fileInput';
  fileInput.style.display = 'none';
  fileInput.multiple = false;
  document.body.appendChild(fileInput);
  
  // Create photo/video input 
  const mediaInput = document.createElement('input');
  mediaInput.type = 'file';
  mediaInput.id = 'mediaInput';
  mediaInput.style.display = 'none';
  mediaInput.accept = 'image/*,video/*';
  mediaInput.multiple = false;
  document.body.appendChild(mediaInput);
  
  // Add menu options
  fileMenu.innerHTML = `
    <div class="file-menu-options">
      <div class="file-option" id="photoVideoOption">
        <div class="file-option-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <div class="file-option-label">Photo or Video</div>
      </div>
      
      <div class="file-option" id="documentOption">
        <div class="file-option-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <div class="file-option-label">Document</div>
      </div>
    </div>
  `;
  
  // Position the menu
  fileMenu.style.display = 'block';
  fileMenu.style.position = 'absolute';
  fileMenu.style.left = `${buttonRect.left}px`;
  fileMenu.style.top = `${buttonRect.top - fileMenu.offsetHeight - 10}px`;
  
  // Add event listeners to options
  document.getElementById('photoVideoOption').addEventListener('click', function() {
    mediaInput.onchange = function() {
      if (this.files.length > 0) {
        handleFileSelection(this.files, context);
      }
      // Remove the input element after use
      document.body.removeChild(mediaInput);
    };
    mediaInput.click();
    fileMenu.style.display = 'none';
  });
  
  document.getElementById('documentOption').addEventListener('click', function() {
    fileInput.onchange = function() {
      if (this.files.length > 0) {
        handleFileSelection(this.files, context);
      }
      // Remove the input element after use
      document.body.removeChild(fileInput);
    };
    fileInput.click();
    fileMenu.style.display = 'none';
  });
  
  // Close menu when clicking anywhere else
  document.addEventListener('click', function closeMenu(e) {
    if (!fileMenu.contains(e.target) && !button.contains(e.target)) {
      fileMenu.style.display = 'none';
      document.removeEventListener('click', closeMenu);
      // Clean up input elements if menu is closed without selecting
      if (document.body.contains(fileInput)) document.body.removeChild(fileInput);
      if (document.body.contains(mediaInput)) document.body.removeChild(mediaInput);
    }
  });
} 