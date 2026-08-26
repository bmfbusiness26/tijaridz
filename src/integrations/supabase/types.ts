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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activation_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          duration_months: number
          invoice_limit: number | null
          monthly_contract_limit: number
          plan: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          duration_months?: number
          invoice_limit?: number | null
          monthly_contract_limit?: number
          plan: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          duration_months?: number
          invoice_limit?: number | null
          monthly_contract_limit?: number
          plan?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      calculations: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          label: string | null
          results: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inputs?: Json
          label?: string | null
          results?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          label?: string | null
          results?: Json
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          nif: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          nif?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          nif?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          analysis: string | null
          created_at: string
          id: string
          name: string
          risk_level: string | null
          source_text: string | null
          user_id: string
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          id?: string
          name: string
          risk_level?: string | null
          source_text?: string | null
          user_id: string
        }
        Update: {
          analysis?: string | null
          created_at?: string
          id?: string
          name?: string
          risk_level?: string | null
          source_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          currency: string
          market_rate: number
          official_rate: number
          updated_at: string
        }
        Insert: {
          currency: string
          market_rate: number
          official_rate: number
          updated_at?: string
        }
        Update: {
          currency?: string
          market_rate?: number
          official_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      invoice_counters: {
        Row: {
          last_seq: number
          user_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          user_id: string
          year: number
        }
        Update: {
          last_seq?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          client_address: string | null
          client_email: string | null
          client_name: string
          client_nif: string | null
          client_phone: string | null
          created_at: string
          currency: string
          description: string
          due_date: string | null
          exchange_rate: number
          id: string
          invoice_date: string
          items: Json
          notes: string | null
          number: string
          status: string
          tva_rate: number
          user_id: string
        }
        Insert: {
          amount?: number
          client_address?: string | null
          client_email?: string | null
          client_name: string
          client_nif?: string | null
          client_phone?: string | null
          created_at?: string
          currency?: string
          description: string
          due_date?: string | null
          exchange_rate?: number
          id?: string
          invoice_date?: string
          items?: Json
          notes?: string | null
          number: string
          status?: string
          tva_rate?: number
          user_id: string
        }
        Update: {
          amount?: number
          client_address?: string | null
          client_email?: string | null
          client_name?: string
          client_nif?: string | null
          client_phone?: string | null
          created_at?: string
          currency?: string
          description?: string
          due_date?: string | null
          exchange_rate?: number
          id?: string
          invoice_date?: string
          items?: Json
          notes?: string | null
          number?: string
          status?: string
          tva_rate?: number
          user_id?: string
        }
        Relationships: []
      }
      payment_receipts: {
        Row: {
          admin_note: string | null
          amount: number | null
          created_at: string
          id: string
          plan: string
          status: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          plan: string
          status?: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          plan?: string
          status?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_address: string | null
          company_cnas: string | null
          company_logo_url: string | null
          company_name: string | null
          company_nif: string | null
          company_phone: string | null
          company_rc: string | null
          created_at: string
          full_name: string | null
          id: string
          lang: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company_address?: string | null
          company_cnas?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_nif?: string | null
          company_phone?: string | null
          company_rc?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          lang?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company_address?: string | null
          company_cnas?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_nif?: string | null
          company_phone?: string | null
          company_rc?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          lang?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          invoice_limit: number | null
          monthly_contract_limit: number
          plan: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          invoice_limit?: number | null
          monthly_contract_limit?: number
          plan?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          invoice_limit?: number | null
          monthly_contract_limit?: number
          plan?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_invoice_number: { Args: never; Returns: string }
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
