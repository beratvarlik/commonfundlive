// Derlenen ABI'yi web uygulamasına kopyalar: npm run compile && npm run export-abi
const fs = require("fs");
const path = require("path");

const artifact = require(path.join(__dirname, "..", "artifacts", "contracts", "CommonFund.sol", "CommonFund.json"));
const target = path.join(__dirname, "..", "..", "web", "src", "lib", "abi.ts");
const body =
  "// Bu dosya contracts/scripts/export-abi.js ile üretilir. Elle düzenleme.\n" +
  "export const commonFundAbi = " +
  JSON.stringify(artifact.abi, null, 2) +
  " as const;\n";
fs.writeFileSync(target, body);
console.log("ABI yazıldı:", target);
