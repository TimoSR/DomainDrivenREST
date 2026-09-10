import "monaco-editor/language/json/monaco.contribution";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/language/json/json.worker?worker";

self.MonacoEnvironment = { getWorker: (_id, label) => label === "json" ? new JsonWorker() : new EditorWorker() };
loader.config({ monaco });
import Editor, { type OnMount } from "@monaco-editor/react";
import { useUiStore } from "../../../shared/state/uiStore";

interface JsonEditorProps {
  value: string;
  onChange: (text: string) => void;
}

// A controlled Monaco instance bound to the shared request-draft store. It never clobbers
// the user's cursor: when the user types here, the store's jsonText is set to exactly the
// text already on screen, so the re-render below is a no-op diff. It only actually changes
// `value` out from under the user when the *form* side edited the draft instead.
export function JsonEditor({ value, onChange }: JsonEditorProps) {
  const theme = useUiStore((s) => s.theme);

  const handleMount: OnMount = (_editor, monaco) => {
    monaco.editor.defineTheme("ddr-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "8FBEDE" },
        { token: "string.value.json", foreground: "9AC4A6" },
        { token: "number", foreground: "D4A866" },
        { token: "keyword.json", foreground: "9089C2" },
        { token: "delimiter", foreground: "74809A" },
      ],
      colors: {
        "editor.background": "#111416",
        "editor.foreground": "#F1F4F9",
        "editorLineNumber.foreground": "#4E5A6D",
        "editorLineNumber.activeForeground": "#8E99AA",
        "editor.lineHighlightBackground": "#1A202A",
        "editorCursor.foreground": "#57A89F",
        "editor.selectionBackground": "#57A89F40",
        "editorIndentGuide.background1": "#2C3545",
      },
    });

    monaco.editor.defineTheme("ddr-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "3A6D96" },
        { token: "string.value.json", foreground: "2F6B4C" },
        { token: "number", foreground: "8A6520" },
        { token: "keyword.json", foreground: "5F5596" },
        { token: "delimiter", foreground: "8B93A1" },
      ],
      colors: {
        "editor.background": "#FFFFFF",
        "editor.foreground": "#10131A",
        "editorLineNumber.foreground": "#C9CFD8",
        "editorCursor.foreground": "#2C7D75",
      },
    });

    monaco.editor.setTheme(theme === "dark" ? "ddr-dark" : "ddr-light");
  };

  return (
    <Editor
      height="100%"
      language="json"
      value={value}
      theme={theme === "dark" ? "ddr-dark" : "ddr-light"}
      onMount={handleMount}
      onChange={(text) => onChange(text ?? "")}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        lineHeight: 22,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "none",
        overviewRulerLanes: 0,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
    />
  );
}
