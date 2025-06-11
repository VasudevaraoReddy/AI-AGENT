import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '../context/ChatContext';
import ChatHome from './ChatHome';

const Home = () => {
  const navigate = useNavigate();
  const { currentCSP } = useChatContext();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="flex h-screen">
      <ChatHome />
    </div>
  );
};

export default Home;
