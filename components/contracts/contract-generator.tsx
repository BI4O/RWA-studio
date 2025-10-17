"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Check, ClipboardCopy } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useWalletClient } from "wagmi";
import { baseSepolia, polygonAmoy, sepolia } from "wagmi/chains";
import { CodeHighlighter } from "@/components/ui/code-highlighter";
import type { Address } from "viem";

const CHAINS = [
  { id: sepolia.id, label: "Ethereum Sepolia" },
  { id: baseSepolia.id, label: "BSC Testnet" },
  { id: polygonAmoy.id, label: "Avalanche Fuji" },
];

const RISK_PROVIDERS = [
  { id: "chainalysis", label: "Chainalysis" },
  { id: "elliptic", label: "Elliptic" },
  { id: "trm", label: "TRM Labs" },
];

const DEFAULT_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

/// @notice ERC20 + EIP7943 RWA Token Contract (with UI interaction annotations)
contract {{CONTRACT_NAME}} is ERC20, AccessControlEnumerable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ENFORCER_ROLE = keccak256("ENFORCER_ROLE");
    
    mapping(address => bool) public whitelisted;
    mapping(address => uint256) public frozen;
    
    bool public whitelistEnabled;
    bool public freezeEnabled;
    bool public forceTransferEnabled;

    /**
     * Constructor parameters (corresponding to UI configuration items):
     * 1️⃣ Token Name
     * 2️⃣ Symbol
     * 3️⃣ Initial Supply
     * 4️⃣ Decimals (not used in constructor, inherited from ERC20)
     * 5️⃣ Owner/Admin Address
     * 6️⃣ Enforcer Role Address
     * 7️⃣ Minter Role Address
     * 8️⃣ Whitelist Mode
     * 9️⃣ Default Whitelisted Addresses
     * 🔟 Freeze Control
     * 11️⃣ Force Transfer Control
     */
    constructor(
        string memory name_,           // 1️⃣
        string memory symbol_,         // 2️⃣
        uint256 initialSupply_,        // 3️⃣
        address admin_,                // 5️⃣
        address enforcer_,             // 6️⃣
        address minter_,               // 7️⃣
        bool whitelistMode_,           // 8️⃣
        address[] memory defaultWL_,   // 9️⃣
        bool freezeCtrl_,              // 🔟
        bool forceCtrl_                // 11️⃣
    ) ERC20(name_, symbol_) {
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
        _setupRole(MINTER_ROLE, minter_);
        _setupRole(ENFORCER_ROLE, enforcer_);
        
        _mint(admin_, initialSupply_ * (10 ** {{DECIMALS}}));
        
        whitelistEnabled = whitelistMode_;
        freezeEnabled = freezeCtrl_;
        forceTransferEnabled = forceCtrl_;
        
        // Initialize default whitelist
        for (uint i = 0; i < defaultWL_.length; i++) {
            whitelisted[defaultWL_[i]] = true;
        }
    }

    /// @notice Override transfer restrictions based on whitelist mode
    function _beforeTokenTransfer(
        address from, 
        address to, 
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
        
        // 8️⃣ If whitelist mode is enabled, restrict transfers to whitelisted addresses only
        if (whitelistEnabled && from != address(0) && to != address(0)) {
            require(whitelisted[from] && whitelisted[to], "Address not whitelisted");
        }
        
        // 🔟 Check frozen balance if freeze control is enabled
        if (freezeEnabled && from != address(0)) {
            uint256 bal = balanceOf(from);
            uint256 available = bal > frozen[from] ? bal - frozen[from] : 0;
            require(amount <= available, "Insufficient unfrozen balance");
        }
    }

    /// @notice 🔟 Enforcer can freeze user assets
    function setFrozen(address user, uint256 amount) external onlyRole(ENFORCER_ROLE) {
        require(freezeEnabled, "Freeze control disabled");
        frozen[user] = amount;
    }

    /// @notice 11️⃣ Enforcer can force transfer (regulatory requirement)
    function forceTransfer(
        address from, 
        address to, 
        uint256 amount
    ) external onlyRole(ENFORCER_ROLE) {
        require(forceTransferEnabled, "Force transfer disabled");
        _transfer(from, to, amount);
    }

    /// @notice 9️⃣ Admin can manage whitelist
    function setWhitelist(address user, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelisted[user] = allowed;
    }

    /// @notice 7️⃣ Minter can mint new tokens
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// @notice Admin can enable/disable whitelist mode
    function setWhitelistEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelistEnabled = enabled;
    }

    /// @notice Admin can enable/disable freeze control
    function setFreezeEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        freezeEnabled = enabled;
    }

    /// @notice Admin can enable/disable force transfer
    function setForceTransferEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        forceTransferEnabled = enabled;
    }
}`;

type DeploymentStatus = "idle" | "preparing" | "submitting" | "success" | "error";

export function ContractGenerator() {
  const [mounted, setMounted] = useState(false);
  const [tokenName, setTokenName] = useState("XAU Gold Token");
  const [symbol, setSymbol] = useState("XAU");
  const [initialSupply, setInitialSupply] = useState(1_000_000);
  const [decimals, setDecimals] = useState(18);
  const [ownerAddress, setOwnerAddress] = useState("0x0000000000000000000000000000000000000000");
  const [enforcerAddress, setEnforcerAddress] = useState("0x0000000000000000000000000000000000000000");
  const [minterAddress, setMinterAddress] = useState("0x0000000000000000000000000000000000000000");
  const [whitelistMode, setWhitelistMode] = useState(false);
  const [defaultWhitelisted, setDefaultWhitelisted] = useState("");
  const [freezeControl, setFreezeControl] = useState(false);
  const [forceTransferControl, setForceTransferControl] = useState(false);
  const [selectedChain, setSelectedChain] = useState<number>(CHAINS[0]?.id ?? sepolia.id);
  const [selectedRiskProvider, setSelectedRiskProvider] = useState(RISK_PROVIDERS[0]?.id ?? "chainalysis");
  const [copiedCode, setCopiedCode] = useState(false);
  const [status, setStatus] = useState<DeploymentStatus>("idle");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [highlightedSections, setHighlightedSections] = useState<string[]>([]);

  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError, isLoading: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();

  // Fix hydration error by ensuring component only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const contractSource = useMemo(() => {
    return DEFAULT_TEMPLATE
      .replace(/{{CONTRACT_NAME}}/g, `${symbol}_RWA_Token`)
      .replace(/{{DECIMALS}}/g, decimals.toString())
      .replace(/400">/g, '>')
      .replace(/\d+">/g, '>'); // Remove all "number"> patterns
  }, [symbol, decimals]);

  // Function to trigger highlight when parameter changes
  const highlightChange = useCallback((section: string) => {
    setHighlightedSections([section]);
    // Clear highlight after 3 seconds
    setTimeout(() => setHighlightedSections([]), 3000);
  }, []);

  // Track parameter changes and trigger highlights
  useEffect(() => {
    highlightChange(`${symbol}_RWA_Token`);
  }, [symbol, highlightChange]);

  useEffect(() => {
    highlightChange(`10 ** ${decimals}`);
  }, [decimals, highlightChange]);

  useEffect(() => {
    if (whitelistMode) {
      highlightChange("whitelistEnabled");
    }
  }, [whitelistMode, highlightChange]);

  useEffect(() => {
    if (freezeControl) {
      highlightChange("freezeEnabled");
    }
  }, [freezeControl, highlightChange]);

  useEffect(() => {
    if (forceTransferControl) {
      highlightChange("forceTransferEnabled");
    }
  }, [forceTransferControl, highlightChange]);

  const handleCopy = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, []);

  const deployContract = useCallback(async () => {
    try {
      setStatus("preparing");
      
      // TODO: This is where actual deployment logic will be implemented
      // When you provide the account, we'll add the real deployment logic here
      console.log("Deploying contract with parameters:", {
        tokenName,
        symbol,
        initialSupply,
        decimals,
        ownerAddress: address ?? ownerAddress,
        enforcerAddress,
        minterAddress,
        whitelistMode,
        defaultWhitelisted: defaultWhitelisted.split(",").map(addr => addr.trim()).filter(addr => addr.length > 0),
        freezeControl,
        forceTransferControl,
        selectedChain,
        selectedRiskProvider
      });

      setStatus("submitting");
      
      // Simulate deployment process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setStatus("success");
      setTransactionHash("0x1234567890abcdef1234567890abcdef12345678");
    } catch (error) {
      console.error("Deployment failed:", error);
      setStatus("error");
    }
  }, [
    tokenName,
    symbol,
    initialSupply,
    decimals,
    address,
    ownerAddress,
    enforcerAddress,
    minterAddress,
    whitelistMode,
    defaultWhitelisted,
    freezeControl,
    forceTransferControl,
    selectedChain,
    selectedRiskProvider
  ]);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-2xl h-[calc(100vh-120px)]">
      <div className="flex flex-col lg:flex-row h-full">
        <aside className="w-full border-b border-border/60 bg-card/95 px-4 py-4 backdrop-blur lg:w-[34%] lg:border-b-0 lg:border-r lg:px-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Contract configuration</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Configure RWA token parameters before generating smart contract code.
              </p>
            </div>
            <div className="space-y-3">
              {/* Network and Risk Provider moved to top */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Select Network</Label>
                  <select
                    value={selectedChain}
                    onChange={(event) => setSelectedChain(Number(event.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                  >
                    {CHAINS.map((chain) => (
                      <option key={chain.id} value={chain.id}>
                        {chain.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Risk Provider</Label>
                  <select
                    value={selectedRiskProvider}
                    onChange={(event) => setSelectedRiskProvider(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                  >
                    {RISK_PROVIDERS.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-border/20 pt-2">
                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="tokenName" className="text-xs">Token Name</Label>
                      <Input
                        id="tokenName"
                        value={tokenName}
                        placeholder="e.g. XAU Gold Token"
                        onChange={(event) => setTokenName(event.target.value)}
                        className="rounded-lg border-border bg-background h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="symbol" className="text-xs">Symbol</Label>
                      <Input
                        id="symbol"
                        value={symbol}
                        placeholder="e.g. XAU"
                        onChange={(event) => setSymbol(event.target.value)}
                        className="rounded-lg border-border bg-background h-7 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="initialSupply" className="text-xs">Initial Supply</Label>
                      <Input
                        id="initialSupply"
                        type="number"
                        value={initialSupply}
                        min={1}
                        onChange={(event) => setInitialSupply(Number(event.target.value))}
                        className="rounded-lg border-border bg-background h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="decimals" className="text-xs">Decimals</Label>
                      <Input
                        id="decimals"
                        type="number"
                        value={decimals}
                        min={0}
                        max={18}
                        onChange={(event) => setDecimals(Number(event.target.value))}
                        className="rounded-lg border-border bg-background h-7 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ownerAddress" className="text-xs">Owner / Admin Address</Label>
                    <Input
                      id="ownerAddress"
                      value={ownerAddress}
                      placeholder="0x..."
                      onChange={(event) => setOwnerAddress(event.target.value)}
                      className="rounded-lg border-border bg-background font-mono text-xs h-7"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="enforcerAddress" className="text-xs">Enforcer Role</Label>
                    <Input
                      id="enforcerAddress"
                      value={enforcerAddress}
                      placeholder="0x..."
                      onChange={(event) => setEnforcerAddress(event.target.value)}
                      className="rounded-lg border-border bg-background font-mono text-xs h-7"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="minterAddress" className="text-xs">Minter Role</Label>
                    <Input
                      id="minterAddress"
                      value={minterAddress}
                      placeholder="0x..."
                      onChange={(event) => setMinterAddress(event.target.value)}
                      className="rounded-lg border-border bg-background font-mono text-xs h-7"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="whitelistMode"
                          checked={whitelistMode}
                          onChange={(event) => setWhitelistMode(event.target.checked)}
                          className="rounded border-border"
                        />
                        <Label htmlFor="whitelistMode" className="text-xs">Whitelist</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="freezeControl"
                          checked={freezeControl}
                          onChange={(event) => setFreezeControl(event.target.checked)}
                          className="rounded border-border"
                        />
                        <Label htmlFor="freezeControl" className="text-xs">Freeze</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="forceTransferControl"
                          checked={forceTransferControl}
                          onChange={(event) => setForceTransferControl(event.target.checked)}
                          className="rounded border-border"
                        />
                        <Label htmlFor="forceTransferControl" className="text-xs">Force Transfer</Label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="defaultWhitelisted" className="text-xs">Default Whitelisted Addresses</Label>
                    <Textarea
                      id="defaultWhitelisted"
                      value={defaultWhitelisted}
                      placeholder="0x..., 0x..., 0x..."
                      onChange={(event) => setDefaultWhitelisted(event.target.value)}
                      className="min-h-[40px] rounded-lg border-border bg-background font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
        
        <section className="flex-1 bg-gradient-to-b from-muted/30 via-background to-background px-4 py-4 lg:px-6 flex flex-col min-h-0">
          <div className="rounded-3xl border border-border/60 bg-card/95 shadow-xl flex-1 flex flex-col min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-3">
              <div>
                <h4 className="text-base font-semibold text-foreground">Real-time generated contract</h4>
                <p className="text-sm text-muted-foreground">
                  Smart contract code generated based on your configuration parameters.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => handleCopy(contractSource)}
              >
                {copiedCode ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy code
                  </>
                )}
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-4 py-3">
                <CodeHighlighter 
                  code={contractSource} 
                  highlightedSections={highlightedSections}
                  className="text-foreground/90 text-xs font-mono"
                />
              </ScrollArea>
            </div>
            <div className="border-t border-border/60 px-6 py-3">
              <Button
                type="button"
                className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={deployContract}
                disabled={status === "submitting" || status === "preparing"}
              >
                {status === "preparing" ? "Preparing..." : 
                 status === "submitting" ? "Deploying..." : 
                 status === "success" ? "Deploy Another Contract" :
                 status === "error" ? "Retry Deployment" :
                 "Deploy Contract"}
              </Button>
              {transactionHash && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Deployment submitted: <span className="font-mono">{transactionHash}</span>
                </p>
              )}
              {status === "error" && (
                <p className="mt-2 text-xs text-destructive">
                  Deployment failed. Please check your configuration and try again.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}