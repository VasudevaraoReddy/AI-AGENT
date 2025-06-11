import { useState } from 'react';
import { useChatContext } from '../context/ChatContext';
import SideBar from './SideBar';
import Messages from './Messages';
import { MessageCircleIcon } from 'lucide-react';
const ChatHome = () => {
  const { loading, sendMessage } = useChatContext();
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
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <SideBar />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-[97vh] w-full">
        {/* Messages */}
        <Messages />

        {/* Prompt message input */}
        <form className="mt-2 relative" onSubmit={handleSubmit}>
          <label htmlFor="chat-input" className="sr-only">Enter your prompt</label>
          <div className="relative">
            <button
              type="button"
              className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-600"
              tabIndex={-1}
            >
              <MessageCircleIcon className="h-5 w-5" />
            </button>
            <textarea
              id="chat-input"
              className="block w-full resize-none rounded-xl border-none bg-slate-200 p-4 pl-10 pr-20 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-400 dark:focus:ring-blue-600 sm:text-base"
              placeholder="Enter your prompt"
              rows={1}
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              disabled={loading}
              onKeyDown={handleKeyDown}
            ></textarea>
            <button
              type="submit"
              disabled={loading}
              className="absolute bottom-2 right-2.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 sm:text-base disabled:opacity-50"
            >
              Send <span className="sr-only">Send message</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatHome;
