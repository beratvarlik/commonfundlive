const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const MON = (v) => ethers.parseEther(String(v));
const DAY = 24 * 60 * 60;

describe("CommonFund", function () {
  let cf, muhtar, bekci, a, b, c, outsider;
  const installment = MON(1);
  const collateral = MON(1);
  const payWindow = 20 * DAY;
  const period = 30 * DAY;
  const maxExt = 7 * DAY;

  async function createFull() {
    await cf.connect(a).createGroup("Yurt 4. kat", 3, installment, collateral, payWindow, period, maxExt, "Üye", { value: collateral });
    await cf.connect(b).join(1, "Üye", { value: collateral });
    await cf.connect(c).join(1, "Üye", { value: collateral });
    return 1;
  }

  beforeEach(async () => {
    [muhtar, bekci, a, b, c, outsider] = await ethers.getSigners();
    const F = await ethers.getContractFactory("CommonFund");
    cf = await F.deploy(muhtar.address, bekci.address);
  });

  it("grup dolunca 1. tur başlar", async () => {
    await cf.connect(a).createGroup("G", 3, installment, collateral, payWindow, period, maxExt, "Üye", { value: collateral });
    let g = await cf.getGroup(1);
    expect(g.status).to.equal(0n);
    await cf.connect(b).join(1, "Üye", { value: collateral });
    await cf.connect(c).join(1, "Üye", { value: collateral });
    g = await cf.getGroup(1);
    expect(g.status).to.equal(1n);
    expect(g.round).to.equal(1n);
    expect(g.members.length).to.equal(3);
    await expect(cf.connect(outsider).join(1, "Üye", { value: collateral })).to.be.revertedWithCustomError(cf, "WrongStatus");
  });

  it("yanlış tutar ve parametreler reddedilir", async () => {
    await expect(
      cf.connect(a).createGroup("G", 3, installment, collateral, payWindow, period, maxExt, "Üye", { value: MON(0.5) })
    ).to.be.revertedWithCustomError(cf, "WrongAmount");
    await expect(
      cf.connect(a).createGroup("G", 1, installment, collateral, payWindow, period, maxExt, "Üye", { value: collateral })
    ).to.be.revertedWithCustomError(cf, "BadParams");
  });

  it("herkes ödeyince kura çekilir, havuz kazanana gider", async () => {
    const id = await createFull();
    for (const s of [a, b, c]) await cf.connect(s).payInstallment(id, { value: installment });
    await expect(cf.connect(a).payInstallment(id, { value: installment })).to.be.revertedWithCustomError(cf, "AlreadyPaid");

    const before = {};
    for (const s of [a, b, c]) before[s.address] = await ethers.provider.getBalance(s.address);
    await cf.connect(outsider).draw(id);
    const winner = await cf.roundWinner(id, 1);
    expect([a.address, b.address, c.address]).to.include(winner);
    expect((await ethers.provider.getBalance(winner)) - before[winner]).to.equal(MON(3));

    const g = await cf.getGroup(id);
    expect(g.round).to.equal(2n);
    expect(g.pot).to.equal(0n);
  });

  it("taksit eksikken kura çekilemez", async () => {
    const id = await createFull();
    await cf.connect(a).payInstallment(id, { value: installment });
    await expect(cf.draw(id)).to.be.revertedWithCustomError(cf, "NotEveryonePaid");
  });

  it("herkes bir kez alır, sonunda teminat geri döner", async () => {
    const id = await createFull();
    const winners = new Set();
    for (let r = 1; r <= 3; r++) {
      for (const s of [a, b, c]) await cf.connect(s).payInstallment(id, { value: installment });
      await cf.draw(id);
      winners.add(await cf.roundWinner(id, r));
    }
    expect(winners.size).to.equal(3);
    expect((await cf.getGroup(id)).status).to.equal(2n);
    await expect(cf.connect(a).withdrawCollateral(id)).to.changeEtherBalance(a, collateral);
    await expect(cf.connect(a).withdrawCollateral(id)).to.be.revertedWithCustomError(cf, "AlreadyDone");
  });

  describe("gecikme, Bekçi ve Muhtar", () => {
    let id;
    beforeEach(async () => {
      id = await createFull();
      await cf.connect(a).payInstallment(id, { value: installment });
      await cf.connect(b).payInstallment(id, { value: installment });
    });

    it("son günden önce mazeret yazılamaz, Bekçi işaretleyemez", async () => {
      await expect(cf.connect(c).submitExcuse(id, "burs")).to.be.revertedWithCustomError(cf, "NotLateYet");
      await time.increase(payWindow + 1);
      await expect(cf.connect(outsider).flagLate(id, c.address, "x")).to.be.revertedWithCustomError(cf, "NotBekci");
      await cf.connect(bekci).flagLate(id, c.address, "Taksidin gelmedi.");
      await expect(cf.connect(bekci).flagLate(id, c.address, "x")).to.be.revertedWithCustomError(cf, "AlreadyDone");
    });

    it("Muhtar mazeret olmadan karar veremez, sadece muhtar karar verebilir", async () => {
      await time.increase(payWindow + 1);
      await expect(cf.connect(muhtar).grantExtension(id, c.address, DAY, "x")).to.be.revertedWithCustomError(cf, "NoExcuse");
      await cf.connect(c).submitExcuse(id, "Burs 27'sinde yatıyor");
      await expect(cf.connect(outsider).grantExtension(id, c.address, DAY, "x")).to.be.revertedWithCustomError(cf, "NotMuhtar");
      await expect(cf.connect(muhtar).grantExtension(id, c.address, maxExt + 1, "x")).to.be.revertedWithCustomError(cf, "BadParams");
    });

    it("süre verilince süre dolmadan kesinti yapılamaz, ödeme gelirse kura çekilir", async () => {
      await time.increase(payWindow + 1);
      await cf.connect(c).submitExcuse(id, "Burs 27'sinde yatıyor");
      await cf.connect(muhtar).grantExtension(id, c.address, 3 * DAY, "İlk gecikme, tarih belli.");
      await expect(cf.enforceLate(id, c.address)).to.be.revertedWithCustomError(cf, "NotLateYet");
      await expect(cf.connect(muhtar).slashCollateral(id, c.address, "x")).to.be.revertedWithCustomError(cf, "AlreadyDone");
      await cf.connect(c).payInstallment(id, { value: installment });
      await cf.draw(id);
    });

    it("Muhtar teminatı keserse havuz tamamlanır", async () => {
      await time.increase(payWindow + 1);
      await cf.connect(c).submitExcuse(id, "Param yok");
      await cf.connect(muhtar).slashCollateral(id, c.address, "Tarih yok, ikinci gecikme.");
      const m = (await cf.getMembers(id)).find((x) => x.account === c.address);
      expect(m.collateralLeft).to.equal(0n);
      expect(m.covered).to.equal(true);
      expect((await cf.getGroup(id)).pot).to.equal(MON(3));
      await cf.draw(id);
    });

    it("süre dolunca kural gereği herkes kesinti başlatabilir", async () => {
      await time.increase(payWindow + 1);
      await cf.connect(c).submitExcuse(id, "Burs");
      await cf.connect(muhtar).grantExtension(id, c.address, DAY, "ok");
      await time.increase(DAY + 1);
      await cf.connect(outsider).enforceLate(id, c.address);
      expect((await cf.getGroup(id)).paidCount).to.equal(3n);
    });

    it("mazeret yazmayan üye için de son günden sonra maxExtension kadar beklenir", async () => {
      await time.increase(payWindow + 1);
      await expect(cf.enforceLate(id, c.address)).to.be.revertedWithCustomError(cf, "NotLateYet");
      await time.increase(maxExt);
      await cf.enforceLate(id, c.address);
      const m = (await cf.getMembers(id)).find((x) => x.account === c.address);
      expect(m.covered).to.equal(true);
    });

    it("Muhtar sessiz kalırsa maxExtension sonunda kesinti yapılabilir", async () => {
      await time.increase(payWindow + 1);
      await cf.connect(c).submitExcuse(id, "Burs");
      await expect(cf.enforceLate(id, c.address)).to.be.revertedWithCustomError(cf, "NotLateYet");
      await time.increase(maxExt);
      await cf.enforceLate(id, c.address);
    });

    it("etkinlik kaydı tutulur", async () => {
      await time.increase(payWindow + 1);
      await cf.connect(bekci).flagLate(id, c.address, "Hatırlatma");
      await cf.connect(c).submitExcuse(id, "Burs");
      const list = await cf.getRecentActivities(id, 2);
      expect(list[0].kind).to.equal(4n); // Excuse
      expect(list[0].text).to.equal("Burs");
      expect(list[1].kind).to.equal(5n); // Flagged
      const mem = (await cf.getMembers(id)).find((x) => x.account === c.address);
      expect(mem.lateCount).to.equal(1n);
    });
  });

  it("teminat tamamlanabilir ama aşılamaz", async () => {
    const id = await createFull();
    await expect(cf.connect(a).topUpCollateral(id, { value: 1 })).to.be.revertedWithCustomError(cf, "WrongAmount");
  });
});
