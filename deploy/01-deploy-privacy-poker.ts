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
};

export default deployPrivacyPoker;
deployPrivacyPoker.tags = ["PrivacyPoker"];