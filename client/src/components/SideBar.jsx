import React, { useState, useEffect, useRef } from 'react';
import { useChatContext } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import { CirclePlus } from 'lucide-react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const CSPBadge = ({ csp }) => {
  const getCSPColor = (csp) => {
    switch (csp.toLowerCase()) {
      case 'aws':
        return 'bg-orange-500';
      case 'azure':
        return 'bg-blue-500';
      case 'gcp':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCSPName = (csp) => {
    switch (csp.toLowerCase()) {
      case 'aws':
        return 'AWS';
      case 'azure':
        return 'Azure';
      case 'gcp':
        return 'GCP';
      default:
        return csp;
    }
  };

  return (
    <div
      className={`w-[90px] rounded-full text-sm font-medium text-white ${getCSPColor(
        csp,
      )}`}
    >
      <p className="text-center">{getCSPName(csp)}</p>
    </div>
  );
};

const getRelativeTime = (date) => {
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000); // in seconds

  const units = [
    { unit: 'year', value: 60 * 60 * 24 * 365 },
    { unit: 'month', value: 60 * 60 * 24 * 30 },
    { unit: 'week', value: 60 * 60 * 24 * 7 },
    { unit: 'day', value: 60 * 60 * 24 },
    { unit: 'hour', value: 60 * 60 },
    { unit: 'minute', value: 60 },
    { unit: 'second', value: 1 },
  ];

  for (const { unit, value } of units) {
    const amount = Math.floor(diff / value);
    if (amount > 0) {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        -amount,
        unit,
      );
    }
  }

  return 'just now';
};

const SideBar = ({ path }) => {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const {
    currentCSP,
    handleNewChat,
    conversations,
    handleChatClick,
    currentChatId,
    currentUser,
    setCurrentUser,
  } = useChatContext();

  const handleLogout = () => {
    localStorage.removeItem('AIUSER');
    setCurrentUser(null);
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const moreList = [
    {
      title: 'Terraform Code',
      to: '/home/terraform',
      icon: '',
    },
  ];

  return (
    <aside className="flex">
      <div className="flex h-[100svh] w-60 flex-col overflow-y-auto bg-slate-50 pt-8 dark:border-slate-700 dark:bg-slate-900 sm:h-[100vh] sm:w-64">
        <div
          onClick={() => navigate('/')}
          className="cursor-pointer flex px-4 items-center"
        >
          {/* Logo */}
          <img
            src={'https://asset.brandfetch.io/idB8IjfqRq/id7PaFT6Jt.png'}
            alt="logo"
            className="h-7 w-7"
          />
          <div className="flex flex-col">
            <h2
              style={{ fontSize: '20px' }}
              className="px-5 text-lg font-medium text-slate-800 dark:text-slate-200"
            >
              Cloud Studio
            </h2>
            <p
              className="px-5 text-sm text-slate-500 dark:text-slate-400"
              style={{ fontSize: '12px' }}
            >
              CloudMind Agent
            </p>
          </div>
        </div>

        {path.includes('/terraform') ? (
          <>
            <button
              onClick={() => {
                navigate('/home');
              }}
              className="border mt-2 cursor-pointer flex w-full gap-x-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back to Chat Interface
            </button>
          </>
        ) : (
          <>
            <div className="mt-5">
              <button
                onClick={handleNewChat}
                className="cursor-pointer flex w-full p-2 rounded text-left text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <CirclePlus className="mr-3" /> New Chat
              </button>
            </div>
            {/* Previous chats container */}
            <div className="h-1/2 space-y-4 overflow-y-auto border-b border-slate-300 px-2 py-4 dark:border-slate-700">
              {conversations?.map((chat, idx) => (
                <button
                  key={chat?.conversationId + idx}
                  onClick={() =>
                    handleChatClick(chat.conversationId, chat?.csp)
                  }
                  className={`cursor-pointer flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors duration-200 focus:outline-none dark:hover:bg-slate-800 ${
                    chat.conversationId === currentChatId
                      ? 'bg-slate-200'
                      : 'hover:bg-slate-200'
                  }`}
                >
                  <span className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">
                    Chat {chat?.conversationId}
                  </span>
                  <CSPBadge csp={chat?.csp} />
                </button>
              ))}
            </div>
            <div className="px-2 py-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Last login: {getRelativeTime(currentUser?.lastLogin)}
              </p>
            </div>
            <hr className="border-slate-300 dark:border-slate-700" />
            <div className="w-full space-y-4 px-2 py-4">
              <button
                onClick={handleLogout}
                className="cursor-pointer flex w-full gap-x-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                  <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path>
                  <path d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"></path>
                  <path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855"></path>
                </svg>
                Logout
              </button>

              {/* Settings Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  className="flex cursor-pointer w-full items-center justify-between gap-x-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-x-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                      <path d="M19.875 6.27a2.225 2.225 0 0 1 1.125 1.948v7.284c0 .809 -.443 1.555 -1.158 1.948l-6.75 4.27a2.269 2.269 0 0 1 -2.184 0l-6.75 -4.27a2.225 2.225 0 0 1 -1.158 -1.948v-7.285c0 -.809 .443 -1.554 1.158 -1.947l6.75 -3.98a2.33 2.33 0 0 1 2.25 0l6.75 3.98h-.033z"></path>
                      <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"></path>
                    </svg>
                    ...More
                  </div>
                  {/* Conditional Chevron */}
                  {isSettingsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {isSettingsOpen && (
                  <div className="ml-4 mt-2 w-50 rounded-md">
                    <ul className="text-sm text-slate-700 dark:text-slate-200">
                      {moreList.map((each, index) => {
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              navigate(each.to);
                            }}
                            className="cursor-pointer flex w-full gap-x-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            {each?.title}
                          </button>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default SideBar;
