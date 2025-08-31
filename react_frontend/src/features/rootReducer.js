import { combineReducers } from 'redux';
import snackbarReducer from './snackbarSlice';
import authReducer from './authSlice'; // Import other reducers as needed

const rootReducer = combineReducers({
  snackbar: snackbarReducer,
  auth: authReducer,
  // Add other reducers here
});

export default rootReducer;
