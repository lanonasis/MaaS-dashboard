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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_banks_memories: {
        Row: {
          access_count: number | null
          content: string
          created_at: string | null
          id: string
          memory_type: string | null
          metadata: Json | null
          project_ref: string | null
          relevance_score: number | null
          source_url: string | null
          status: string | null
          summary: string | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          access_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          memory_type?: string | null
          metadata?: Json | null
          project_ref?: string | null
          relevance_score?: number | null
          source_url?: string | null
          status?: string | null
          summary?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          access_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          memory_type?: string | null
          metadata?: Json | null
          project_ref?: string | null
          relevance_score?: number | null
          source_url?: string | null
          status?: string | null
          summary?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_banks_memory_search_logs: {
        Row: {
          created_at: string | null
          execution_time_ms: number | null
          filters: Json | null
          id: string
          limit_requested: number | null
          query: string
          results_count: number | null
          search_type: string | null
          session_id: string | null
          threshold: number | null
          top_similarity_score: number | null
          user_context: string | null
        }
        Insert: {
          created_at?: string | null
          execution_time_ms?: number | null
          filters?: Json | null
          id?: string
          limit_requested?: number | null
          query: string
          results_count?: number | null
          search_type?: string | null
          session_id?: string | null
          threshold?: number | null
          top_similarity_score?: number | null
          user_context?: string | null
        }
        Update: {
          created_at?: string | null
          execution_time_ms?: number | null
          filters?: Json | null
          id?: string
          limit_requested?: number | null
          query?: string
          results_count?: number | null
          search_type?: string | null
          session_id?: string | null
          threshold?: number | null
          top_similarity_score?: number | null
          user_context?: string | null
        }
        Relationships: []
      }
      agent_banks_sessions: {
        Row: {
          completed_at: string | null
          description: string | null
          id: string
          last_activity: string | null
          memory_count: number | null
          metadata: Json | null
          session_name: string
          session_type: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          description?: string | null
          id?: string
          last_activity?: string | null
          memory_count?: number | null
          metadata?: Json | null
          session_name: string
          session_type?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          description?: string | null
          id?: string
          last_activity?: string | null
          memory_count?: number | null
          metadata?: Json | null
          session_name?: string
          session_type?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          confidence_score: number | null
          content: Json
          created_at: string | null
          expires_at: string | null
          id: number
          recommendation_type: string
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          content: Json
          created_at?: string | null
          expires_at?: string | null
          id?: number
          recommendation_type: string
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          content?: Json
          created_at?: string | null
          expires_at?: string | null
          id?: number
          recommendation_type?: string
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_response_cache: {
        Row: {
          created_at: string
          expires_at: string | null
          hit_count: number | null
          id: string
          model_used: string
          prompt: string
          prompt_hash: string
          response: string
          tokens_used: number | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          model_used: string
          prompt: string
          prompt_hash: string
          response: string
          tokens_used?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          model_used?: string
          prompt?: string
          prompt_hash?: string
          response?: string
          tokens_used?: number | null
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          estimated_cost: number | null
          feedback_text: string | null
          id: string
          model_used: string
          prompt: string
          query_complexity: string
          response_time_ms: number | null
          tokens_used: number | null
          user_feedback: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_cost?: number | null
          feedback_text?: string | null
          id?: string
          model_used: string
          prompt: string
          query_complexity: string
          response_time_ms?: number | null
          tokens_used?: number | null
          user_feedback?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_cost?: number | null
          feedback_text?: string | null
          id?: string
          model_used?: string
          prompt?: string
          query_complexity?: string
          response_time_ms?: number | null
          tokens_used?: number | null
          user_feedback?: number | null
          user_id?: string
        }
        Relationships: []
      }
      api_key_projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          owner_id: string
          settings: Json | null
          team_members: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          owner_id: string
          settings?: Json | null
          team_members?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          owner_id?: string
          settings?: Json | null
          team_members?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          service: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          service?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          service?: string | null
          user_id?: string
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          account_number: string
          bank_code: string
          category: string | null
          created_at: string
          id: string
          is_archived: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          bank_code: string
          category?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          bank_code?: string
          category?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bulk_payments: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          last_error: string | null
          modified_by: string | null
          processed_at: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["payment_status"]
          title: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          id?: string
          last_error?: string | null
          modified_by?: string | null
          processed_at?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          title: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          last_error?: string | null
          modified_by?: string | null
          processed_at?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          title?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_financial_insights: {
        Row: {
          data: Json
          generated_at: string | null
          id: number
          insight_type: string
          period_end: string | null
          period_start: string | null
          user_id: string | null
        }
        Insert: {
          data: Json
          generated_at?: string | null
          id?: number
          insight_type: string
          period_end?: string | null
          period_start?: string | null
          user_id?: string | null
        }
        Update: {
          data?: Json
          generated_at?: string | null
          id?: number
          insight_type?: string
          period_end?: string | null
          period_start?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_metrics: {
        Row: {
          active_customers: number | null
          cash_on_hand: number | null
          created_at: string | null
          id: string
          inventory_value: number | null
          low_stock_items: number | null
          metadata: Json | null
          metric_date: string
          net_profit: number | null
          out_of_stock_items: number | null
          outstanding_payables: number | null
          outstanding_receivables: number | null
          overdue_invoices: number | null
          total_customers: number | null
          total_expenses: number | null
          total_products: number | null
          total_revenue: number | null
          user_id: string
        }
        Insert: {
          active_customers?: number | null
          cash_on_hand?: number | null
          created_at?: string | null
          id?: string
          inventory_value?: number | null
          low_stock_items?: number | null
          metadata?: Json | null
          metric_date?: string
          net_profit?: number | null
          out_of_stock_items?: number | null
          outstanding_payables?: number | null
          outstanding_receivables?: number | null
          overdue_invoices?: number | null
          total_customers?: number | null
          total_expenses?: number | null
          total_products?: number | null
          total_revenue?: number | null
          user_id: string
        }
        Update: {
          active_customers?: number | null
          cash_on_hand?: number | null
          created_at?: string | null
          id?: string
          inventory_value?: number | null
          low_stock_items?: number | null
          metadata?: Json | null
          metric_date?: string
          net_profit?: number | null
          out_of_stock_items?: number | null
          outstanding_payables?: number | null
          outstanding_receivables?: number | null
          overdue_invoices?: number | null
          total_customers?: number | null
          total_expenses?: number | null
          total_products?: number | null
          total_revenue?: number | null
          user_id?: string
        }
        Relationships: []
      }
      business_profiles: {
        Row: {
          address: Json | null
          business_name: string
          business_type: string | null
          created_at: string | null
          id: number
          industry: string | null
          registration_number: string | null
          tax_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: Json | null
          business_name: string
          business_type?: string | null
          created_at?: string | null
          id?: number
          industry?: string | null
          registration_number?: string | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: Json | null
          business_name?: string
          business_type?: string | null
          created_at?: string | null
          id?: number
          industry?: string | null
          registration_number?: string | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_recommendations: {
        Row: {
          action_items: Json | null
          confidence_score: number | null
          created_at: string | null
          description: string
          estimated_value: number | null
          expires_at: string | null
          id: string
          impact_level: string | null
          implementation_effort: string | null
          implemented_at: string | null
          recommendation_type: string
          reviewed_at: string | null
          status: string | null
          supporting_data: Json | null
          title: string
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          description: string
          estimated_value?: number | null
          expires_at?: string | null
          id?: string
          impact_level?: string | null
          implementation_effort?: string | null
          implemented_at?: string | null
          recommendation_type: string
          reviewed_at?: string | null
          status?: string | null
          supporting_data?: Json | null
          title: string
          user_id: string
        }
        Update: {
          action_items?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string
          estimated_value?: number | null
          expires_at?: string | null
          id?: string
          impact_level?: string | null
          implementation_effort?: string | null
          implemented_at?: string | null
          recommendation_type?: string
          reviewed_at?: string | null
          status?: string | null
          supporting_data?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          title: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          encrypted: boolean
          id: string
          role: string
          timestamp: string
        }
        Insert: {
          content: string
          conversation_id: string
          encrypted?: boolean
          id: string
          role: string
          timestamp?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          encrypted?: boolean
          id?: string
          role?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_endpoints: {
        Row: {
          auth_required: boolean
          created_at: string
          description: string | null
          id: string
          method: string
          path: string
          rate_limit: number | null
          service_id: string
          updated_at: string
        }
        Insert: {
          auth_required?: boolean
          created_at?: string
          description?: string | null
          id?: string
          method: string
          path: string
          rate_limit?: number | null
          service_id: string
          updated_at?: string
        }
        Update: {
          auth_required?: boolean
          created_at?: string
          description?: string | null
          id?: string
          method?: string
          path?: string
          rate_limit?: number | null
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_endpoints_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "company_services"
            referencedColumns: ["id"]
          },
        ]
      }
      company_projects: {
        Row: {
          api_key: string
          created_at: string
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_services: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "company_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      company_usage_logs: {
        Row: {
          endpoint_id: string | null
          execution_time_ms: number | null
          id: string
          metadata: Json | null
          project_id: string
          request_method: string | null
          request_path: string | null
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_status: number | null
          service_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          endpoint_id?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          project_id: string
          request_method?: string | null
          request_path?: string | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_status?: number | null
          service_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          endpoint_id?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          project_id?: string
          request_method?: string | null
          request_path?: string | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_status?: number | null
          service_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_usage_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "company_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_usage_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "company_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_usage_logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "company_services"
            referencedColumns: ["id"]
          },
        ]
      }
      edoc_consents: {
        Row: {
          consent_type: string
          created_at: string | null
          expires_at: string | null
          id: number
          metadata: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: number
          metadata?: Json | null
          status: string
          user_id?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: number
          metadata?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      edoc_financial_analysis: {
        Row: {
          analysis_type: string
          created_at: string | null
          data: Json
          id: number
          user_id: string | null
        }
        Insert: {
          analysis_type: string
          created_at?: string | null
          data: Json
          id?: number
          user_id?: string | null
        }
        Update: {
          analysis_type?: string
          created_at?: string | null
          data?: Json
          id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      edoc_transactions: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          id: number
          metadata: Json | null
          status: string
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: number
          metadata?: Json | null
          status: string
          transaction_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: number
          metadata?: Json | null
          status?: string
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      edoc_usage_logs: {
        Row: {
          action: string
          created_at: string | null
          id: number
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: number
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: number
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: number
          name: string
          rollout_percentage: number | null
          updated_at: string | null
          user_groups: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: number
          name: string
          rollout_percentage?: number | null
          updated_at?: string | null
          user_groups?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: number
          name?: string
          rollout_percentage?: number | null
          updated_at?: string | null
          user_groups?: string[] | null
        }
        Relationships: []
      }
      imported_data: {
        Row: {
          content: string | null
          created_at: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          source_type: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          source_type: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      key_rotation_policies: {
        Row: {
          auto_rotate: boolean | null
          created_at: string | null
          frequency_days: number
          id: string
          key_id: string
          last_rotation: string | null
          next_rotation: string | null
          rotation_history: Json | null
          updated_at: string | null
        }
        Insert: {
          auto_rotate?: boolean | null
          created_at?: string | null
          frequency_days?: number
          id?: string
          key_id: string
          last_rotation?: string | null
          next_rotation?: string | null
          rotation_history?: Json | null
          updated_at?: string | null
        }
        Update: {
          auto_rotate?: boolean | null
          created_at?: string | null
          frequency_days?: number
          id?: string
          key_id?: string
          last_rotation?: string | null
          next_rotation?: string | null
          rotation_history?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_rotation_policies_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: true
            referencedRelation: "api_keys_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_rotation_policies_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: true
            referencedRelation: "stored_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      key_security_events: {
        Row: {
          description: string
          event_type: string
          id: string
          key_id: string | null
          metadata: Json | null
          organization_id: string | null
          severity: string
          timestamp: string | null
        }
        Insert: {
          description: string
          event_type: string
          id?: string
          key_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          severity: string
          timestamp?: string | null
        }
        Update: {
          description?: string
          event_type?: string
          id?: string
          key_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          severity?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_security_events_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "api_keys_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_security_events_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "stored_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      key_usage_analytics: {
        Row: {
          id: string
          key_id: string
          metadata: Json | null
          operation: string
          organization_id: string
          success: boolean | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          key_id: string
          metadata?: Json | null
          operation: string
          organization_id: string
          success?: boolean | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          key_id?: string
          metadata?: Json | null
          operation?: string
          organization_id?: string
          success?: boolean | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_usage_analytics_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "api_keys_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_usage_analytics_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "stored_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_transactions: {
        Row: {
          amount: number
          buyer_id: string | null
          created_at: string
          id: string
          order_id: string | null
          platform_fee: number
          seller_amount: number
          seller_id: string | null
          status: string
          stripe_charge_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          platform_fee: number
          seller_amount: number
          seller_id?: string | null
          status?: string
          stripe_charge_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          platform_fee?: number
          seller_amount?: number
          seller_id?: string | null
          status?: string
          stripe_charge_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_key_access_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          context: Json | null
          created_at: string | null
          environment: string
          estimated_duration: number
          id: string
          justification: string
          key_names: string[]
          organization_id: string
          requires_approval: boolean | null
          status: string
          tool_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          context?: Json | null
          created_at?: string | null
          environment: string
          estimated_duration: number
          id: string
          justification: string
          key_names: string[]
          organization_id: string
          requires_approval?: boolean | null
          status?: string
          tool_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          context?: Json | null
          created_at?: string | null
          environment?: string
          estimated_duration?: number
          id?: string
          justification?: string
          key_names?: string[]
          organization_id?: string
          requires_approval?: boolean | null
          status?: string
          tool_id?: string
        }
        Relationships: []
      }
      mcp_key_audit_log: {
        Row: {
          event_type: string
          id: string
          metadata: Json | null
          organization_id: string
          session_id: string | null
          timestamp: string | null
          tool_id: string | null
          user_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          metadata?: Json | null
          organization_id: string
          session_id?: string | null
          timestamp?: string | null
          tool_id?: string | null
          user_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          session_id?: string | null
          timestamp?: string | null
          tool_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mcp_key_sessions: {
        Row: {
          created_at: string | null
          ended_at: string | null
          environment: string
          expires_at: string
          id: string
          key_names: string[]
          organization_id: string
          request_id: string
          session_id: string
          tool_id: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          environment: string
          expires_at: string
          id?: string
          key_names: string[]
          organization_id: string
          request_id: string
          session_id: string
          tool_id: string
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          environment?: string
          expires_at?: string
          id?: string
          key_names?: string[]
          organization_id?: string
          request_id?: string
          session_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_key_sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "mcp_key_access_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_key_tools: {
        Row: {
          auto_approve: boolean | null
          created_at: string | null
          created_by: string
          id: string
          organization_id: string
          permissions: Json
          risk_level: string
          status: string
          tool_id: string
          tool_name: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          auto_approve?: boolean | null
          created_at?: string | null
          created_by: string
          id?: string
          organization_id: string
          permissions?: Json
          risk_level?: string
          status?: string
          tool_id: string
          tool_name: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          auto_approve?: boolean | null
          created_at?: string | null
          created_by?: string
          id?: string
          organization_id?: string
          permissions?: Json
          risk_level?: string
          status?: string
          tool_id?: string
          tool_name?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      mcp_proxy_tokens: {
        Row: {
          created_at: string | null
          encrypted_mapping: string
          expires_at: string
          id: string
          key_name: string
          proxy_value: string
          revoked_at: string | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_mapping: string
          expires_at: string
          id?: string
          key_name: string
          proxy_value: string
          revoked_at?: string | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_mapping?: string
          expires_at?: string
          id?: string
          key_name?: string
          proxy_value?: string
          revoked_at?: string | null
          session_id?: string
        }
        Relationships: []
      }
      memory_access_patterns: {
        Row: {
          access_method: string | null
          access_type: string
          created_at: string | null
          id: string
          memory_id: string | null
          user_id: string
        }
        Insert: {
          access_method?: string | null
          access_type: string
          created_at?: string | null
          id?: string
          memory_id?: string | null
          user_id: string
        }
        Update: {
          access_method?: string | null
          access_type?: string
          created_at?: string | null
          id?: string
          memory_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_access_patterns_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memory_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_entries: {
        Row: {
          access_count: number | null
          content: string
          created_at: string
          embedding: string | null
          id: string
          last_accessed: string | null
          memory_type: Database["public"]["Enums"]["memory_type"] | null
          metadata: Json | null
          organization_id: string | null
          tags: string[] | null
          title: string | null
          topic_id: string | null
          type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_count?: number | null
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          last_accessed?: string | null
          memory_type?: Database["public"]["Enums"]["memory_type"] | null
          metadata?: Json | null
          organization_id?: string | null
          tags?: string[] | null
          title?: string | null
          topic_id?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_count?: number | null
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          last_accessed?: string | null
          memory_type?: Database["public"]["Enums"]["memory_type"] | null
          metadata?: Json | null
          organization_id?: string | null
          tags?: string[] | null
          title?: string | null
          topic_id?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_entries_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_search_analytics: {
        Row: {
          created_at: string | null
          execution_time_ms: number | null
          id: string
          query: string
          results_count: number | null
          search_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          query: string
          results_count?: number | null
          search_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          query?: string
          results_count?: number | null
          search_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          error_enabled: boolean
          id: string
          info_enabled: boolean
          success_enabled: boolean
          updated_at: string
          user_id: string
          warning_enabled: boolean
        }
        Insert: {
          created_at?: string
          error_enabled?: boolean
          id?: string
          info_enabled?: boolean
          success_enabled?: boolean
          updated_at?: string
          user_id: string
          warning_enabled?: boolean
        }
        Update: {
          created_at?: string
          error_enabled?: boolean
          id?: string
          info_enabled?: boolean
          success_enabled?: boolean
          updated_at?: string
          user_id?: string
          warning_enabled?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          notification_group: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          notification_group?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          notification_group?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_sessions: {
        Row: {
          client_id: string | null
          code_challenge: string | null
          code_verifier: string | null
          created_at: string | null
          expires_at: string
          id: string
          is_used: boolean | null
          redirect_uri: string | null
          scope: string | null
          session_data: Json
          state: string
          used_at: string | null
        }
        Insert: {
          client_id?: string | null
          code_challenge?: string | null
          code_verifier?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          is_used?: boolean | null
          redirect_uri?: string | null
          scope?: string | null
          session_data: Json
          state: string
          used_at?: string | null
        }
        Update: {
          client_id?: string | null
          code_challenge?: string | null
          code_verifier?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean | null
          redirect_uri?: string | null
          scope?: string | null
          session_data?: Json
          state?: string
          used_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          order_date: string | null
          shipping_address: string | null
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          order_date?: string | null
          shipping_address?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          order_date?: string | null
          shipping_address?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_audit: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["payment_status"] | null
          old_status: Database["public"]["Enums"]["payment_status"] | null
          payment_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["payment_status"] | null
          old_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["payment_status"] | null
          old_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_id?: string
        }
        Relationships: []
      }
      payment_items: {
        Row: {
          amount: number
          beneficiary_id: string
          bulk_payment_id: string
          created_at: string
          currency_code: string
          description: string | null
          error_message: string | null
          id: string
          processed_at: string | null
          retry_count: number | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          beneficiary_id: string
          bulk_payment_id: string
          created_at?: string
          currency_code?: string
          description?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          beneficiary_id?: string
          bulk_payment_id?: string
          created_at?: string
          currency_code?: string
          description?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_items_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_items_bulk_payment_id_fkey"
            columns: ["bulk_payment_id"]
            isOneToOne: false
            referencedRelation: "bulk_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_insights: {
        Row: {
          confidence_score: number
          created_at: string | null
          expires_at: string | null
          id: string
          market_trend: string | null
          max_viable_price: number | null
          min_viable_price: number | null
          price_elasticity: number | null
          product_id: string
          reasoning: string | null
          suggested_price: number
        }
        Insert: {
          confidence_score: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          market_trend?: string | null
          max_viable_price?: number | null
          min_viable_price?: number | null
          price_elasticity?: number | null
          product_id: string
          reasoning?: string | null
          suggested_price: number
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          market_trend?: string | null
          max_viable_price?: number | null
          min_viable_price?: number | null
          price_elasticity?: number | null
          product_id?: string
          reasoning?: string | null
          suggested_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_insights_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_embeddings: {
        Row: {
          created_at: string | null
          embedding: string | null
          id: string
          product_id: string
          text_content: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          product_id: string
          text_content: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          product_id?: string
          text_content?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_embeddings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock_quantity: number
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          stock_quantity?: number
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock_quantity?: number
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_type: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_vendor: boolean | null
          last_name: string | null
          stripe_customer_id: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          business_type?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_vendor?: boolean | null
          last_name?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          business_type?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_vendor?: boolean | null
          last_name?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      query_classifications: {
        Row: {
          actual_complexity: string | null
          classified_complexity: string
          created_at: string
          feedback_score: number | null
          id: string
          prompt: string
          tokens_used: number | null
          was_escalated: boolean | null
        }
        Insert: {
          actual_complexity?: string | null
          classified_complexity: string
          created_at?: string
          feedback_score?: number | null
          id?: string
          prompt: string
          tokens_used?: number | null
          was_escalated?: boolean | null
        }
        Update: {
          actual_complexity?: string | null
          classified_complexity?: string
          created_at?: string
          feedback_score?: number | null
          id?: string
          prompt?: string
          tokens_used?: number | null
          was_escalated?: boolean | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          clicked: boolean | null
          created_at: string | null
          id: string
          product_id: string
          reason: string | null
          recommendation_type: string
          relevance_score: number
          supplier_id: string
          updated_at: string | null
          user_id: string
          viewed: boolean | null
        }
        Insert: {
          clicked?: boolean | null
          created_at?: string | null
          id?: string
          product_id: string
          reason?: string | null
          recommendation_type: string
          relevance_score: number
          supplier_id: string
          updated_at?: string | null
          user_id: string
          viewed?: boolean | null
        }
        Update: {
          clicked?: boolean | null
          created_at?: string | null
          id?: string
          product_id?: string
          reason?: string | null
          recommendation_type?: string
          relevance_score?: number
          supplier_id?: string
          updated_at?: string | null
          user_id?: string
          viewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_analysis: {
        Row: {
          created_at: string | null
          id: string
          is_flagged: boolean | null
          order_id: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          risk_factors: Json | null
          risk_score: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_flagged?: boolean | null
          order_id?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          risk_factors?: Json | null
          risk_score: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_flagged?: boolean | null
          order_id?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          risk_factors?: Json | null
          risk_score?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_analysis_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_analysis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      say_bills: {
        Row: {
          amount: number
          bill_type: string
          completed_at: string | null
          created_at: string | null
          currency: string | null
          customer_id: string
          id: number
          raw_response: Json | null
          reference: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          bill_type: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id: string
          id?: number
          raw_response?: Json | null
          reference: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          bill_type?: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          id?: number
          raw_response?: Json | null
          reference?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      say_orders: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          currency: string | null
          id: number
          raw_response: Json | null
          reference: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          id?: number
          raw_response?: Json | null
          reference: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          id?: number
          raw_response?: Json | null
          reference?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      say_transfers: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          currency: string | null
          id: number
          raw_response: Json | null
          recipient_account: string | null
          recipient_name: string | null
          reference: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          id?: number
          raw_response?: Json | null
          recipient_account?: string | null
          recipient_name?: string | null
          reference: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          id?: number
          raw_response?: Json | null
          recipient_account?: string | null
          recipient_name?: string | null
          reference?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          category: string | null
          created_at: string | null
          filters: Json | null
          id: string
          results_count: number | null
          search_query: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          results_count?: number | null
          search_query: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          results_count?: number | null
          search_query?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          last_activity: string | null
          token_hash: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          token_hash: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          token_hash?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      simple_users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          password_hash: string
          project_scope: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash: string
          project_scope?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash?: string
          project_scope?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stored_api_keys: {
        Row: {
          access_level: string
          created_at: string | null
          created_by: string
          encrypted_value: string
          environment: string
          expires_at: string | null
          id: string
          key_type: string
          last_rotated: string | null
          metadata: Json | null
          name: string
          organization_id: string
          project_id: string
          rotation_frequency: number | null
          status: string
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          access_level?: string
          created_at?: string | null
          created_by: string
          encrypted_value: string
          environment?: string
          expires_at?: string | null
          id?: string
          key_type?: string
          last_rotated?: string | null
          metadata?: Json | null
          name: string
          organization_id: string
          project_id: string
          rotation_frequency?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          access_level?: string
          created_at?: string | null
          created_by?: string
          encrypted_value?: string
          environment?: string
          expires_at?: string | null
          id?: string
          key_type?: string
          last_rotated?: string | null
          metadata?: Json | null
          name?: string
          organization_id?: string
          project_id?: string
          rotation_frequency?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stored_api_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "api_key_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connect_accounts: {
        Row: {
          created_at: string
          id: string
          onboarding_complete: boolean
          stripe_account_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          onboarding_complete?: boolean
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          onboarding_complete?: boolean
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_name: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_error_logs: {
        Row: {
          created_at: string | null
          error_message: string
          error_type: string
          function_name: string | null
          id: number
          request_data: Json | null
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message: string
          error_type: string
          function_name?: string | null
          id?: number
          request_data?: Json | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string
          error_type?: string
          function_name?: string | null
          id?: number
          request_data?: Json | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      topics: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action: string
          created_at: string | null
          id: number
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: number
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: number
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_type: string
          created_at: string | null
          granted: boolean
          id: number
          metadata: Json | null
          updated_at: string | null
          user_id: string | null
          version: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string | null
          granted: boolean
          id?: number
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string | null
          granted?: boolean
          id?: number
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
        }
        Relationships: []
      }
      user_payments: {
        Row: {
          amount: number
          currency: string | null
          id: number
          metadata: Json | null
          payment_date: string | null
          payment_method: string | null
          payment_type: string | null
          provider: string
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          currency?: string | null
          id?: number
          metadata?: Json | null
          payment_date?: string | null
          payment_method?: string | null
          payment_type?: string | null
          provider: string
          transaction_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          currency?: string | null
          id?: number
          metadata?: Json | null
          payment_date?: string | null
          payment_method?: string | null
          payment_type?: string | null
          provider?: string
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          business_size: string | null
          created_at: string
          id: string
          industry_focus: string[] | null
          payment_methods: string[] | null
          preferred_currencies: string[] | null
          regions_of_interest: string[] | null
          risk_tolerance: string | null
          trade_frequency: string | null
          trade_volume: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_size?: string | null
          created_at?: string
          id?: string
          industry_focus?: string[] | null
          payment_methods?: string[] | null
          preferred_currencies?: string[] | null
          regions_of_interest?: string[] | null
          risk_tolerance?: string | null
          trade_frequency?: string | null
          trade_volume?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_size?: string | null
          created_at?: string
          id?: string
          industry_focus?: string[] | null
          payment_methods?: string[] | null
          preferred_currencies?: string[] | null
          regions_of_interest?: string[] | null
          risk_tolerance?: string | null
          trade_frequency?: string | null
          trade_volume?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_product_interactions: {
        Row: {
          created_at: string | null
          id: number
          interaction_type: string
          metadata: Json | null
          product_id: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          interaction_type: string
          metadata?: Json | null
          product_id?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          interaction_type?: string
          metadata?: Json | null
          product_id?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: number
          role: string
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: number
          role: string
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: number
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: number
          ip_address: unknown
          last_accessed: string | null
          session_token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: number
          ip_address?: unknown
          last_accessed?: string | null
          session_token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: number
          ip_address?: unknown
          last_accessed?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_tiers: {
        Row: {
          can_use_advanced_models: boolean
          created_at: string
          expires_at: string | null
          id: string
          max_queries_per_day: number
          tier_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_use_advanced_models?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          max_queries_per_day?: number
          tier_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_use_advanced_models?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          max_queries_per_day?: number
          tier_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          last_login: string | null
          organization_id: string
          password_hash: string
          plan: Database["public"]["Enums"]["plan_type"]
          role: Database["public"]["Enums"]["user_role"]
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_login?: string | null
          organization_id: string
          password_hash: string
          plan?: Database["public"]["Enums"]["plan_type"]
          role?: Database["public"]["Enums"]["user_role"]
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          organization_id?: string
          password_hash?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          role?: Database["public"]["Enums"]["user_role"]
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_api_keys: {
        Row: {
          created_at: string | null
          description: string | null
          encrypted_key: string
          id: string
          is_active: boolean | null
          key_name: string
          last_used_at: string | null
          updated_at: string | null
          vendor_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          encrypted_key: string
          id?: string
          is_active?: boolean | null
          key_name: string
          last_used_at?: string | null
          updated_at?: string | null
          vendor_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          encrypted_key?: string
          id?: string
          is_active?: boolean | null
          key_name?: string
          last_used_at?: string | null
          updated_at?: string | null
          vendor_name?: string
        }
        Relationships: []
      }
      vendor_api_keys_v2: {
        Row: {
          allowed_ip_ranges: Json | null
          allowed_platforms: Json | null
          allowed_services: Json | null
          created_at: string | null
          environment: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_description: string | null
          key_id: string
          key_name: string
          key_secret_hash: string
          key_type: string | null
          last_request_at: string | null
          last_used_at: string | null
          monthly_requests: number | null
          rate_limit_override: number | null
          requires_signature: boolean | null
          total_requests: number | null
          updated_at: string | null
          vendor_org_id: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          allowed_ip_ranges?: Json | null
          allowed_platforms?: Json | null
          allowed_services?: Json | null
          created_at?: string | null
          environment?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_description?: string | null
          key_id: string
          key_name?: string
          key_secret_hash: string
          key_type?: string | null
          last_request_at?: string | null
          last_used_at?: string | null
          monthly_requests?: number | null
          rate_limit_override?: number | null
          requires_signature?: boolean | null
          total_requests?: number | null
          updated_at?: string | null
          vendor_org_id: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          allowed_ip_ranges?: Json | null
          allowed_platforms?: Json | null
          allowed_services?: Json | null
          created_at?: string | null
          environment?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_description?: string | null
          key_id?: string
          key_name?: string
          key_secret_hash?: string
          key_type?: string | null
          last_request_at?: string | null
          last_used_at?: string | null
          monthly_requests?: number | null
          rate_limit_override?: number | null
          requires_signature?: boolean | null
          total_requests?: number | null
          updated_at?: string | null
          vendor_org_id?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_api_keys_v2_vendor_org_id_fkey"
            columns: ["vendor_org_id"]
            isOneToOne: false
            referencedRelation: "vendor_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_billing_records: {
        Row: {
          base_cost: number | null
          billing_period_end: string
          billing_period_start: string
          created_at: string | null
          currency: string | null
          discount_amount: number | null
          id: string
          invoice_number: string | null
          invoice_url: string | null
          overage_cost: number | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          tax_amount: number | null
          total_amount: number | null
          total_compute_hours: number | null
          total_requests: number | null
          total_tokens: number | null
          updated_at: string | null
          usage_cost: number | null
          vendor_org_id: string
        }
        Insert: {
          base_cost?: number | null
          billing_period_end: string
          billing_period_start: string
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          overage_cost?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          total_compute_hours?: number | null
          total_requests?: number | null
          total_tokens?: number | null
          updated_at?: string | null
          usage_cost?: number | null
          vendor_org_id: string
        }
        Update: {
          base_cost?: number | null
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          overage_cost?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          total_compute_hours?: number | null
          total_requests?: number | null
          total_tokens?: number | null
          updated_at?: string | null
          usage_cost?: number | null
          vendor_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_billing_records_vendor_org_id_fkey"
            columns: ["vendor_org_id"]
            isOneToOne: false
            referencedRelation: "vendor_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_key_audit_log: {
        Row: {
          action: string
          id: string
          ip_address: unknown
          key_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown
          key_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown
          key_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_key_audit_log_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "vendor_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_organizations: {
        Row: {
          billing_address: Json | null
          billing_model: string | null
          billing_tier: string | null
          business_registration: string | null
          compliance_requirements: Json | null
          contact_email: string
          contact_name: string | null
          created_at: string | null
          created_by: string | null
          credit_balance: number | null
          currency: string | null
          data_retention_days: number | null
          id: string
          monthly_limit: number | null
          monthly_spend_limit: number | null
          organization_name: string
          organization_type: string
          platform_access: Json | null
          privacy_level: string | null
          rate_limit_per_minute: number | null
          service_permissions: Json | null
          status: string | null
          tax_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          vendor_code: string
          website_url: string | null
        }
        Insert: {
          billing_address?: Json | null
          billing_model?: string | null
          billing_tier?: string | null
          business_registration?: string | null
          compliance_requirements?: Json | null
          contact_email: string
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_balance?: number | null
          currency?: string | null
          data_retention_days?: number | null
          id?: string
          monthly_limit?: number | null
          monthly_spend_limit?: number | null
          organization_name: string
          organization_type: string
          platform_access?: Json | null
          privacy_level?: string | null
          rate_limit_per_minute?: number | null
          service_permissions?: Json | null
          status?: string | null
          tax_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          vendor_code: string
          website_url?: string | null
        }
        Update: {
          billing_address?: Json | null
          billing_model?: string | null
          billing_tier?: string | null
          business_registration?: string | null
          compliance_requirements?: Json | null
          contact_email?: string
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_balance?: number | null
          currency?: string | null
          data_retention_days?: number | null
          id?: string
          monthly_limit?: number | null
          monthly_spend_limit?: number | null
          organization_name?: string
          organization_type?: string
          platform_access?: Json | null
          privacy_level?: string | null
          rate_limit_per_minute?: number | null
          service_permissions?: Json | null
          status?: string | null
          tax_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          vendor_code?: string
          website_url?: string | null
        }
        Relationships: []
      }
      vendor_platform_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity_at: string | null
          mfa_verified_at: string | null
          platform: string
          requires_mfa: boolean | null
          session_metadata: Json | null
          session_token: string
          user_agent: string | null
          user_id: string | null
          vendor_org_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          mfa_verified_at?: string | null
          platform: string
          requires_mfa?: boolean | null
          session_metadata?: Json | null
          session_token: string
          user_agent?: string | null
          user_id?: string | null
          vendor_org_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          mfa_verified_at?: string | null
          platform?: string
          requires_mfa?: boolean | null
          session_metadata?: Json | null
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
          vendor_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_platform_sessions_vendor_org_id_fkey"
            columns: ["vendor_org_id"]
            isOneToOne: false
            referencedRelation: "vendor_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_usage_logs: {
        Row: {
          api_key_id: string | null
          billing_tier: string | null
          compute_units: number | null
          cost_amount: number | null
          cost_currency: string | null
          endpoint: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          method: string | null
          platform: string
          processed_at: string | null
          processing_time_ms: number | null
          request_id: string
          request_metadata: Json | null
          request_size_bytes: number | null
          request_timestamp: string | null
          response_metadata: Json | null
          response_size_bytes: number | null
          service: string
          status_code: number | null
          success: boolean | null
          tokens_consumed: number | null
          user_agent: string | null
          vendor_org_id: string
        }
        Insert: {
          api_key_id?: string | null
          billing_tier?: string | null
          compute_units?: number | null
          cost_amount?: number | null
          cost_currency?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string | null
          platform: string
          processed_at?: string | null
          processing_time_ms?: number | null
          request_id: string
          request_metadata?: Json | null
          request_size_bytes?: number | null
          request_timestamp?: string | null
          response_metadata?: Json | null
          response_size_bytes?: number | null
          service: string
          status_code?: number | null
          success?: boolean | null
          tokens_consumed?: number | null
          user_agent?: string | null
          vendor_org_id: string
        }
        Update: {
          api_key_id?: string | null
          billing_tier?: string | null
          compute_units?: number | null
          cost_amount?: number | null
          cost_currency?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string | null
          platform?: string
          processed_at?: string | null
          processing_time_ms?: number | null
          request_id?: string
          request_metadata?: Json | null
          request_size_bytes?: number | null
          request_timestamp?: string | null
          response_metadata?: Json | null
          response_size_bytes?: number | null
          service?: string
          status_code?: number | null
          success?: boolean | null
          tokens_consumed?: number | null
          user_agent?: string | null
          vendor_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "vendor_api_keys_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_usage_logs_vendor_org_id_fkey"
            columns: ["vendor_org_id"]
            isOneToOne: false
            referencedRelation: "vendor_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_cards: {
        Row: {
          card_id: string | null
          cardholder_id: string | null
          created_at: string
          id: string
          is_locked: boolean
          last4: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          card_id?: string | null
          cardholder_id?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          last4?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          card_id?: string | null
          cardholder_id?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          last4?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      vortex_items: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          keywords: string[] | null
          owner_id: string | null
          pitch: string | null
          source: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
          url: string | null
          writer: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          owner_id?: string | null
          pitch?: string | null
          source?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          url?: string | null
          writer?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          owner_id?: string | null
          pitch?: string | null
          source?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          url?: string | null
          writer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vortex_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
          referencedRelation: "company_projects"
          referencedColumns: ["id"]
        },
      ]
      }
      scheduled_workflows: {
        Row: {
          created_at: string
          goal: string
          id: string
          last_run_at: string | null
          metadata: Json | null
          next_run_at: string | null
          schedule_type: string
          scheduled_time: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal: string
          id?: string
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          schedule_type: string
          scheduled_time: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal?: string
          id?: string
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          schedule_type?: string
          scheduled_time?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tool_configs: {
        Row: {
          api_key: string | null
          config: Json | null
          created_at: string
          enabled: boolean
          id: string
          permissions: string[] | null
          tool_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          config?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          permissions?: string[] | null
          tool_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          config?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          permissions?: string[] | null
          tool_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          goal: string
          id: string
          results: Json | null
          status: string
          steps: Json | null
          used_memories: Json | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          goal: string
          id?: string
          results?: Json | null
          status?: string
          steps?: Json | null
          used_memories?: Json | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          goal?: string
          id?: string
          results?: Json | null
          status?: string
          steps?: Json | null
          used_memories?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          event_type: string
          id: number
          processed_at: string | null
          provider: string
          raw_event: Json
          resource_id: string | null
          resource_type: string | null
        }
        Insert: {
          event_type: string
          id?: number
          processed_at?: string | null
          provider: string
          raw_event: Json
          resource_id?: string | null
          resource_type?: string | null
        }
        Update: {
          event_type?: string
          id?: number
          processed_at?: string | null
          provider?: string
          raw_event?: Json
          resource_id?: string | null
          resource_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      api_keys_compat: {
        Row: {
          access_level: string | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          is_active: boolean | null
          key: string | null
          name: string | null
          organization_id: string | null
          project_id: string | null
          service: string | null
          user_id: string | null
        }
        Insert: {
          access_level?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: never
          key?: never
          name?: string | null
          organization_id?: string | null
          project_id?: string | null
          service?: never
          user_id?: string | null
        }
        Update: {
          access_level?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: never
          key?: never
          name?: string | null
          organization_id?: string | null
          project_id?: string | null
          service?: never
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stored_api_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "api_key_projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_mcp_resources: { Args: never; Returns: undefined }
      cleanup_expired_oauth_sessions: { Args: never; Returns: undefined }
      execute_safe_query:
        | { Args: { query_text: string }; Returns: Json }
        | { Args: { query_params?: Json; query_text: string }; Returns: Json }
      generate_vendor_api_key: {
        Args: {
          p_environment?: string
          p_key_name?: string
          p_key_type?: string
          p_vendor_org_id: string
        }
        Returns: {
          api_key_record_id: string
          key_id: string
          key_secret: string
        }[]
      }
      get_current_org: { Args: never; Returns: string }
      get_key_for_mcp_session: {
        Args: { key_name_param: string; session_id_param: string }
        Returns: {
          expires_at: string
          proxy_token: string
        }[]
      }
      get_memory_stats: {
        Args: { filter_user_id?: string }
        Returns: {
          by_type: Json
          recent_activity: Json
          total_memories: number
        }[]
      }
      get_product_image_url: { Args: { image_path: string }; Returns: string }
      hybrid_search_memories: {
        Args: {
          keyword_weight?: number
          match_count?: number
          min_similarity?: number
          p_memory_types?: string[]
          p_organization_id?: string
          p_tags?: string[]
          p_user_id?: string
          query_embedding: string
          query_text: string
          semantic_weight?: number
        }
        Returns: {
          access_count: number
          combined_score: number
          content: string
          created_at: string
          id: string
          keyword_rank: number
          metadata: Json
          organization_id: string
          semantic_similarity: number
          summary: string
          tags: string[]
          title: string
          topic_id: string
          type: string
          user_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_owner: { Args: { bulk_id: string }; Returns: boolean }
      keyword_search_memories: {
        Args: {
          match_count?: number
          p_memory_types?: string[]
          p_organization_id?: string
          p_tags?: string[]
          p_topic_id?: string
          p_user_id?: string
          query_text: string
        }
        Returns: {
          access_count: number
          content: string
          created_at: string
          headline: string
          id: string
          metadata: Json
          organization_id: string
          rank: number
          summary: string
          tags: string[]
          title: string
          topic_id: string
          type: string
          user_id: string
        }[]
      }
      log_search_analytics: {
        Args: {
          p_avg_similarity?: number
          p_distance_metric: string
          p_execution_time_ms: number
          p_filters: Json
          p_organization_id: string
          p_query_text: string
          p_results_count: number
          p_search_type: string
          p_top_similarity?: number
          p_user_id: string
        }
        Returns: string
      }
      log_vendor_usage: {
        Args: {
          p_api_key_id: string
          p_platform: string
          p_processing_time_ms?: number
          p_request_id: string
          p_service: string
          p_status_code?: number
          p_success?: boolean
          p_tokens_consumed?: number
          p_vendor_org_id: string
        }
        Returns: string
      }
      match_memories:
        | {
            Args: {
              filter_user_id?: string
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
            Returns: {
              content: string
              created_at: string
              id: string
              metadata: Json
              similarity: number
              tags: string[]
              title: string
              type: string
              updated_at: string
            }[]
          }
        | {
            Args: {
              match_count?: number
              match_threshold?: number
              p_organization_id?: string
              p_user_id?: string
              query_embedding: string
            }
            Returns: {
              content: string
              created_at: string
              id: string
              similarity: number
              tags: string[]
              title: string
              type: string
            }[]
          }
      match_memories_advanced: {
        Args: {
          distance_metric?: string
          include_archived?: boolean
          match_count?: number
          match_threshold?: number
          p_memory_types?: string[]
          p_organization_id?: string
          p_tags?: string[]
          p_topic_id?: string
          p_user_id?: string
          query_embedding: string
        }
        Returns: {
          access_count: number
          content: string
          created_at: string
          distance: number
          id: string
          metadata: Json
          organization_id: string
          similarity: number
          summary: string
          tags: string[]
          title: string
          topic_id: string
          type: string
          updated_at: string
          user_id: string
        }[]
      }
      request_password_reset: { Args: { email: string }; Returns: boolean }
      search_vectors: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          content: string
          created_at: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      text_search_memories: {
        Args: {
          filter_type?: string
          filter_user_id?: string
          max_results?: number
          search_query: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          rank: number
          tags: string[]
          title: string
          type: string
          updated_at: string
        }[]
      }
      track_memory_access: {
        Args: {
          p_access_method?: string
          p_access_type: string
          p_memory_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      track_search_analytics: {
        Args: {
          p_execution_time_ms?: number
          p_query: string
          p_results_count: number
          p_search_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_memory_access: { Args: { memory_id: string }; Returns: undefined }
      validate_vendor_api_key:
        | {
            Args: { p_key_id: string; p_key_secret: string }
            Returns: {
              allowed_platforms: Json
              allowed_services: Json
              is_valid: boolean
              rate_limit: number
              vendor_code: string
              vendor_org_id: string
            }[]
          }
        | {
            Args: { p_key_id: string; p_key_secret: string }
            Returns: {
              is_valid: boolean
              organization_id: string
              permissions: Json
              user_id: string
            }[]
          }
    }
    Enums: {
      memory_type:
        | "context"
        | "project"
        | "knowledge"
        | "reference"
        | "personal"
        | "workflow"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "canceled"
      plan_type: "free" | "pro" | "enterprise"
      user_role: "admin" | "user" | "viewer" | "superadmin" | "system"
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
      memory_type: [
        "context",
        "project",
        "knowledge",
        "reference",
        "personal",
        "workflow",
      ],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "canceled",
      ],
      plan_type: ["free", "pro", "enterprise"],
      user_role: ["admin", "user", "viewer", "superadmin", "system"],
    },
  },
} as const
