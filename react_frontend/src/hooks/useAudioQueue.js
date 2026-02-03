import { useState, useRef, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../services/apiService';
import store from '../store';

/**
 * Hook for managing sequential playback of audio chunks.
 *
 * Handles:
 * - Queueing audio chunks by index
 * - Playing chunks in order
 * - Handling gaps (missing chunks)
 * - Fallback to full message audio
 */
const useAudioQueue = (conversationId) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const queueRef = useRef([]);
  const pendingIdRef = useRef(null);
  const totalChunksRef = useRef(0);
  const playedChunksRef = useRef(new Set());
  const isPlayingRef = useRef(false);
  const fallbackAttemptedRef = useRef(false);

  const getAuthToken = useCallback(() => {
    const state = store.getState();
    return state?.auth?.token || '';
  }, []);

  const fetchAudioChunk = useCallback(async (pendingId, chunkIndex, retries = 3) => {
    const token = getAuthToken();
    const url = `${API_BASE_URL}/conversations/${conversationId}/audio-chunk/${pendingId}/${chunkIndex}/`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (response.status === 202) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const audioBlob = await response.blob();
        return URL.createObjectURL(audioBlob);
      } catch (err) {
        if (attempt === retries - 1) {
          console.error(`[AudioQueue] Failed to fetch chunk ${chunkIndex}:`, err);
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }
    return null;
  }, [conversationId, getAuthToken]);

  const playNextChunk = useCallback(async () => {
    if (!isPlayingRef.current || !audioRef.current) {
      return;
    }

    const nextIndex = currentChunkIndex + 1;

    if (nextIndex >= totalChunksRef.current && totalChunksRef.current > 0) {
      console.log('[AudioQueue] All chunks played');
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentChunkIndex(-1);
      return;
    }

    if (playedChunksRef.current.has(nextIndex)) {
      setCurrentChunkIndex(nextIndex);
      return;
    }

    setIsLoading(true);

    const pendingId = pendingIdRef.current;
    if (!pendingId) {
      console.warn('[AudioQueue] No pending ID set');
      setIsLoading(false);
      return;
    }

    const audioUrl = await fetchAudioChunk(pendingId, nextIndex);

    if (!audioUrl) {
      console.warn(`[AudioQueue] Chunk ${nextIndex} unavailable, skipping`);
      playedChunksRef.current.add(nextIndex);
      setCurrentChunkIndex(nextIndex);
      setIsLoading(false);
      setTimeout(() => playNextChunk(), 50);
      return;
    }

    try {
      audioRef.current.src = audioUrl;
      await audioRef.current.play();
      playedChunksRef.current.add(nextIndex);
      setCurrentChunkIndex(nextIndex);
      setIsLoading(false);
    } catch (err) {
      console.error('[AudioQueue] Playback error:', err);
      setIsLoading(false);
      playedChunksRef.current.add(nextIndex);
      setCurrentChunkIndex(nextIndex);
      setTimeout(() => playNextChunk(), 50);
    }
  }, [currentChunkIndex, fetchAudioChunk]);

  const startPlayback = useCallback((pendingId, totalChunks) => {
    console.log('[AudioQueue] Starting playback:', { pendingId, totalChunks });

    pendingIdRef.current = pendingId;
    totalChunksRef.current = totalChunks;
    playedChunksRef.current = new Set();
    fallbackAttemptedRef.current = false;
    setCurrentChunkIndex(-1);
    setIsPlaying(true);
    isPlayingRef.current = true;
    setError(null);

    setTimeout(() => playNextChunk(), 100);
  }, [playNextChunk]);

  const stopPlayback = useCallback(() => {
    console.log('[AudioQueue] Stopping playback');
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const reset = useCallback(() => {
    stopPlayback();
    queueRef.current = [];
    pendingIdRef.current = null;
    totalChunksRef.current = 0;
    playedChunksRef.current = new Set();
    fallbackAttemptedRef.current = false;
    setCurrentChunkIndex(-1);
    setError(null);
  }, [stopPlayback]);

  const playFullMessageAudio = useCallback(async (messageId) => {
    if (fallbackAttemptedRef.current) {
      return;
    }

    fallbackAttemptedRef.current = true;
    console.log('[AudioQueue] Falling back to full message audio:', messageId);

    const token = getAuthToken();
    const url = `${API_BASE_URL}/conversations/${conversationId}/audio/${messageId}/`;

    try {
      setIsLoading(true);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        setIsPlaying(true);
        isPlayingRef.current = true;
      }
    } catch (err) {
      console.error('[AudioQueue] Full message fallback failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, getAuthToken]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener('ended', () => {
      if (isPlayingRef.current && totalChunksRef.current > 0) {
        playNextChunk();
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    });

    audio.addEventListener('error', (e) => {
      console.error('[AudioQueue] Audio error:', e);
      if (isPlayingRef.current && totalChunksRef.current > 0) {
        playNextChunk();
      }
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [playNextChunk]);

  return {
    isPlaying,
    isLoading,
    currentChunkIndex,
    error,
    startPlayback,
    stopPlayback,
    reset,
    playFullMessageAudio,
  };
};

export default useAudioQueue;
