"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createWalletClient, custom, type Address, type Hash, type TransactionReceipt } from "viem";
import { commonFundAbi } from "./abi";
import { CONTRACT_ADDRESS, RPC_URL, isDeployed, monadTestnet, publicClient } from "./chain";
import { friendlyError } from "./errors";

type Eip1193 = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

const CHAIN_HEX = "0x" + monadTestnet.id.toString(16);

export type SendArgs = {
  functionName: string;
  args: readonly unknown[];
  value?: bigint;
};

type WalletState = {
  account?: Address;
  hasWallet: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  send: (a: SendArgs) => Promise<{ hash: Hash; receipt: TransactionReceipt }>;
};

const Ctx = createContext<WalletState | null>(null);

async function ensureChain(eth: Eip1193) {
  const current = (await eth.request({ method: "eth_chainId" })) as string;
  if (current?.toLowerCase() === CHAIN_HEX) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code;
    if (code === 4902 || code === -32603) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_HEX,
            chainName: "Monad Testnet",
            nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: [monadTestnet.blockExplorers.default.url],
          },
        ],
      });
    } else {
      throw e;
    }
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Address | undefined>();
  const [hasWallet, setHasWallet] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const eth = window.ethereum;
    setHasWallet(!!eth);
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((a) => {
      const list = a as Address[];
      if (list?.length) setAccount(list[0]);
    });
    const onAccounts = (a: Address[]) => setAccount(a?.[0]);
    eth.on?.("accountsChanged", onAccounts);
    return () => eth.removeListener?.("accountsChanged", onAccounts);
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) throw new Error("Tarayıcında cüzdan bulunamadı. MetaMask gibi bir cüzdan kurup sayfayı yenile.");
    setConnecting(true);
    try {
      const list = (await eth.request({ method: "eth_requestAccounts" })) as Address[];
      setAccount(list[0]);
      await ensureChain(eth);
    } catch (e) {
      throw new Error(friendlyError(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const send = useCallback(
    async ({ functionName, args, value }: SendArgs) => {
      const eth = window.ethereum;
      if (!eth) throw new Error("Tarayıcında cüzdan bulunamadı. MetaMask gibi bir cüzdan kurup sayfayı yenile.");
      if (!isDeployed) throw new Error("Kasa sözleşmesi henüz kurulmadı. README'deki kurulum adımlarını izle.");
      try {
        let from = account;
        if (!from) {
          const list = (await eth.request({ method: "eth_requestAccounts" })) as Address[];
          from = list[0];
          setAccount(from);
        }
        await ensureChain(eth);
        const wallet = createWalletClient({ account: from, chain: monadTestnet, transport: custom(eth as any) });
        const params = {
          address: CONTRACT_ADDRESS,
          abi: commonFundAbi,
          functionName: functionName as any,
          args: args as any,
          value,
          account: from,
        } as any;
        const { request } = await publicClient.simulateContract(params);
        // Kura kazanana göre döngü uzunluğu değişir; tahmin tutmayabilir, pay bırak.
        const gas = ((await publicClient.estimateContractGas(params)) * 3n) / 2n;
        const hash = await wallet.writeContract({ ...request, gas } as any);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("İşlem zincirde başarısız oldu. Tekrar dene.");
        return { hash, receipt };
      } catch (e) {
        throw new Error(friendlyError(e));
      }
    },
    [account],
  );

  const value = useMemo(() => ({ account, hasWallet, connecting, connect, send }), [account, hasWallet, connecting, connect, send]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet, WalletProvider içinde kullanılmalı.");
  return v;
}
