"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Paperclip, Send, Upload } from "lucide-react";
import { v4 as uuid } from "uuid";

import type { ChatMessage } from "@/lib/ai";

const SYSTEM_PROMPT = `You are a compliance co-pilot for RWA issuances. Ask targeted follow-up questions to capture missing disclosures, highlight regulatory gaps, and produce structured bullet summaries.`;

type ExtractedField = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
};

type ConversationMessage = ChatMessage & { id: string };

const INITIAL_FIELDS: ExtractedField[] = [
  {
    id: "issuerName",
    label: "Issuer legal entity",
    placeholder: "e.g. ABC Capital Ltd",
    value: "",
  },
  {
    id: "assetType",
    label: "Underlying asset type",
    placeholder: "Commercial real estate, trade finance receivables, ...",
    value: "",
  },
  {
    id: "jurisdiction",
    label: "Issuance jurisdiction",
    placeholder: "Singapore, Hong Kong, Delaware, ...",
    value: "",
  },
  {
    id: "offeringSize",
    label: "Offering size",
    placeholder: "USD 5M",
    value: "",
  },
];

export function DocumentWorkbench() {
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [messages, setMessages] = useState<ConversationMessage[]>([{
    id: uuid(),
    role: "assistant",
    content:
      "Upload issuer materials and I will extract required representations, highlight missing inputs, and produce a compliance-ready draft.",
  }]);
  const [draft, setDraft] = useState("No draft generated yet.");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const aiMessages = useMemo<ChatMessage[]>(
    () => [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map(({ role, content }) => ({ role, content })),
    ],
    [messages],
  );

  const handleFieldChange = useCallback((id: string, value: string) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, value } : field)));
  }, []);

  const buildDraft = useCallback(() => {
    const filled = fields.filter((field) => field.value.trim().length > 0);
    if (!filled.length) {
      return "Provide issuer details to synthesize a disclosure draft.";
    }

    const lines = filled.map((field) => `- **${field.label}:** ${field.value}`);
    return `# Compliance summary\n\n${lines.join("\n")}\n\n_Auto-generated via AI co-pilot._`;
  }, [fields]);

  const sendMessage = useCallback(
    async (input: string) => {
      const userMessage: ConversationMessage = { id: uuid(), role: "user", content: input };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...aiMessages, userMessage] }),
        });

        if (!response.ok) {
          throw new Error("AI request failed");
        }

        const { content } = (await response.json()) as { content: string };
        setMessages((prev) => [...prev, { id: uuid(), role: "assistant", content }]);
        setDraft(buildDraft() + `\n\n## Assistant notes\n${content}`);
      } catch (error) {
        console.error(error);
        setMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            role: "assistant",
            content: "I could not reach the AI service. Please confirm the OpenRouter API key configuration.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [aiMessages, buildDraft],
  );

  const onUpload = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const next = Array.from(files);
    setUploadedFiles(next);
    setMessages((prev) => [
      ...prev,
      {
        id: uuid(),
        role: "assistant",
        content: `${next.length} file(s) received. I will extract covenants and risk factors for review.`,
      },
    ]);
  }, []);

  const renderedDraft = useMemo(() => {
    const escape = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return escape(draft).replace(/\n/g, "<br/>");
  }, [draft]);
  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const note = formData.get("message");
      if (typeof note === "string" && note.trim().length > 0) {
        void sendMessage(note);
        form.reset();
      }
    },
    [sendMessage],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.25fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Document ingestion</CardTitle>
            <CardDescription>Drop pitch decks, legal opinions, or spreadsheets to auto-extract the essentials.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="documents">Upload supporting files</Label>
            <Input id="documents" type="file" multiple onChange={(event) => onUpload(event.target.files)} />
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file) => (
                <Badge key={file.name} variant="secondary" className="flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5" />
                  {file.name}
                </Badge>
              ))}
              {!uploadedFiles.length && (
                <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Key representations</CardTitle>
            <CardDescription>Validate extracted attributes and fill gaps highlighted by the AI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input
                  id={field.id}
                  value={field.value}
                  placeholder={field.placeholder}
                  onChange={(event) => handleFieldChange(field.id, event.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card className="h-[420px]">
          <CardHeader>
            <CardTitle>AI conversation</CardTitle>
            <CardDescription>Ask clarifying questions, request checklists, or generate legal review prompts.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-[320px] flex-col">
            <ScrollArea className="h-full flex-1 rounded-md border bg-muted/40 p-3">
              <div className="space-y-3 text-sm">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={message.role === "assistant" ? "text-foreground" : "text-muted-foreground"}
                  >
                    <span className="font-semibold capitalize">{message.role}</span>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <form onSubmit={onSubmit} className="mt-3 flex gap-2">
              <Input name="message" placeholder="Ask for a disclosure checklist..." disabled={isLoading} />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Upload className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Live draft</CardTitle>
            <CardDescription>Download and share with counsel once validated.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px] rounded-md border bg-muted/40 p-4 text-sm">
              <article className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderedDraft }} />
            </ScrollArea>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline">
                Export to Markdown
              </Button>
              <Button type="button" variant="secondary">
                Submit for legal review
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
