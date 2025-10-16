import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentWorkbench } from "@/components/compliance/document-workbench";

export const metadata = {
  title: "RWA Studio · Compliance Workbench",
  description: "Upload artifacts, fill disclosures, and co-create issuance drafts with the AI assistant.",
};

const WATCHERS = [
  { label: "Watchers", value: "3 reviewers" },
  { label: "Jurisdiction", value: "United States" },
  { label: "Last update", value: "4 minutes ago" },
];

export default function CompliancePage() {
  return (
    <section className="space-y-10">
      <div className="rounded-3xl border border-border/70 bg-card/90 px-6 py-7 shadow-lg backdrop-blur-sm md:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="rounded-full border-primary/40 text-primary">
              Workflow · Compliance Files
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Draft regulatory disclosures for ChainTech Q1 issuance
              </h1>
              <p className="mt-2 max-w-3xl text-base text-muted-foreground">
                Coordinate live document ingestion, generate investor-ready checklists, and surface legal review items
                across primary and secondary jurisdictions in one workspace.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                Active stage · Drafting
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                SLA · 2 business days
              </Badge>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-4">
              {WATCHERS.map((item) => (
                <div key={item.label} className="rounded-xl border border-border/60 bg-background/80 px-4 py-2 shadow-sm">
                  <p className="text-xs uppercase tracking-wide">{item.label}</p>
                  <p className="font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
            <Button className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 lg:w-auto">
              Share with legal ops
            </Button>
          </div>
        </div>
      </div>
      <DocumentWorkbench />
    </section>
  );
}
