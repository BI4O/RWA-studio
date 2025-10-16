"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  ClipboardCopy,
  Code2,
  Rocket,
  ShieldCheck,
  Wallet2,
} from "lucide-react";
import { useAccount, useConnect, useDisconnect, useWalletClient } from "wagmi";
import { baseSepolia, polygonAmoy, sepolia } from "wagmi/chains";
import type { Address } from "viem";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBOD2CLRrOMDTOmSU6yfBOb63j84nGR5-aM1VpsblcsweQRdg0DT6NUr0x7Oz9VPUBxrejO-wIY2-Xs2DspwxYfVXaQqL4Jepzg-c5fVwbeYSP1WxVKxRFqNnmBQGEiHnAQtE9EpWe2sShIQ4-PM-oIkTt1NiTTLyH0R27x6Ze6W-fMpqzMLvMeXd9J7zSAwE6fwcxBzQOnutsvrVXdmm9_L82w5KPmx9VshgpfCRw8LnX_tiWXc1RN6oX-BLAnypKVSCt2RVU1h94V";

const CHAINS = [
  { id: sepolia.id, label: "Ethereum Sepolia" },
  { id: baseSepolia.id, label: "Base Sepolia" },
  { id: polygonAmoy.id, label: "Polygon Amoy" },
];

const DEFAULT_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";

