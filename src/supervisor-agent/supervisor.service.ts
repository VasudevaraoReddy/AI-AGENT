import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BufferMemory } from "langchain/memory";
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AgentError } from '../utils/agent-error';
import { AgentMetrics } from '../utils/agent-metrics';
import { ConversationManager } from '../utils/conversation-store';
import { ToolRegistry } from '../utils/tool-registry';
import { SUPERVISOR_SYSTEM_PROMPT } from './supervisor.prompt';

export class SupervisorAgentService {
    private static instance: SupervisorAgentService;
    private readonly memory: BufferMemory;
    private readonly toolRegistry: ToolRegistry;
    private readonly metrics: AgentMetrics;
    private readonly conversationManager: ConversationManager;

    private constructor() {
        this.toolRegistry = ToolRegistry.getInstance();
        this.metrics = AgentMetrics.getInstance();
        this.conversationManager = ConversationManager.getInstance();
        this.memory = new BufferMemory({
            returnMessages: true,
            memoryKey: "chat_history",
            inputKey: "input",
            outputKey: "output"
        });
    }

    public static getInstance(): SupervisorAgentService {
        if (!SupervisorAgentService.instance) {
            SupervisorAgentService.instance = new SupervisorAgentService();
        }
        return SupervisorAgentService.instance;
    }

    private async detectCSP(llm: any, message: string): Promise<string | null> {
        const cspResult = await llm.invoke([
            new SystemMessage(`Extract the cloud provider from the message. Return ONLY the provider name in uppercase (AWS, AZURE, GCP) or null if not mentioned.
            Examples:
            "Deploy in Azure" -> "AZURE"
            "Create in AWS" -> "AWS"
            "Setup on GCP" -> "GCP"
            "Create a VM" -> null`),
            new HumanMessage(message)
        ]);

        try {
            const content = String(cspResult.content).trim()
                .replace(/^["']|["']$/g, '') // Remove quotes
                .replace(/```.*```/gs, '') // Remove code blocks
                .trim()
                .toUpperCase();
            
            return ['AWS', 'AZURE', 'GCP'].includes(content) ? content : null;
        } catch (error) {
            console.error('Error parsing CSP result:', error);
            return null;
        }
    }

    public async processQuery(message: string, userId?: string, providedCsp?: string) {
        console.log('Processing query:', { message, userId, providedCsp });
        const startTime = Date.now();
        let success = false;

        try {
            // Initialize LLM
            const llm = new ChatOllama({
                model: 'llama3.1',
                baseUrl: 'https://codeprism-ai.com',
                format: 'json',
            }).bindTools(this.toolRegistry.getAvailableTools());

            // Detect CSP from message
            const detectedCsp = await this.detectCSP(llm, message);
            const effectiveCsp = detectedCsp || providedCsp?.toUpperCase() || 'general';

            // Create agent with tools
            const agent = createToolCallingAgent({
                llm: llm.withConfig({ format: 'json' }),
                tools: this.toolRegistry.getAvailableTools(),
                prompt: ChatPromptTemplate.fromMessages([
                    ["system", SUPERVISOR_SYSTEM_PROMPT],
                    ["placeholder", "{chat_history}"],
                    ["human", `User Query: {input}\nCloud Provider: {csp}\nUser ID: {userId}`],
                    ["placeholder", "{agent_scratchpad}"],
                ]),
            });

            const agentExecutor = new AgentExecutor({
                agent,
                tools: this.toolRegistry.getAvailableTools(),
                memory: this.memory,
                maxIterations: 3,
                returnIntermediateSteps: true
            });

            const chatHistory = await this.memory.loadMemoryVariables({});

            // Process the query
            const result = await agentExecutor.invoke({
                input: message,
                csp: effectiveCsp,
                userId: userId || 'anonymous',
                chat_history: chatHistory.chat_history || [],
                agent_scratchpad: "",
                metadata: {
                    original_csp: providedCsp,
                    detected_csp: detectedCsp,
                    original_userId: userId
                }
            });

            // Handle the result
            const executedTool = result.intermediateSteps?.[0]?.action?.tool || 'unknown';
            let toolObservation = this.parseToolObservation(result.intermediateSteps[0].observation);
            
            success = true;

            // Save conversation context
            const outputResponse = toolObservation.response || result.output;
            await this.saveContext(message, outputResponse, effectiveCsp, userId);

            // Store conversation
            await this.storeConversation(
                userId || 'anonymous',
                message,
                outputResponse,
                executedTool,
                toolObservation,
                effectiveCsp,
                providedCsp
            );

            return {
                response: outputResponse,
                delegated_to: executedTool,
                tool_result: toolObservation.tool_response || toolObservation,
                metadata: {
                    csp: effectiveCsp,
                    detected_csp: detectedCsp || undefined,
                    original_csp: providedCsp,
                    userId
                }
            };

        } catch (error) {
            console.error('Error in supervisor agent:', error);
            const agentError = error instanceof AgentError 
                ? error 
                : AgentError.fromError(error, 'supervisor_agent');

            success = false;
            throw agentError;
        } finally {
            const executionTime = Date.now() - startTime;
            this.metrics.recordToolExecution('supervisor_agent', executionTime, success);
        }
    }

    private parseToolObservation(observation: any): any {
        try {
            return typeof observation === 'string' 
                ? JSON.parse(observation) 
                : observation;
        } catch (error) {
            console.error('Error parsing tool observation:', error);
            return {
                response: observation,
                tool_response: {
                    status: 'success',
                    message: 'Processed successfully but response was not in JSON format',
                    service: null
                }
            };
        }
    }

    private async saveContext(message: string, response: string, csp: string, userId?: string) {
        await this.memory.saveContext(
            { 
                input: message,
                metadata: {
                    csp,
                    userId
                }
            },
            { output: response }
        );
    }

    private async storeConversation(
        userId: string,
        message: string,
        response: string,
        executedTool: string,
        toolObservation: any,
        effectiveCsp: string,
        originalCsp?: string
    ) {
        try {
            console.log('Storing conversation...');
            await this.conversationManager.addMessage(
                userId,
                message,
                {
                    response,
                    delegated_to: executedTool,
                    tool_result: toolObservation.tool_response || toolObservation,
                    metadata: {
                        csp: effectiveCsp,
                        original_csp: originalCsp,
                        userId
                    }
                },
                effectiveCsp
            );
            console.log('Conversation stored successfully');
        } catch (error) {
            console.error('Failed to store conversation:', error);
            // Non-critical error, don't throw
        }
    }
} 