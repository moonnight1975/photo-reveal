import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { GameState, PlayerScore, Photo, GameSettings } from '../types';
import { supabaseGameService, generateTileOrder } from '../services/supabaseGameService';

type EventCallback = (data: any) => void;

class SupabaseRealtimeBridge {
  private channels = new Map<string, RealtimeChannel>();
  private listeners = new Map<string, Set<{ event: string; callback: EventCallback }>>();
  private timers = new Map<string, NodeJS.Timeout>();

  /**
   * Get or create channel for a game
   */
  getChannel(gameId: string): RealtimeChannel {
    if (this.channels.has(gameId)) {
      return this.channels.get(gameId)!;
    }

    const channel = supabase.channel(`game:${gameId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: gameId },
      },
    });

    // Listen for broadcast events
    channel.on('broadcast', { event: '*' }, (message) => {
      const { event, payload } = message;
      this._emitLocal(gameId, event, payload);
    });

    // Listen for DB changes to games
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      async () => {
        const game = await supabaseGameService.getGame(gameId, false);
        if (game) {
          this._emitLocal(gameId, 'game:state', game);
          this._emitLocal(gameId, 'game:state-update', game);
        }
      }
    );

    // Listen for DB changes to game_reveal_state
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_reveal_state', filter: `game_id=eq.${gameId}` },
      async () => {
        const game = await supabaseGameService.getGame(gameId, false);
        if (game) {
          this._emitLocal(gameId, 'game:state', game);
          this._emitLocal(gameId, 'game:state-update', game);
        }
      }
    );

    // Listen for DB changes to players
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
      async () => {
        const game = await supabaseGameService.getGame(gameId, false);
        if (game) {
          this._emitLocal(gameId, 'game:scores-update', game.scores);
        }
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Connected
      }
    });

    this.channels.set(gameId, channel);
    return channel;
  }

  /**
   * Subscribe to an event on a game room
   */
  on(gameId: string, event: string, callback: EventCallback) {
    this.getChannel(gameId); // Ensure channel is active
    if (!this.listeners.has(gameId)) {
      this.listeners.set(gameId, new Set());
    }
    this.listeners.get(gameId)!.add({ event, callback });
  }

  /**
   * Unsubscribe from an event on a game room
   */
  off(gameId: string, event: string, callback: EventCallback) {
    const list = this.listeners.get(gameId);
    if (!list) return;
    for (const item of list) {
      if (item.event === event && item.callback === callback) {
        list.delete(item);
      }
    }
  }

  /**
   * Broadcast an event to all clients in the game channel
   */
  async broadcast(gameId: string, event: string, payload: any) {
    const channel = this.getChannel(gameId);
    // Emit locally immediately
    this._emitLocal(gameId, event, payload);
    // Send over Supabase Realtime WebSocket broadcast
    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }

  private _emitLocal(gameId: string, event: string, payload: any) {
    const list = this.listeners.get(gameId);
    if (!list) return;
    list.forEach((item) => {
      if (item.event === event || item.event === '*') {
        try {
          item.callback(payload);
        } catch (e) {
          console.error(`Error in listener for ${event}:`, e);
        }
      }
    });
  }

  /**
   * Host timer controls for Auto-Reveal
   */
  startAutoTimer(
    gameId: string,
    onTick: (remaining: number) => void,
    onRevealNext: () => void,
    onTimeUp: () => void,
    intervalSeconds: number
  ) {
    this.stopAutoTimer(gameId);
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += 1;
      onTick(elapsed);

      if (elapsed % intervalSeconds === 0) {
        onRevealNext();
      }
    }, 1000);

    this.timers.set(gameId, timer);
  }

  stopAutoTimer(gameId: string) {
    const timer = this.timers.get(gameId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(gameId);
    }
  }

  leaveChannel(gameId: string) {
    this.stopAutoTimer(gameId);
    const channel = this.channels.get(gameId);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(gameId);
    }
    this.listeners.delete(gameId);
  }
}

export const realtimeBridge = new SupabaseRealtimeBridge();
