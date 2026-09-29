import { baseApi } from "./baseApi";
import { AuthResponse, ApiResponse } from "@/types";
import { RegisterFormData, LoginFormData } from "@/lib/validations";

/**
 * Auth API endpoints for registration, login, and profile management.
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
    getMe: builder.query<ApiResponse<AuthResponse>, void>({
      query: () => "/auth/me",
      providesTags: ["User"],
    }),
  }),
});

export const { useRegisterMutation, useLoginMutation, useGetMeQuery } = authApi;
