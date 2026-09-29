const hre = require("hardhat");

async function main() {
    const Ledger = await hre.ethers.getContractFactory("DecryptionLedger");
    const ledger = await Ledger.deploy();
    await ledger.waitForDeployment();
    console.log("DecryptionLedger deployed to:", await ledger.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});