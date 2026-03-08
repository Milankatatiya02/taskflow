import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import contactReducer from './slices/contactSlice';
import profileReducer from './slices/profileSlice';
import tasksReducer from './slices/tasksSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
    profile: profileReducer,
    contact: contactReducer,
  },
});
