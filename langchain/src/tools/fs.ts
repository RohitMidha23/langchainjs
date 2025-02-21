import { z } from "zod";
import { BaseFileStore } from "../schema/index.js";
import { StructuredTool, ToolParams } from "./base.js";

interface ReadFileParams extends ToolParams {
  store: BaseFileStore;
}

export class ReadFileTool extends StructuredTool {
  // eslint-disable-next-line tree-shaking/no-side-effects-in-initialization
  schema = /* #__PURE__ */ z.object({
    // eslint-disable-next-line tree-shaking/no-side-effects-in-initialization
    file_path: /* #__PURE__ */ z.string().describe("name of file"),
  });

  name = "read_file";

  description = "Read file from disk";

  store: BaseFileStore;

  constructor({ verbose, callbackManager, store }: ReadFileParams) {
    super(verbose, callbackManager);

    this.store = store;
  }

  async _call({ file_path }: z.infer<typeof this.schema>) {
    return await this.store.readFile(file_path);
  }
}

interface WriteFileParams extends ToolParams {
  store: BaseFileStore;
}

export class WriteFileTool extends StructuredTool {
  // eslint-disable-next-line tree-shaking/no-side-effects-in-initialization
  schema = /* #__PURE__ */ z.object({
    // eslint-disable-next-line tree-shaking/no-side-effects-in-initialization
    file_path: /* #__PURE__ */ z.string().describe("name of file"),
    // eslint-disable-next-line tree-shaking/no-side-effects-in-initialization
    text: /* #__PURE__ */ z.string().describe("text to write to file"),
  });

  name = "write_file";

  description = "Write file from disk";

  store: BaseFileStore;

  constructor({ verbose, callbackManager, store }: WriteFileParams) {
    super(verbose, callbackManager);

    this.store = store;
  }

  async _call({ file_path, text }: z.infer<typeof this.schema>) {
    await this.store.writeFile(file_path, text);
    return "File written to successfully.";
  }
}
