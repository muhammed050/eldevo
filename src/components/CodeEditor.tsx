"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { sql } from "@codemirror/lang-sql";

const Editor = dynamic(() => import("@uiw/react-codemirror").then((module) => module.default), {
  ssr: false,
  loading: () => <div className="min-h-[22rem] animate-pulse bg-slate-950/60" />,
});

type Language = "text" | "json" | "html" | "sql";

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  language = "text",
  placeholder,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  language?: Language;
  placeholder?: string;
}) {
  const extensions = useMemo(() => {
    const languageExtensions =
      language === "json"
        ? [json()]
        : language === "html"
          ? [html()]
          : language === "sql"
            ? [sql()]
            : [];
    return [
      basicSetup,
      keymap.of([...defaultKeymap, indentWithTab]),
      EditorView.lineWrapping,
      ...languageExtensions,
    ];
  }, [language]);

  return (
    <Editor
      value={value}
      onChange={(nextValue) => onChange?.(nextValue)}
      readOnly={readOnly}
      extensions={extensions}
      theme="dark"
      height="100%"
      minHeight="22rem"
      placeholder={placeholder}
      basicSetup={false}
    />
  );
}
