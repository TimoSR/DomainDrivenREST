import { create } from "zustand";
import type { TypeSchema } from "../../api-schema";
import { getAtPath, setAtPath, type JsonPath } from "../domain/path";
import { validate, type ValidationError } from "../domain/validate";

interface RequestDraftState {
  schema?: TypeSchema;
  schemaTable: Record<string, TypeSchema>;
  value: unknown;
  jsonText: string;
  jsonSyntaxError?: string;
  lastEditSource: "form" | "json" | "init";
  validationErrors: ValidationError[];

  init: (schema: TypeSchema | undefined, table: Record<string, TypeSchema>, initialValue: unknown) => void;
  setFieldValue: (path: JsonPath, newValue: unknown) => void;
  setJsonText: (text: string) => void;
  /** Swaps the whole draft at once — used by "fill with sample data". */
  replaceValue: (newValue: unknown) => void;
}

function reserialize(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

export const useRequestDraftStore = create<RequestDraftState>((set, get) => ({
  schema: undefined,
  schemaTable: {},
  value: undefined,
  jsonText: "",
  jsonSyntaxError: undefined,
  lastEditSource: "init",
  validationErrors: [],

  init: (schema, table, initialValue) => {
    set({
      schema,
      schemaTable: table,
      value: initialValue,
      jsonText: reserialize(initialValue),
      jsonSyntaxError: undefined,
      lastEditSource: "init",
      validationErrors: validate(schema, initialValue, table),
    });
  },

  setFieldValue: (path, newValue) => {
    const { value, schema, schemaTable } = get();
    const nextValue = setAtPath(value, path, newValue);
    set({
      value: nextValue,
      jsonText: reserialize(nextValue),
      jsonSyntaxError: undefined,
      lastEditSource: "form",
      validationErrors: validate(schema, nextValue, schemaTable),
    });
  },

  replaceValue: (newValue) => {
    const { schema, schemaTable } = get();
    set({
      value: newValue,
      jsonText: reserialize(newValue),
      jsonSyntaxError: undefined,
      lastEditSource: "form",
      validationErrors: validate(schema, newValue, schemaTable),
    });
  },

  setJsonText: (text) => {
    const { schema, schemaTable } = get();
    try {
      const parsed = JSON.parse(text);
      set({
        value: parsed,
        jsonText: text,
        jsonSyntaxError: undefined,
        lastEditSource: "json",
        validationErrors: validate(schema, parsed, schemaTable),
      });
    } catch (err) {
      // Invalid intermediate JSON while typing: keep the last valid `value` (so the form
      // doesn't get clobbered), just record the syntax error and disable Send.
      set({ jsonText: text, jsonSyntaxError: (err as Error).message, lastEditSource: "json" });
    }
  },
}));

export function getValueAtPath(path: JsonPath): unknown {
  return getAtPath(useRequestDraftStore.getState().value, path);
}
