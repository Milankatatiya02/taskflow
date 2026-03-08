import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { userAPI, handleAPIError } from '../../services/api';
import { syncAuthUser } from './authSlice';

const initialState = {
  profile: null,
  preferences: {
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    weeklyReport: true,
    twoFactor: false,
  },
  loading: false,
  error: null,
};

export const fetchProfile = createAsyncThunk('profile/fetchProfile', async (_, thunkAPI) => {
  try {
    const response = await userAPI.getProfile();
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(handleAPIError(error).message);
  }
});

export const updateProfile = createAsyncThunk('profile/updateProfile', async (data, thunkAPI) => {
  try {
    const response = await userAPI.updateProfile(data);
    thunkAPI.dispatch(syncAuthUser(response.data));
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(handleAPIError(error).message);
  }
});

export const fetchPreferences = createAsyncThunk('profile/fetchPreferences', async (_, thunkAPI) => {
  try {
    const response = await userAPI.getPreferences();
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(handleAPIError(error).message);
  }
});

export const updatePreferences = createAsyncThunk('profile/updatePreferences', async (data, thunkAPI) => {
  try {
    const response = await userAPI.updatePreferences(data);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(handleAPIError(error).message);
  }
});

export const changePassword = createAsyncThunk('profile/changePassword', async ({ currentPassword, newPassword }, thunkAPI) => {
  try {
    const response = await userAPI.changePassword(currentPassword, newPassword);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(handleAPIError(error).message);
  }
});

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfileError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load profile';
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update profile';
      })
      .addCase(fetchPreferences.fulfilled, (state, action) => {
        state.preferences = { ...state.preferences, ...action.payload };
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.preferences = { ...state.preferences, ...action.payload };
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.error = action.payload || 'Failed to change password';
      });
  },
});

export const { clearProfileError } = profileSlice.actions;
export default profileSlice.reducer;
