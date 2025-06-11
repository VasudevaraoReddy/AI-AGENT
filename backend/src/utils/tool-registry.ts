import { DynamicStructuredTool } from "langchain/tools";

export class ToolRegistry {
    private static instance: ToolRegistry;
    private tools: Map<string, DynamicStructuredTool>;

    private constructor() {
        this.tools = new Map();
    }

    public static getInstance(): ToolRegistry {
        if (!ToolRegistry.instance) {
            ToolRegistry.instance = new ToolRegistry();
        }
        return ToolRegistry.instance;
    }

    register(tool: DynamicStructuredTool) {
        this.tools.set(tool.name, tool);
    }
    
    getTool(name: string): DynamicStructuredTool | undefined {
        return this.tools.get(name);
    }
    
    getAvailableTools(): DynamicStructuredTool[] {
        return Array.from(this.tools.values());
    }

    getToolNames(): string[] {
        return Array.from(this.tools.keys());
    }
} 