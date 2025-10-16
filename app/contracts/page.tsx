import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContractGenerator } from "@/components/contracts/contract-generator";

export const metadata = {
  title: "RWA Studio · Contract Generator",
  description: "Configure, preview, and deploy RWA contracts with viem and wagmi.",
};

const SNAPSHOT = [
  { label: "Network", value: "Ethereum Sepolia" },
  { label: "Last deploy", value: "Pending" },
  { label: "Audit status", value: "In review" },
];

export default function ContractsPage() {
  return (
    <section className="space-y-10">
      <div className="rounded-3xl border border-border/70 bg-card/90 px-6 py-7 shadow-lg backdrop-blur-sm md:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="rounded-full border-primary/40 text-primary">
              Workflow · Contract Generation
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Parameterize the on-chain issuance agreement
              </h1>
              <p className="mt-2 max-w-3xl text-base text-muted-foreground">
                Update key financial levers, generate a live Solidity preview, and handoff deployments to powered
                wallets without leaving the compliance pipeline.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                Status · Draft
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                Linked deal · ChainTech Q1
              </Badge>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-4">
              {SNAPSHOT.map((item) => (
                <div key={item.label} className="rounded-xl border border-border/60 bg-background/80 px-4 py-2 shadow-sm">
                  <p className="text-xs uppercase tracking-wide">{item.label}</p>
                  <p className="font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
            <Button className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 lg:w-auto">
              Sync with compliance notes
            </Button>
          </div>
        </div>
      </div>
      <ContractGenerator />
    </section>
  );
}
