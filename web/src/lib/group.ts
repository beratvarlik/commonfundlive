import { getAbiItem, type Address, type Hash } from "viem";
import { commonFundAbi } from "./abi";
import { CONTRACT_ADDRESS, publicClient } from "./chain";

export enum Kind {
  Created = 0,
  Joined = 1,
  Started = 2,
  Paid = 3,
  Excuse = 4,
  Flagged = 5,
  Extension = 6,
  Slashed = 7,
  AutoSlashed = 8,
  Draw = 9,
  TopUp = 10,
  Withdraw = 11,
}

export enum Status {
  Forming = 0,
  Active = 1,
  Completed = 2,
}

export type GroupInfo = {
  id: bigint;
  name: string;
  creator: Address;
  size: number;
  installment: bigint;
  collateral: bigint;
  payWindow: number;
  period: number;
  maxExtension: number;
  status: Status;
  round: number;
  roundStart: number;
  deadline: number;
  pot: bigint;
  paidCount: number;
  members: Address[];
};

export type MemberInfo = {
  account: Address;
  nickname: string;
  received: boolean;
  receivedRound: number;
  lateCount: number;
  withdrawn: boolean;
  collateralLeft: bigint;
  paid: boolean;
  covered: boolean;
  excuse: boolean;
  decided: boolean;
  flagged: boolean;
  extendedUntil: number;
};

export type ActivityInfo = {
  index: number;
  kind: Kind;
  actor: Address;
  subject: Address;
  amount: bigint;
  time: number;
  blockNumber: bigint;
  text: string;
  txHash?: Hash;
};

export type GroupData = {
  group: GroupInfo;
  members: MemberInfo[];
  activities: ActivityInfo[];
  activityTotal: number;
  muhtar: Address;
  bekci: Address;
};

const base = { address: CONTRACT_ADDRESS, abi: commonFundAbi } as const;

export async function fetchGroup(id: bigint, activityLimit = 40): Promise<GroupData | null> {
  const [g, ms, total, acts, muhtar, bekci] = await Promise.all([
    publicClient.readContract({ ...base, functionName: "getGroup", args: [id] }),
    publicClient.readContract({ ...base, functionName: "getMembers", args: [id] }),
    publicClient.readContract({ ...base, functionName: "activityCount", args: [id] }),
    publicClient.readContract({ ...base, functionName: "getRecentActivities", args: [id, BigInt(activityLimit)] }),
    publicClient.readContract({ ...base, functionName: "muhtar" }),
    publicClient.readContract({ ...base, functionName: "bekci" }),
  ]);
  if (g.size === 0) return null;

  const group: GroupInfo = {
    id: g.id,
    name: g.name,
    creator: g.creator,
    size: Number(g.size),
    installment: g.installment,
    collateral: g.collateral,
    payWindow: Number(g.payWindow),
    period: Number(g.period),
    maxExtension: Number(g.maxExtension),
    status: Number(g.status) as Status,
    round: Number(g.round),
    roundStart: Number(g.roundStart),
    deadline: Number(g.deadline),
    pot: g.pot,
    paidCount: Number(g.paidCount),
    members: [...g.members],
  };

  const members: MemberInfo[] = ms.map((m) => ({
    account: m.account,
    nickname: m.nickname,
    received: m.received,
    receivedRound: Number(m.receivedRound),
    lateCount: Number(m.lateCount),
    withdrawn: m.withdrawn,
    collateralLeft: m.collateralLeft,
    paid: m.paid,
    covered: m.covered,
    excuse: m.excuse,
    decided: m.decided,
    flagged: m.flagged,
    extendedUntil: Number(m.extendedUntil),
  }));

  const totalN = Number(total);
  const activities: ActivityInfo[] = acts.map((a, i) => ({
    index: totalN - 1 - i,
    kind: Number(a.kind) as Kind,
    actor: a.actor,
    subject: a.subject,
    amount: a.amount,
    time: Number(a.time),
    blockNumber: a.blockNumber,
    text: a.text,
  }));

  return { group, members, activities, activityTotal: totalN, muhtar, bekci };
}

const activityEvent = getAbiItem({ abi: commonFundAbi, name: "ActivityLogged" });

/** Her etkinliğin işlem kaydını (tx hash) bulur. Etkinliğin blok numarası zincirde saklandığı için
 *  yalnızca o bloklar sorgulanır; geniş blok aralığı taraması gerekmez. */
export async function attachTxHashes(id: bigint, list: ActivityInfo[], known: Map<number, Hash>): Promise<Map<number, Hash>> {
  const result = new Map(known);
  const blocks = Array.from(new Set(list.filter((a) => !result.has(a.index)).map((a) => a.blockNumber)));
  await Promise.all(
    blocks.map(async (bn) => {
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: activityEvent,
          args: { groupId: id },
          fromBlock: bn,
          toBlock: bn,
        });
        for (const l of logs) {
          if (l.args.index !== undefined && l.transactionHash) result.set(Number(l.args.index), l.transactionHash);
        }
      } catch {
        // Kayıt bağlantısı bulunamazsa satır bağlantısız gösterilir.
      }
    }),
  );
  return result;
}

export async function fetchUserGroups(user: Address): Promise<bigint[]> {
  const ids = await publicClient.readContract({ ...base, functionName: "groupsOf", args: [user] });
  return [...ids];
}

export function nameOf(members: MemberInfo[], addr?: string): string {
  if (!addr) return "";
  const m = members.find((x) => x.account.toLowerCase() === addr.toLowerCase());
  return m ? m.nickname : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function sameAddr(a?: string, b?: string) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}
