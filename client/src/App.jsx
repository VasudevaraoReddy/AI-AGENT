import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ChatProvider } from './context/ChatContext';
import Login from './components/Login';
import Home from './components/Home';
import LandingPage from './components/LandingPage';
import CSPSelection from './components/CSPSelection';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';
import './App.css';
import TerraformCodeHomePage from './components/TerraformCodeBlock/TerraformCodeHomePage';
import ChatHome from './components/ChatHome';

function App() {
  return (
    <Router>
      <ChatProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          {/* <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />} />
            <Route path="/select-csp" element={<CSPSelection />} />
            <Route path="/terraform" element={<TerraformCodeHomePage />} />
          </Route> */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />}>
              <Route index element={<ChatHome />} />
              <Route path="terraform" element={<TerraformCodeHomePage />} />
            </Route>
            <Route path="/select-csp" element={<CSPSelection />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ChatProvider>
    </Router>
  );
}

export default App;
