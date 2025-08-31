import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import Login from './components/Login';
import Register from './components/Register'; // Import your Signup/Register component
import ProtectedRoute from './components/ProtectedRoute';
import Home from './components/Home';
import HomeDefault from './components/HomeDefault';
import Management from './components/management/management';
import SnackbarComponent from './components/SnackBarComponent';
import ChatPage from './components/chat/chat';
import ActivitiesHome from './components/rubrics/activities_home';
import RubricsHome from './components/rubrics/rubrics_home';

const App = () => {
  return (
    <Provider store={store}>
      <SnackbarComponent />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} /> {/* Registration route */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomeDefault />} />
            <Route path="manage" element={<Management />} />
            <Route path="talk" element={<ChatPage />} />
            <Route path="manage_activities" element={<ActivitiesHome />} />
            <Route path="rubrics" element={<RubricsHome />} />
          </Route>
          {/* Fallback: redirect "/" to "/home" */}
          <Route path="/" element={<Navigate to="/home" />} />
        </Routes>
      </Router>
    </Provider>
  );
};

export default App;
