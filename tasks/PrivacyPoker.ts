import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("privacy-poker:deploy")
  .setDescription("Deploy PrivacyPoker contract")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    console.log("Deploying PrivacyPoker contract...");

    const PrivacyPoker = await ethers.getContractFactory("PrivacyPoker");
    const privacyPoker = await PrivacyPoker.deploy();

    await privacyPoker.waitForDeployment();
    
    const contractAddress = await privacyPoker.getAddress();
    console.log(`PrivacyPoker deployed to: ${contractAddress}`);
    
    return contractAddress;
  });

task("privacy-poker:game-info")
  .setDescription("Get game information")
  .addParam("contract", "The contract address")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const contractAddress = taskArguments.contract;
    
    const PrivacyPoker = await ethers.getContractFactory("PrivacyPoker");
    const privacyPoker = PrivacyPoker.attach(contractAddress);

    console.log("=== Privacy Poker Game Info ===");
    console.log(`Contract Address: ${contractAddress}`);
    
    try {
      const gameState = await privacyPoker.gameState();
      const playerCount = await privacyPoker.playerCount();
      const gameOwner = await privacyPoker.gameOwner();
      const activePlayerIndex = await privacyPoker.activePlayerIndex();
      const communityCardCount = await privacyPoker.getCommunityCardCount();

      const gameStates = ["WaitingForPlayers", "GameActive", "GameEnded"];
      
      console.log(`Game State: ${gameStates[Number(gameState)]} (${gameState})`);
      console.log(`Player Count: ${playerCount}/6`);
      console.log(`Game Owner: ${gameOwner}`);
      console.log(`Active Player Index: ${activePlayerIndex}`);
      console.log(`Community Cards: ${communityCardCount}/5`);
      
    } catch (error) {
      console.error("Error reading game info:", error);
    }
  });

task("privacy-poker:join-game")
  .setDescription("Join a privacy poker game")
  .addParam("contract", "The contract address")
  .addOptionalParam("ante", "Ante amount in ETH", "0.01")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const contractAddress = taskArguments.contract;
    const anteAmount = taskArguments.ante;
    
    const [signer] = await ethers.getSigners();
    const PrivacyPoker = await ethers.getContractFactory("PrivacyPoker");
    const privacyPoker = PrivacyPoker.attach(contractAddress);

    console.log(`Joining game at ${contractAddress} with ${anteAmount} ETH ante...`);
    console.log(`Using signer: ${await signer.getAddress()}`);

    try {
      const tx = await privacyPoker.connect(signer).joinGame({
        value: ethers.parseEther(anteAmount)
      });
      
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log("Successfully joined the game!");
      
    } catch (error) {
      console.error("Error joining game:", error);
    }
  });

task("privacy-poker:start-game")
  .setDescription("Start a privacy poker game (owner only)")
  .addParam("contract", "The contract address")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const contractAddress = taskArguments.contract;
    
    const [signer] = await ethers.getSigners();
    const PrivacyPoker = await ethers.getContractFactory("PrivacyPoker");
    const privacyPoker = PrivacyPoker.attach(contractAddress);

    console.log(`Starting game at ${contractAddress}...`);
    console.log(`Using signer: ${await signer.getAddress()}`);

    try {
      const tx = await privacyPoker.connect(signer).startGame();
      
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log("Game started successfully!");
      
    } catch (error) {
      console.error("Error starting game:", error);
    }
  });

task("privacy-poker:deal-cards")
  .setDescription("Deal community cards (owner only)")
  .addParam("contract", "The contract address")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const contractAddress = taskArguments.contract;
    
    const [signer] = await ethers.getSigners();
    const PrivacyPoker = await ethers.getContractFactory("PrivacyPoker");
    const privacyPoker = PrivacyPoker.attach(contractAddress);

    console.log(`Dealing community cards at ${contractAddress}...`);

    try {
      const tx = await privacyPoker.connect(signer).dealCommunityCards();
      
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log("Community cards dealt successfully!");
      
    } catch (error) {
      console.error("Error dealing cards:", error);
    }
  });

task("privacy-poker:player-action")
  .setDescription("Perform player action (fold/call/raise)")
  .addParam("contract", "The contract address")
  .addParam("action", "Action type: 0=Fold, 1=Call, 2=Raise")
  .addOptionalParam("amount", "Raise amount (only for raise action)", "0")
  .setAction(async function (taskArguments: TaskArguments, { ethers, fhevm }) {
    const contractAddress = taskArguments.contract;
    const action = parseInt(taskArguments.action);
    const amount = parseInt(taskArguments.amount);
    
    const [signer] = await ethers.getSigners();
    const PrivacyPoker = await ethers.getContractFactory("PrivacyPoker");
    const privacyPoker = PrivacyPoker.attach(contractAddress);

    console.log(`Performing action ${action} at ${contractAddress}...`);

    try {
      let encryptedAmount = "0x0000000000000000000000000000000000000000000000000000000000000000";
      let inputProof = "0x";

      if (action === 2 && amount > 0) { // Raise action
        const instance = await fhevm.createInstance();
        const input = instance.createEncryptedInput(contractAddress, await signer.getAddress());
        input.add32(amount);
        const encrypted = await input.encrypt();
        
        encryptedAmount = encrypted.handles[0];
        inputProof = encrypted.inputProof;
        
        console.log(`Encrypting raise amount: ${amount}`);
      }

      const tx = await privacyPoker.connect(signer).playerAction(
        action,
        encryptedAmount,
        inputProof
      );
      
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log("Action performed successfully!");
      
    } catch (error) {
      console.error("Error performing action:", error);
    }
  });

task("privacy-poker:end-game")
  .setDescription("End the game (owner only)")
  .addParam("contract", "The contract address")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const contractAddress = taskArguments.contract;
    
    const [signer] = await ethers.getSigners();
    const PrivacyPoker = await ethers.getContractFactory("PrivacyPoker");
    const privacyPoker = PrivacyPoker.attach(contractAddress);

    console.log(`Ending game at ${contractAddress}...`);

    try {
      const tx = await privacyPoker.connect(signer).endGame();
      
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log("Game ended successfully!");
      
    } catch (error) {
      console.error("Error ending game:", error);
    }
  });

task("privacy-poker:get-balance")
  .setDescription("Get player's encrypted balance")
  .addParam("contract", "The contract address")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const contractAddress = taskArguments.contract;
    
    const [signer] = await ethers.getSigners();
    const PrivacyPoker = await ethers.getContractFactory("PrivacyPoker");
    const privacyPoker = PrivacyPoker.attach(contractAddress);

    console.log(`Getting balance from ${contractAddress}...`);

    try {
      const balance = await privacyPoker.connect(signer).getPlayerBalance();
      console.log(`Encrypted balance: ${balance}`);
      console.log("Note: This is encrypted data. Use FHE decryption to view actual balance.");
      
    } catch (error) {
      console.error("Error getting balance:", error);
    }
  });