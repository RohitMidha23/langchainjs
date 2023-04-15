import { Agent } from "agents/agent.js";
import { BasePromptTemplate } from "index.js";
import { Tool } from "tools/base.js";

import { AgentExecutor } from "agents/executor.js";
import { BaseLLM } from "llms/base.js";
import { SerpAPI } from "tools/serpapi.js";
import { PROMPT } from "./prompt.js";

export class SelfAskWithSearchAgent extends Agent {
  /** Agent for the self-ask-with-search paper. */

  _agentType(): string {
    /** Return Identifier of agent type. */
    return "self-ask-with-search" as const;
  }

  static createPrompt(): BasePromptTemplate {
    /** Prompt does not depend on tools. */
    return PROMPT;
  }

  static validateTools(tools: Tool[]): void {
    if (tools.length !== 1) {
      throw new Error(`Exactly one tool must be specified, but got ${tools}`);
    }

    const toolNames = new Set(tools.map((tool) => tool.name));
    if (!toolNames.has("Intermediate Answer")) {
      throw new Error(
        `Tool name should be Intermediate Answer, got ${[...toolNames]}`
      );
    }
  }

  async extractToolAndInput(
    text: string
  ): Promise<{ tool: string; input: string } | null> {
    const followup = "Follow up:";
    const lastLine = text.split("\n").pop();

    if (!lastLine) {
      return null;
    }

    if (!lastLine.includes(followup)) {
      const finishString = "So the final answer is: ";
      if (!lastLine.includes(finishString)) {
        return null;
      }
      return {
        tool: "Final Answer",
        input: lastLine.slice(finishString.length),
      };
    }

    const afterColon = lastLine.split(":").pop();

    if (!afterColon) {
      return null;
    }

    return { tool: "Intermediate Answer", input: afterColon };
  }

  fixText(text: string): string {
    return `${text}\nSo the final answer is:`;
  }

  observationPrefix(): string {
    /** Prefix to append the observation with. */
    return "Intermediate answer: ";
  }

  llmPrefix(): string {
    /** Prefix to append the LLM call with. */
    return "";
  }

  starterString(): string {
    /** Put this string after user input but before first LLM call. */
    return "Are follow up questions needed here:";
  }
}

export class SelfAskWithSearchChain extends AgentExecutor {
  constructor(llm: BaseLLM, search_chain: Tool) {
    const search_tool = search_chain as SerpAPI;
    const agent = SelfAskWithSearchAgent.fromLLMAndTools(llm, [search_tool]);
    super({ agent, tools: [search_tool] });
  }
}
