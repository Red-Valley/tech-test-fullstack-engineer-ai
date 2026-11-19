import dns from 'node:dns';
import { SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { createCatalogTools } from '@/lib/ai/tools';

dns.setDefaultResultOrder('ipv4first');

export interface ModelOption {
    id: string;
    label: string;
}

export const DEFAULT_GOOGLE_MODEL = 'gemini-3-flash-preview';

export const GOOGLE_MODEL_OPTIONS: ModelOption[] = [
    {
        id: 'gemini-3-flash-preview',
        label: 'Gemini 3 Flash Preview',
    },
    {
        id: 'gemini-3.1-flash-lite',
        label: 'Gemini 3.1 Flash Lite',
    },
    {
        id: 'gemini-3.7-flash',
        label: 'Gemini 3.7 Flash',
    },
    {
        id: 'gemini-3.8-flash',
        label: 'Gemini 3.8 Flash',
    },
];

export interface ResolvedLLMConfig {
    provider: 'google';
    apiKey: string;
    model: string;
}

const SYSTEM_PROMPT = `You are the IndiePulse AI Catalog Analyst for an indie games analytics dashboard.

Rules you MUST follow:
1. Always use the provided catalog tools (search_games, count_games, get_catalog_stats, compare_games, add_or_update_game) to look up real catalog data before answering any question about games, counts, revenue, downloads, ratings, or genres.
2. NEVER guess, assume, or fabricate numbers, game titles, ratings, or statistics. If a game or metric is not in the tool output, state that clearly.
3. Only call add_or_update_game when the user explicitly asks to add a new game or update an existing game's metrics.
4. Format answers concisely using clean markdown (bullet points or compact tables for comparisons, currency formatted like $123,456, ratings like 4.85/5).`;

export function resolveLLMConfig(requestedModel?: string): ResolvedLLMConfig | null {
    const trimmedModel = requestedModel?.trim();
    const googleKey =
        process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
        process.env.GEMINI_API_KEY?.trim() ||
        process.env.GOOGLE_API_KEY?.trim();

    if (!googleKey) {
        return null;
    }

    return {
        provider: 'google',
        apiKey: googleKey,
        model: trimmedModel || process.env.LLM_MODEL?.trim() || DEFAULT_GOOGLE_MODEL,
    };
}

export function createCatalogAgent(config: ResolvedLLMConfig) {
    const tools = createCatalogTools();

    const modelWithTools = new ChatGoogleGenerativeAI({
        model: config.model,
        apiKey: config.apiKey,
        streaming: true,
        temperature: 0,
        maxRetries: 1,
    }).bindTools(tools);

    const toolNode = new ToolNode(tools);

    const callModel = async (state: typeof MessagesAnnotation.State) => {
        const hasSystem = state.messages.some((msg) => msg._getType() === 'system');
        const messages = hasSystem
            ? state.messages
            : [new SystemMessage(SYSTEM_PROMPT), ...state.messages];

        const response = await modelWithTools.invoke(messages);
        return { messages: [response] };
    };

    const workflow = new StateGraph(MessagesAnnotation)
        .addNode('agent', callModel)
        .addNode('tools', toolNode)
        .addEdge(START, 'agent')
        .addConditionalEdges('agent', toolsCondition)
        .addEdge('tools', 'agent');

    return workflow.compile();
}
