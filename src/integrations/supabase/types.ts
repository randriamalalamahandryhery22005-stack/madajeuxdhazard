export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activation_codes: {
        Row: {
          code_name: string
          code_value: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code_name: string
          code_value?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code_name?: string
          code_value?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_config_logs: {
        Row: {
          config_id: string | null
          created_at: string
          error: string | null
          id: string
          prompt: string
          response: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          config_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          prompt: string
          response?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          config_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          prompt?: string
          response?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_config_logs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "app_config"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          prompt: string | null
          version: number
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          prompt?: string | null
          version: number
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          prompt?: string | null
          version?: number
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      app_updates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          title: string
          update_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string
          update_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string
          update_url?: string
        }
        Relationships: []
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "global_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "global_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          admin_response: string | null
          created_at: string
          game_mode: string
          id: string
          image_url: string | null
          message: string | null
          responded_at: string | null
          responded_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          game_mode: string
          id?: string
          image_url?: string | null
          message?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          game_mode?: string
          id?: string
          image_url?: string | null
          message?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          last_message_at: string
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      custom_predictions: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          requires_subscription: boolean
          slug: string
          subscription_key: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          requires_subscription?: boolean
          slug: string
          subscription_key?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          requires_subscription?: boolean
          slug?: string
          subscription_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      football_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          payload: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          payload?: Json
        }
        Relationships: []
      }
      game_access: {
        Row: {
          days_requested: number
          expires_at: string | null
          game_mode: string
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          payment_proof_url: string | null
          price_amount: number
          rejection_reason: string | null
          user_id: string
        }
        Insert: {
          days_requested?: number
          expires_at?: string | null
          game_mode: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          payment_proof_url?: string | null
          price_amount?: number
          rejection_reason?: string | null
          user_id: string
        }
        Update: {
          days_requested?: number
          expires_at?: string | null
          game_mode?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          payment_proof_url?: string | null
          price_amount?: number
          rejection_reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      game_usage: {
        Row: {
          game_mode: string | null
          game_name: string
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          game_mode?: string | null
          game_name: string
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          game_mode?: string | null
          game_name?: string
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gen_store_items: {
        Row: {
          body: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          download_count: number
          file_name: string
          file_path: string
          file_size: number
          file_url: string | null
          id: string
          is_published: boolean
          link_url: string | null
          mime_type: string | null
          post_type: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          download_count?: number
          file_name: string
          file_path: string
          file_size?: number
          file_url?: string | null
          id?: string
          is_published?: boolean
          link_url?: string | null
          mime_type?: string | null
          post_type?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          download_count?: number
          file_name?: string
          file_path?: string
          file_size?: number
          file_url?: string | null
          id?: string
          is_published?: boolean
          link_url?: string | null
          mime_type?: string | null
          post_type?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gen_store_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          item_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          item_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          item_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gen_store_reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "gen_store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      global_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          reply_to_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          reply_to_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          reply_to_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "global_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      live_fixtures: {
        Row: {
          away_goals: number | null
          away_id: number | null
          away_logo: string | null
          away_name: string | null
          country: string | null
          fixture_id: number
          home_goals: number | null
          home_id: number | null
          home_logo: string | null
          home_name: string | null
          league_id: number | null
          league_logo: string | null
          league_name: string | null
          minute: number | null
          raw: Json
          status_long: string | null
          status_short: string | null
          updated_at: string
        }
        Insert: {
          away_goals?: number | null
          away_id?: number | null
          away_logo?: string | null
          away_name?: string | null
          country?: string | null
          fixture_id: number
          home_goals?: number | null
          home_id?: number | null
          home_logo?: string | null
          home_name?: string | null
          league_id?: number | null
          league_logo?: string | null
          league_name?: string | null
          minute?: number | null
          raw: Json
          status_long?: string | null
          status_short?: string | null
          updated_at?: string
        }
        Update: {
          away_goals?: number | null
          away_id?: number | null
          away_logo?: string | null
          away_name?: string | null
          country?: string | null
          fixture_id?: number
          home_goals?: number | null
          home_id?: number | null
          home_logo?: string | null
          home_name?: string | null
          league_id?: number | null
          league_logo?: string | null
          league_name?: string | null
          minute?: number | null
          raw?: Json
          status_long?: string | null
          status_short?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      login_history: {
        Row: {
          created_at: string
          device_info: string | null
          event_type: string
          id: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          event_type: string
          id?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          event_type?: string
          id?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_global: boolean
          is_read: boolean
          message: string
          target_user_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean
          is_read?: boolean
          message: string
          target_user_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean
          is_read?: boolean
          message?: string
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      online_users: {
        Row: {
          device_id: string | null
          last_ping: string
          updated_at: string
          user_id: string
        }
        Insert: {
          device_id?: string | null
          last_ping?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          device_id?: string | null
          last_ping?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          created_at: string
          id: string
          new_password: string | null
          reset_code: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_identifier: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_password?: string | null
          reset_code?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_identifier: string
        }
        Update: {
          created_at?: string
          id?: string
          new_password?: string | null
          reset_code?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_identifier?: string
        }
        Relationships: []
      }
      prediction_logs: {
        Row: {
          created_at: string
          custom_prediction_id: string | null
          id: string
          input_params: Json
          mode: string
          reliability_avg: number | null
          results: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_prediction_id?: string | null
          id?: string
          input_params?: Json
          mode: string
          reliability_avg?: number | null
          results?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          custom_prediction_id?: string | null
          id?: string
          input_params?: Json
          mode?: string
          reliability_avg?: number | null
          results?: Json
          user_id?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          created_at: string
          id: string
          input_coefficient: number
          input_time: string
          mode: string
          results: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_coefficient: number
          input_time: string
          mode: string
          results?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_coefficient?: number
          input_time?: string
          mode?: string
          results?: Json
          user_id?: string
        }
        Relationships: []
      }
      premium_bonuses: {
        Row: {
          created_at: string
          days: number
          expires_at: string
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          days: number
          expires_at: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          days?: number
          expires_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          country_code: string | null
          created_at: string
          device_id: string | null
          device_info: string | null
          email: string
          full_name: string | null
          gen_store_last_seen_at: string | null
          gender: string | null
          id: string
          is_validated: boolean
          last_seen_at: string | null
          location: string | null
          login_count: number
          name: string
          phone: string | null
          region: string | null
          status: string
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          country_code?: string | null
          created_at?: string
          device_id?: string | null
          device_info?: string | null
          email: string
          full_name?: string | null
          gen_store_last_seen_at?: string | null
          gender?: string | null
          id?: string
          is_validated?: boolean
          last_seen_at?: string | null
          location?: string | null
          login_count?: number
          name: string
          phone?: string | null
          region?: string | null
          status?: string
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          country_code?: string | null
          created_at?: string
          device_id?: string | null
          device_info?: string | null
          email?: string
          full_name?: string | null
          gen_store_last_seen_at?: string | null
          gender?: string | null
          id?: string
          is_validated?: boolean
          last_seen_at?: string | null
          location?: string | null
          login_count?: number
          name?: string
          phone?: string | null
          region?: string | null
          status?: string
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      protected_admins: {
        Row: {
          created_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          requested_days: number
          requested_game: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          requested_days?: number
          requested_game: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          requested_days?: number
          requested_game?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_coins: {
        Row: {
          balance: number
          consumption_rate_per_hour: number
          created_at: string
          last_consumed_at: string | null
          plan_expires_at: string | null
          plan_started_at: string | null
          plan_type: string
          total_consumed: number
          total_granted: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          consumption_rate_per_hour?: number
          created_at?: string
          last_consumed_at?: string | null
          plan_expires_at?: string | null
          plan_started_at?: string | null
          plan_type?: string
          total_consumed?: number
          total_granted?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          consumption_rate_per_hour?: number
          created_at?: string
          last_consumed_at?: string | null
          plan_expires_at?: string | null
          plan_started_at?: string | null
          plan_type?: string
          total_consumed?: number
          total_granted?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          created_at: string
          game_name: string | null
          id: string
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_name?: string | null
          id?: string
          points?: number
          reason?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_name?: string | null
          id?: string
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_call_rooms: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          initiated_by: string
          started_at: string
          status: string
          title: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          initiated_by: string
          started_at?: string
          status?: string
          title?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          initiated_by?: string
          started_at?: string
          status?: string
          title?: string | null
        }
        Relationships: []
      }
      voice_call_signals: {
        Row: {
          call_id: string
          created_at: string
          from_user: string
          id: string
          kind: string
          payload: Json
          to_user: string
        }
        Insert: {
          call_id: string
          created_at?: string
          from_user: string
          id?: string
          kind: string
          payload: Json
          to_user: string
        }
        Update: {
          call_id?: string
          created_at?: string
          from_user?: string
          id?: string
          kind?: string
          payload?: Json
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_call_signals_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "voice_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_calls: {
        Row: {
          callee_id: string
          caller_id: string
          conversation_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_access_code_required: { Args: never; Returns: boolean }
      consume_user_coins: { Args: never; Returns: undefined }
      get_active_device: { Args: { _user_id: string }; Returns: string }
      get_total_revenue: { Args: never; Returns: number }
      has_active_premium_bonus: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      verify_app_access_code: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
