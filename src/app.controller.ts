import { Controller, Post, Body } from '@nestjs/common';
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
import { provisionAgentTool } from './tools-as-agents/provision-sub-agent';
import { generalCloudAgentTool } from './tools-as-agents/general-cloud-agent';
import { ToolRegistry } from './utils/tool-registry';
import { AgentMetrics } from './utils/agent-metrics';
import { AgentError } from './utils/agent-error';
import { recommendationsAgentTool } from './tools-as-agents/recommendations-sub-agent';
import { ConversationManager } from './utils/conversation-store';
import { UserConversation } from './utils/conversation.types';
import { SupervisorAgentService } from './supervisor-agent/supervisor.service';

@Controller()
export class AppController {
  private readonly toolRegistry: ToolRegistry;
  private readonly metrics: AgentMetrics;
  private readonly memory: BufferMemory;
  private readonly conversationManager: ConversationManager;
  private readonly supervisorAgent: SupervisorAgentService;

  constructor() {
    console.log('Initializing AppController...');
    this.toolRegistry = ToolRegistry.getInstance();
    this.metrics = AgentMetrics.getInstance();
    this.conversationManager = ConversationManager.getInstance();
    this.supervisorAgent = SupervisorAgentService.getInstance();
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
  async processQuery(@Body() body: any) {
    console.log('Processing user query:', body);
    return this.supervisorAgent.processQuery(body.message, body.userId, body.csp);
  }

  @Post('/metrics')
  async getMetrics() {
    return this.metrics.getMetrics();
  }

  @Post('/conversations')
  async getConversations(@Body() body: { userId: string }): Promise<UserConversation | null> {
    return this.conversationManager.getUserHistory(body.userId);
  }

  @Post('/conversations/csp')
  async getConversationsByCSP(@Body() body: { csp: string }): Promise<{ userId: string; conversation: UserConversation }[]> {
    return this.conversationManager.getConversationsByCSP(body.csp);
  }

  @Post('/conversations/users')
  async getAllUsers(): Promise<string[]> {
    return this.conversationManager.getAllUserIds();
  }
}
