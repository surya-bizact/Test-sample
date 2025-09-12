import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config';

// Create base query with credentials included
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    // Get the token from the state if available
    // const token = getState()?.auth?.token;
    
    // // Set the content type
    // headers.set('Content-Type', 'application/json');
    
    // // If we have a token, add it to the headers
    // if (token) {
    //   headers.set('Authorization', `Bearer ${token}`);
    // }
    
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Session', 'Design', 'Admin', 'AdminUser'],
  endpoints: (builder) => ({
    // Auth endpoints
    checkAuthStatus: builder.query({
      query: () => '/api/auth/status',
      providesTags: ['User'],
    }),
    
    login: builder.mutation({
      query: (credentials) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    
    register: builder.mutation({
      query: (userData) => ({
        url: '/api/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    
    logout: builder.mutation({
      query: () => ({
        url: '/api/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    
    verifyEmail: builder.mutation({
      query: (token) => ({
        url: '/api/auth/verify-email',
        method: 'GET',
        params: { token },
      }),
    }),
    
    forgotPassword: builder.mutation({
      query: (email) => ({
        url: '/api/auth/forgot-password',
        method: 'POST',
        body: { email },
      }),
    }),
    
    resendVerificationEmail: builder.mutation({
      query: (email) => ({
        url: '/api/auth/resend-verification',
        method: 'POST',
        body: { email },
      }),
    }),
    
    // Session endpoints
    getSessions: builder.query({
      query: () => '/api/sessions',
      providesTags: ['Session'],
    }),
    
    getSession: builder.query({
      query: (sessionId) => `/api/sessions/${sessionId}`,
      providesTags: (result, error, sessionId) => [{ type: 'Session', id: sessionId }],
    }),
    
    createSession: builder.mutation({
      query: (sessionData) => ({
        url: '/api/sessions',
        method: 'POST',
        body: sessionData,
      }),
      invalidatesTags: ['Session'],
    }),
    
    updateSession: builder.mutation({
      query: ({ sessionId, ...updates }) => ({
        url: `/api/sessions/${sessionId}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { sessionId }) => [
        'Session',
        { type: 'Session', id: sessionId },
      ],
    }),
    
    deleteSession: builder.mutation({
      query: (sessionId) => ({
        url: `/api/sessions/${sessionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Session'],
    }),
    
    // Feedback endpoints
    getFeedback: builder.query({
      query: () => '/api/feedback',
      providesTags: ['Feedback'],
    }),
    
    submitFeedback: builder.mutation({
      query: (feedbackData) => ({
        url: '/api/feedback',
        method: 'POST',
        body: feedbackData,
      }),
      invalidatesTags: ['Feedback'],
    }),
    
    // Admin endpoints
    getAdminStats: builder.query({
      query: () => '/api/admin/stats',
      providesTags: ['AdminStats'],
    }),
    
    getAdminUsers: builder.query({
      query: () => '/api/admin/users',
      providesTags: ['Users'],
    }),
    
    createAdminUser: builder.mutation({
      query: (userData) => ({
        url: '/api/admin/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Users'],
    }),
    
    deleteAdminUser: builder.mutation({
      query: (userId) => ({
        url: `/api/admin/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Users'],
    }),
    
    promoteAdminUser: builder.mutation({
      query: (userId) => ({
        url: `/api/admin/users/${userId}/promote`,
        method: 'PUT',
      }),
      invalidatesTags: ['Users'],
    }),
    
    demoteAdminUser: builder.mutation({
      query: (userId) => ({
        url: `/api/admin/users/${userId}/demote`,
        method: 'PUT',
      }),
      invalidatesTags: ['Users'],
    }),
    
    // Design endpoints
    saveDesign: builder.mutation({
      query: (designData) => ({
        url: '/api/designs',
        method: 'POST',
        body: designData,
      }),
      invalidatesTags: ['Design'],
    }),
    
    getDesigns: builder.query({
      query: () => '/api/designs',
      providesTags: ['Design'],
    }),
    
    // Wall Designs endpoints
    saveWallDesigns: builder.mutation({
      query: ({ wallDesigns, roomType, roomDimensions, selectedWall }) => ({
        url: '/api/designs/wall-designs',
        method: 'POST',
        body: { wallDesigns, roomType, roomDimensions, selectedWall },
      }),
      invalidatesTags: ['WallDesign'],
    }),
    
    getWallDesigns: builder.query({
      query: () => '/api/designs/wall-designs',
      providesTags: ['WallDesign'],
    }),
  }),
});

export const {
  useCheckAuthStatusQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useResendVerificationEmailMutation,
  // Session
  useGetSessionsQuery,
  useGetSessionQuery,
  useLazyGetSessionQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  // Design
  useSaveDesignMutation,
  useGetDesignsQuery,
  useSaveWallDesignsMutation,
  useGetWallDesignsQuery,
  useLazyGetWallDesignsQuery,
  // Feedback
  useGetFeedbackQuery,
  useSubmitFeedbackMutation,
  // Admin
  useGetAdminStatsQuery,
  useGetAdminUsersQuery,
  useCreateAdminUserMutation,
  useDeleteAdminUserMutation,
  usePromoteAdminUserMutation,
  useDemoteAdminUserMutation,
} = apiSlice;
