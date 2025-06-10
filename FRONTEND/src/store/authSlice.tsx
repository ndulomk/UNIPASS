import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LoginResponseDetails, User, ApiCandidate, ApiEnrollment } from '@/lib/api'; 

interface AuthState {
    user: User | null;
    candidate: ApiCandidate | null;
    enrollment: ApiEnrollment | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialState: AuthState = {
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
        loginSuccess(state, action: PayloadAction<LoginResponseDetails>) {
            state.user = action.payload.userData;
            state.candidate = action.payload.candidateData || null;
            state.enrollment = action.payload.enrollmentData || null;
            state.token = action.payload.accessToken;
            state.isAuthenticated = true;
            state.isLoading = false;
            state.error = null;

            localStorage.setItem('access_token', action.payload.accessToken);
            localStorage.setItem('userData', JSON.stringify(action.payload.userData));
            if (action.payload.candidateData) localStorage.setItem('candidateData', JSON.stringify(action.payload.candidateData));
            else localStorage.removeItem('candidateData');
            if (action.payload.enrollmentData) localStorage.setItem('enrollmentData', JSON.stringify(action.payload.enrollmentData));
            else localStorage.removeItem('enrollmentData');
        },
        loginFailure(state, action: PayloadAction<string>) {
            state.isLoading = false;
            state.error = action.payload;
            state.isAuthenticated = false;
            state.user = null;
            state.candidate = null;
            state.enrollment = null;
            state.token = null;
            localStorage.removeItem('access_token');
            localStorage.removeItem('userData');
            localStorage.removeItem('candidateData');
            localStorage.removeItem('enrollmentData');
        },
        logout(state) {
            state.user = null;
            state.candidate = null;
            state.enrollment = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
            localStorage.removeItem('access_token');
            localStorage.removeItem('userData');
            localStorage.removeItem('candidateData');
            localStorage.removeItem('enrollmentData');
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        hydrateAuth(state) {
            const token = localStorage.getItem('access_token');
            const userDataString = localStorage.getItem('userData');
            const candidateDataString = localStorage.getItem('candidateData');
            const enrollmentDataString = localStorage.getItem('enrollmentData');

            if (token && userDataString) {
                state.token = token;
                state.user = JSON.parse(userDataString);
                state.isAuthenticated = true;
                if (candidateDataString) state.candidate = JSON.parse(candidateDataString);
                if (enrollmentDataString) state.enrollment = JSON.parse(enrollmentDataString);
            }
            state.isLoading = false; 
        },
        updateUserDetails(state, action: PayloadAction<{ user: User; candidate?: ApiCandidate; enrollment?: ApiEnrollment }>) {
            state.user = action.payload.user;
            localStorage.setItem('userData', JSON.stringify(action.payload.user));

            if (action.payload.candidate) {
                state.candidate = action.payload.candidate;
                localStorage.setItem('candidateData', JSON.stringify(action.payload.candidate));
            } else {
                state.candidate = null;
                localStorage.removeItem('candidateData');
            }
            if (action.payload.enrollment) {
                state.enrollment = action.payload.enrollment;
                localStorage.setItem('enrollmentData', JSON.stringify(action.payload.enrollment));
            } else {
                state.enrollment = null;
                localStorage.removeItem('enrollmentData');
            }
            state.isLoading = false;
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
} = authSlice.actions;

export default authSlice.reducer;