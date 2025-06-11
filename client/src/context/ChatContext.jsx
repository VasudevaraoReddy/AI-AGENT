import { createContext, useContext, useState, useEffect } from "react";
import {
  processQuery,
  getUserConversations,
  getChatHistory,
} from "../services/ApiService";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
const ChatContext = createContext(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentCSP, setCurrentCSP] = useState("azure"); // Default to AWS
  const navigate = useNavigate();

  // Fetch list of conversations
  useEffect(() => {
      const user = JSON.parse(localStorage.getItem('user'));
      setCurrentUser(user);
  }, []);

  // Load chat history when currentUser changes
  useEffect(() => {
    if (currentUser) {
      loadChatHistory(currentUser?.userId);
    }
  }, [currentUser]);

  const loadChatHistory = async (userId) => {
    try {
      setLoading(true);
      const data = await getUserConversations(userId);
      setConversations(data.chats);

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
      console.error("Failed to create new Chat", error);
      toast.error("Failed to create new Chat");
      setLoading(false);
      throw error;
    }
  }

  const handleChatClick = async (chatId, csp) => {
    setChatId(chatId);
    setCurrentCSP(csp);
    const chatHistory = await getChatHistory(chatId, currentUser?.userId);

    setChatHistory(chatHistory);
  }

  const handleSendMessage = async (message) => {
    if (typeof message === "string") {
      try {
        setLoading(true);

        if (!currentUser) {
          throw new Error("No user selected");
        }

        const response = await processQuery({
          message,
          userId: currentUser?.userId,
          chatId,
          csp: currentCSP
        });

        // Update chat history after sending message
        await loadChatHistory(currentUser?.userId);
        
        const chatHistory = await getChatHistory(chatId, currentUser?.userId);

        setChatHistory(chatHistory);

        setLoading(false);
        return response;
      } catch (error) {
        toast.error("Failed to send Message");
        setLoading(false);
        throw error;
      }
    } else {
      try {
        setLoading(true);

        if (!currentUser) {
          throw new Error("No user selected");
        }

        const response = await processQuery({
          message: message?.message,
          userId: currentUser?.userId,
          chatId,
          csp: currentCSP,
          payload: {
            template: message?.payload?.service?.template,
            formData: message?.payload?.formData,
          }
        });

        // Update chat history after sending message
        await loadChatHistory(currentUser?.userId);

        const chatHistory = await getChatHistory(chatId, currentUser?.userId);

        setChatHistory(chatHistory);

        setLoading(false);
        return response;
      } catch (error) {
        toast.error("Failed to send Message");
        setLoading(false);
        throw error;
      }
    }
  };

  const switchUser = (userId) => {
    setCurrentUser(userId);
  };

  const value = {
    conversations,
    currentUser,
    chatHistory,
    loading,
    currentCSP,
    handleNewChat,  
    setCurrentCSP,
    sendMessage: handleSendMessage,
    handleChatClick,
    currentChatId: chatId,
    switchUser,
    setChatHistory,
    refreshHistory: () => loadChatHistory(currentUser?.userId),
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}; 