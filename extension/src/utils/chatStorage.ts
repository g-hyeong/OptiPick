/**
 * 챗봇 세션/메시지 Storage 유틸리티 (IndexedDB via Dexie)
 */
import { db } from '@/db';
import type {
  ChatMessage,
  StoredChatSession,
  StoredChatMessage,
} from '@/types/chatbot';

/**
 * historyId로 가장 최근 채팅 세션 조회
 */
export async function getChatSessionByHistoryId(
  historyId: string
): Promise<StoredChatSession | undefined> {
  const sessions = await db.chatSessions
    .where('historyId')
    .equals(historyId)
    .sortBy('updatedAt');
  return sessions[sessions.length - 1]; // 가장 최근 세션
}

/**
 * historyId로 모든 채팅 세션 조회 (최신순)
 */
export async function getChatSessionsByHistoryId(
  historyId: string
): Promise<StoredChatSession[]> {
  const sessions = await db.chatSessions
    .where('historyId')
    .equals(historyId)
    .toArray();
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * threadId로 채팅 세션 조회
 */
export async function getChatSession(
  threadId: string
): Promise<StoredChatSession | undefined> {
  return db.chatSessions.get(threadId);
}

/**
 * 새 채팅 세션 저장
 */
export async function saveChatSession(
  session: StoredChatSession
): Promise<void> {
  await db.chatSessions.put(session);
}

/**
 * 채팅 세션 업데이트 (updatedAt 갱신)
 */
export async function updateChatSessionTimestamp(
  threadId: string
): Promise<void> {
  await db.chatSessions.update(threadId, { updatedAt: Date.now() });
}

/**
 * 채팅 세션 삭제 (메시지도 함께 삭제)
 */
export async function deleteChatSession(threadId: string): Promise<void> {
  await db.transaction('rw', [db.chatSessions, db.chatMessages], async () => {
    await db.chatMessages.where('threadId').equals(threadId).delete();
    await db.chatSessions.delete(threadId);
  });
}

/**
 * historyId로 채팅 세션 삭제
 */
export async function deleteChatSessionByHistoryId(
  historyId: string
): Promise<void> {
  const session = await getChatSessionByHistoryId(historyId);
  if (session) {
    await deleteChatSession(session.threadId);
  }
}

/**
 * 세션의 모든 메시지 조회 (시간순)
 */
export async function getChatMessages(
  threadId: string
): Promise<StoredChatMessage[]> {
  return db.chatMessages
    .where('threadId')
    .equals(threadId)
    .sortBy('timestamp');
}

/**
 * 메시지 저장 (단일)
 */
export async function saveChatMessage(
  message: StoredChatMessage
): Promise<void> {
  await db.chatMessages.put(message);
  // 세션 updatedAt 갱신
  await updateChatSessionTimestamp(message.threadId);
}

/**
 * 메시지 일괄 저장
 */
export async function saveChatMessages(
  messages: StoredChatMessage[]
): Promise<void> {
  if (messages.length === 0) return;
  await db.chatMessages.bulkPut(messages);
  // 세션 updatedAt 갱신
  const threadId = messages[0].threadId;
  await updateChatSessionTimestamp(threadId);
}

/**
 * 메시지 업데이트 (스트리밍 완료 시 content/sources 업데이트)
 */
export async function updateChatMessage(
  id: string,
  changes: Partial<Omit<StoredChatMessage, 'id' | 'threadId'>>
): Promise<void> {
  await db.chatMessages.update(id, changes);
}

/**
 * ChatMessage UI 타입으로 변환
 */
export function toUIChatMessage(stored: StoredChatMessage): ChatMessage {
  return {
    id: stored.id,
    role: stored.role,
    content: stored.content,
    timestamp: stored.timestamp,
    sources: stored.sources,
    isStreaming: false,
  };
}

/**
 * StoredChatMessage로 변환
 */
export function toStoredChatMessage(
  message: ChatMessage,
  threadId: string
): StoredChatMessage {
  return {
    id: message.id,
    threadId,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    sources: message.sources,
  };
}

/**
 * 최근 채팅 세션 목록 조회 (최신순)
 */
export async function getRecentChatSessions(
  limit = 10
): Promise<StoredChatSession[]> {
  return db.chatSessions.orderBy('updatedAt').reverse().limit(limit).toArray();
}

/**
 * 오래된 채팅 세션 정리 (30일 이상)
 */
export async function cleanupOldChatSessions(
  maxAgeDays = 30
): Promise<number> {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const oldSessions = await db.chatSessions
    .where('updatedAt')
    .below(cutoff)
    .toArray();

  for (const session of oldSessions) {
    await deleteChatSession(session.threadId);
  }

  return oldSessions.length;
}
