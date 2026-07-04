export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      candidate_votes: {
        Row: {
          candidate_id: string;
          comment: string | null;
          rating: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          candidate_id: string;
          comment?: string | null;
          rating: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          candidate_id?: string;
          comment?: string | null;
          rating?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_votes_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "lodging_candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidate_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_items: {
        Row: {
          assigned_to: string | null;
          created_at: string;
          created_by: string;
          done: boolean;
          event_id: string | null;
          id: string;
          section: string;
          title: string;
          trip_id: string;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string;
          created_by: string;
          done?: boolean;
          event_id?: string | null;
          id?: string;
          section?: string;
          title: string;
          trip_id: string;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string;
          created_by?: string;
          done?: boolean;
          event_id?: string | null;
          id?: string;
          section?: string;
          title?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_items_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_items_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "trip_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_items_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      document_shares: {
        Row: {
          document_id: string;
          expires_at: string | null;
          id: string;
          shared_at: string;
          shared_by: string;
          shared_with: string | null;
          trip_id: string;
        };
        Insert: {
          document_id: string;
          expires_at?: string | null;
          id?: string;
          shared_at?: string;
          shared_by: string;
          shared_with?: string | null;
          trip_id: string;
        };
        Update: {
          document_id?: string;
          expires_at?: string | null;
          id?: string;
          shared_at?: string;
          shared_by?: string;
          shared_with?: string | null;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_shares_shared_by_fkey";
            columns: ["shared_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_shares_shared_with_fkey";
            columns: ["shared_with"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_shares_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"];
          deleted_at: string | null;
          expires_at: string | null;
          file_name: string;
          id: string;
          metadata: Json;
          mime_type: string;
          owner_id: string;
          scope: Database["public"]["Enums"]["document_scope"];
          size_bytes: number;
          storage_path: string;
          trip_id: string | null;
          uploaded_at: string;
        };
        Insert: {
          category?: Database["public"]["Enums"]["document_category"];
          deleted_at?: string | null;
          expires_at?: string | null;
          file_name: string;
          id?: string;
          metadata?: Json;
          mime_type: string;
          owner_id: string;
          scope: Database["public"]["Enums"]["document_scope"];
          size_bytes: number;
          storage_path: string;
          trip_id?: string | null;
          uploaded_at?: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["document_category"];
          deleted_at?: string | null;
          expires_at?: string | null;
          file_name?: string;
          id?: string;
          metadata?: Json;
          mime_type?: string;
          owner_id?: string;
          scope?: Database["public"]["Enums"]["document_scope"];
          size_bytes?: number;
          storage_path?: string;
          trip_id?: string | null;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      emergency_sheets: {
        Row: {
          allergies: string | null;
          blood_group: string | null;
          emergency_contacts: string | null;
          insurance_phone: string | null;
          insurance_policy: string | null;
          notes: string | null;
          trip_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          allergies?: string | null;
          blood_group?: string | null;
          emergency_contacts?: string | null;
          insurance_phone?: string | null;
          insurance_policy?: string | null;
          notes?: string | null;
          trip_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          allergies?: string | null;
          blood_group?: string | null;
          emergency_contacts?: string | null;
          insurance_phone?: string | null;
          insurance_policy?: string | null;
          notes?: string | null;
          trip_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emergency_sheets_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emergency_sheets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      event_documents: {
        Row: {
          document_id: string;
          event_id: string;
        };
        Insert: {
          document_id: string;
          event_id: string;
        };
        Update: {
          document_id?: string;
          event_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_documents_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_documents_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "trip_events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_notes: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          event_id: string;
          id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          event_id: string;
          id?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_notes_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "trip_events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_participants: {
        Row: {
          added_at: string;
          event_id: string;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          event_id: string;
          user_id: string;
        };
        Update: {
          added_at?: string;
          event_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "trip_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_beneficiaries: {
        Row: {
          expense_id: string;
          user_id: string;
        };
        Insert: {
          expense_id: string;
          user_id: string;
        };
        Update: {
          expense_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_beneficiaries_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_beneficiaries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          created_by: string;
          currency: string;
          event_id: string | null;
          id: string;
          is_settlement: boolean;
          paid_by: string;
          spent_on: string;
          title: string;
          trip_id: string;
        };
        Insert: {
          amount: number;
          category?: string;
          created_at?: string;
          created_by: string;
          currency?: string;
          event_id?: string | null;
          id?: string;
          is_settlement?: boolean;
          paid_by: string;
          spent_on?: string;
          title: string;
          trip_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          created_by?: string;
          currency?: string;
          event_id?: string | null;
          id?: string;
          is_settlement?: boolean;
          paid_by?: string;
          spent_on?: string;
          title?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "trip_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_paid_by_fkey";
            columns: ["paid_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      idea_votes: {
        Row: {
          created_at: string;
          idea_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          idea_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          idea_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_votes_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "trip_ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lodging_candidates: {
        Row: {
          check_in: string;
          check_out: string;
          chosen_event_id: string | null;
          created_at: string;
          created_by: string;
          id: string;
          notes: string | null;
          price: string | null;
          status: string;
          title: string;
          trip_id: string;
          url: string | null;
        };
        Insert: {
          check_in: string;
          check_out: string;
          chosen_event_id?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          notes?: string | null;
          price?: string | null;
          status?: string;
          title: string;
          trip_id: string;
          url?: string | null;
        };
        Update: {
          check_in?: string;
          check_out?: string;
          chosen_event_id?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          notes?: string | null;
          price?: string | null;
          status?: string;
          title?: string;
          trip_id?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lodging_candidates_chosen_event_id_fkey";
            columns: ["chosen_event_id"];
            isOneToOne: false;
            referencedRelation: "trip_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lodging_candidates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lodging_candidates_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      poll_votes: {
        Row: {
          option_index: number;
          poll_id: string;
          user_id: string;
          voted_at: string;
        };
        Insert: {
          option_index: number;
          poll_id: string;
          user_id: string;
          voted_at?: string;
        };
        Update: {
          option_index?: number;
          poll_id?: string;
          user_id?: string;
          voted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      polls: {
        Row: {
          closed_at: string | null;
          created_at: string;
          created_by: string;
          id: string;
          options: string[];
          question: string;
          trip_id: string;
        };
        Insert: {
          closed_at?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          options: string[];
          question: string;
          trip_id: string;
        };
        Update: {
          closed_at?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          options?: string[];
          question?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "polls_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "polls_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          last_export_at: string | null;
          locale: string;
          notification_preferences: Json;
          timezone: string;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          last_export_at?: string | null;
          locale?: string;
          notification_preferences?: Json;
          timezone?: string;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          last_export_at?: string | null;
          locale?: string;
          notification_preferences?: Json;
          timezone?: string;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_events: {
        Row: {
          created_at: string;
          created_by: string;
          ends_at: string | null;
          id: string;
          location_address: string | null;
          location_lat: number | null;
          location_lng: number | null;
          location_name: string | null;
          metadata: Json;
          notes: string | null;
          starts_at: string;
          timezone: string;
          title: string;
          trip_id: string;
          type: Database["public"]["Enums"]["event_type"];
        };
        Insert: {
          created_at?: string;
          created_by: string;
          ends_at?: string | null;
          id?: string;
          location_address?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_name?: string | null;
          metadata?: Json;
          notes?: string | null;
          starts_at: string;
          timezone: string;
          title: string;
          trip_id: string;
          type: Database["public"]["Enums"]["event_type"];
        };
        Update: {
          created_at?: string;
          created_by?: string;
          ends_at?: string | null;
          id?: string;
          location_address?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_name?: string | null;
          metadata?: Json;
          notes?: string | null;
          starts_at?: string;
          timezone?: string;
          title?: string;
          trip_id?: string;
          type?: Database["public"]["Enums"]["event_type"];
        };
        Relationships: [
          {
            foreignKeyName: "trip_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_events_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_ideas: {
        Row: {
          cost_currency: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          estimated_cost: number | null;
          estimated_duration_minutes: number | null;
          external_url: string | null;
          id: string;
          location_lat: number | null;
          location_lng: number | null;
          location_name: string | null;
          scheduled_event_id: string | null;
          status: Database["public"]["Enums"]["idea_status"];
          tags: string[];
          title: string;
          trip_id: string;
        };
        Insert: {
          cost_currency?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          estimated_cost?: number | null;
          estimated_duration_minutes?: number | null;
          external_url?: string | null;
          id?: string;
          location_lat?: number | null;
          location_lng?: number | null;
          location_name?: string | null;
          scheduled_event_id?: string | null;
          status?: Database["public"]["Enums"]["idea_status"];
          tags?: string[];
          title: string;
          trip_id: string;
        };
        Update: {
          cost_currency?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          estimated_cost?: number | null;
          estimated_duration_minutes?: number | null;
          external_url?: string | null;
          id?: string;
          location_lat?: number | null;
          location_lng?: number | null;
          location_name?: string | null;
          scheduled_event_id?: string | null;
          status?: Database["public"]["Enums"]["idea_status"];
          tags?: string[];
          title?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_ideas_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_ideas_scheduled_event_id_fkey";
            columns: ["scheduled_event_id"];
            isOneToOne: false;
            referencedRelation: "trip_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_ideas_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          invited_by: string;
          invited_email: string;
          role: Database["public"]["Enums"]["trip_role"];
          token: string;
          trip_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          invited_email: string;
          role?: Database["public"]["Enums"]["trip_role"];
          token?: string;
          trip_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          invited_email?: string;
          role?: Database["public"]["Enums"]["trip_role"];
          token?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_invitations_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_participants: {
        Row: {
          calendar_token: string;
          invited_by: string | null;
          joined_at: string;
          role: Database["public"]["Enums"]["trip_role"];
          trip_id: string;
          user_id: string;
        };
        Insert: {
          calendar_token?: string;
          invited_by?: string | null;
          joined_at?: string;
          role?: Database["public"]["Enums"]["trip_role"];
          trip_id: string;
          user_id: string;
        };
        Update: {
          calendar_token?: string;
          invited_by?: string | null;
          joined_at?: string;
          role?: Database["public"]["Enums"]["trip_role"];
          trip_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_participants_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_participants_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_photos: {
        Row: {
          caption: string | null;
          created_at: string;
          event_id: string | null;
          id: string;
          size_bytes: number;
          storage_path: string;
          thumb_path: string | null;
          trip_id: string;
          uploaded_by: string;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          size_bytes?: number;
          storage_path: string;
          thumb_path?: string | null;
          trip_id: string;
          uploaded_by: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          size_bytes?: number;
          storage_path?: string;
          thumb_path?: string | null;
          trip_id?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_photos_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "trip_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_photos_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_photos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trips: {
        Row: {
          archived_at: string | null;
          cover_image_url: string | null;
          created_at: string;
          created_by: string;
          default_timezone: string;
          destination: string;
          destination_lat: number | null;
          destination_lng: number | null;
          end_date: string;
          id: string;
          name: string;
          start_date: string;
          whatsapp_group_url: string | null;
        };
        Insert: {
          archived_at?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          created_by: string;
          default_timezone?: string;
          destination: string;
          destination_lat?: number | null;
          destination_lng?: number | null;
          end_date: string;
          id?: string;
          name: string;
          start_date: string;
          whatsapp_group_url?: string | null;
        };
        Update: {
          archived_at?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          created_by?: string;
          default_timezone?: string;
          destination?: string;
          destination_lat?: number | null;
          destination_lng?: number | null;
          end_date?: string;
          id?: string;
          name?: string;
          start_date?: string;
          whatsapp_group_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "trips_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_passkeys: {
        Row: {
          counter: number;
          created_at: string;
          credential_id: string;
          device_name: string | null;
          id: string;
          last_used_at: string | null;
          public_key: string;
          transports: string[];
          user_id: string;
        };
        Insert: {
          counter?: number;
          created_at?: string;
          credential_id: string;
          device_name?: string | null;
          id?: string;
          last_used_at?: string | null;
          public_key: string;
          transports?: string[];
          user_id: string;
        };
        Update: {
          counter?: number;
          created_at?: string;
          credential_id?: string;
          device_name?: string | null;
          id?: string;
          last_used_at?: string | null;
          public_key?: string;
          transports?: string[];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_passkeys_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      vault_access_log: {
        Row: {
          accessed_at: string;
          accessed_by: string;
          action: Database["public"]["Enums"]["vault_action"];
          document_id: string | null;
          document_owner_id: string;
          id: string;
          ip_address: unknown;
          user_agent: string | null;
        };
        Insert: {
          accessed_at?: string;
          accessed_by: string;
          action: Database["public"]["Enums"]["vault_action"];
          document_id?: string | null;
          document_owner_id: string;
          id?: string;
          ip_address?: unknown;
          user_agent?: string | null;
        };
        Update: {
          accessed_at?: string;
          accessed_by?: string;
          action?: Database["public"]["Enums"]["vault_action"];
          document_id?: string | null;
          document_owner_id?: string;
          id?: string;
          ip_address?: unknown;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vault_access_log_accessed_by_fkey";
            columns: ["accessed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vault_access_log_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vault_access_log_document_owner_id_fkey";
            columns: ["document_owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      document_category:
        | "passport"
        | "id_card"
        | "driving_license"
        | "ticket"
        | "voucher"
        | "lodging"
        | "insurance"
        | "other";
      document_scope: "VAULT" | "TRIP";
      event_type: "TRANSPORT" | "LODGING" | "ACTIVITY";
      idea_status: "POOL" | "SCHEDULED" | "DISMISSED";
      trip_role: "OWNER" | "EDITOR" | "VIEWER";
      vault_action: "UPLOAD" | "VIEW" | "DOWNLOAD" | "UPDATE" | "DELETE" | "SHARE" | "UNSHARE";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      document_category: [
        "passport",
        "id_card",
        "driving_license",
        "ticket",
        "voucher",
        "lodging",
        "insurance",
        "other",
      ],
      document_scope: ["VAULT", "TRIP"],
      event_type: ["TRANSPORT", "LODGING", "ACTIVITY"],
      idea_status: ["POOL", "SCHEDULED", "DISMISSED"],
      trip_role: ["OWNER", "EDITOR", "VIEWER"],
      vault_action: ["UPLOAD", "VIEW", "DOWNLOAD", "UPDATE", "DELETE", "SHARE", "UNSHARE"],
    },
  },
} as const;
