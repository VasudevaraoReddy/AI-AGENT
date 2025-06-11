import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChatProvider } from './context/ChatContext';
import Login from './components/Login';
import Home from './components/Home';
import LandingPage from './components/LandingPage';
import CSPSelection from './components/CSPSelection';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';
import "./App.css";

function App() {
  return (
    <Router>
      <ChatProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/home"
            element={
              localStorage.getItem('user') ? (
                <Home />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route 
            path="/select-csp" 
            element={
              <ProtectedRoute>
                <CSPSelection />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ChatProvider>
    </Router>
  );
}

export default App;
