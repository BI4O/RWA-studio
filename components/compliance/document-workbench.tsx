"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Steps } from "@/components/ui/steps";
import { FileUp, Loader2, MessageCircle, Paperclip, Send } from "lucide-react";
import { v4 as uuid } from "uuid";

import type { ChatMessage } from "@/lib/ai";

const SYSTEM_PROMPT = `You are a compliance co-pilot for RWA issuances. Ask targeted follow-up questions to capture missing disclosures, highlight regulatory gaps, and produce structured bullet summaries.`;

const COMPLIANCE_STEPS = [
  { title: "Executive Summary", description: "Token symbol, contract address, basic info" },
  { title: "Issuer & Governance", description: "Corporate structure, core team responsibilities" },
  { title: "Token Overview & Classification", description: "Token utility, legal classification" },
  { title: "Legal & Regulatory", description: "Offering routes, KYC/AML compliance" },
  { title: "Tokenomics", description: "Supply, allocation, unlock, treasury" },
  { title: "Fundraising & Use of Proceeds", description: "Past rounds, current funding usage" },
  { title: "Technology & Security", description: "Blockchain & contract info, security audits" },
  { title: "Listing & Trading", description: "Exchange platforms, trading pairs setup" },
  { title: "Market Integrity & Disclosure", description: "Insider policy, disclosure requirements" },
  { title: "Key Risks", description: "Legal, technical, market risk assessment" },
  { title: "Incident Response & Delisting", description: "Emergency procedures, delisting triggers" },
  { title: "Declarations & Signatures", description: "Authenticity statements, risk disclosures" },
];

type ConversationMessage = ChatMessage & { id: string };

export function DocumentWorkbench() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: uuid(),
      role: "assistant",
      content:
        "Upload issuer materials and I will extract required representations, highlight missing inputs, and produce a compliance-ready draft.",
    },
  ]);
  const [draft, setDraft] = useState("Provide issuer details to synthesize a disclosure draft.");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const aiMessages = useMemo<ChatMessage[]>(
    () => [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map(({ role, content }) => ({ role, content })),
    ],
    [messages],
  );

  const buildDraft = useCallback(() => {
    return "# Compliance summary\n\n_Auto-generated via AI co-pilot._";
  }, []);

  const summaryBlurb = useMemo(() => {
    return "Upload issuer materials and collaborate with the AI assistant to generate compliance documentation.";
  }, []);

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

  const onUpload = useCallback(
    (files: FileList | null) => {
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
    },
    [],
  );

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
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-10">
        <aside className="order-2 flex flex-col gap-6 xl:order-1 xl:col-span-2">
          <div className="rounded-2xl border-2 border-dashed border-border bg-muted/40 p-6 text-center shadow-sm">
            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground/70">
                <FileUp className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Drag and drop files here</p>
                <p className="text-sm">Supported: PDFs, DOCX, XLSX. Max 25MB.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-2 w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse files
              </Button>
              <Input
                ref={fileInputRef}
                id="compliance-documents"
                type="file"
                multiple
                className="hidden"
                onChange={(event) => onUpload(event.target.files)}
              />
            </div>
          </div>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Uploaded evidence</CardTitle>
              <CardDescription>
                Audited artifacts and counsel notes synchronized from the data room.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadedFiles.length ? (
                uploadedFiles.map((file) => (
                  <div key={file.name} className="rounded-xl border border-border/60 bg-background px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Paperclip className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB - {file.type || "Unlabelled"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                  No files uploaded yet. Drop issuer disclosures or underwriting memos to kick off extraction.
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
        <section className="order-1 flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-xl xl:order-2 xl:col-span-5">
          <div className="border-b border-border/60 bg-card/60 px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">AI Compliance Assistant</h2>
                <p className="text-sm text-muted-foreground">Live extraction and co-authoring workspace.</p>
              </div>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                Stage · Drafting
              </Badge>
            </div>
            <div className="mt-4 rounded-xl border border-border/60 bg-muted/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageCircle className="h-4 w-4" />
                AI Summary
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summaryBlurb}</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-6 px-6 py-6">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`h-9 w-9 flex-shrink-0 rounded-full bg-cover bg-center ${
                          isUser
                            ? "bg-[url('https://i.pravatar.cc/100?img=12')]"
                            : "bg-[url('https://i.pravatar.cc/100?img=32')]"
                        }`}
                      />
                      <div className={`flex max-w-[75%] flex-col gap-1 ${isUser ? "items-end text-right" : ""}`}>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {isUser ? "You" : "AI Assistant"}
                        </p>
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                            isUser
                              ? "rounded-br-none bg-primary text-primary-foreground"
                              : "rounded-tl-none bg-muted/70 text-foreground"
                          }`}
                        >
                          <span className="whitespace-pre-wrap">{message.content}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isLoading && (
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 flex-shrink-0 rounded-full bg-[url('https://i.pravatar.cc/100?img=32')] bg-cover bg-center" />
                    <div className="flex max-w-[75%] flex-col gap-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Assistant</p>
                      <div className="rounded-tl-none rounded-2xl bg-muted/70 px-4 py-3 text-sm text-foreground shadow-sm">
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Drafting response...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="border-t border-border/60 bg-muted/30 px-6 py-4">
              <form onSubmit={onSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
                <Textarea
                  name="message"
                  placeholder="Request a disclosure checklist or ask the assistant to refine a section..."
                  disabled={isLoading}
                  className="min-h-[72px] flex-1 rounded-xl border-border bg-background"
                />
                <Button type="submit" disabled={isLoading} className="h-11 min-w-[140px] rounded-xl">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </section>
        <aside className="order-3 flex flex-col xl:col-span-3">
          <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/80 shadow-lg">
            <div className="border-b border-border/60 px-6 py-4">
              <Button variant="secondary" size="sm" className="rounded-full px-4 py-2 text-xs font-semibold uppercase">
                Compliance manual
              </Button>
            </div>
            <ScrollArea className="flex-1 px-6 py-4">
              <article
                className="prose prose-sm max-w-none text-foreground dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderedDraft }}
              />
            </ScrollArea>
            <div className="border-t border-border/60 px-6 py-4">
              <div className="space-y-4">
                <Steps
                  current={1}
                  direction="vertical"
                  progressDot
                  items={COMPLIANCE_STEPS}
                  className="max-h-96 overflow-y-auto"
                />
                <Button variant="secondary" className="w-full rounded-lg">
                  Export PDF
                </Button>
              </div>
            </div>
            <div className="border-t border-border/60 px-6 py-4">
              <Button className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                Next: Send to contracts
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
