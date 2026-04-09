/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Storage } from "@plasmohq/storage";

export const storage = new Storage();

export interface AuthState {
  uid: string | null;
  userName: string | null;
  token: string | null;
  isConnected: boolean;
  lastSync: string | null;
  geminiApiKey: string | null;
}

export const getAuthState = async (): Promise<AuthState> => {
  const uid = await storage.get("uid");
  const userName = await storage.get("userName");
  const token = await storage.get("token");
  const isConnected = await storage.get<boolean>("isConnected");
  const lastSync = await storage.get("lastSync");
  const geminiApiKey = await storage.get("geminiApiKey");

  return {
    uid: uid || null,
    userName: userName || null,
    token: token || null,
    isConnected: !!isConnected,
    lastSync: lastSync || null,
    geminiApiKey: geminiApiKey || null
  };
};
