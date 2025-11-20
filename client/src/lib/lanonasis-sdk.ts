import { useState, useEffect } from 'react';
import { MOCK_MEMORIES, MOCK_API_KEYS } from '../packages/shared/mock-data';
import { Memory, ApiKey } from '../packages/shared/types';

// Simulating @LanOnasis/sdk
export class LanonasisClient {
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  isAuthenticated() {
    return !!this.apiKey;
  }

  async connect(apiKey: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    this.apiKey = apiKey;
    return { success: true, user: { id: 'user_123', name: 'Dev User' } };
  }

  async disconnect() {
    this.apiKey = null;
    return { success: true };
  }

  get memory() {
    return {
      list: async (query?: string): Promise<Memory[]> => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        if (!query) return MOCK_MEMORIES;
        return MOCK_MEMORIES.filter(m => 
          m.title.toLowerCase().includes(query.toLowerCase()) ||
          m.content.toLowerCase().includes(query.toLowerCase())
        );
      },
      add: async (content: string) => {
        console.log("Adding to vector store:", content);
        return { success: true, id: Math.random().toString() };
      }
    };
  }

  get keys() {
    return {
      list: async (): Promise<ApiKey[]> => {
        return MOCK_API_KEYS;
      }
    };
  }
}

// Simulating @lanonasis/memory-client hook
export function useLanonasis() {
  const [client] = useState(() => new LanonasisClient());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const login = async () => {
    setIsConnecting(true);
    await client.connect("mock_key_123");
    setIsAuthenticated(true);
    setIsConnecting(false);
  };

  const logout = async () => {
    await client.disconnect();
    setIsAuthenticated(false);
  };

  return {
    client,
    isAuthenticated,
    isConnecting,
    login,
    logout
  };
}
