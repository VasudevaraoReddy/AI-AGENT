export interface ConversationMessage {
    role: 'human' | 'assistant';
    content: string | any; // Allow any response format from the supervisor
    timestamp: string;
}

export interface Chat {
    chatTitle: string;
    history: ConversationMessage[];
}

export interface UserConversation {
    csp: string;
    chats: {
        [chatId: string]: Chat;
    };
}

export interface ConversationStore {
    [userId: string]: UserConversation;
} 