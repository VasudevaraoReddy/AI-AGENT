// import { useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useChatContext } from '../context/ChatContext';
// import ChatHome from './ChatHome';

// const Home = () => {
//   const navigate = useNavigate();
//   const { currentCSP } = useChatContext();

//   useEffect(() => {
//     const user = localStorage.getItem('AIUSER');
//     if (!user) {
//       navigate('/login');
//     }
//   }, [navigate]);

//   return (
//     <div className="flex h-screen">
//       <ChatHome />
//     </div>
//   );
// };

// export default Home;

import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useChatContext } from '../context/ChatContext';
import SideBar from './SideBar';

const Home = () => {
  const navigate = useNavigate();
  const { currentCSP } = useChatContext();

  useEffect(() => {
    const user = localStorage.getItem('AIUSER');
    if (!user) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="h-screen">
      <div className="flex h-full w-full">
        <div className="w-64 flex-shrink-0">
          <SideBar path={location.pathname} />
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default Home;
