/**
 * Navigation Bar Component & Google Sign-In Renderer
 */

(function () {
  function renderNav() {
    const navContainer = document.getElementById('navbar-container');
    if (!navContainer) return;

    const user = Auth.getUser();
    const currentPage = window.location.pathname.split('/').pop() || 'event.html';

    navContainer.innerHTML = `
      <header class="navbar">
        <a href="event.html" class="nav-brand">
          📸 PictureWall
        </a>
        <nav>
          <ul class="nav-links">
            <li><a href="event.html" class="${currentPage === 'event.html' ? 'active' : ''}">Event Management</a></li>
          </ul>
        </nav>
        <div class="nav-auth">
          ${
            user
              ? `
            <div class="user-profile">
              <img src="${user.picture || 'https://via.placeholder.com/32'}" alt="Avatar" class="user-avatar" id="user-avatar-img">
              <span id="user-display-name">${user.name || user.email}</span>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-logout">Sign Out</button>
          `
              : `
            <div id="g_id_onload"></div>
            <div id="google-signin-btn"></div>
            <button class="btn btn-primary btn-sm" id="btn-mock-login">Sign In (Dev)</button>
          `
          }
        </div>
      </header>
    `;

    // Attach listeners
    if (user) {
      const logoutBtn = document.getElementById('btn-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          Auth.signOut();
          window.location.reload();
        });
      }
    } else {
      const mockBtn = document.getElementById('btn-mock-login');
      if (mockBtn) {
        mockBtn.addEventListener('click', () => {
          const email = prompt('Enter login email:', 'lloyd.miguel@gmail.com');
          if (email) {
            Auth.mockSignIn(email);
            window.location.reload();
          }
        });
      }
    }
  }

  // Init Google Identity Services SDK
  async function initGoogleAuth() {
    try {
      const res = await fetch('/api/config');
      const config = await res.json();

      if (config.googleClientId && window.google && window.google.accounts) {
        google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: (response) => {
            Auth.handleCredentialResponse(response);
            window.location.reload();
          }
        });

        const btnDiv = document.getElementById('google-signin-btn');
        if (btnDiv && !Auth.getUser()) {
          google.accounts.id.renderButton(btnDiv, {
            theme: 'outline',
            size: 'medium'
          });
        }
      }
    } catch (e) {
      console.warn('Could not initialize Google Auth config:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderNav();
    initGoogleAuth();
  });

  window.addEventListener('auth-change', () => {
    renderNav();
  });
})();
