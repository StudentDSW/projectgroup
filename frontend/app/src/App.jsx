import { Routes, Route } from 'react-router-dom';
import { Login } from "./components/Login"
import { Registration } from "./components/Registration"
import { ResetPassword } from "./components/ResetPassword"
import { Dashboard } from "./components/Dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Profile } from "./components/Profile"
import { GroupPage } from "./components/GroupPage";
import GoToTop from './components/GoToTop';
import ErrorBoundary from "./components/ErrorBoundary";

import './App.css'

function App() {
  return (
    <div>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Login />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/group/:groupName"
          element={
            <ErrorBoundary>
              <ProtectedRoute>
                <GroupPage />
              </ProtectedRoute>
            </ErrorBoundary>
          }
        />
        <Route path="/account" element={<Profile />} />
      </Routes>
      <GoToTop />
    </div>
  );
}

export default App;
