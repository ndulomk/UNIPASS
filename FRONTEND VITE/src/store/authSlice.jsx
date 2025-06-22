import { createSlice } from '@reduxjs/toolkit';

// Cookie utility functions
const setCookie = (name, value, days = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure`;
};

const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

const removeCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict;Secure`;
};

const initialState = {
  user: null,
  candidate: null,
  enrollment: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.user = action.payload.userData;
      state.candidate = action.payload.candidateData || null;
      state.enrollment = action.payload.enrollmentData || null;
      state.token = action.payload.accessToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;

      // Store in cookies with 7 days expiration
      setCookie('access_token', action.payload.accessToken, 7);
      setCookie('userData', JSON.stringify(action.payload.userData), 7);
      
      if (action.payload.candidateData) {
        setCookie('candidateData', JSON.stringify(action.payload.candidateData), 7);
      } else {
        removeCookie('candidateData');
      }
      
      if (action.payload.enrollmentData) {
        setCookie('enrollmentData', JSON.stringify(action.payload.enrollmentData), 7);
      } else {
        removeCookie('enrollmentData');
      }
    },
    loginFailure(state, action) {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.candidate = null;
      state.enrollment = null;
      state.token = null;
      
      // Remove all auth cookies
      removeCookie('access_token');
      removeCookie('userData');
      removeCookie('candidateData');
      removeCookie('enrollmentData');
    },
    logout(state) {
      state.user = null;
      state.candidate = null;
      state.enrollment = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      
      // Remove all auth cookies
      removeCookie('access_token');
      removeCookie('userData');
      removeCookie('candidateData');
      removeCookie('enrollmentData');
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    hydrateAuth(state) {
      const token = getCookie('access_token');
      const userDataString = getCookie('userData');
      const candidateDataString = getCookie('candidateData');
      const enrollmentDataString = getCookie('enrollmentData');

      if (token && userDataString) {
        try {
          state.token = token;
          state.user = JSON.parse(userDataString);
          state.isAuthenticated = true;
          
          if (candidateDataString) {
            state.candidate = JSON.parse(candidateDataString);
          }
          if (enrollmentDataString) {
            state.enrollment = JSON.parse(enrollmentDataString);
          }
        } catch (error) {
          console.error('Error parsing auth data from cookies:', error);
          // Clear corrupted cookies
          removeCookie('access_token');
          removeCookie('userData');
          removeCookie('candidateData');
          removeCookie('enrollmentData');
        }
      }
      state.isLoading = false;
    },
    updateUserDetails(state, action) {
      state.user = action.payload.user;
      setCookie('userData', JSON.stringify(action.payload.user), 7);

      if (action.payload.candidate) {
        state.candidate = action.payload.candidate;
        setCookie('candidateData', JSON.stringify(action.payload.candidate), 7);
      } else {
        state.candidate = null;
        removeCookie('candidateData');
      }
      
      if (action.payload.enrollment) {
        state.enrollment = action.payload.enrollment;
        setCookie('enrollmentData', JSON.stringify(action.payload.enrollment), 7);
      } else {
        state.enrollment = null;
        removeCookie('enrollmentData');
      }
      state.isLoading = false;
    },
    clearError(state) {
      state.error = null;
    },
    setError(state, action) {
      state.error = action.payload;
    }
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  setLoading,
  hydrateAuth,
  updateUserDetails,
  clearError,
  setError,
} = authSlice.actions;

export default authSlice.reducer;