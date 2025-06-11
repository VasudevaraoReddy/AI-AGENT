import { Controller, Post, Body, UnauthorizedException, Param } from '@nestjs/common';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { BufferMemory } from "langchain/memory";
import { provisionAgentTool } from './supervisor-agent/tools/provision-sub-agent';
import { generalCloudAgentTool } from './supervisor-agent/tools/general-cloud-agent';
import { ToolRegistry } from './utils/tool-registry';
import { AgentMetrics } from './utils/agent-metrics';
import { AgentError } from './utils/agent-error';
import { recommendationsAgentTool } from './supervisor-agent/tools/recommendations-sub-agent';
import { ConversationManager } from './utils/conversation-store';
import { UserConversation } from './utils/conversation.types';
import { SupervisorAgentService } from './supervisor-agent/supervisor.service';
import { AppService } from './app.service';
import { PayloadHandler, StandardPayload } from './utils/payload-handler';

// src/dto/process-query.dto.ts
export class ProcessQueryDto {
  message: string;
  userId?: string;
  csp?: string;
  chatId?: string;
  payload?: StandardPayload; // Use the standardized payload type
}

@Controller()
export class AppController {
  private readonly toolRegistry: ToolRegistry;
  private readonly metrics: AgentMetrics;
  private readonly memory: BufferMemory;
  private readonly conversationManager: ConversationManager;
  private readonly supervisorAgent: SupervisorAgentService;
  private readonly appService: AppService;
  private readonly payloadHandler: PayloadHandler;

  constructor(appService: AppService) {
    console.log('Initializing AppController...');
    this.toolRegistry = ToolRegistry.getInstance();
    this.metrics = AgentMetrics.getInstance();
    this.conversationManager = ConversationManager.getInstance();
    this.supervisorAgent = SupervisorAgentService.getInstance();
    this.appService = appService;
    this.payloadHandler = PayloadHandler.getInstance();
    console.log('ConversationManager initialized');
    this.memory = new BufferMemory({
      returnMessages: true,
      memoryKey: "chat_history",
      inputKey: "input",
      outputKey: "output"
    });

    // Register available tools
    this.toolRegistry.register(provisionAgentTool);
    this.toolRegistry.register(generalCloudAgentTool);
    this.toolRegistry.register(recommendationsAgentTool);
  }

  @Post('/process-query')
  async processQuery(@Body() body: ProcessQueryDto) {
    const { message, userId, csp, chatId, payload } = body;

    console.log('Processing query...', body);

    if (!message || !userId || !csp || !chatId) {
      throw new Error('Missing required parameters: message, userId, csp, and chatId are required');
    }

    try {
      // Standardize the payload if it exists
      const standardizedPayload = payload ? this.payloadHandler.standardizePayload(payload) : undefined;

      const response = await this.supervisorAgent.processQuery(
        message,
        userId,
        csp,
        chatId,
        standardizedPayload
      );
      
      return response;
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  }

  @Post('/metrics')
  async getMetrics() {
    return this.metrics.getMetrics();
  }

  @Post('/conversations')
  async getConversations(@Body() body: { userId: string }): Promise<{
    userId: string;
    chats: Array<{
      chatId: string;
      chatTitle: string;
      timestamp: string;
      csp: string;
    }>;
  }> {
    const conversations = await this.conversationManager.getUserHistory(body.userId);
    if (!conversations) {
      return { userId: body.userId, chats: [] };
    }

    // Transform the conversations to include chat details
    const chats = Object.entries(conversations.chats || {}).map(([chatId, chat]) => ({
      chatId,
      chatTitle: chat.chatTitle,
      timestamp: chat.history[0]?.timestamp || new Date().toISOString(),
      csp: conversations.csp
    }));

    return {
      userId: body.userId,
      chats
    };
  }

  @Post('/conversations/:userId/:chatId')
  async getChatHistory(
    @Param('userId') userId: string,
    @Param('chatId') chatId: string
  ): Promise<{
    chatId: string;
    chatTitle: string;
    timestamp: string;
    csp: string;
    messages: Array<{
      role: 'human' | 'assistant';
      content: string;
      timestamp: string;
    }>;
  }> {
    const conversations = await this.conversationManager.getUserHistory(userId);
    if (!conversations || !conversations.chats || !conversations.chats[chatId]) {
      throw new Error('Chat not found');
    }

    const chat = conversations.chats[chatId];
    return {
      chatId,
      chatTitle: chat.chatTitle,
      timestamp: chat.history[0]?.timestamp || new Date().toISOString(),
      csp: conversations.csp,
      messages: chat.history.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
    };
  }

  @Post('/conversations/csp')
  async getConversationsByCSP(@Body() body: { csp: string }): Promise<Array<{
    userId: string;
    chats: Array<{
      chatId: string;
      chatTitle: string;
      timestamp: string;
      csp: string;
    }>;
  }>> {
    const conversations = await this.conversationManager.getConversationsByCSP(body.csp);
    return conversations.map(conv => ({
      userId: conv.userId,
      chats: Object.entries(conv.conversation.chats || {}).map(([chatId, chat]) => ({
        chatId,
        chatTitle: chat.chatTitle,
        timestamp: chat.history[0]?.timestamp || new Date().toISOString(),
        csp: conv.conversation.csp
      }))
    }));
  }

  @Post('/conversations/users')
  async getAllUsers(): Promise<string[]> {
    return this.conversationManager.getAllUserIds();
  }
}
