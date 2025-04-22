/**
 * Search functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize search when page loads
  initializeSearch();
});

function initializeSearch() {
  console.log('Initializing search feature');
  const searchInput = document.getElementById('searchInput');
  
  if (!searchInput) {
    console.error('Search input element not found');
    return;
  }
  
  // Create container for search results if it doesn't exist
  let searchResults = document.querySelector('.search-results');
  if (!searchResults) {
    searchResults = document.createElement('div');
    searchResults.className = 'search-results';
    searchResults.style.display = 'none';
    
    // Add container to the DOM
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
      searchContainer.appendChild(searchResults);
    } else {
      console.error('Search container not found');
      return;
    }
  }
  
  // Add event listener to search input
  searchInput.addEventListener('input', debounce(function(e) {
    const query = e.target.value.trim();
    
    // Only search if query has at least 2 characters
    if (query.length >= 2) {
      console.log('Searching for:', query);
      performSearch(query);
    } else {
      // Hide results if query is too short
      searchResults.style.display = 'none';
    }
  }, 300)); // 300ms debounce time
  
  // Close search results when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-container') && !e.target.closest('.search-results')) {
      searchResults.style.display = 'none';
    }
  });
  
  console.log('Search feature initialized');
}

// Perform search and display results
function performSearch(query) {
  console.log('Performing search for:', query);
  
  // Call the API to search for users
  fetch(`/search_users?query=${encodeURIComponent(query)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Search request failed');
      }
      return response.json();
    })
    .then(data => {
      displaySearchResults(data.users || []);
    })
    .catch(error => {
      console.error('Search error:', error);
      displaySearchError('Failed to perform search');
    });
}

// Display search results
function displaySearchResults(users) {
  console.log('Displaying search results:', users);
  
  const searchResults = document.querySelector('.search-results');
  if (!searchResults) {
    console.error('Search results container not found');
    return;
  }
  
  // Show container
  searchResults.style.display = 'block';
  
  // Clear previous results
  searchResults.innerHTML = '';
  
  // Add header
  const header = document.createElement('div');
  header.className = 'search-results-header';
  header.textContent = users.length > 0 
    ? `${users.length} result${users.length !== 1 ? 's' : ''}` 
    : 'No results found';
  searchResults.appendChild(header);
  
  // Check if we have results
  if (users.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'search-no-results';
    noResults.textContent = 'No users found. Try a different search.';
    searchResults.appendChild(noResults);
    return;
  }
  
  // Add user items
  users.forEach(user => {
    const userItem = createSearchUserItem(user);
    searchResults.appendChild(userItem);
  });
}

// Display search error
function displaySearchError(message) {
  console.error('Search error:', message);
  
  const searchResults = document.querySelector('.search-results');
  if (!searchResults) {
    console.error('Search results container not found');
    return;
  }
  
  // Show container
  searchResults.style.display = 'block';
  
  // Clear previous results
  searchResults.innerHTML = '';
  
  // Add header
  const header = document.createElement('div');
  header.className = 'search-results-header';
  header.textContent = 'Error';
  searchResults.appendChild(header);
  
  // Add error message
  const errorElement = document.createElement('div');
  errorElement.className = 'search-error';
  errorElement.textContent = message;
  searchResults.appendChild(errorElement);
}

// Create search user item
function createSearchUserItem(user) {
  const userItem = document.createElement('div');
  userItem.className = 'search-user-item';
  userItem.setAttribute('data-user-id', user.id);
  
  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'search-user-avatar';
  
  if (user.avatar_path) {
    const img = document.createElement('img');
    img.src = user.avatar_path;
    img.alt = user.name;
    img.onerror = function() {
      this.remove();
      const initials = document.createElement('div');
      initials.className = 'avatar-initials';
      initials.textContent = getInitials(user.name);
      avatar.appendChild(initials);
    };
    avatar.appendChild(img);
  } else {
    const initials = document.createElement('div');
    initials.className = 'avatar-initials';
    initials.textContent = getInitials(user.name);
    avatar.appendChild(initials);
  }
  
  // User info
  const info = document.createElement('div');
  info.className = 'search-user-info';
  
  const name = document.createElement('div');
  name.className = 'search-user-name';
  name.textContent = user.name;
  info.appendChild(name);
  
  const bio = document.createElement('div');
  bio.className = 'search-user-bio';
  bio.textContent = user.bio || 'No bio';
  info.appendChild(bio);
  
  // Assemble
  userItem.appendChild(avatar);
  userItem.appendChild(info);
  
  // Add click event
  userItem.addEventListener('click', function() {
    handleSearchUserClick(user);
  });
  
  return userItem;
}

// Handle click on search user item
function handleSearchUserClick(user) {
  console.log('User clicked:', user);
  
  // Hide search results
  const searchResults = document.querySelector('.search-results');
  if (searchResults) {
    searchResults.style.display = 'none';
  }
  
  // Clear search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Open chat with user
  openChat(user.id, user.name);
}

// Utility function to debounce input
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
