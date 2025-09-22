import React, { useState, useEffect } from 'react';
import type { GameState } from './PokerGame';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useAccount } from 'wagmi';
import '../styles/GameBoard.css';

interface GameBoardProps {
  gameState: GameState;
  onDealCommunityCards: () => Promise<void>;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onDealCommunityCards
}) => {
  const { address } = useAccount();
  const { instance } = useZamaInstance();
  const [decryptedBalance] = useState<number | null>(null);
  const [decryptedPot] = useState<number | null>(null);
  const [decryptedCards] = useState<[number, number] | null>(null);

  // Decrypt player data
  useEffect(() => {
    const decryptPlayerData = async () => {
      if (!instance || !gameState.playerCards || !address) return;

      try {
        // Note: User decryption is commented out for now
        // This would require proper key generation and signing implementation
        // For demonstration purposes, we'll show encrypted placeholders

        // setDecryptedBalance(100); // Mock value for UI demo
        // setDecryptedPot(60); // Mock value for UI demo
        // setDecryptedCards([12, 25]); // Mock values for UI demo
      } catch (error) {
        console.error('Error decrypting player data:', error);
      }
    };

    decryptPlayerData();
  }, [instance, gameState.playerBalance, gameState.totalPot, gameState.playerCards, address]);

  const formatCard = (cardValue: number): string => {
    if (cardValue === 0) return '??';

    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    const suitIndex = Math.floor((cardValue - 1) / 13);
    const rankIndex = (cardValue - 1) % 13;

    return `${ranks[rankIndex]}${suits[suitIndex]}`;
  };

  const getCardColor = (cardValue: number): string => {
    if (cardValue === 0) return 'gray';
    const suitIndex = Math.floor((cardValue - 1) / 13);
    return suitIndex === 1 || suitIndex === 2 ? 'red' : 'black';
  };

  return (
    <div className="game-board">
      <div className="board-header">
        <div className="game-info">
          <h2>Privacy Poker Game</h2>
          <div className="game-status">
            <span className="game-id">Game #{gameState.gameId}</span>
            <span className="player-count">{gameState.playerCount} Players</span>
          </div>
        </div>

        <div className="pot-info">
          <div className="pot-display">
            <span className="pot-label">Total Pot</span>
            <span className="pot-amount">
              {decryptedPot !== null ? `${decryptedPot} ETH` : 'Loading...'}
            </span>
          </div>
        </div>
      </div>

      <div className="community-cards-section">
        <h3>Community Cards</h3>
        <div className="community-cards">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className={`card ${index < gameState.communityCardCount ? 'revealed' : 'hidden'}`}
            >
              {index < gameState.communityCardCount ? '🂠' : '🂠'}
            </div>
          ))}
        </div>

        <div className="community-actions">
          {gameState.isGameOwner && gameState.communityCardCount < 5 && (
            <button
              onClick={onDealCommunityCards}
              className="deal-cards-button"
            >
              {gameState.communityCardCount === 0 ? 'Deal Flop (3 cards)' :
               gameState.communityCardCount === 3 ? 'Deal Turn (1 card)' :
               'Deal River (1 card)'}
            </button>
          )}
        </div>
      </div>

      <div className="player-section">
        <div className="player-info">
          <h3>Your Hand</h3>
          <div className="player-cards">
            {decryptedCards ? (
              <>
                <div className={`card player-card ${getCardColor(decryptedCards[0])}`}>
                  {formatCard(decryptedCards[0])}
                </div>
                <div className={`card player-card ${getCardColor(decryptedCards[1])}`}>
                  {formatCard(decryptedCards[1])}
                </div>
              </>
            ) : gameState.playerCards ? (
              <>
                <div className="card player-card encrypted">
                  <div className="card-content">
                    <span className="encrypted-symbol">🔒</span>
                    <span className="card-text">Card 1</span>
                  </div>
                </div>
                <div className="card player-card encrypted">
                  <div className="card-content">
                    <span className="encrypted-symbol">🔒</span>
                    <span className="card-text">Card 2</span>
                  </div>
                </div>
              </>
            ) : (
              <p>No cards dealt yet</p>
            )}
          </div>

          <div className="player-stats">
            <div className="stat">
              <span className="stat-label">Balance:</span>
              <span className="stat-value">
                {decryptedBalance !== null ? `${decryptedBalance} ETH` : 'Loading...'}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Status:</span>
              <span className={`stat-value ${gameState.hasFolded ? 'folded' : gameState.isActivePlayer ? 'active' : 'waiting'}`}>
                {gameState.hasFolded ? 'Folded' : gameState.isActivePlayer ? 'Your Turn' : 'Waiting'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="game-progress">
        <div className="progress-info">
          <span>Active Player: {gameState.activePlayerIndex + 1}</span>
          <span>Community Cards: {gameState.communityCardCount}/5</span>
        </div>
      </div>
    </div>
  );
};