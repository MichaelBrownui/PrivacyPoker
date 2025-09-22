import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Header } from './Header';
import { GameLobby } from './GameLobby';
import { GameBoard } from './GameBoard';
import { PlayerActions } from './PlayerActions';
import { usePokerContract } from '../hooks/usePokerContract';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/PokerGame.css';

export interface GameState {
  gameId: string;
  gameOwner: string;
  gameState: number; // 0: WaitingForPlayers, 1: GameActive, 2: GameEnded
  playerCount: number;
  activePlayerIndex: number;
  hasJoined: boolean;
  hasFolded: boolean;
  totalPot: string;
  communityCardCount: number;
  playerBalance: string;
  playerCards: [string, string] | null;
  isGameOwner: boolean;
  isActivePlayer: boolean;
}

export const PokerGame: React.FC = () => {
  const { address } = useAccount();
  const {
    gameState,
    loading,
    error,
    joinGame,
    startGame,
    dealCommunityCards,
    playerAction,
    endGame,
    refreshGameState
  } = usePokerContract();
  const { instance } = useZamaInstance();

  useEffect(() => {
    if (address) {
      refreshGameState();
    }
  }, [address, refreshGameState]);

  const renderGameContent = () => {
    if (!address) {
      return (
        <div className="poker-welcome">
          <h1>Privacy Poker</h1>
          <p>Connect your wallet to start playing</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="poker-loading">
          <div className="loading-spinner"></div>
          <p>Loading game state...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="poker-error">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={refreshGameState} className="retry-button">
            Retry
          </button>
        </div>
      );
    }

    if (!gameState) {
      return (
        <div className="poker-error">
          <p>Unable to load game state</p>
        </div>
      );
    }

    switch (gameState.gameState) {
      case 0: // WaitingForPlayers
        return (
          <GameLobby
            gameState={gameState}
            onJoinGame={joinGame}
            onStartGame={startGame}
          />
        );
      case 1: // GameActive
        return (
          <div className="poker-active-game">
            <GameBoard
              gameState={gameState}
              onDealCommunityCards={dealCommunityCards}
            />
            <PlayerActions
              gameState={gameState}
              instance={instance}
              onPlayerAction={playerAction}
              onEndGame={endGame}
            />
          </div>
        );
      case 2: // GameEnded
        return (
          <div className="poker-game-ended">
            <h2>Game Ended</h2>
            <p>Thank you for playing Privacy Poker!</p>
            <button onClick={() => window.location.reload()} className="new-game-button">
              Start New Game
            </button>
          </div>
        );
      default:
        return (
          <div className="poker-error">
            <p>Unknown game state</p>
          </div>
        );
    }
  };

  return (
    <div className="poker-game">
      <Header />
      <main className="poker-main">
        {renderGameContent()}
      </main>
    </div>
  );
};