export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          locale: string;
          settings_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          locale?: string;
          settings_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          locale?: string;
          settings_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      friendships: {
        Row: {
          id: string;
          user_a: string;
          user_b: string;
          status: 'pending' | 'accepted' | 'blocked';
          initiated_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_a: string;
          user_b: string;
          status?: 'pending' | 'accepted' | 'blocked';
          initiated_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_a?: string;
          user_b?: string;
          status?: 'pending' | 'accepted' | 'blocked';
          initiated_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'friendships_user_a_fkey';
            columns: ['user_a'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_user_b_fkey';
            columns: ['user_b'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_initiated_by_fkey';
            columns: ['initiated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      game_invitations: {
        Row: {
          id: string;
          from_user: string;
          to_user: string | null;
          status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
          game_config: Json;
          invite_code: string;
          created_at: string;
          updated_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          from_user: string;
          to_user?: string | null;
          status?: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
          game_config: Json;
          invite_code?: string;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          from_user?: string;
          to_user?: string | null;
          status?: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
          game_config?: Json;
          invite_code?: string;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_invitations_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_invitations_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      games: {
        Row: {
          id: string;
          red_player: string;
          blue_player: string;
          status:
            | 'started'
            | 'aborted'
            | 'checkmate'
            | 'resign'
            | 'timeout'
            | 'stalemate'
            | 'draw'
            | 'dispute';
          winner: 'red' | 'blue' | null;
          result_reason: string | null;
          pgn: string | null;
          time_control: Json;
          invitation_id: string | null;
          started_at: string;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          red_player: string;
          blue_player: string;
          status?:
            | 'started'
            | 'aborted'
            | 'checkmate'
            | 'resign'
            | 'timeout'
            | 'stalemate'
            | 'draw'
            | 'dispute';
          winner?: 'red' | 'blue' | null;
          result_reason?: string | null;
          pgn?: string | null;
          time_control: Json;
          invitation_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          red_player?: string;
          blue_player?: string;
          status?:
            | 'started'
            | 'aborted'
            | 'checkmate'
            | 'resign'
            | 'timeout'
            | 'stalemate'
            | 'draw'
            | 'dispute';
          winner?: 'red' | 'blue' | null;
          result_reason?: string | null;
          pgn?: string | null;
          time_control?: Json;
          invitation_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'games_red_player_fkey';
            columns: ['red_player'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_blue_player_fkey';
            columns: ['blue_player'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_invitation_id_fkey';
            columns: ['invitation_id'];
            isOneToOne: false;
            referencedRelation: 'game_invitations';
            referencedColumns: ['id'];
          }
        ];
      };
      feedback: {
        Row: {
          id: string;
          user_id: string | null;
          message: string;
          page_url: string;
          context_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          message: string;
          page_url: string;
          context_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          message?: string;
          page_url?: string;
          context_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'feedback_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
