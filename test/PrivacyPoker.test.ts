import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { Signer } from "ethers";
import type { FhevmInstance } from "@fhevm/hardhat-plugin";
import { PrivacyPoker } from "../types";

describe("PrivacyPoker", function () {
  let privacyPoker: PrivacyPoker;
  let owner: Signer;
  let player1: Signer;
  let player2: Signer;
  let player3: Signer;
  let instance: FhevmInstance;

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();

    // 部署合约
    const PrivacyPokerFactory = await ethers.getContractFactory("PrivacyPoker");
    privacyPoker = await PrivacyPokerFactory.deploy();
    await privacyPoker.waitForDeployment();

    // 初始化FHE实例
    instance = await fhevm.createInstance();
  });

  describe("部署和初始化", function () {
    it("应该正确设置游戏owner", async function () {
      expect(await privacyPoker.gameOwner()).to.equal(await owner.getAddress());
    });

    it("应该初始化为等待玩家状态", async function () {
      expect(await privacyPoker.gameState()).to.equal(0); // WaitingForPlayers
    });

    it("应该初始玩家数量为0", async function () {
      expect(await privacyPoker.playerCount()).to.equal(0);
    });
  });

  describe("玩家加入游戏", function () {
    it("应该允许玩家加入游戏", async function () {
      const anteAmount = ethers.parseEther("0.01"); // 0.01 ETH for testing
      
      await expect(privacyPoker.connect(player1).joinGame({ value: anteAmount }))
        .to.emit(privacyPoker, "PlayerJoined")
        .withArgs(await player1.getAddress(), 0);

      expect(await privacyPoker.playerCount()).to.equal(1);
      expect(await privacyPoker.hasJoined(await player1.getAddress())).to.be.true;
    });

    it("应该拒绝重复加入的玩家", async function () {
      const anteAmount = ethers.parseEther("0.01");
      
      await privacyPoker.connect(player1).joinGame({ value: anteAmount });
      
      await expect(
        privacyPoker.connect(player1).joinGame({ value: anteAmount })
      ).to.be.revertedWith("Player already joined");
    });

    it("应该拒绝ante不足的玩家", async function () {
      const insufficientAmount = ethers.parseEther("0.005");
      
      await expect(
        privacyPoker.connect(player1).joinGame({ value: insufficientAmount })
      ).to.be.revertedWith("Insufficient ante amount");
    });

    it("应该允许多个玩家加入", async function () {
      const anteAmount = ethers.parseEther("0.01");
      
      await privacyPoker.connect(player1).joinGame({ value: anteAmount });
      await privacyPoker.connect(player2).joinGame({ value: anteAmount });
      
      expect(await privacyPoker.playerCount()).to.equal(2);
    });
  });

  describe("游戏开始", function () {
    beforeEach(async function () {
      const anteAmount = ethers.parseEther("0.01");
      await privacyPoker.connect(player1).joinGame({ value: anteAmount });
      await privacyPoker.connect(player2).joinGame({ value: anteAmount });
    });

    it("只有owner可以开始游戏", async function () {
      await expect(
        privacyPoker.connect(player1).startGame()
      ).to.be.revertedWith("Only game owner can call this");
    });

    it("应该在有足够玩家时开始游戏", async function () {
      await expect(privacyPoker.connect(owner).startGame())
        .to.emit(privacyPoker, "GameStarted");

      expect(await privacyPoker.gameState()).to.equal(1); // GameActive
    });

    it("应该拒绝玩家不足时开始游戏", async function () {
      // 只有一个玩家的情况下测试
      const anteAmount = ethers.parseEther("0.01");
      const newContract = await ethers.getContractFactory("PrivacyPoker");
      const testContract = await newContract.deploy();
      
      await testContract.connect(player1).joinGame({ value: anteAmount });
      
      await expect(
        testContract.connect(owner).startGame()
      ).to.be.revertedWith("Not enough players");
    });
  });

  describe("公共牌发放", function () {
    beforeEach(async function () {
      const anteAmount = ethers.parseEther("0.01");
      await privacyPoker.connect(player1).joinGame({ value: anteAmount });
      await privacyPoker.connect(player2).joinGame({ value: anteAmount });
      await privacyPoker.connect(owner).startGame();
    });

    it("只有owner可以发放公共牌", async function () {
      await expect(
        privacyPoker.connect(player1).dealCommunityCards()
      ).to.be.revertedWith("Only game owner can call this");
    });

    it("应该在游戏活跃状态发放公共牌", async function () {
      await expect(privacyPoker.connect(owner).dealCommunityCards())
        .to.emit(privacyPoker, "CommunityCardRevealed");

      expect(await privacyPoker.getCommunityCardCount()).to.be.greaterThan(0);
    });

    it("应该限制公共牌最多5张", async function () {
      // 发放所有可能的公共牌
      await privacyPoker.connect(owner).dealCommunityCards(); // 3张 (翻牌圈)
      await privacyPoker.connect(owner).dealCommunityCards(); // 1张 (转牌圈)
      await privacyPoker.connect(owner).dealCommunityCards(); // 1张 (河牌圈)

      expect(await privacyPoker.getCommunityCardCount()).to.equal(5);

      // 尝试再次发放应该失败
      await expect(
        privacyPoker.connect(owner).dealCommunityCards()
      ).to.be.revertedWith("All community cards already dealt");
    });
  });

  describe("玩家行动", function () {
    beforeEach(async function () {
      const anteAmount = ethers.parseEther("0.01");
      await privacyPoker.connect(player1).joinGame({ value: anteAmount });
      await privacyPoker.connect(player2).joinGame({ value: anteAmount });
      await privacyPoker.connect(owner).startGame();
    });

    it("应该允许加密的加注行动", async function () {
      // 创建加密输入
      const input = instance.createEncryptedInput(
        await privacyPoker.getAddress(),
        await player1.getAddress()
      );
      input.add32(20); // 加注20
      const encryptedAmount = await input.encrypt();

      await expect(
        privacyPoker.connect(player1).playerAction(
          2, // BetAction.Raise
          encryptedAmount.handles[0],
          encryptedAmount.inputProof
        )
      ).to.emit(privacyPoker, "PlayerAction");
    });

    it("应该允许弃牌行动", async function () {
      await expect(
        privacyPoker.connect(player1).playerAction(
          0, // BetAction.Fold
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x"
        )
      ).to.emit(privacyPoker, "PlayerAction");

      expect(await privacyPoker.hasFolded(await player1.getAddress())).to.be.true;
    });

    it("应该拒绝未加入玩家的行动", async function () {
      await expect(
        privacyPoker.connect(player3).playerAction(
          1, // BetAction.Call
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x"
        )
      ).to.be.revertedWith("Only joined players can call this");
    });
  });

  describe("游戏结束", function () {
    beforeEach(async function () {
      const anteAmount = ethers.parseEther("0.01");
      await privacyPoker.connect(player1).joinGame({ value: anteAmount });
      await privacyPoker.connect(player2).joinGame({ value: anteAmount });
      await privacyPoker.connect(owner).startGame();
    });

    it("只有owner可以结束游戏", async function () {
      await expect(
        privacyPoker.connect(player1).endGame()
      ).to.be.revertedWith("Only game owner can call this");
    });

    it("应该能够结束游戏", async function () {
      await expect(privacyPoker.connect(owner).endGame())
        .to.emit(privacyPoker, "GameEnded");

      expect(await privacyPoker.gameState()).to.equal(2); // GameEnded
    });
  });

  describe("加密数据访问", function () {
    beforeEach(async function () {
      const anteAmount = ethers.parseEther("0.01");
      await privacyPoker.connect(player1).joinGame({ value: anteAmount });
      await privacyPoker.connect(owner).startGame();
    });

    it("应该允许玩家查看自己的加密余额", async function () {
      const balance = await privacyPoker.connect(player1).getPlayerBalance();
      expect(balance).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("应该允许玩家查看自己的底牌", async function () {
      const cards = await privacyPoker.connect(player1).getPlayerCards();
      expect(cards[0]).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
      expect(cards[1]).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("应该允许查看加密的奖池", async function () {
      const pot = await privacyPoker.getTotalPot();
      expect(pot).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });
  });
});