import { useState } from 'react';
import { useChatContext } from '../context/ChatContext';
import SideBar from './SideBar';
import Messages from './Messages';
import { MessageCircleIcon, SendHorizontal } from 'lucide-react';

const ChatHome = () => {
  const {
    messageSentLoading,
    sendMessage,
    setActiveAndUserSelectedAgent,
    activeAndUserSelectedAgent,
  } = useChatContext();
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await sendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent newline
      handleSubmit(e);
    }
  };

  const agents = [
    { value: '', name: 'Auto' },
    { value: 'general_agent', name: 'General Agent' },
    { value: 'provision_agent', name: 'Provision Agent' },
    { value: 'recommendations_agent', name: 'Recommendation Agent' },
  ];

  const getAgentName = (value) => {
    const agent = agents.find((a) => a.value === value);
    return agent ? agent.name : 'Auto';
  };

  return (
    <div className="flex h-full w-full">
      <div className="w-64 flex-shrink-0">
        <SideBar />
      </div>

      <div className="flex-1 flex flex-col h-[97vh] w-full">
        <Messages />

        <form
          className="bg-slate-200 p-2 rounded-2xl mt-2 relative"
          onSubmit={handleSubmit}
        >
          <div className="relative flex flex-col gap-2 px-2">
            <textarea
              id="chat-input"
              className="flex-1 block resize-none border-none focus:border-none focus:outline-none focus:ring-0 bg-slate-200 p-2 text-sm text-slate-900 sm:text-base"
              placeholder="Enter your prompt"
              rows={1}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={messageSentLoading}
              onKeyDown={handleKeyDown}
            />

            <div className="flex justify-between">
              <div className="left-4 flex items-center">
                <select
                  value={activeAndUserSelectedAgent?.userSelectedAgent}
                  onChange={(e) =>
                    setActiveAndUserSelectedAgent({
                      ...activeAndUserSelectedAgent,
                      userSelectedAgent: e.target.value,
                    })
                  }
                  className="cursor-pointer rounded-md bg-white text-sm text-slate-700 w-[70px] shadow-sm focus:outline-none"
                >
                  {agents.map((each) => {
                    return <option value={each.value}>{each?.name}</option>;
                  })}
                </select>
                {activeAndUserSelectedAgent?.activeAgent && (
                  <div className="ml-4 flex justify-end pr-4">
                    <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {getAgentName(activeAndUserSelectedAgent?.activeAgent)}
                    </div>
                  </div>
                )}
              </div>
              <button
                className="cursor-pointer"
                type="submit"
                disabled={messageSentLoading}
              >
                <SendHorizontal />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatHome;
