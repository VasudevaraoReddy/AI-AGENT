export interface ConversationMessage {
    role: 'human' | 'assistant';
    content: string | any; // Allow any response format from the supervisor
    timestamp: string;
}

export interface UserConversation {
    csp: string;
    history: ConversationMessage[];
}

export interface ConversationStore {
    [userId: string]: UserConversation;
} 