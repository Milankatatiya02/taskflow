import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { contactAPI, handleAPIError } from '../../services/api';

const initialState = {
  formData: {
    name: '',
    email: '',
    subject: '',
    message: '',
  },
  loading: false,
  submitted: false,
  error: null,
  submissionHistory: [],
};

export const submitContactForm = createAsyncThunk('contact/submitContactForm', async (formData, thunkAPI) => {
  try {
    const response = await contactAPI.submit(formData);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(handleAPIError(error).message);
  }
});

const contactSlice = createSlice({
  name: 'contact',
  initialState,
  reducers: {
    updateField: (state, action) => {
      const { name, value } = action.payload;
      state.formData[name] = value;
    },
    resetForm: (state) => {
      state.formData = { ...initialState.formData };
    },
    clearSubmittedState: (state) => {
      state.submitted = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitContactForm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitContactForm.fulfilled, (state, action) => {
        state.loading = false;
        state.submitted = true;
        state.submissionHistory.unshift(action.payload);
        state.formData = { ...initialState.formData };
      })
      .addCase(submitContactForm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to submit the form.';
      });
  },
});

export const { updateField, resetForm, clearSubmittedState, clearError } = contactSlice.actions;
export default contactSlice.reducer;
