interface BaseEntityStore {
  get(key: string, defaultValue?: string): string | undefined;
  set(key: string, value?: string): void;
  delete(key: string): void;
  exists(key: string): boolean;
  clear(): void;
}

class InMemoryEntityStore implements BaseEntityStore {
  private store: Record<string, string | undefined> = {};

  public get(key: string, defaultValue: string | undefined ): string | undefined {
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
