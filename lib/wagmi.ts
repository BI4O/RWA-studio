import { http, createConfig } from "wagmi";
import { baseSepolia, polygonAmoy, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [sepolia, baseSepolia, polygonAmoy],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
  ssr: true,
});
