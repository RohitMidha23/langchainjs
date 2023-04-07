import { BaseLanguageModel } from "base_language/index.js";
import { BasePromptTemplate, LLMChain } from "index.js";
import { BaseChatMessage } from "../schema/index.js";

import {
  BaseChatMemory,
  BaseMemoryInput,
  ChatMessageHistory,
} from "./chat_memory.js";
import {
  ENTITY_EXTRACTION_PROMPT,
  ENTITY_SUMMARIZATION_PROMPT,
} from "./prompt.js";
import {
  InputValues,
  MemoryVariables,
  getBufferString,
  getPromptInputKey,
} from "./base.js";

interface BaseEntityStore {
  get(key: string, defaultValue?: string): string | undefined;
  set(key: string, value?: string): void;
  delete(key: string): void;
  exists(key: string): boolean;
  clear(): void;
}

class InMemoryEntityStore implements BaseEntityStore {
  private store: Record<string, string | undefined> = {};

  public get(
    key: string,
    defaultValue: string | undefined
  ): string | undefined {
    return key in this.store ? this.store[key] : defaultValue;
  }

  public set(key: string, value: string | undefined): void {
    this.store[key] = value;
  }

  public delete(key: string): void {
    delete this.store[key];
  }

  public exists(key: string): boolean {
    return key in this.store;
  }

  public clear(): void {
    this.store = {};
  }
}

export interface EntityMemoryInput extends BaseMemoryInput {
  humanPrefix: string;
  aiPrefix: string;
  llm: BaseLanguageModel;
  entityExtractionPrompt: BasePromptTemplate;
  entitySummarizationPrompt: BasePromptTemplate;
  entityCache: string[];
  k: number;
  chatHistoryKey: string;
  entityStore: BaseEntityStore;
}

export class EntityMemory extends BaseChatMemory implements EntityMemoryInput {
  humanPrefix = "Human";

  aiPrefix = "AI";

  entityExtractionPrompt = ENTITY_EXTRACTION_PROMPT;

  entitySummarizationPrompt = ENTITY_SUMMARIZATION_PROMPT;

  entityStore = new InMemoryEntityStore();

  entityCache: string[];

  k = 3;

  chatHistoryKey = "history";

  llm: BaseLanguageModel;

  entitiesKey = "entities";

  get buffer(): BaseChatMessage[] {
    return this.chatHistory.messages;
  }

  get memoryVariables(): string[] {
    return [this.entitiesKey, this.chatHistoryKey];
  }

  async loadMemoryVariables(inputs: InputValues): Promise<MemoryVariables> {
    const chain = new LLMChain({
      llm: this.llm,
      prompt: this.entityExtractionPrompt,
    });
    const prompt_input_key =
      this.inputKey ?? getPromptInputKey(inputs, this.memoryVariables);
    const buffer_string = getBufferString(
      this.buffer.slice(-this.k * 2),
      this.humanPrefix,
      this.aiPrefix
    );
    const output = await chain.predict({
      history: buffer_string,
      input: inputs[prompt_input_key],
    });
    const entities: string[] =
      output.trim() === "NONE" ? [] : output.split(",").map((w) => w.trim());
    const entity_summaries: { [key: string]: string | undefined } = {};

    for (const entity of entities) {
      entity_summaries[entity] = await this.entityStore.get(entity, "");
    }
    this.entityCache = [...entities];
    const buffer = this.returnMessages
      ? this.buffer.slice(-this.k * 2)
      : buffer_string;

    return {
      [this.chatHistoryKey]: buffer,
      [this.entitiesKey]: entity_summaries,
    };
  }

  async saveContext(
    inputs: Record<string, unknown>,
    outputs: Record<string, unknown>
  ): Promise<void> {
    await super.saveContext(inputs, outputs);

    const promptInputKey =
      this.inputKey ?? getPromptInputKey(inputs, this.memoryVariables);
    const buffer_string = getBufferString(
      this.buffer.slice(-this.k * 2),
      this.humanPrefix,
      this.aiPrefix
    );
    const input_data = inputs[promptInputKey];
    const chain = new LLMChain({
      llm: this.llm,
      prompt: this.entitySummarizationPrompt,
    });

    for (const entity of this.entityCache) {
      const existing_summary = this.entityStore.get(entity, "");
      const output = await chain.predict({
        summary: existing_summary,
        entity,
        history: buffer_string,
        input: input_data,
      });
      this.entityStore.set(entity, output.trim());
    }
  }

  clear(): void {
    this.chatHistory = new ChatMessageHistory();
    this.entityStore = new InMemoryEntityStore();
  }
}
