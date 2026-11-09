import { baseApi } from "./baseApi";
import { AuthResponse, ApiResponse, UserResponse } from "@/types";
import { RegisterFormData, LoginFormData } from "@/lib/validations";

/**
 * Auth API endpoints. The API sets and clears the httpOnly refresh cookie
 * on register, login, refresh and logout; responses carry only the access
 * token.
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<ApiResponse<AuthResponse>, RegisterFormData>({
      query: (credentials) => ({
        url: "/auth/register",
        method: "POST",
        body: credentials,
      }),
    }),
    login: builder.mutation<ApiResponse<AuthResponse>, LoginFormData>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    logout: builder.mutation<ApiResponse<null>, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
    getMe: builder.query<ApiResponse<UserResponse>, void>({
      query: () => "/auth/me",
      providesTags: ["User"],
    }),
  }),
});

export const { useRegisterMutation, useLoginMutation, useLogoutMutation, useGetMeQuery } = authApi;
