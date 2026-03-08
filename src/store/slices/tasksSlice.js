import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { taskAPI, handleAPIError } from '../../services/api';

const initialState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchTasks = createAsyncThunk('tasks/fetchTasks', async (_, thunkAPI) => {
  try {
    const response = await taskAPI.getAllTasks();
    return response.data || [];
  } catch (error) {
    return thunkAPI.rejectWithValue(handleAPIError(error).message);
  }
});

export const createTask = createAsyncThunk('tasks/createTask', async (payload, thunkAPI) => {
  try {
    const response = await taskAPI.createTask(payload);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(handleAPIError(error).message);
  }
});

export const updateTask = createAsyncThunk('tasks/updateTask', async ({ id, data }, thunkAPI) => {
  try {
    const response = await taskAPI.updateTask(id, data);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(handleAPIError(error).message);
  }
});

export const deleteTask = createAsyncThunk('tasks/deleteTask', async (id, thunkAPI) => {
  try {
    await taskAPI.deleteTask(id);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(handleAPIError(error).message);
  }
});

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearTaskError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch tasks';
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(createTask.rejected, (state, action) => {
        state.error = action.payload || 'Failed to create task';
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.items.findIndex((task) => task.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.error = action.payload || 'Failed to update task';
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((task) => task.id !== action.payload);
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.error = action.payload || 'Failed to delete task';
      });
  },
});

export const { clearTaskError } = tasksSlice.actions;
export default tasksSlice.reducer;
