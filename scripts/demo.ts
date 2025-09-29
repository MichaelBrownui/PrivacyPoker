#!/usr/bin/env ts-node

import { ethers } from "hardhat";

async function main() {
  console.log("🃏 Privacy Poker Demo Script");
  console.log("================================");

  // 获取签名者
  const [owner, player1, player2, player3] = await ethers.getSigners();
  
  console.log("Accounts:");
  console.log(`Owner: ${await owner.getAddress()}`);
  console.log(`Player1: ${await player1.getAddress()}`);
  console.log(`Player2: ${await player2.getAddress()}`);
  console.log(`Player3: ${await player3.getAddress()}`);
  console.log("");

  // 部署合约
  console.log("Deploying PrivacyPoker contract...");
  const PrivacyPoker = await ethers.getContractFactory("PrivacyPoker");
  const privacyPoker = await PrivacyPoker.deploy();
  await privacyPoker.waitForDeployment();
  
  const contractAddress = await privacyPoker.getAddress();
  console.log(`Contract deployed at: ${contractAddress}`);
  console.log("");

  // 游戏演示
  try {
    // 检查初始状态
    console.log("=== Initial Game State ===");
    const initialState = await privacyPoker.gameState();
    const initialPlayerCount = await privacyPoker.playerCount();
    console.log(`Game State: ${initialState} (0=WaitingForPlayers)`);
    console.log(`Player Count: ${initialPlayerCount}/6`);
    console.log("");

    // 玩家加入游戏
    console.log("=== Players Joining Game ===");
    const anteAmount = ethers.parseEther("0.01");
    
    console.log("Player1 joining...");
    await privacyPoker.connect(player1).joinGame({ value: anteAmount });
    
    console.log("Player2 joining...");
    await privacyPoker.connect(player2).joinGame({ value: anteAmount });
    
    console.log("Player3 joining...");
    await privacyPoker.connect(player3).joinGame({ value: anteAmount });

    const playerCountAfterJoin = await privacyPoker.playerCount();
    console.log(`Players joined: ${playerCountAfterJoin}/6`);
    console.log("");

    // 开始游戏
    console.log("=== Starting Game ===");
    await privacyPoker.connect(owner).startGame();
    
    const gameStateAfterStart = await privacyPoker.gameState();
    console.log(`Game State: ${gameStateAfterStart} (1=GameActive)`);
    console.log("Game started! Cards dealt to players.");
    console.log("");

    // 发放公共牌
    console.log("=== Dealing Community Cards ===");
    console.log("Dealing flop (3 cards)...");
    await privacyPoker.connect(owner).dealCommunityCards();
    
    let communityCardCount = await privacyPoker.getCommunityCardCount();
    console.log(`Community cards: ${communityCardCount}/5`);
    
    console.log("Dealing turn (1 card)...");
    await privacyPoker.connect(owner).dealCommunityCards();
    
    communityCardCount = await privacyPoker.getCommunityCardCount();
    console.log(`Community cards: ${communityCardCount}/5`);
    
    console.log("Dealing river (1 card)...");
    await privacyPoker.connect(owner).dealCommunityCards();
    
    communityCardCount = await privacyPoker.getCommunityCardCount();
    console.log(`Community cards: ${communityCardCount}/5`);
    console.log("");

    // 玩家行动演示
    console.log("=== Player Actions ===");
    
    // Player1 弃牌
    console.log("Player1 folds...");
    await privacyPoker.connect(player1).playerAction(
      0, // Fold
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x"
    );
    
    const player1Folded = await privacyPoker.hasFolded(await player1.getAddress());
    console.log(`Player1 has folded: ${player1Folded}`);
    
    // Player2 跟注
    console.log("Player2 calls...");
    await privacyPoker.connect(player2).playerAction(
      1, // Call
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x"
    );
    console.log("Player2 called");
    console.log("");

    // 查看加密数据
    console.log("=== Encrypted Data Access ===");
    
    // 玩家查看自己的加密数据
    const player2Balance = await privacyPoker.connect(player2).getPlayerBalance();
    console.log(`Player2 encrypted balance: ${player2Balance}`);
    
    const player2Cards = await privacyPoker.connect(player2).getPlayerCards();
    console.log(`Player2 encrypted cards: [${player2Cards[0]}, ${player2Cards[1]}]`);
    
    const totalPot = await privacyPoker.getTotalPot();
    console.log(`Total pot (encrypted): ${totalPot}`);
    console.log("");

    // 结束游戏
    console.log("=== Ending Game ===");
    await privacyPoker.connect(owner).endGame();
    
    const finalGameState = await privacyPoker.gameState();
    console.log(`Final Game State: ${finalGameState} (2=GameEnded)`);
    console.log("Game ended! Winner determined.");
    console.log("");

    console.log("🎉 Demo completed successfully!");
    console.log("================================");
    console.log("Summary:");
    console.log("✅ Contract deployed");
    console.log("✅ Players joined with encrypted ante");
    console.log("✅ Game started with encrypted card dealing");
    console.log("✅ Community cards dealt");
    console.log("✅ Player actions with encrypted data");
    console.log("✅ Game ended with encrypted winner determination");
    console.log("");
    console.log("All sensitive data (cards, bets, balances) remain encrypted!");
    console.log(`Contract Address: ${contractAddress}`);

  } catch (error) {
    console.error("Demo failed:", error);
    process.exit(1);
  }
}

// 运行演示
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}