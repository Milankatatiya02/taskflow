import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authAPI, handleAPIError } from '../../services/api';

const loadPersistedAuth = () => {
  try {
    const savedUser = localStorage.getItem('taskflow_user');
    const savedToken = localStorage.getItem('token');

    if (!savedUser || !savedToken) {
      return { user: null, token: null };
    }

    return {
      user: JSON.parse(savedUser),
      token: savedToken,
    };
  } catch {
    return { user: null, token: null };
  }
};

const persisted = loadPersistedAuth();

const initialState = {
  user: persisted.user,
  token: persisted.token,
  loading: false,
  error: null,
};

export const loginUser = createAsyncThunk('auth/loginUser', async ({ email, password }, thunkAPI) => {
  try {
    const response = await authAPI.login(email, password);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(handleAPIError(error).message);
  }
});

export const registerUser = createAsyncThunk('auth/registerUser', async ({ name, email, password }, thunkAPI) => {
  try {
    const response = await authAPI.register(name, email, password);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(handleAPIError(error).message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem('taskflow_user');
      localStorage.removeItem('token');
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    syncAuthUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem('taskflow_user', JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem('taskflow_user', JSON.stringify(action.payload.user));
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Registration failed';
      });
  },
});

export const { logout, clearAuthError, syncAuthUser } = authSlice.actions;
export default authSlice.reducer;
