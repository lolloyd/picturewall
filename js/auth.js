/**
 * Google Authentication & Session Helper
 */

const AUTH_STORAGE_KEY = 'picturewall_user';

const Auth = {
  // Parse JWT token from Google credential
  parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to parse JWT token', e);
      return null;
    }
  },

  // Get logged in user from LocalStorage
  getUser() {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  },

  // Set logged in user
  setUser(user) {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('auth-change', { detail: user }));
  },

  // Handle Google Sign-In Credential Response
  handleCredentialResponse(response) {
    if (response && response.credential) {
      const payload = Auth.parseJwt(response.credential);
      if (payload) {
        const user = {
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          picture: payload.picture || '',
          idToken: response.credential
        };
        Auth.setUser(user);
      }
    }
  },

  // Mock sign-in for dev/testing when Google Client ID is not configured or in offline environments
  mockSignIn(email, name) {
    const userEmail = email || 'lloyd.miguel@gmail.com';
    const userName = name || userEmail.split('@')[0];
    const user = {
      email: userEmail,
      name: userName,
      picture: 'https://via.placeholder.com/40?text=' + encodeURIComponent(userName.charAt(0).toUpperCase()),
      idToken: 'mock-jwt-token-for-' + userEmail
    };
    Auth.setUser(user);
    return user;
  },

  // Sign out
  signOut() {
    Auth.setUser(null);
  },

  // Check if currently logged in user is default admin
  isAdmin(adminEmail = 'lloyd.miguel@gmail.com') {
    const user = Auth.getUser();
    return !!(user && user.email && user.email.toLowerCase() === adminEmail.toLowerCase());
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}
