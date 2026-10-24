import { createPublicClient, defineChain, http, type Address } from "viem";
import deployment from "./deployment.json";

export const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
export const EXPLORER_URL = "https://testnet.monadexplorer.com";

// Herkese açık RPC saniyede 15 istekle sınırlı; sınır aşılınca kısa bekleyip yeniden dener.
const limitedFetch: typeof fetch = async (input, init) => {
  for (let i = 0; ; i++) {
    const res = await fetch(input, init);
    const limited = res.status === 429 || (await res.clone().text()).includes("requests limited");
    if (!limited || i >= 8) return res;
    await new Promise((r) => setTimeout(r, 250 * (i + 1)));
  }
};
export const rpcTransport = () => http(RPC_URL, { fetchFn: limitedFetch });

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "Monad Explorer", url: EXPLORER_URL } },
  testnet: true,
});

export const CONTRACT_ADDRESS = deployment.address as Address;
export const DEPLOY_BLOCK = BigInt(deployment.deployBlock || 0);
export const isDeployed = CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: rpcTransport(),
});

export const txUrl = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const addressUrl = (addr: string) => `${EXPLORER_URL}/address/${addr}`;
