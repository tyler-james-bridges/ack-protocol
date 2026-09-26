/**
 * Extensible ERC-8257 tool action registry.
 *
 * Reputation actions register here at import time. A later tool (e.g. kudos)
 * can add actions with `registerToolAction` without rewriting the dispatcher.
 */

export type JsonObject = Record<string, unknown>;

export interface ToolActionResult {
  status: number;
  body: JsonObject;
}

export type ToolActionHandler = (
  params: JsonObject
) => Promise<ToolActionResult>;

export interface ToolActionDefinition {
  name: string;
  tool: string;
  description: string;
  handler: ToolActionHandler;
}

const actions = new Map<string, ToolActionDefinition>();

export function registerToolAction(def: ToolActionDefinition): void {
  const existing = actions.get(def.name);
  if (existing && existing.tool !== def.tool) {
    throw new Error(
      `Tool action already registered: ${def.name} (owned by ${existing.tool})`
    );
  }
  actions.set(def.name, def);
}

export function getToolAction(name: string): ToolActionDefinition | undefined {
  return actions.get(name);
}

export function listToolActions(): ToolActionDefinition[] {
  return [...actions.values()];
}

export function listToolActionNames(): string[] {
  return [...actions.keys()];
}

/** Test-only: clear the registry between isolated cases. */
export function resetToolActions(): void {
  actions.clear();
}
