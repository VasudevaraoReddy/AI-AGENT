import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BufferMemory } from "langchain/memory";
import { AgentError } from '../utils/agent-error';
import { AgentMetrics } from '../utils/agent-metrics';
import recommendationsTool from './tools/recommendations.tool';

// Create a memory instance for the recommendations agent
const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: "chat_history",
    inputKey: "input",
    outputKey: "output"
});

// Create the recommendations agent
const llm = new ChatOllama({
    model: 'llama3.1',
    baseUrl: 'https://codeprism-ai.com',
    format: 'json',
    temperature: 0.7,
});

const recommendationsAssistant = createToolCallingAgent({
    llm,
    tools: [recommendationsTool],
    prompt: ChatPromptTemplate.fromMessages([
        ["system", `You are a specialized cloud service recommendations assistant that helps users find the best cloud services based on their requirements.

EXPERTISE AREAS:
1. Cloud Service Selection:
   - Infrastructure recommendations (compute, storage, networking)
   - Platform service recommendations (databases, containers, serverless)
   - Application service recommendations (AI/ML, analytics, IoT)

2. Requirements Analysis:
   - Performance requirements
   - Scalability needs
   - Cost constraints
   - Security requirements
   - Compliance needs

3. Multi-Cloud Strategy:
   - Cross-provider comparisons
   - Hybrid cloud recommendations
   - Migration recommendations

4. Cost Optimization:
   - Pricing model recommendations
   - Resource sizing recommendations
   - Cost-saving strategies

RESPONSE FORMAT:
You must ALWAYS return a JSON object with this exact structure (no additional fields):

response: (string) Your detailed recommendation explanation
details:
  category: (string) The service category being recommended
  requirements: (array) List of identified requirements
  recommendations: (array) List of recommendation objects containing:
    - service: (string) Service name
    - provider: (string) Cloud provider
    - tier: (string) Recommended tier/size
    - estimatedCost: (string) Estimated monthly cost
    - features: (array) Key features
    - benefits: (array) Key benefits
    - considerations: (array) Important considerations
  alternatives: (array) List of alternative objects containing:
    - service: (string) Alternative service name
    - provider: (string) Cloud provider
    - reason: (string) Why this is an alternative

IMPORTANT RULES:
1. Always provide detailed justification for recommendations
2. Include cost estimates when possible
3. Consider scalability and future growth
4. Include alternative options
5. Highlight important considerations and limitations
6. ALWAYS format your response as valid JSON
7. Do not include any non-JSON text in your response
8. Follow the exact structure above - no additional or missing fields
9. ALWAYS pass the user's exact input to tools without modifying it
10. DO NOT summarize or rephrase the user's input when calling tools`],
        ["placeholder", "{chat_history}"],
        ["human", "{input}"],
        ["placeholder", "{agent_scratchpad}"]
    ])
});

const recommendationsAgentExecutor = new AgentExecutor({
    agent: recommendationsAssistant,
    tools: [recommendationsTool],
    maxIterations: 3,
    returnIntermediateSteps: true,
    memory: memory
});

export default recommendationsAgentExecutor; 