import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployPrivacyPoker: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying PrivacyPoker contract...");

  const privacyPoker = await deploy("PrivacyPoker", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });

  console.log(`PrivacyPoker deployed to: ${privacyPoker.address}`);
  console.log(`Transaction hash: ${privacyPoker.transactionHash}`);

  // 验证合约 (仅在sepolia网络上)
  if (hre.network.name === "sepolia") {
    console.log("Waiting for block confirmations...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 等待1分钟

    try {
      await hre.run("verify:verify", {
        address: privacyPoker.address,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error);
    }
  }

  // 保存部署信息到文件
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: privacyPoker.address,
    deploymentTxHash: privacyPoker.transactionHash,
    deployer: deployer,
    timestamp: new Date().toISOString(),
    blockNumber: privacyPoker.receipt?.blockNumber,
  };

  const deploymentPath = `deployments/${hre.network.name}/PrivacyPoker_deployment_info.json`;
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment info saved to: ${deploymentPath}`);
};

export default deployPrivacyPoker;
deployPrivacyPoker.tags = ["PrivacyPoker"];