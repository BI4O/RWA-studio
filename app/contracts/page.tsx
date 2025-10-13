import { ContractGenerator } from "@/components/contracts/contract-generator";

export const metadata = {
  title: "RWA Studio — Contract Generator",
  description: "Configure, preview, and deploy RWA contracts with viem and wagmi.",
};

export default function ContractsPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-3xl font-semibold">Contract automation</h2>
        <p className="text-muted-foreground">
          Generate opinionated Solidity blueprints, validate governance requirements, and deploy to your preferred
          testnet using wagmi with viem transports.
        </p>
      </header>
      <ContractGenerator />
    </section>
  );
}
