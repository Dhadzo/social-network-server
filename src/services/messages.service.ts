import pool from '../config/database';
import {
  Message,
  MessageWithUser,
  Conversation,
  ConversationWithDetails,
  CreateMessageDTO,
  CreateConversationDTO
} from '../types/message.types';
import { ResultSetHeader } from 'mysql2';
import { NotificationsService } from './notifications.service';

export class MessagesService {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  async createConversation(
    userId: number,
    data: CreateConversationDTO
  ): Promise<ConversationWithDetails> {
    const connection = await pool.getConnection();

    console.log('data', data);
    try {
      await connection.beginTransaction();

      // Create conversation
      const [conversationResult] = await connection.execute<ResultSetHeader>(
        'INSERT INTO conversations (type) VALUES (?)',
        [data.type]
      );
      const conversationId = conversationResult.insertId;

      // Add participants (including current user)
      const allParticipantIds = [...new Set([...data.participant_ids, userId])];
      const participantValues = allParticipantIds.map((pid) => [
        conversationId,
        pid
      ]);
      await connection.query(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ?',
        [participantValues]
      );

      // Fetch the created conversation with details
      const [conversations] = await connection.execute<any[]>(
        `SELECT 
                    c.*,
                    cp.user_id,
                    cp.last_read_at,
                    u.username,
                    u.email,
                    u.name
                FROM conversations c
                JOIN conversation_participants cp ON c.id = cp.conversation_id
                JOIN users u ON cp.user_id = u.id
                WHERE c.id = ?`,
        [conversationId]
      );

      await connection.commit();

      // Format the response
      const conversation: ConversationWithDetails = {
        id: conversationId,
        type: data.type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        participants: conversations.map((row) => ({
          conversation_id: conversationId,
          user_id: row.user_id,
          last_read_at: row.last_read_at,
          created_at: row.created_at,
          user: {
            id: row.user_id,
            username: row.username,
            email: row.email,
            name: row.name
          }
        }))
      };

      return conversation;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createMessage(
    userId: number,
    data: CreateMessageDTO
  ): Promise<MessageWithUser> {
    const connection = await pool.getConnection();
    try {
      // Verify user is part of the conversation
      const [participants] = await connection.execute<any[]>(
        'SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
        [data.conversation_id, userId]
      );

      if (participants.length === 0) {
        throw new Error('User is not part of this conversation');
      }

      // Create message
      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO messages (conversation_id, sender_id, content, type) VALUES (?, ?, ?, ?)',
        [data.conversation_id, userId, data.content, data.type || 'text']
      );

      // Update conversation's updated_at timestamp
      await connection.execute(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [data.conversation_id]
      );

      // Fetch the created message with sender details
      const [messages] = await connection.execute<any[]>(
        `SELECT 
                    m.*,
                    u.username,
                    u.email,
                    u.name
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.id = ?`,
        [result.insertId]
      );

      const message = messages[0];

      // Get all participants except the sender
      const [recipients] = await connection.execute<any[]>(
        `SELECT cp.user_id, u.name 
         FROM conversation_participants cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.conversation_id = ? AND cp.user_id != ?`,
        [data.conversation_id, userId]
      );

      // Create notifications for all recipients
      for (const recipient of recipients) {
        await this.notificationsService.createNotification({
          userId: recipient.user_id,
          actorId: userId,
          type: 'message',
          message: `${
            message.name
          } sent you a message: ${message.content.substring(0, 50)}${
            message.content.length > 50 ? '...' : ''
          }`
        });
      }

      return {
        id: message.id,
        conversation_id: message.conversation_id,
        sender_id: message.sender_id,
        content: message.content,
        type: message.type,
        status: message.status,
        created_at: message.created_at,
        updated_at: message.updated_at,
        sender: {
          id: message.sender_id,
          username: message.username,
          email: message.email,
          name: message.name
        }
      };
    } finally {
      connection.release();
    }
  }

  async getConversationMessages(
    conversationId: number,
    userId: number,
    limit: number = 50,
    before?: string
  ): Promise<MessageWithUser[]> {
    console.log('conversationId', conversationId);

    // Verify user is part of the conversation
    const [participants] = await pool.query<any[]>(
      'SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, userId]
    );

    if (participants.length === 0) {
      throw new Error('User is not part of this conversation');
    }

    // Validate and format the before timestamp if provided
    let beforeTimestamp = null;
    if (before && before !== '0') {
      try {
        // Try to parse the timestamp
        const date = new Date(before);
        if (!isNaN(date.getTime())) {
          beforeTimestamp = date.toISOString().slice(0, 19).replace('T', ' ');
        }
      } catch (error) {
        console.error('Invalid timestamp format:', error);
      }
    }

    // Fetch messages with explicit column selection
    const [messages] = await pool.query<any[]>(
      `SELECT 
                m.id,
                m.conversation_id,
                m.sender_id,
                m.content,
                m.type,
                m.status,
                m.created_at,
                m.updated_at,
                u.username,
                u.email,
                u.name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ${beforeTimestamp ? 'AND m.created_at < ?' : ''}
            ORDER BY m.created_at ASC
            LIMIT ?`,
      beforeTimestamp
        ? [conversationId, beforeTimestamp, limit]
        : [conversationId, limit]
    );

    return messages.map((message) => ({
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      content: message.content,
      type: message.type,
      status: message.status,
      created_at: message.created_at,
      updated_at: message.updated_at,
      sender: {
        id: message.sender_id,
        username: message.username,
        email: message.email,
        name: message.name
      }
    }));
  }

  async getUserConversations(
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<ConversationWithDetails[]> {
    const [conversations] = await pool.query<any[]>(
      `SELECT 
                c.*,
                cp.user_id,
                cp.last_read_at,
                u.username,
                u.email,
                u.name,
                m.id as last_message_id,
                m.content as last_message_content,
                m.type as last_message_type,
                m.created_at as last_message_created_at,
                m.sender_id as last_message_sender_id,
                sender.username as last_message_sender_username,
                sender.email as last_message_sender_email,
                sender.name as last_message_sender_name
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            JOIN users u ON cp.user_id = u.id
            LEFT JOIN (
                SELECT m1.*
                FROM messages m1
                LEFT JOIN messages m2 ON m1.conversation_id = m2.conversation_id 
                    AND m1.created_at < m2.created_at
                WHERE m2.id IS NULL
            ) m ON c.id = m.conversation_id
            LEFT JOIN users sender ON m.sender_id = sender.id
            WHERE c.id IN (
                SELECT conversation_id 
                FROM conversation_participants 
                WHERE user_id = ?
            )
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // Group conversations and their participants
    const conversationMap = new Map<number, ConversationWithDetails>();

    conversations.forEach((row) => {
      if (!conversationMap.has(row.id)) {
        conversationMap.set(row.id, {
          id: row.id,
          type: row.type,
          created_at: row.created_at,
          updated_at: row.updated_at,
          participants: [],
          last_message: row.last_message_id
            ? {
                id: row.last_message_id,
                conversation_id: row.id,
                sender_id: row.last_message_sender_id,
                content: row.last_message_content,
                type: row.last_message_type,
                status: 'sent',
                created_at: row.last_message_created_at,
                updated_at: row.last_message_created_at,
                sender: {
                  id: row.last_message_sender_id,
                  username: row.last_message_sender_username,
                  email: row.last_message_sender_email,
                  name: row.last_message_sender_name
                }
              }
            : undefined
        });
      }

      const conversation = conversationMap.get(row.id)!;
      conversation.participants.push({
        conversation_id: row.id,
        user_id: row.user_id,
        last_read_at: row.last_read_at,
        created_at: row.created_at,
        user: {
          id: row.user_id,
          username: row.username,
          email: row.email,
          name: row.name
        }
      });
    });

    return Array.from(conversationMap.values());
  }

  async markMessagesAsRead(
    conversationId: number,
    userId: number
  ): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update last_read_at in conversation_participants
      await connection.execute(
        'UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND user_id = ?',
        [conversationId, userId]
      );

      // Update message status to read
      await connection.execute(
        'UPDATE messages SET status = "read" WHERE conversation_id = ? AND sender_id != ? AND status != "read"',
        [conversationId, userId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getConversationParticipants(conversationId: number) {
    const [participants] = await pool.execute<any[]>(
      'SELECT * FROM conversation_participants WHERE conversation_id = ?',
      [conversationId]
    );
    return participants;
  }
}
