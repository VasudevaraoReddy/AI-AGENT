import * as fs from 'fs';
import * as path from 'path';
import { ConversationMessage, UserConversation, ConversationStore, Chat } from './conversation.types';

export class ConversationManager {
    private static instance: ConversationManager;
    private filePath: string;

    private constructor() {
        try {
            const serverDir = path.resolve(__dirname, '../../');
            const conversationsDir = path.join(serverDir, 'conversations');

            if (!fs.existsSync(conversationsDir)) {
                fs.mkdirSync(conversationsDir, { recursive: true, mode: 0o755 });
            } else {
                fs.chmodSync(conversationsDir, 0o755);
            }

            this.filePath = path.join(conversationsDir, 'conversations.json');
            
            if (!fs.existsSync(this.filePath)) {
                fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2), { mode: 0o644 });
            } else {
                fs.chmodSync(this.filePath, 0o644);
            }

            try {
                fs.accessSync(this.filePath, fs.constants.W_OK);
            } catch (error) {
                throw new Error('Cannot write to conversations.json file');
            }
        } catch (error) {
            console.error('Error in ConversationManager constructor:', error);
            throw error;
        }
    }

    public static getInstance(): ConversationManager {
        if (!ConversationManager.instance) {
            ConversationManager.instance = new ConversationManager();
        }
        return ConversationManager.instance;
    }

    private readConversations(): ConversationStore {
        try {
            const data = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading conversations:', error);
            return {};
        }
    }

    private writeConversations(data: ConversationStore): void {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error writing conversations:', error);
            throw error;
        }
    }

    private formatTimestamp(): string {
        const date = new Date();
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    public addMessage(userId: string, message: string, response: any, csp: string, chatId: string, chatTitle: string): void {
        try {
            const conversations = this.readConversations();
            
            // Initialize user conversation if it doesn't exist
            if (!conversations[userId]) {
                conversations[userId] = {
                    csp: csp.toLowerCase(), // This will be the default CSP for the user
                    chats: {}
                };
            }

            // Initialize chat if it doesn't exist
            if (!conversations[userId].chats[chatId]) {
                conversations[userId].chats[chatId] = {
                    chatTitle,
                    csp: csp.toLowerCase(),
                    history: []
                };
            }

            const timestamp = this.formatTimestamp();

            // Add user message
            conversations[userId].chats[chatId].history.push({
                role: 'human',
                content: message,
                timestamp
            });

            // Add assistant response with chat-specific CSP in metadata
            conversations[userId].chats[chatId].history.push({
                role: 'assistant',
                content: {
                    ...response,
                    metadata: {
                        ...response.metadata,
                        csp: csp.toLowerCase(), // Ensure chat-specific CSP is used
                        original_csp: csp.toLowerCase()
                    }
                },
                timestamp
            });

            this.writeConversations(conversations);
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    }

    public getUserHistory(userId: string): UserConversation | null {
        const conversations = this.readConversations();
        return conversations[userId] || null;
    }

    public getChatHistory(userId: string, chatId: string): Chat | null {
        const conversations = this.readConversations();
        return conversations[userId]?.chats[chatId] || null;
    }

    public getAllUserIds(): string[] {
        const conversations = this.readConversations();
        return Object.keys(conversations);
    }

    public getConversationsByCSP(csp: string): { userId: string; conversation: UserConversation }[] {
        const conversations = this.readConversations();
        return Object.entries(conversations)
            .filter(([_, conv]) => conv.csp.toLowerCase() === csp.toLowerCase())
            .map(([userId, conversation]) => ({ userId, conversation }));
    }
} 