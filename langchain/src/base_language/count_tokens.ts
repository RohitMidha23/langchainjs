import type { TiktokenModel } from "@dqbd/tiktoken";

// https://www.npmjs.com/package/@dqbd/tiktoken

export const getModelNameForTiktoken = (modelName: string): TiktokenModel => {
  if (modelName.startsWith("gpt-3.5-turbo-")) {
    return "gpt-3.5-turbo";
  }

  if (modelName.startsWith("gpt-4-32k-")) {
    return "gpt-4-32k";
  }

  if (modelName.startsWith("gpt-4-")) {
    return "gpt-4";
  }

  return modelName as TiktokenModel;
};

export const getModelContextSize = (modelName: string): number => {
  switch (getModelNameForTiktoken(modelName)) {
    case "text-davinci-003":
      return 4097;
    case "text-curie-001":
      return 2048;
    case "text-babbage-001":
      return 2048;
    case "text-ada-001":
      return 2048;
    case "code-davinci-002":
      return 8000;
    case "code-cushman-001":
      return 2048;
    default:
      return 4097;
  }
};

interface CalculateMaxTokenProps {
  prompt: string;
  modelName: TiktokenModel;
}

export const importTiktoken = async () => {
  try {
    const { encoding_for_model } = await import("@dqbd/tiktoken");
    return { encoding_for_model };
  } catch (error) {
    console.log(error);
    return { encoding_for_model: null };
  }
};

export const calculateMaxTokens = async ({
  prompt,
  modelName,
}: CalculateMaxTokenProps) => {
  const { encoding_for_model } = await importTiktoken();

  // fallback to approximate calculation if tiktoken is not available
  let numTokens = Math.ceil(prompt.length / 4);

  try {
    if (encoding_for_model) {
      const encoding = encoding_for_model(getModelNameForTiktoken(modelName));

      const tokenized = encoding.encode(prompt);

      numTokens = tokenized.length;

      encoding.free();
    }
  } catch (error) {
    console.warn(
      "Failed to calculate number of tokens with tiktoken, falling back to approximate count",
      error
    );
  }

  const maxTokens = getModelContextSize(modelName);

  return maxTokens - numTokens;
};
