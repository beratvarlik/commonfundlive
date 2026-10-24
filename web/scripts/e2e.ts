// Uçtan uca deneme: Monad testnet üzerinde canlı sözleşmeyle tam bir grup döngüsü.
// Çalıştır: cd web && node scripts/e2e.ts
// Anahtarlar yalnızca web/.env.local ve contracts/.env dosyalarından okunur, hiçbir yere yazdırılmaz.
import fs from "node:fs";
import path from "node:path";
import {
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  defineChain,
  formatEther,
  http,
  parseEther,
  parseEventLogs,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { commonFundAbi } from "../src/lib/abi.ts";

const root = path.resolve(import.meta.dirname, "..", "..");
const deployment = JSON.parse(fs.readFileSync(path.join(root, "web", "src", "lib", "deployment.json"), "utf8"));
const CONTRACT = deployment.address as Address;

function readEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const webEnv = readEnv(path.join(root, "web", ".env.local"));
const conEnv = readEnv(path.join(root, "contracts", ".env"));
const hex = (k: string) => (k.startsWith("0x") ? k : `0x${k}`) as `0x${string}`;

const RPC = webEnv.NEXT_PUBLIC_MONAD_RPC_URL || conEnv.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
// Herkese açık RPC saniyede 15 istekle sınırlı; sınır aşılınca biraz bekleyip yeniden dene.
const limitedFetch: typeof fetch = async (url, init) => {
  for (let i = 0; ; i++) {
    const res = await fetch(url, init);
    const limited = res.status === 429 || (await res.clone().text()).includes("requests limited");
    if (!limited || i >= 12) return res;
    await new Promise((r) => setTimeout(r, 300 * (i + 1)));
  }
};
const chain = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});
const pub = createPublicClient({ chain, transport: http(RPC, { retryCount: 8, retryDelay: 500, fetchFn: limitedFetch }) });

const NAMES = ["Sen", "Ayse", "Mert", "Zeynep", "Can"] as const;
type Name = (typeof NAMES)[number];
const people = Object.fromEntries(
  NAMES.map((n, i) => [n, privateKeyToAccount(hex(webEnv[`DEMO_KEY_${i + 1}`]))]),
) as Record<Name, ReturnType<typeof privateKeyToAccount>>;
const muhtar = privateKeyToAccount(hex(webEnv.MUHTAR_PRIVATE_KEY));
const bekci = privateKeyToAccount(hex(webEnv.BEKCI_PRIVATE_KEY));
const deployer = privateKeyToAccount(hex(conEnv.DEPLOYER_PRIVATE_KEY));
type Acct = ReturnType<typeof privateKeyToAccount>;

const INSTALLMENT = parseEther("1");
const COLLATERAL = parseEther("2");
const PAY_WINDOW = 45; // 90 sn'lik turun son ödeme süresi
const PERIOD = 90;
const MAX_EXT = 30;
const MIN_BALANCE = parseEther("9");

// ---------------------------------------------------------------------------
// Rapor
// ---------------------------------------------------------------------------

const results: { name: string; ok: boolean; detail: string }[] = [];
class Fatal extends Error {}

