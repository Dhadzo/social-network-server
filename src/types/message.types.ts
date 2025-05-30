import { SafeUser } from './auth.types';

export type MessageType = 'text' | 'image' | 'file';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: number;
  type: ConversationType;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  last_message?: Message;
}

export interface ConversationParticipant {
  conversation_id: number;
  user_id: number;
  last_read_at: string | null;
  created_at: string;
  user?: SafeUser;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  type: MessageType;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
  sender?: SafeUser;
}

export interface CreateMessageDTO {
  conversation_id: number;
  content: string;
  type?: MessageType;
}

export interface CreateConversationDTO {
  type: ConversationType;
  participant_ids: number[];
}

export interface MessageWithUser extends Message {
  sender: SafeUser;
}

export interface ConversationWithDetails extends Conversation {
  participants: (ConversationParticipant & { user: SafeUser })[];
  last_message?: MessageWithUser;
}
