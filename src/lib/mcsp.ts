/**
 * MCSP - Memory Core Sync Protocol
 *
 * Soul Architectureをユーザーの「内的OS」としてFirestoreから取得し、
 * AI呼び出し時のsystem promptへ自動注入するヘルパー。
 *
 * これにより、全てのAI呼び出しがユーザーの魂の設計図を前提として動作する。
 */

import { getAdminDb } from './firebase-admin';

/** Firestore上のSoul Architectureドキュメント */
export interface SoulArchitectureDoc {
  content: string;        // Markdown全文
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  aiProvider: string;
  aiModel: string;
  version: number;
  generatedAt: FirebaseFirestore.Timestamp;
}

/**
 * ユーザーのSoul ArchitectureをFirestoreから取得する
 * 未生成の場合はnullを返す
 */
export async function fetchSoulArchitecture(uid: string): Promise<string | null> {
  const db = await getAdminDb();
  const ref = db.collection('users').doc(uid).collection('soul_architecture').doc('core');
  const snap = await ref.get();

  if (!snap.exists) return null;
  return (snap.data() as SoulArchitectureDoc).content ?? null;
}

/**
 * Soul Architectureをsystem promptに注入して返す
 * Soul Architectureが未生成の場合はベースのsystem promptをそのまま返す
 */
export async function injectSoulContext(uid: string, baseSystemPrompt: string): Promise<string> {
  const soulContent = await fetchSoulArchitecture(uid);
  if (!soulContent) return baseSystemPrompt;

  return `${baseSystemPrompt}

---
## ユーザーの魂の設計図（Soul Architecture）

以下はこのユーザー固有の内的OSです。全ての回答・分析において、この設計図を前提として最適化してください。

${soulContent}
---`;
}
