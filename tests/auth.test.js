const Auth = require('../js/auth');

// Mock localStorage and window events for Node environment
global.localStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.window = {
  dispatchEvent: jest.fn()
};
global.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options.detail;
  }
};

describe('Auth Helper Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('mockSignIn sets user and retrieves user correctly', () => {
    const user = Auth.mockSignIn('lloyd.miguel@gmail.com', 'Lloyd Miguel');
    expect(user.email).toBe('lloyd.miguel@gmail.com');
    expect(Auth.getUser()).toEqual(user);
  });

  test('isAdmin checks admin email accurately', () => {
    Auth.mockSignIn('lloyd.miguel@gmail.com');
    expect(Auth.isAdmin()).toBe(true);

    Auth.mockSignIn('other@gmail.com');
    expect(Auth.isAdmin()).toBe(false);
  });

  test('signOut removes user from session', () => {
    Auth.mockSignIn('lloyd.miguel@gmail.com');
    expect(Auth.getUser()).not.toBeNull();

    Auth.signOut();
    expect(Auth.getUser()).toBeNull();
  });
});
