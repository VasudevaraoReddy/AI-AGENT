import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useChatContext } from '../context/ChatContext';

function ProtectedRoute() {
  const { currentUser, authLoading } = useChatContext();

  if (authLoading) {
    return <div className="text-center mt-10">Checking authentication...</div>; // Or a spinner
  }

  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
