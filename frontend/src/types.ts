/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DiaryEntry {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  content: string; // decrypted plain text (used in memory)
  mood: string;
  tags: string[];
  signature: string; // the pen name signed onto this diary entry
  createdAt: string;
  updatedAt: string;
  
  // Simulated database ciphertext storage structures to respect the AES-GCM local storage spec
  ciphertext?: string;
  nonce?: string;
  salt?: string;
}

export interface UserProfile {
  username: string;
  penName: string;
  isLoggedIn: boolean;
  passwordHash?: string; // simulation for testing credentials
}

export type BookViewMode = 'closed' | 'open-write' | 'open-search' | 'open-read';

export interface DatabaseState {
  entries: DiaryEntry[];
  currentUser: UserProfile;
  masterPasswordSet: boolean;
  securityLogs: string[];
}
