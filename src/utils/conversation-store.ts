import * as fs from 'fs';
import * as path from 'path';
import { ConversationMessage, UserConversation, ConversationStore } from './conversation.types';

export class ConversationManager {
    private static instance: ConversationManager;
    private filePath: string;

    private constructor() {
        try {
            // Get the absolute path of the server directory
            const serverDir = path.resolve(__dirname, '../../');
            console.log('Server directory:', serverDir);

            // Create the conversations directory in the server root
            const conversationsDir = path.join(serverDir, 'conversations');
            console.log('Conversations directory path:', conversationsDir);

            if (!fs.existsSync(conversationsDir)) {
                console.log('Creating conversations directory...');
                fs.mkdirSync(conversationsDir, { recursive: true, mode: 0o755 });
                console.log('Conversations directory created successfully');
            } else {
                console.log('Conversations directory already exists');
                // Ensure proper permissions
                fs.chmodSync(conversationsDir, 0o755);
            }

            this.filePath = path.join(conversationsDir, 'conversations.json');
            console.log('Conversations file path:', this.filePath);
            
            // Create the file if it doesn't exist
            if (!fs.existsSync(this.filePath)) {
                console.log('Creating conversations.json file...');
                fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2), { mode: 0o644 });
                console.log('conversations.json file created successfully');
            } else {
                console.log('conversations.json file already exists');
                // Ensure proper permissions
                fs.chmodSync(this.filePath, 0o644);
            }

            // Verify file is writable
            try {
                fs.accessSync(this.filePath, fs.constants.W_OK);
                console.log('Verified write permissions for conversations.json');
            } catch (error) {
                console.error('File is not writable:', error);
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
            console.log('Reading conversations from:', this.filePath);
            const data = fs.readFileSync(this.filePath, 'utf8');
            // console.log('Raw file content:', data);
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading conversations:', error);
            return {};
        }
    }

    private writeConversations(data: ConversationStore): void {
        try {
            console.log('Writing conversations to:', this.filePath);
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
            console.log('Successfully wrote conversations to file');
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

    public addMessage(userId: string, message: string, response: any, csp: string): void {
        try {
            console.log('Adding new message for user:', userId);
            const conversations = this.readConversations();
            
            // Initialize user conversation if it doesn't exist
            if (!conversations[userId]) {
                conversations[userId] = {
                    csp: csp.toLowerCase(),
                    history: []
                };
            }

            const timestamp = this.formatTimestamp();

            // Add user message
            conversations[userId].history.push({
                role: 'human',
                content: message,
                timestamp
            });

            // Add assistant response with exact structure
            conversations[userId].history.push({
                role: 'assistant',
                content: response,
                timestamp
            });

            this.writeConversations(conversations);
            console.log('Successfully added message to conversation');
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    }

    public getUserHistory(userId: string): UserConversation | null {
        const conversations = this.readConversations();
        return conversations[userId] || null;
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