async function step(name: string, fn: () => Promise<string | void>, fatal = false) {
  try {
    const detail = (await fn()) || "";
    results.push({ name, ok: true, detail });
    console.log(`  GEÇTİ  ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (e) {
    const detail = ((e as Error).message || String(e)).split("\n")[0];
    results.push({ name, ok: false, detail });
    console.log(`  KALDI  ${name} — ${detail}`);
    if (fatal) throw new Fatal(name);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

// ---------------------------------------------------------------------------
// Zincir yardımcıları
// ---------------------------------------------------------------------------

async function call(who: Acct, functionName: string, args: unknown[] = [], value = 0n) {
  const params = {
    account: who,
    address: CONTRACT,
    abi: commonFundAbi,
    functionName: functionName as never,
    args: args as never,
    value,
  } as never;
  const { request } = await pub.simulateContract(params);
  const gas = ((await pub.estimateContractGas(params)) * 3n) / 2n; // kura kazanana göre uzar, pay bırak
  const wallet = createWalletClient({ account: who, chain, transport: http(RPC, { retryCount: 8, retryDelay: 500, fetchFn: limitedFetch }) });
  const hash = await wallet.writeContract({ ...request, gas } as never);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${functionName} işlemi başarısız (${hash})`);
  return receipt;
}

async function expectRevert(who: Acct, functionName: string, args: unknown[], errorName: string, value = 0n) {
  try {
    await pub.simulateContract({
      account: who,
      address: CONTRACT,
      abi: commonFundAbi,
      functionName: functionName as never,
      args: args as never,
      value,
    } as never);
  } catch (e) {
    const err = (e as { walk?: (fn: (x: unknown) => boolean) => unknown }).walk?.(
      (x) => x instanceof ContractFunctionRevertedError,
    ) as ContractFunctionRevertedError | undefined;
    const got = err?.data?.errorName ?? err?.reason ?? (e as Error).message.split("\n")[0];
    assert(got === errorName, `${errorName} bekleniyordu, ${got} geldi`);
    return `${errorName} ile reddedildi`;
  }
  throw new Error(`${functionName} reddedilmeliydi (${errorName}) ama geçti`);
}

const bal = (a: Address) => pub.getBalance({ address: a });
const mon = (v: bigint) => `${formatEther(v)} MON`;

async function chainNow(): Promise<number> {
  return Number((await pub.getBlock({ blockTag: "latest" })).timestamp);
}

async function waitUntilAfter(ts: number, label: string) {
  const left = ts + 2 - (await chainNow());
  if (left > 0) console.log(`  ...  ${label}: zincir saati için ~${left} sn bekleniyor`);
  while ((await chainNow()) < ts + 2) await new Promise((r) => setTimeout(r, 2000));
}

let gid = 0n;
// uint64 alanlar viem'de bigint gelir; saniye alanlarını sayıya çevir.
const group = async () => {
  const g = await pub.readContract({ address: CONTRACT, abi: commonFundAbi, functionName: "getGroup", args: [gid] });
  return {
    ...g,
    payWindow: Number(g.payWindow),
    period: Number(g.period),
    maxExtension: Number(g.maxExtension),
    roundStart: Number(g.roundStart),
    deadline: Number(g.deadline),
    paidCount: Number(g.paidCount),
  };
};
const members = async () => {
  const list = await pub.readContract({ address: CONTRACT, abi: commonFundAbi, functionName: "getMembers", args: [gid] });
  const by = new Map(list.map((m) => [m.account.toLowerCase(), { ...m, extendedUntil: Number(m.extendedUntil) }]));
  return (n: Name) => by.get(people[n].address.toLowerCase())!;
};

async function payAll(who: Name[], note = "") {
  for (const n of who) await call(people[n], "payInstallment", [gid], INSTALLMENT);
  return note;
}

/** Kura: kimin çağırdığı önemli değil; Bekçi cüzdanı çağırır, kazananın bakiye farkı havuza eşit olmalı. */
async function drawAndCheck(round: number) {
  const g0 = await group();
  assert(g0.round === round, `tur ${round} bekleniyordu, ${g0.round}`);
  const pot = g0.pot;
  assert(pot === INSTALLMENT * 5n, `havuz ${mon(pot)}, 5 MON bekleniyordu`);
  const before = new Map(NAMES.map((n) => [n, 0n] as [Name, bigint]));
  for (const n of NAMES) before.set(n, await bal(people[n].address));
  const receipt = await call(bekci, "draw", [gid]);
  const winnerAddr = (await pub.readContract({ address: CONTRACT, abi: commonFundAbi, functionName: "roundWinner", args: [gid, round] })) as Address;
  const winner = NAMES.find((n) => people[n].address.toLowerCase() === winnerAddr.toLowerCase());
  assert(winner, "kazanan demo cüzdanlarından biri değil");
  const delta = (await bal(people[winner].address)) - before.get(winner)!;
  assert(delta === pot, `kazanan ${mon(delta)} aldı, ${mon(pot)} bekleniyordu`);
  const m = (await members())(winner);
  assert(m.received, "kazanan 'received' işaretlenmedi");
  const logs = parseEventLogs({ abi: commonFundAbi, logs: receipt.logs, eventName: "ActivityLogged" });
  assert(logs.some((l) => l.args.kind === 9), "Draw etkinliği yok");
  return winner;
}

// ---------------------------------------------------------------------------
// Senaryo
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nCommonFund E2E — kontrat ${CONTRACT}\n`);
  const contractBalBefore = await bal(CONTRACT);

  console.log("[0] Hazırlık");
  await step("Demo cüzdanlarında yeterli MON var (eksik varsa deployer tamamlar)", async () => {
    const wallet = createWalletClient({ account: deployer, chain, transport: http(RPC, { retryCount: 8, retryDelay: 500, fetchFn: limitedFetch }) });
    const topped: string[] = [];
    for (const n of NAMES) {
      const b = await bal(people[n].address);
      if (b < MIN_BALANCE) {
        const h = await wallet.sendTransaction({ to: people[n].address, value: MIN_BALANCE - b });
        await pub.waitForTransactionReceipt({ hash: h });
        topped.push(`${n} +${formatEther(MIN_BALANCE - b)}`);
      }
    }
    return topped.length ? `tamamlandı: ${topped.join(", ")}` : "hepsi yeterli";
  }, true);
  await step("Muhtar ve Bekçi cüzdanları kontrattakilerle aynı", async () => {
    const [m, b] = await Promise.all([
      pub.readContract({ address: CONTRACT, abi: commonFundAbi, functionName: "muhtar" }),
      pub.readContract({ address: CONTRACT, abi: commonFundAbi, functionName: "bekci" }),
    ]);
    assert(m.toLowerCase() === muhtar.address.toLowerCase(), "Muhtar adresi uyuşmuyor");
    assert(b.toLowerCase() === bekci.address.toLowerCase(), "Bekçi adresi uyuşmuyor");
  }, true);

  console.log("\n[1] Grup kurma ve katılma");
  await step("Sen grubu kurar (5 kişi, taksit 1 MON, teminat 2 MON, tur 90 sn)", async () => {
    await expectRevert(people.Sen, "createGroup", ["x", 5, INSTALLMENT, COLLATERAL, 100n, 90n, 30n, "Sen"], "BadParams", COLLATERAL);
    await expectRevert(people.Sen, "createGroup", ["x", 5, INSTALLMENT, COLLATERAL, 45n, 90n, 30n, "Sen"], "WrongAmount", COLLATERAL - 1n);
    const receipt = await call(
      people.Sen,
      "createGroup",
      [`E2E ${new Date().toISOString().slice(11, 19)}`, 5, INSTALLMENT, COLLATERAL, BigInt(PAY_WINDOW), BigInt(PERIOD), BigInt(MAX_EXT), "Sen"],
      COLLATERAL,
    );
    const logs = parseEventLogs({ abi: commonFundAbi, logs: receipt.logs, eventName: "ActivityLogged" });
    gid = logs[0].args.groupId;
    const g = await group();
    assert(g.status === 0 && g.members.length === 1, "grup Forming ve 1 üyeli olmalı");
    assert(g.payWindow === PAY_WINDOW && g.period === PERIOD, "süreler beklenen değil (45/90 sn)");
    return `grup #${gid}, tur süresi ${g.period} sn, son ödeme ${g.payWindow} sn`;
  }, true);

  await step("Aynı kişi ikinci kez katılamaz; yanlış teminat reddedilir", async () => {
    await expectRevert(people.Sen, "join", [gid, "Sen2"], "AlreadyMember", COLLATERAL);
    await expectRevert(people.Ayse, "join", [gid, "Ayse"], "WrongAmount", parseEther("1"));
  });
  await step("Ayse, Mert, Zeynep, Can katılır; grup dolunca 1. tur başlar", async () => {
    for (const n of ["Ayse", "Mert", "Zeynep", "Can"] as const) await call(people[n], "join", [gid, n], COLLATERAL);
    const g = await group();
    assert(g.status === 1 && g.round === 1, "grup Active ve tur 1 olmalı");
    assert(g.members.length === 5, "5 üye olmalı");
    const bal = await pub.getBalance({ address: CONTRACT });
    assert(bal - contractBalBefore === COLLATERAL * 5n, "kasadaki teminat 10 MON olmalı");
    return `kasa +${mon(bal - contractBalBefore)}`;
  }, true);

  console.log("\n[2] Tur 1 — herkes öder, kura");
  await step("Yanlış tutar ve erken kura reddedilir; 5 taksit ödenir", async () => {
    await expectRevert(people.Sen, "payInstallment", [gid], "WrongAmount", parseEther("0.5"));
    await payAll(["Sen", "Ayse", "Mert", "Zeynep"]);
    await expectRevert(people.Sen, "payInstallment", [gid], "AlreadyPaid", INSTALLMENT);
    await expectRevert(bekci, "draw", [gid], "NotEveryonePaid");
    await call(people.Can, "payInstallment", [gid], INSTALLMENT);
    const g = await group();
    assert(g.paidCount === 5 && g.pot === INSTALLMENT * 5n, "5 ödeme ve 5 MON havuz olmalı");
  }, true);
  await step("Teminat grup bitmeden iade edilemez", () => expectRevert(people.Sen, "withdrawCollateral", [gid], "WrongStatus"));
  let w1 = "";
  await step("Kura çekilir, havuz kazananın cüzdanına geçer", async () => {
    w1 = await drawAndCheck(1);
    const g = await group();
    assert(g.round === 2, "tur 2'ye geçmeli");
    return `kazanan: ${w1}`;
  }, true);

  console.log("\n[3] Tur 2 — geciken iki üye (Zeynep, Can): Bekçi, mazeret, Muhtar");
  await step("Sen, Ayse, Mert öder; süre dolmadan Bekçi işaretleyemez, mazeret yazılamaz", async () => {
    await payAll(["Sen", "Ayse", "Mert"]);
    await expectRevert(bekci, "flagLate", [gid, people.Zeynep.address, "erken"], "NotLateYet");
    await expectRevert(people.Zeynep, "submitExcuse", [gid, "erken"], "NotLateYet");
    await expectRevert(muhtar, "grantExtension", [gid, people.Zeynep.address, 10n, "x"], "NoExcuse");
  });
  const g2 = await group();
  await waitUntilAfter(g2.deadline, "tur 2 son ödeme günü");

  await step("Bekçi gecikmeyi işaretler (yalnızca Bekçi yapabilir, iki kez olmaz)", async () => {
    await expectRevert(people.Mert, "flagLate", [gid, people.Zeynep.address, "x"], "NotBekci");
    await expectRevert(bekci, "flagLate", [gid, people.Sen.address, "x"], "AlreadyPaid");
    await call(bekci, "flagLate", [gid, people.Zeynep.address, "Taksit son günde gelmedi."]);
    await call(bekci, "flagLate", [gid, people.Can.address, "Taksit son günde gelmedi."]);
    await expectRevert(bekci, "flagLate", [gid, people.Zeynep.address, "x"], "AlreadyDone");
    const m = await members();
    assert(m("Zeynep").flagged && m("Can").flagged, "iki üye de flagged olmalı");
    assert(m("Zeynep").lateCount === 1 && m("Can").lateCount === 1, "lateCount 1 olmalı");
  });
  await step("Zeynep ve Can mazeret yazar (gecikme ikinci kez sayılmaz)", async () => {
    await expectRevert(people.Sen, "submitExcuse", [gid, "x"], "AlreadyPaid");
    await call(people.Zeynep, "submitExcuse", [gid, "Maaşım yarın yatıyor."]);
    await call(people.Can, "submitExcuse", [gid, "Telefonum bozuldu, bankaya giremedim."]);
    await expectRevert(people.Zeynep, "submitExcuse", [gid, "tekrar"], "AlreadyDone");
    const m = await members();
    assert(m("Zeynep").excuse && m("Can").excuse, "mazeretler kayıtlı olmalı");
    assert(m("Zeynep").lateCount === 1 && m("Can").lateCount === 1, "lateCount hâlâ 1 olmalı");
  });
  await step("Muhtar karar 1 — süre ver (Zeynep)", async () => {
    await expectRevert(people.Mert, "grantExtension", [gid, people.Zeynep.address, 10n, "x"], "NotMuhtar");
    await expectRevert(muhtar, "grantExtension", [gid, people.Zeynep.address, BigInt(MAX_EXT + 1), "x"], "BadParams");
    await call(muhtar, "grantExtension", [gid, people.Zeynep.address, BigInt(MAX_EXT), "Maaş yarın yatacak, 30 sn süre."]);
    const g = await group();
    const m = (await members())("Zeynep");
    assert(m.decided && m.extendedUntil === g.deadline + MAX_EXT, "extendedUntil = son gün + 30 sn olmalı");
    assert(!m.paid, "süre vermek ödeme sayılmamalı");
    await expectRevert(muhtar, "grantExtension", [gid, people.Zeynep.address, 10n, "x"], "AlreadyDone");
  });
  await step("Muhtar karar 2 — teminatı kes (Can)", async () => {
    const g0 = await group();
    await call(muhtar, "slashCollateral", [gid, people.Can.address, "Mazeret yetersiz, taksit teminattan karşılandı."]);
    const g1 = await group();
    const m = (await members())("Can");
    assert(m.covered && m.paid && m.decided, "Can'ın taksidi teminattan karşılanmış olmalı");
    assert(m.collateralLeft === COLLATERAL - INSTALLMENT, `teminat ${mon(m.collateralLeft)}, 1 MON bekleniyordu`);
    assert(g1.pot - g0.pot === INSTALLMENT, "havuz 1 MON artmalı");
    await expectRevert(muhtar, "slashCollateral", [gid, people.Can.address, "x"], "AlreadyPaid");
    return `kalan teminat ${mon(m.collateralLeft)}`;
  });
  await step("Muhtar ödemiş üyeye karar veremez", () =>
    expectRevert(muhtar, "slashCollateral", [gid, people.Mert.address, "x"], "AlreadyPaid"));
  await step("Süre verilen Zeynep öder; kura çekilir", async () => {
    const m0 = (await members())("Zeynep");
    const now = await chainNow();
    if (now <= m0.extendedUntil) await expectRevert(bekci, "enforceLate", [gid, people.Zeynep.address], "NotLateYet");
    await call(people.Zeynep, "payInstallment", [gid], INSTALLMENT);
    const winner = await drawAndCheck(2);
    return `kazanan: ${winner}`;
  }, true);
  await step("Can teminatını 1 MON tamamlar (fazlası reddedilir)", async () => {
    await expectRevert(people.Can, "topUpCollateral", [gid], "WrongAmount", parseEther("1.5"));
    await call(people.Can, "topUpCollateral", [gid], parseEther("1"));
    assert((await members())("Can").collateralLeft === COLLATERAL, "teminat 2 MON'a dönmeli");
  });

  console.log("\n[4] Tur 3 — ödemeyen Mert: kural gereği teminattan karşılanır");
  await step("Mert dışında 4 kişi öder", () => payAll(["Sen", "Ayse", "Zeynep", "Can"]));
  const g3 = await group();
  assert(g3.round === 3, "tur 3 olmalı");
  await waitUntilAfter(g3.deadline, "tur 3 son ödeme günü");
  await step("Süre dolsa da mazeret payı bitmeden kural işletilemez", async () => {
    const now = await chainNow();
    if (now > g3.deadline + MAX_EXT) return "atlandı (süre zaten geçti)";
    return expectRevert(bekci, "enforceLate", [gid, people.Mert.address], "NotLateYet");
  });
  await waitUntilAfter(g3.deadline + MAX_EXT, "tur 3 mazeret payı");
  await step("Herkes kuralı işletir: Mert'in taksidi teminattan karşılanır (AutoSlashed)", async () => {
    await expectRevert(bekci, "enforceLate", [gid, people.Sen.address], "AlreadyPaid");
    await call(bekci, "enforceLate", [gid, people.Mert.address]);
    const m = (await members())("Mert");
    assert(m.covered && m.paid, "Mert'in taksidi karşılanmış olmalı");
    assert(m.collateralLeft === COLLATERAL - INSTALLMENT, "Mert'in teminatı 1 MON olmalı");
    assert(m.lateCount === 1, "Mert'in gecikmesi 1 sayılmalı");
  });
  await step("Tur 3 kurası", async () => `kazanan: ${await drawAndCheck(3)}`, true);

  console.log("\n[5] Tur 4 ve 5 — normal ödeme");
  for (const r of [4, 5]) {
    await step(`Tur ${r}: herkes öder, kura çekilir`, async () => {
      assert((await group()).round === r, `tur ${r} olmalı`);
      await payAll([...NAMES]);
      return `kazanan: ${await drawAndCheck(r)}`;
    }, true);
  }
  await step("Grup tamamlandı; her üye bir kez kazandı", async () => {
    const g = await group();
    assert(g.status === 2, "grup Completed olmalı");
    const winners = await Promise.all(
      [1, 2, 3, 4, 5].map((r) =>
        pub.readContract({ address: CONTRACT, abi: commonFundAbi, functionName: "roundWinner", args: [gid, r] }),
      ),
    );
    assert(new Set(winners.map((x) => x.toLowerCase())).size === 5, "5 farklı kazanan olmalı");
    const m = await members();
    assert(NAMES.every((n) => m(n).received), "herkes 'received' olmalı");
  });

  console.log("\n[6] Teminat iadesi");
  await step("Her üye kalan teminatını geri çeker (Mert 1 MON, diğerleri 2 MON)", async () => {
    await expectRevert(people.Sen, "topUpCollateral", [gid], "WrongStatus", parseEther("0.1"));
    const parts: string[] = [];
    for (const n of NAMES) {
      const left = (await members())(n).collateralLeft;
      const b0 = await bal(people[n].address);
      const receipt = await call(people[n], "withdrawCollateral", [gid]);
      const gas = receipt.gasUsed * receipt.effectiveGasPrice;
      const delta = (await bal(people[n].address)) - b0 + gas;
      assert(delta === left, `${n}: ${mon(delta)} geldi, ${mon(left)} bekleniyordu`);
      assert(left === (n === "Mert" ? COLLATERAL - INSTALLMENT : COLLATERAL), `${n}: beklenmeyen teminat ${mon(left)}`);
      parts.push(`${n} ${formatEther(left)}`);
    }
    return parts.join(", ");
  });
  await step("İkinci çekim reddedilir; kasa grup öncesindeki bakiyeye döner", async () => {
    await expectRevert(people.Sen, "withdrawCollateral", [gid], "AlreadyDone");
    await expectRevert(deployer, "withdrawCollateral", [gid], "NotMember");
    const left = (await bal(CONTRACT)) - contractBalBefore;
    assert(left === 0n, `kasada ${mon(left)} artık para kaldı`);
  });
}

main()
  .catch((e) => {
    if (!(e instanceof Fatal)) {
      results.push({ name: "Beklenmeyen hata", ok: false, detail: (e as Error).message.split("\n")[0] });
      console.log(`  KALDI  Beklenmeyen hata — ${(e as Error).message.split("\n")[0]}`);
    } else {
      console.log("\nKritik adım başarısız, senaryo durduruldu.");
    }
  })
  .finally(() => {
    const failed = results.filter((r) => !r.ok);
    console.log(`\n===== SONUÇ: ${results.length - failed.length}/${results.length} adım geçti =====`);
    for (const f of failed) console.log(`  KALDI  ${f.name} — ${f.detail}`);
    if (gid) console.log(`Grup #${gid}: http://localhost:3000/grup/${gid}`);
    process.exit(failed.length ? 1 : 0);
  });
