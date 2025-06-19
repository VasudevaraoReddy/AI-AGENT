import { createContext, useContext, useState, useEffect } from 'react';
import {
  processQuery,
  getUserConversations,
  getChatHistory,
} from '../services/ApiService';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
const ChatContext = createContext(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState({});
  const [loading, setLoading] = useState(false);
  const [messageSentLoading, setMessageSentLoading] = useState(false);
  const [activeAndUserSelectedAgent, setActiveAndUserSelectedAgent] = useState({
    userSelectedAgent: '',
    activeAgent: '',
  });
  const [currentCSP, setCurrentCSP] = useState('azure'); // Default to AWS
  const navigate = useNavigate();

  // Fetch list of conversations
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('AIUSER'));
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadChatConversations(currentUser?.userId);
    }
  }, [currentUser]);

  const loadChatConversations = async (userId) => {
    try {
      setLoading(true);
      const data = await getUserConversations(userId);
      setConversations(data);

      // Extract current CSP from history
      if (data && data.csp) {
        setCurrentCSP(data.csp);
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const chatId = uuidv4();
      setChatId(chatId);
      navigate(`/select-csp?chatId=${chatId}`);
    } catch (error) {
      console.error('Failed to create new Chat', error);
      toast.error('Failed to create new Chat');
      setLoading(false);
      throw error;
    }
  };

  const handleChatClick = async (chatId, csp) => {
    setChatId(chatId);
    setCurrentCSP(csp);
    const chatHistory = await getChatHistory(chatId, currentUser?.userId);

    setChatHistory(chatHistory);
    setActiveAndUserSelectedAgent({
      ...activeAndUserSelectedAgent,
      activeAgent: chatHistory?.extra_info?.active_agent,
    });
  };

  const refreshChat = async () => {
    if (!currentUser?.userId || !chatId) return;
    await loadChatConversations(currentUser.userId);
    // const chatHistory = await getChatHistory(chatId, currentUser.userId);
    // setChatHistory(chatHistory);
  };

  const createMessagePayload = (message) => {
    const base = {
      user_input: typeof message === 'string' ? message : message?.message,
      userId: currentUser?.userId,
      conversation_id: chatId,
      csp: currentCSP,
      userSelectedAgent: activeAndUserSelectedAgent.userSelectedAgent,
    };

    if (typeof message !== 'string') {
      base.formData = {
        template: message?.payload?.service?.template,
        formData: message?.payload?.formData,
        serviceDeploymentId: message?.payload?.serviceDeploymentId
      };
    }

    return base;
  };

  const handleSendMessage = async (message) => {
    try {
      setChatHistory((prev) => ({
        ...prev,
        messages: [
          ...(prev?.messages || []),
          {
            type: 'human',
            content: typeof message === 'string' ? message : message?.message,
          },
        ],
      }));
      setMessageSentLoading(true);
      const payload = createMessagePayload(message);
      const response = await processQuery(payload);

      setActiveAndUserSelectedAgent((prev) => ({
        ...prev,
        activeAgent: response?.extra_info?.active_agent,
      }));

      const lastMessage =
        Array.isArray(response?.messages) && response?.messages.length > 0
          ? response.messages[response.messages.length - 1]
          : null;

      setChatHistory((prev) => ({
        ...prev,
        messages: [
          ...(prev?.messages || []),
          ...(lastMessage ? [lastMessage] : []),
        ],
        extra_info: response?.extra_info,
      }));

      setMessageSentLoading(false);

      await refreshChat();

      return response;
    } catch (error) {
      toast.error('Failed to send Message');
      setChatHistory((prev) => ({
        ...prev,
        messages: (prev?.messages || []).slice(0, -1),
      }));
      throw error;
    } finally {
      setMessageSentLoading(false);
    }
  };

  const value = {
    conversations,
    currentUser,
    setCurrentUser,
    chatHistory,
    loading,
    currentCSP,
    handleNewChat,
    setCurrentCSP,
    sendMessage: handleSendMessage,
    handleChatClick,
    setConversations,
    currentChatId: chatId,
    setChatHistory,
    messageSentLoading,
    setActiveAndUserSelectedAgent,
    activeAndUserSelectedAgent,
    refreshHistory: () => loadChatConversations(currentUser?.userId),
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
