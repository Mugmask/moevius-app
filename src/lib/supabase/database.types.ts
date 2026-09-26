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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          lineup: string[]
          neighborhood: string
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          venue: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          lineup?: string[]
          neighborhood: string
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          venue: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          lineup?: string[]
          neighborhood?: string
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          venue?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          order_id: string
          quantity: number
          ticket_type_id: string
          unit_price: number
        }
        Insert: {
          order_id: string
          quantity: number
          ticket_type_id: string
          unit_price: number
        }
        Update: {
          order_id?: string
          quantity?: number
          ticket_type_id?: string
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
            foreignKeyName: "order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_dni: string
          buyer_email: string
          buyer_name: string
          client_ip: unknown
          created_at: string
          email_sent_at: string | null
          event_id: string
          expires_at: string
          id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
        }
        Insert: {
          buyer_dni: string
          buyer_email: string
          buyer_name: string
          client_ip?: unknown
          created_at?: string
          email_sent_at?: string | null
          event_id: string
          expires_at: string
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
        }
        Update: {
          buyer_dni?: string
          buyer_email?: string
          buyer_name?: string
          client_ip?: unknown
          created_at?: string
          email_sent_at?: string | null
          event_id?: string
          expires_at?: string
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["staff_role"]
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      ticket_types: {
        Row: {
          active: boolean
          capacity: number
          created_at: string
          event_id: string
          id: string
          max_per_order: number
          name: string
          price: number
          sales_end: string | null
          sales_start: string | null
          sort_order: number
        }
        Insert: {
          active?: boolean
          capacity: number
          created_at?: string
          event_id: string
          id?: string
          max_per_order?: number
          name: string
          price: number
          sales_end?: string | null
          sales_start?: string | null
          sort_order?: number
        }
        Update: {
          active?: boolean
          capacity?: number
          created_at?: string
          event_id?: string
          id?: string
          max_per_order?: number
          name?: string
          price?: number
          sales_end?: string | null
          sales_start?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          code: string
          created_at: string
          event_id: string
          id: string
          order_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_type_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          code?: string
          created_at?: string
          event_id: string
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_type_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          code?: string
          created_at?: string
          event_id?: string
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_in: { Args: { p_code: string; p_event_id: string }; Returns: Json }
      create_order: {
        Args: {
          p_buyer_dni: string
          p_buyer_email: string
          p_buyer_name: string
          p_client_ip?: unknown
          p_event_id: string
          p_items: Json
          p_max_pending_per_ip: number
          p_reservation_minutes: number
        }
        Returns: string
      }
      event_stats: {
        Args: never
        Returns: {
          checked_in: number
          event_id: string
          revenue: number
          sold: number
        }[]
      }
      fulfill_order: {
        Args: { p_mp_payment_id: string; p_order_id: string }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      ticket_availability: {
        Args: never
        Returns: {
          available: number
          capacity: number
          ticket_type_id: string
        }[]
      }
      ticket_type_taken: { Args: { p_ticket_type_id: string }; Returns: number }
      void_order: {
        Args: { p_mp_payment_id: string; p_order_id: string }
        Returns: number
      }
    }
    Enums: {
      event_status: "draft" | "published" | "archived"
      order_status: "pending" | "paid" | "expired" | "cancelled" | "refunded"
      staff_role: "admin" | "door"
      ticket_status: "valid" | "used" | "void"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      event_status: ["draft", "published", "archived"],
      order_status: ["pending", "paid", "expired", "cancelled", "refunded"],
      staff_role: ["admin", "door"],
      ticket_status: ["valid", "used", "void"],
    },
  },
} as const
