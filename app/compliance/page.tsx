import { DocumentWorkbench } from "@/components/compliance/document-workbench";

export const metadata = {
  title: "RWA Studio · Compliance Workbench",
  description: "Upload artifacts, fill disclosures, and co-create issuance drafts with the AI assistant.",
};

export default function CompliancePage() {
  return (
    <section className="space-y-10">
      <DocumentWorkbench />
    </section>
  );
}
