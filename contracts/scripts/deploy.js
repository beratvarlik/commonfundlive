const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("DEPLOYER_PRIVATE_KEY .env dosyasında yok.");

  const muhtar = process.env.MUHTAR_ADDRESS || deployer.address;
  const bekci = process.env.BEKCI_ADDRESS || deployer.address;

  console.log("Kuran cüzdan:", deployer.address);
  console.log("Muhtar      :", muhtar);
  console.log("Bekçi       :", bekci);

  const Factory = await hre.ethers.getContractFactory("CommonFund");
  const contract = await Factory.deploy(muhtar, bekci);
  const receipt = await contract.deploymentTransaction().wait();
  const address = await contract.getAddress();

  console.log("CommonFund kuruldu:", address);
  console.log("İşlem:", receipt.hash);

  const out = {
    address,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployBlock: receipt.blockNumber,
    muhtar,
    bekci,
  };
  const target = path.join(__dirname, "..", "..", "web", "src", "lib", "deployment.json");
  fs.writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
  console.log("Adres web/src/lib/deployment.json dosyasına yazıldı.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
