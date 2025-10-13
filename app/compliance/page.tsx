import { DocumentWorkbench } from "@/components/compliance/document-workbench";

export const metadata = {
  title: "RWA Studio — Compliance Workbench",
  description: "Upload artifacts, fill disclosures, and co-create issuance drafts with AI.",
};

export default function CompliancePage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-3xl font-semibold">Compliance automation</h2>
        <p className="text-muted-foreground">
          Coordinate documents, extract key representations, and collaborate with the OpenRouter-powered assistant to
          finalize investor-ready disclosures.
        </p>
      </header>
      <DocumentWorkbench />
    </section>
  );
}
