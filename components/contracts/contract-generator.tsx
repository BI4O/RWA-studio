"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Code2, Rocket, ShieldCheck } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useWriteContract } from "wagmi";
import { polygonAmoy, baseSepolia, sepolia } from "wagmi/chains";
import { v4 as uuid } from "uuid";

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
  const [status, setStatus] = useState<DeploymentStatus>("idle");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const primaryConnector = connectors[0];


  const constructorArgs = useMemo(
    () => [assetName, BigInt(couponBps), BigInt(maxSupply), address ?? "0x0000000000000000000000000000000000000000"],
    [address, assetName, couponBps, maxSupply],
  );

  const contractSource = useMemo(() => {
    return DEFAULT_TEMPLATE.replace("Harborview Warehouse", assetName).replace("850", couponBps.toString()).replace(
      "1000000",
      maxSupply.toString(),
    );
  }, [assetName, couponBps, maxSupply]);

  const { writeContractAsync } = useWriteContract();

  const deployContract = useCallback(async () => {
    if (!isConnected) {
      throw new Error("Connect a wallet before deploying");
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
      "0x608060405234801561001057600080fd5b50604051610904380380610904833981016040818152825181835260008054600160a060020a0319163317905591506002556003556000600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16146100c257600080fd5b60008054600160a060020a0390811691161461010257600080fd5b600054600160a060020a031681565b600054600160a060020a0316331461014457600080fd5b60018054600160a060020a0319163317815561020b908190602001906100f9565b5050610273565b600081359050610223816102db565b92915050565b60006020828403121561023f57600080fd5b600061024d84828501610218565b91505092915050565b6020808252601b908201527f737562736372697074696f6e2072657175697265732076616c756500000000604082015260600190565b600060408201905061029a6000830184610218565b92915050565b60008151905091905056fea2646970667358221220a94251c1ee8ad0c8fa447879aa94c2952807645a2df1adb4a38ddca37a3248f64736f6c63430008170033";

    try {
      setStatus("submitting");
      const hash = await writeContractAsync({
        abi,
        bytecode,
        chainId: selectedChain,
        account: address,
        args: constructorArgs,
      });
      setTransactionHash(hash as string);
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }, [address, constructorArgs, isConnected, selectedChain, writeContractAsync]);

  const deploymentBadges = useMemo(
    () => [
      { label: "Wallet", value: address ?? "Not connected" },
      { label: "Network", value: CHAINS.find((chain) => chain.id === selectedChain)?.label ?? "Unknown" },
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
      { label: "Est. gas", value: "Connect wallet" },
    ],
    [address, selectedChain, status],
  );

  const governanceChecklist = useMemo(
    () => [
      "Investor onboarding: Verify KYC/AML workflow integrates with off-chain provider.",
      "Asset servicing: Confirm coupon calculations align with ${couponBps / 100}% APR.",
      "Reporting: Publish NAV statements to the monitoring dashboard weekly.",
      governanceNotes,
    ],
    [couponBps, governanceNotes],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Contract parameters</CardTitle>
            <CardDescription>Configure issuance economics before generating Solidity artifacts.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assetName">Asset name</Label>
              <Input id="assetName" value={assetName} onChange={(event) => setAssetName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon">Coupon (bps)</Label>
              <Input
                id="coupon"
                type="number"
                value={couponBps}
                onChange={(event) => setCouponBps(Number(event.target.value))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supply">Max supply (USD)</Label>
              <Input
                id="supply"
                type="number"
                value={maxSupply}
                onChange={(event) => setMaxSupply(Number(event.target.value))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chain">Target network</Label>
              <select
                id="chain"
                value={selectedChain}
                onChange={(event) => setSelectedChain(Number(event.target.value))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CHAINS.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="governance">Governance notes</Label>
              <Textarea
                id="governance"
                value={governanceNotes}
                onChange={(event) => setGovernanceNotes(event.target.value)}
                placeholder="Outline redemption windows, oracles, and contingency controls."
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Solidity preview</CardTitle>
              <CardDescription>Review the generated contract prior to deployment.</CardDescription>
            </div>
            <Code2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[360px] rounded-md border bg-muted/40 p-4 text-xs">
              <pre className="whitespace-pre-wrap">{contractSource}</pre>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(contractSource)}>
              Copy source
            </Button>
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify(constructorArgs))}>
              Copy constructor args
            </Button>
          </CardFooter>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Deployment</CardTitle>
            <CardDescription>Connect a wallet via wagmi and broadcast with viem under the hood.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <Button
                type="button"
                className="w-full"
                onClick={() => primaryConnector && connect({ connector: primaryConnector })}
                disabled={!primaryConnector || isConnecting}
              >
                {isConnecting ? "Connecting..." : primaryConnector ? `Connect ${primaryConnector.name}` : "No wallet available"}
              </Button>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={() => disconnect()}>
                Disconnect {address?.slice(0, 6)}…{address?.slice(-4)}
              </Button>
            )}
            {connectError && <p className="text-xs text-destructive">{connectError.message}</p>}
            <div className="flex flex-wrap gap-2">
              {deploymentBadges.map((badge) => (
                <Badge key={badge.label} variant="outline">
                  <span className="font-semibold">{badge.label}:</span> {badge.value}
                </Badge>
              ))}
            </div>
            <Separator />
            <Button
              type="button"
              className="w-full"
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
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Gas estimations leverage viem. Persist deployments to Neon through background jobs using the provided
              connection helpers.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Governance checklist</CardTitle>
              <CardDescription>Operational steps before going live.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {governanceChecklist.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center gap-3">
            <Rocket className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Post-deployment hooks</CardTitle>
              <CardDescription>Automations triggered on successful broadcast.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Use <code>recordDeployment</code> from <code>lib/db</code> to log deployments into Neon and surface analytics on
              the dashboard. The helper is SSR-friendly and caches connections using Neon&apos;s serverless driver.
            </p>
            <p>
              Webhooks can notify off-chain trustees, update collateral reports, and push to Chainlink Functions for oracle
              calibration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
