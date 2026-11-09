import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UserResponse } from "@/types";
import { markSignedIn, markSignedOut } from "@/lib/auth";

interface AuthState {
  user: UserResponse | null;
  /** In memory only; the refresh token is an httpOnly cookie the API manages. */
  accessToken: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserResponse; accessToken: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      markSignedIn();
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      markSignedOut();
    },
    updateUser: (state, action: PayloadAction<UserResponse>) => {
      state.user = action.payload;
    },
  },
});

export const { setCredentials, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
