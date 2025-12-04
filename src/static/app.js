document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Authentication elements
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const closeModal = document.querySelector(".close-modal");
  const loggedInStatus = document.getElementById("logged-in-status");
  const usernameDisplay = document.getElementById("username-display");
  const signupContainer = document.getElementById("signup-container");
  
  let authToken = localStorage.getItem("authToken");
  let currentUsername = localStorage.getItem("username");

  // Check authentication status on load
  async function checkAuthStatus() {
    if (authToken) {
      try {
        const response = await fetch("/auth/verify", {
          headers: {
            "Authorization": authToken
          }
        });
        const result = await response.json();
        
        if (result.authenticated) {
          showLoggedInState();
        } else {
          // Token invalid, clear it
          logout();
        }
      } catch (error) {
        console.error("Error verifying auth:", error);
        logout();
      }
    }
  }
  
  function showLoggedInState() {
    loginBtn.classList.add("hidden");
    loggedInStatus.classList.remove("hidden");
    signupContainer.classList.remove("hidden");
    usernameDisplay.textContent = `👤 ${currentUsername}`;
    
    // Show delete buttons on participants
    updateDeleteButtonsVisibility(true);
  }
  
  function showLoggedOutState() {
    loginBtn.classList.remove("hidden");
    loggedInStatus.classList.add("hidden");
    signupContainer.classList.add("hidden");
    
    // Hide delete buttons
    updateDeleteButtonsVisibility(false);
  }
  
  function updateDeleteButtonsVisibility(show) {
    document.querySelectorAll(".delete-btn").forEach((button) => {
      if (show) {
        button.style.display = "inline";
      } else {
        button.style.display = "none";
      }
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      
      // Clear activity select options (except first)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons (only visible when logged in)
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn teacher-only" data-activity="${name}" data-email="${email}" style="display: ${authToken ? 'inline' : 'none'};">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!authToken) {
      messageDiv.textContent = "You must be logged in to unregister students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": authToken
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          messageDiv.textContent = "Session expired. Please login again.";
          logout();
        } else {
          messageDiv.textContent = result.detail || "An error occurred";
        }
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!authToken) {
      messageDiv.textContent = "You must be logged in to register students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Authorization": authToken
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          messageDiv.textContent = "Session expired. Please login again.";
          logout();
        } else {
          messageDiv.textContent = result.detail || "An error occurred";
        }
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to register student. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });
  
  // Login modal handlers
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });
  
  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginMessage.classList.add("hidden");
  });
  
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
      loginMessage.classList.add("hidden");
    }
  });
  
  // Handle login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        {
          method: "POST"
        }
      );
      
      const result = await response.json();
      
      if (response.ok) {
        authToken = result.token;
        currentUsername = username;
        localStorage.setItem("authToken", authToken);
        localStorage.setItem("username", username);
        
        loginMessage.textContent = result.message;
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");
        
        setTimeout(() => {
          loginModal.classList.add("hidden");
          loginMessage.classList.add("hidden");
          loginForm.reset();
          showLoggedInState();
          fetchActivities(); // Refresh to show delete buttons
        }, 1000);
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });
  
  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: {
          "Authorization": authToken
        }
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }
    
    logout();
  });
  
  function logout() {
    authToken = null;
    currentUsername = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
    showLoggedOutState();
    fetchActivities(); // Refresh to hide delete buttons
  }

  // Initialize app
  checkAuthStatus();
  fetchActivities();
});
