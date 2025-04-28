import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Login } from "./components/Login"
import { Registration } from "./components/Registration"
import { ResetPassword } from "./components/ResetPassword"

import './App.css'

function App() {

  return (
    <div className='wrapper-main'>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </div>
  )
}

export default App
