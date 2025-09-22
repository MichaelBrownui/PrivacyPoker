import { useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { parseEther } from 'viem';
import type { GameState } from '../components/PokerGame';

export const usePokerContract = () => {
  const { address } = useAccount();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Read contract state
  const { data: gameId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'gameId',
  });

  const { data: gameOwner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'gameOwner',
  });

  const { data: gameStateData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'gameState',
  });

  const { data: playerCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'playerCount',
  });

  const { data: activePlayerIndex } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'activePlayerIndex',
  });

  const { data: hasJoined } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'hasJoined',
    args: address ? [address] : undefined,
  });

  const { data: hasFolded } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'hasFolded',
    args: address ? [address] : undefined,
  });

  const { data: totalPot } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getTotalPot',
  });

  const { data: communityCardCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCommunityCardCount',
  });

  const { data: playerBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayerBalance',
    query: {
      enabled: !!address && !!hasJoined,
    },
  });

  const { data: playerCards } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayerCards',
    query: {
      enabled: !!address && !!hasJoined,
    },
  });

  const { data: players } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'players',
    args: activePlayerIndex !== undefined ? [BigInt(activePlayerIndex)] : undefined,
  });

  // Construct game state
  const gameState: GameState | null = address && gameId ? {
    gameId: gameId.toString(),
    gameOwner: gameOwner as string || '',
    gameState: Number(gameStateData) || 0,
    playerCount: Number(playerCount) || 0,
    activePlayerIndex: Number(activePlayerIndex) || 0,
    hasJoined: Boolean(hasJoined),
    hasFolded: Boolean(hasFolded),
    totalPot: totalPot as string || '0',
    communityCardCount: Number(communityCardCount) || 0,
    playerBalance: playerBalance as string || '0',
    playerCards: playerCards as [string, string] || null,
    isGameOwner: address.toLowerCase() === (gameOwner as string || '').toLowerCase(),
    isActivePlayer: address.toLowerCase() === (players as string || '').toLowerCase(),
  } : null;

  // Contract write functions
  const joinGame = useCallback(async () => {
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'joinGame',
        value: parseEther('0.001'), // ANTE_AMOUNT = 10 ETH
      });
    } catch (err: any) {
      setError(err.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  }, [address, writeContract]);

  const startGame = useCallback(async () => {
    if (!gameState?.isGameOwner) {
      setError('Only game owner can start the game');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'startGame',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  }, [gameState?.isGameOwner, writeContract]);

  const dealCommunityCards = useCallback(async () => {
    if (!gameState?.isGameOwner) {
      setError('Only game owner can deal community cards');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'dealCommunityCards',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to deal community cards');
    } finally {
      setLoading(false);
    }
  }, [gameState?.isGameOwner, writeContract]);

  const playerAction = useCallback(async (
    action: number,
    encryptedAmount: string,
    inputProof: string
  ) => {
    if (!gameState?.isActivePlayer) {
      setError('Not your turn');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'playerAction',
        args: [action, encryptedAmount as `0x${string}`, inputProof as `0x${string}`],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to perform action');
    } finally {
      setLoading(false);
    }
  }, [gameState?.isActivePlayer, writeContract]);

  const endGame = useCallback(async () => {
    if (!gameState?.isGameOwner) {
      setError('Only game owner can end the game');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'endGame',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to end game');
    } finally {
      setLoading(false);
    }
  }, [gameState?.isGameOwner, writeContract]);

  const refreshGameState = useCallback(() => {
    // This will trigger a re-read of all contract data
    // The useReadContract hooks will automatically refetch
  }, []);

  return {
    gameState,
    loading: loading || isPending || isConfirming,
    error,
    joinGame,
    startGame,
    dealCommunityCards,
    playerAction,
    endGame,
    refreshGameState,
    isConfirmed,
  };
};