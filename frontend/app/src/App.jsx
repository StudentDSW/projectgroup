import { Routes, Route } from 'react-router-dom';
import { Login } from "./components/Login"
import { Registration } from "./components/Registration"
import { ResetPassword } from "./components/ResetPassword"
import { Dashboard } from "./components/Dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Profile } from "./components/Profile"
import GroupPage from "./components/GroupPage";

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
          path="/group/:groupId"
          element={
            <ProtectedRoute>
              <GroupPage />
            </ProtectedRoute>
          }
        />
        <Route path="/account" element={<Profile />} />
      </Routes>
    </div>
  );
}

export default App;