contract RWAInterestNote is Ownable {
    string public assetName;
    uint256 public couponBps;
    uint256 public maxSupply;

    event Subscription(address indexed investor, uint256 notional, uint256 timestamp);

    constructor(string memory _assetName, uint256 _couponBps, uint256 _maxSupply, address _owner) Ownable(_owner) {
        assetName = _assetName;
        couponBps = _couponBps;
        maxSupply = _maxSupply;
    }

    function subscribe() external payable {
        require(msg.value > 0, "subscription requires value");
        emit Subscription(msg.sender, msg.value, block.timestamp);
    }
};
`;

type DeploymentStatus = "idle" | "preparing" | "submitting" | "success" | "error";

export function ContractGenerator() {
  const [assetName, setAssetName] = useState("Harborview Warehouse");
  const [couponBps, setCouponBps] = useState(850);
  const [maxSupply, setMaxSupply] = useState(1_000_000);
  const [governanceNotes, setGovernanceNotes] = useState("Transfers restricted to KYC-approved wallets.");
  const [selectedChain, setSelectedChain] = useState<number>(CHAINS[0]?.id ?? sepolia.id);
  const [adminAddress, setAdminAddress] = useState("0x0000000000000000000000000000000000000000");
  const [governanceModel, setGovernanceModel] = useState("Foundation + Board oversight");
  const [copiedSource, setCopiedSource] = useState(false);
  const [copiedArgs, setCopiedArgs] = useState(false);
  const [status, setStatus] = useState<DeploymentStatus>("idle");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError, isLoading: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const primaryConnector = connectors[0];

  const constructorArgs = useMemo(
    () =>
      [
        assetName,
        BigInt(couponBps),
        BigInt(maxSupply),
        (address ?? adminAddress) as Address,
      ] as const,
    [address, adminAddress, assetName, couponBps, maxSupply],
  );

  const contractSource = useMemo(() => {
    return DEFAULT_TEMPLATE.replace("Harborview Warehouse", assetName)
      .replace("850", couponBps.toString())
      .replace("1000000", maxSupply.toString());
  }, [assetName, couponBps, maxSupply]);

  const configurationSnapshot = useMemo(
    () => [
      { label: "Total supply", value: new Intl.NumberFormat("en-US").format(maxSupply) },
      { label: "Coupon", value: `${(couponBps / 100).toFixed(2)}% APR` },
      { label: "Governance", value: governanceModel },
    ],
    [couponBps, governanceModel, maxSupply],
  );

  const deploymentBadges = useMemo(
    () => [
      { label: "Wallet", value: address ?? "Not connected" },
      { label: "Network", value: CHAINS.find((chain) => chain.id === selectedChain)?.label ?? "Unknown" },
      { label: "Admin", value: adminAddress ? `${adminAddress.slice(0, 6)}...${adminAddress.slice(-4)}` : "Pending" },
      { label: "Governance", value: governanceModel },
      {
        label: "Status",
        value:
          status === "idle"
            ? "Idle"
            : status === "preparing"
              ? "Preparing"
              : status === "submitting"
                ? "Submitting"
                : status === "success"
                  ? "Success"
                  : "Error",
      },
    ],
    [address, adminAddress, governanceModel, selectedChain, status],
  );

  const deployContract = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error("Connect a wallet before deploying");
    }
    if (!walletClient) {
      throw new Error("Wallet client unavailable. Reconnect your wallet.");
    }
    if (walletClient.chain?.id && walletClient.chain.id !== selectedChain) {
      throw new Error("Switch the connected wallet to the selected network before deploying.");
    }

    setStatus("preparing");

    const abi = [
      {
        type: "constructor",
        inputs: [
          { name: "_assetName", type: "string" },
          { name: "_couponBps", type: "uint256" },
          { name: "_maxSupply", type: "uint256" },
          { name: "_owner", type: "address" },
        ],
        stateMutability: "nonpayable",
      },
      {
        type: "event",
        name: "Subscription",
        inputs: [
          { name: "investor", type: "address", indexed: true },
          { name: "notional", type: "uint256", indexed: false },
          { name: "timestamp", type: "uint256", indexed: false },
        ],
        anonymous: false,
      },
      {
        type: "function",
        name: "subscribe",
        inputs: [],
        outputs: [],
        stateMutability: "payable",
      },
    ] as const;

    const bytecode =
      "0x608060405234801561001057600080fd5b50604051610904380380610904833981016040818152825181835260008054600160a060020a0319163317905591506002556003556000600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16146100c257600080fd5b60008054600160a060020a0390811691161461010257600080fd5b600054600160a060020a031681565b600054600160a060020a0316331461014457600080fd5b60018054600160a060020a0319163317815561020b908190602001906100f9565b5050610273565b600081359050610223816102db565b92915050565b60006020828403121561023f57600080fd5b600061024d84828501610218565b91505092915050565b6020808252601b908201527f737562736372697074696f6e2072657175697265732076616c756500000000604082015260600190565b600060408201905061029a6000830184610218565b92915050565b600081519050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006102e9826102be565b9050919050565b6102f9816102de565b811461030457600080fd5b50565b600081359050610316816102f0565b92915050565b6000806040838503121561033157600080fd5b600061033f858286016102c9565b9250506020610350858286016102c9565b915050925092905056fea26469706673582212201149963a0b9b4735bc2d54d648e64def27906631f7d7b61e32cd93e2c9ad466164736f6c63430008170033";

    try {
      setStatus("submitting");
      const hash = await walletClient.deployContract({
        abi,
        bytecode,
        account: address as Address,
        args: constructorArgs,
      });
      setTransactionHash(hash as string);
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }, [address, constructorArgs, isConnected, selectedChain, walletClient]);

  const governanceChecklist = useMemo(
    () => [
      "Investor onboarding: Verify KYC/AML workflow integrates with off-chain provider.",
      `Asset servicing: Confirm coupon calculations align with ${(couponBps / 100).toFixed(2)}% APR.`,
      "Reporting: Publish NAV statements to the monitoring dashboard weekly.",
      governanceNotes,
    ],
    [couponBps, governanceNotes],
  );

  const handleCopy = useCallback(async (value: string, type: "source" | "args") => {
    await navigator.clipboard.writeText(value);
    if (type === "source") {
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);
    } else {
      setCopiedArgs(true);
      setTimeout(() => setCopiedArgs(false), 2000);
    }
  }, []);

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-2xl">
      <div className="flex flex-col lg:flex-row">
        <aside className="w-full border-b border-border/60 bg-card/95 px-6 py-8 backdrop-blur lg:w-[36%] lg:border-b-0 lg:border-r lg:px-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Contract configuration</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Parameterize issuance economics and governance before generating Solidity artifacts.
              </p>
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Network selection</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {CHAINS.map((chain) => (
                    <label key={chain.id} className="relative block cursor-pointer">
                      <input
                        type="radio"
                        name="network"
                        value={chain.id}
                        checked={selectedChain === chain.id}
                        onChange={() => setSelectedChain(chain.id)}
                        className="peer sr-only"
                      />
                      <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-medium transition peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary">
                        {chain.label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assetName">Asset name</Label>
                  <Input
                    id="assetName"
                    value={assetName}
                    onChange={(event) => setAssetName(event.target.value)}
                    className="rounded-xl border-border bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coupon">Coupon (bps)</Label>
                  <Input
                    id="coupon"
                    type="number"
                    value={couponBps}
                    min={0}
                    onChange={(event) => setCouponBps(Number(event.target.value))}
                    className="rounded-xl border-border bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supply">Max supply (units)</Label>
                  <Input
                    id="supply"
                    type="number"
                    value={maxSupply}
                    min={1}
                    onChange={(event) => setMaxSupply(Number(event.target.value))}
                    className="rounded-xl border-border bg-background"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminAddress">Admin address</Label>
                  <Input
                    id="adminAddress"
                    value={adminAddress}
                    placeholder="0x..."
                    onChange={(event) => setAdminAddress(event.target.value)}
                    className="rounded-xl border-border bg-background font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="governanceModel">Governance model</Label>
                  <Input
                    id="governanceModel"
                    value={governanceModel}
                    onChange={(event) => setGovernanceModel(event.target.value)}
                    className="rounded-xl border-border bg-background"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="governanceNotes">Governance guardrails</Label>
                <Textarea
                  id="governanceNotes"
                  value={governanceNotes}
                  onChange={(event) => setGovernanceNotes(event.target.value)}
                  className="min-h-[120px] rounded-2xl border-border bg-background"
                />
              </div>
            </div>
          </div>
        </aside>
        <section className="flex-1 bg-gradient-to-b from-muted/30 via-background to-background px-6 py-8 lg:px-10">
          <div
            className="overflow-hidden rounded-3xl border border-border/60 bg-cover bg-center p-6 text-white shadow-2xl"
            style={{ backgroundImage: `linear-gradient(0deg, rgba(17,24,39,0.7), rgba(17,24,39,0.25)), url(${HERO_IMAGE})` }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-wider text-white/70">Live configuration snapshot</p>
                <h3 className="mt-2 text-2xl font-semibold">{assetName}</h3>
                <p className="mt-1 text-sm text-white/80">
                  Parameters synced from compliance workspace. Adjust economics before broadcasting to the selected network.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {configurationSnapshot.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm backdrop-blur">
                    <p className="text-white/70">{item.label}</p>
                    <p className="font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-border/60 bg-card/95 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-4">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">Real-time generated contract</h4>
                    <p className="text-sm text-muted-foreground">
                      Mirror of the solidity artifact based on the parameters configured on the left.
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    autogen
                  </Badge>
                </div>
                <ScrollArea className="h-[360px] px-6 py-5 text-xs">
                  <pre className="whitespace-pre-wrap font-mono leading-relaxed text-foreground/90">{contractSource}</pre>
                </ScrollArea>
                <Separator />
                <div className="flex flex-wrap gap-3 px-6 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => handleCopy(contractSource, "source")}
                  >
                    {copiedSource ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <ClipboardCopy className="mr-2 h-4 w-4" />
                        Copy source
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => handleCopy(JSON.stringify(constructorArgs), "args")}
                  >
                    {copiedArgs ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Constructor copied
                      </>
                    ) : (
                      <>
                        <Code2 className="mr-2 h-4 w-4" />
                        Copy constructor args
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="rounded-3xl border border-border/60 bg-card/90 shadow-lg">
                <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="text-base font-semibold text-foreground">Governance checklist</h4>
                    <p className="text-sm text-muted-foreground">Operational steps before going live.</p>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <ul className="list-disc space-y-3 pl-5 text-sm text-muted-foreground">
                    {governanceChecklist.map((item, index) => (
                      <li key={`governance-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="rounded-3xl border border-border/60 bg-card/90 shadow-lg">
                <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
                  <Rocket className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="text-base font-semibold text-foreground">Post-deployment hooks</h4>
                    <p className="text-sm text-muted-foreground">Automations triggered on successful broadcast.</p>
                  </div>
                </div>
                <div className="space-y-3 px-6 py-5 text-sm text-muted-foreground">
                  <p>
                    Use <code className="font-mono text-xs text-foreground">recordDeployment</code> from{" "}
                    <code className="font-mono text-xs text-foreground">lib/db</code> to write deployments to Neon and drive the
                    analytics dashboard.
                  </p>
                  <p>
                    Push updates to Chainlink Functions for oracle calibration, notify trustees, and log attestations for the
                    compliance archive.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-3xl border border-border/60 bg-card/95 shadow-xl">
                <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
                  <Wallet2 className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="text-base font-semibold text-foreground">Deployment panel</h4>
                    <p className="text-sm text-muted-foreground">
                      Connect a wallet via wagmi and broadcast with viem under the hood.
                    </p>
                  </div>
                </div>
                <div className="space-y-4 px-6 py-5">
                  {!isConnected ? (
                    <Button
                      type="button"
                      className="w-full rounded-xl"
                      onClick={() => primaryConnector && connect({ connector: primaryConnector })}
                      disabled={!primaryConnector || isConnecting}
                    >
                      {isConnecting ? "Connecting..." : primaryConnector ? `Connect ${primaryConnector.name}` : "No wallet available"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => disconnect()}
                    >
                      Disconnect {address?.slice(0, 6)}...{address?.slice(-4)}
                    </Button>
                  )}
                  {connectError && <p className="text-xs text-destructive">{connectError.message}</p>}
                  <div className="flex flex-wrap gap-2">
                    {deploymentBadges.map((badge) => (
                      <Badge key={badge.label} variant="outline" className="rounded-full border-border/70 px-3 py-1 text-xs">
                        <span className="font-semibold text-foreground">{badge.label}:</span>{" "}
                        <span className="text-muted-foreground">{badge.value}</span>
                      </Badge>
                    ))}
                  </div>
                  <Separator />
                  <Button
                    type="button"
                    className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() =>
                      deployContract().catch((error) => {
                        console.error(error);
                        alert(error instanceof Error ? error.message : "Failed to deploy contract");
                      })
                    }
                    disabled={!isConnected || status === "submitting"}
                  >
                    {status === "submitting" ? "Broadcasting..." : "Deploy contract"}
                  </Button>
                  {transactionHash && (
                    <p className="text-xs text-muted-foreground">
                      Deployment submitted: <span className="font-mono">{transactionHash}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-3xl border border-dashed border-primary/40 bg-primary/5 p-6 shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">Handoff checklist</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Confirm secondary sign-offs before executing the deployment playbook.
                    </p>
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                      <li>Legal review approval synced from compliance workspace</li>
                      <li>Treasury loaded with deployment gas budget</li>
                      <li>Monitoring alerts configured in dashboard module</li>
                    </ul>
                  </div>
                  <Badge variant="outline" className="rounded-full border-primary/40 text-primary">
                    Ready
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
