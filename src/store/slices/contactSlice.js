import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

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

export const submitContactForm = createAsyncThunk(
  'contact/submitContactForm',
  async (formData) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      ...formData,
      submittedAt: new Date().toISOString(),
    };
  },
);

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
        state.error = action.error.message || 'Failed to submit the form.';
      });
  },
});

export const { updateField, resetForm, clearSubmittedState, clearError } = contactSlice.actions;
export default contactSlice.reducer;
