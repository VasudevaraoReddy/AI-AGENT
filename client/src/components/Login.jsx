import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useChatContext } from '../context/ChatContext';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setCurrentUser, currentUser } = useChatContext();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      console.log(data);

      if (response.ok) {
        setCurrentUser(data);
        localStorage.setItem('AIUSER', JSON.stringify(data)); // Persist session
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  if (typeof currentUser !== 'undefined' && currentUser !== null) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen bg-[#333333] flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-[#ffffff] p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-[#333333]">
            Welcome to CloudMind
          </h2>
          <p className="mt-2 text-center text-[#999999]">
            Sign in to your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
              role="alert"
            >
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#333333]"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-[#cccccc] rounded-md shadow-sm focus:outline-none focus:ring-[#ffe600] focus:border-[#ffe600] text-[#333333]"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#333333]"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-[#cccccc] rounded-md shadow-sm focus:outline-none focus:ring-[#ffe600] focus:border-[#ffe600] text-[#333333]"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[#333333] bg-[#ffe600] hover:bg-[#ffe600]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ffe600] transition-colors duration-200"
            >
              Sign in
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-[#999999]">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-medium text-[#ffe600] hover:text-[#ffe600]/90"
              >
                Sign up
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
