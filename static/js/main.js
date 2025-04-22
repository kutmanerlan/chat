/**
 * Main JavaScript entry point that imports all other modules
 */

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Set up menu button - using simple DOM approach
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
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    const avatarInput = document.getElementById('avatarInput');
    
    // Menu button opens the side menu
    if (menuBtn && sideMenu && overlay) {
        menuBtn.addEventListener('click', function() {
            sideMenu.classList.add('active');
            overlay.classList.add('active');
        });
    }
    
    // Close menu button closes the side menu
    if (closeMenuBtn && sideMenu && overlay) {
        closeMenuBtn.addEventListener('click', function() {
            sideMenu.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
    
    // Clicking the overlay closes both the side menu and the profile edit sidebar
    if (overlay && sideMenu && editProfileSidebar) {
        overlay.addEventListener('click', function() {
            sideMenu.classList.remove('active');
            editProfileSidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
    
    // Logout button shows the logout modal
    if (logoutBtn && logoutModal && overlay) {
        logoutBtn.addEventListener('click', function() {
            logoutModal.classList.add('active');
            overlay.classList.add('active');
        });
    }
    
    // Cancel logout closes the logout modal
    if (cancelLogout && logoutModal && overlay) {
        cancelLogout.addEventListener('click', function() {
            logoutModal.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
    
    // Edit profile button shows the profile edit sidebar
    if (editProfileBtn && editProfileSidebar && overlay && sideMenu) {
        editProfileBtn.addEventListener('click', function() {
            sideMenu.classList.remove('active');
            editProfileSidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }
    
    // Back button in profile edit sidebar returns to the main menu
    if (backToMainMenu && editProfileSidebar && sideMenu && overlay) {
        backToMainMenu.addEventListener('click', function() {
            editProfileSidebar.classList.remove('active');
            sideMenu.classList.add('active');
        });
    }
    
    // Avatar placeholder click triggers file input
    if (avatarPlaceholder && avatarInput) {
        avatarPlaceholder.addEventListener('click', function() {
            avatarInput.click();
        });
    }
    
    // Avatar file input change uploads the avatar
    if (avatarInput) {
        avatarInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                uploadAvatar(this.files[0]);
            }
        });
    }
    
    // Handle form submission for profile edit
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateProfile();
        });
    }
    
    // Initialize the chat application
    if (typeof ChatApp !== 'undefined') {
        ChatApp.init();
    }
});

// Function to upload avatar
function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    
    fetch('/upload_avatar', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update avatar in UI
            const avatarImage = document.querySelector('.avatar-image');
            const avatarInitials = document.getElementById('avatarInitials');
            
            if (avatarImage) {
                avatarImage.src = data.avatar_path;
            } else if (avatarInitials) {
                // Create new image element
                const newImg = document.createElement('img');
                newImg.src = data.avatar_path;
                newImg.alt = "Avatar";
                newImg.className = "avatar-image";
                
                // Replace initials with image
                const avatarPlaceholder = document.getElementById('avatarPlaceholder');
                if (avatarPlaceholder) {
                    avatarInitials.style.display = 'none';
                    avatarPlaceholder.appendChild(newImg);
                }
            }
            
            showSuccessNotification('Avatar updated successfully');
        } else {
            showErrorNotification(data.error || 'Failed to update avatar');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showErrorNotification('Failed to update avatar');
    });
}

// Function to update profile
function updateProfile() {
    const name = document.getElementById('profileName').value;
    const bio = document.getElementById('profileBio').value;
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('bio', bio);
    
    fetch('/update_profile', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update profile in UI
            document.getElementById('editProfileSidebar').classList.remove('active');
            document.getElementById('overlay').classList.remove('active');
            
            // Update user name in side menu
            const userNameElement = document.querySelector('.user-info h3');
            if (userNameElement) {
                userNameElement.textContent = data.user_name;
            }
            
            // Update bio in side menu
            const bioElement = document.querySelector('.user-status');
            if (bioElement) {
                bioElement.textContent = data.bio;
            }
            
            showSuccessNotification('Profile updated successfully');
        } else {
            showErrorNotification(data.error || 'Failed to update profile');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showErrorNotification('Failed to update profile');
    });
}
