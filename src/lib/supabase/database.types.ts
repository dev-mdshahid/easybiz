export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      businesses: {
        Row: {
          created_at: string;
          id: number;
          name: string;
          opening_balance: number | null;
          opening_balance_on: string | null;
          opening_stock: number | null;
          opening_stock_on: string | null;
          inventory_cost_ratio: number | null;
        };
        Insert: {
          created_at?: string;
          id?: never;
          name: string;
          opening_balance?: number | null;
          opening_balance_on?: string | null;
          opening_stock?: number | null;
          opening_stock_on?: string | null;
          inventory_cost_ratio?: number | null;
        };
        Update: {
          created_at?: string;
          id?: never;
          name?: string;
          opening_balance?: number | null;
          opening_balance_on?: string | null;
          opening_stock?: number | null;
          opening_stock_on?: string | null;
          inventory_cost_ratio?: number | null;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          business_id: number;
          category: string;
          created_at: string;
          id: number;
          note: string | null;
          occurred_on: string;
        };
        Insert: {
          amount: number;
          business_id: number;
          category: string;
          created_at?: string;
          id?: never;
          note?: string | null;
          occurred_on: string;
        };
        Update: {
          amount?: number;
          business_id?: number;
          category?: string;
          created_at?: string;
          id?: never;
          note?: string | null;
          occurred_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          amount: number;
          business_id: number;
          created_at: string;
          id: number;
          kind: string;
          note: string | null;
          occurred_on: string;
        };
        Insert: {
          amount: number;
          business_id: number;
          created_at?: string;
          id?: never;
          kind: string;
          note?: string | null;
          occurred_on: string;
        };
        Update: {
          amount?: number;
          business_id?: number;
          created_at?: string;
          id?: never;
          kind?: string;
          note?: string | null;
          occurred_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      csv_uploads: {
        Row: {
          business_id: number;
          created_at: string;
          error_count: number;
          error_message: string | null;
          file_sha256: string;
          filename: string;
          id: number;
          inserted_count: number;
          row_count: number;
          status: string;
          updated_count: number;
        };
        Insert: {
          business_id: number;
          created_at?: string;
          error_count?: number;
          error_message?: string | null;
          file_sha256: string;
          filename: string;
          id?: never;
          inserted_count?: number;
          row_count?: number;
          status: string;
          updated_count?: number;
        };
        Update: {
          business_id?: number;
          created_at?: string;
          error_count?: number;
          error_message?: string | null;
          file_sha256?: string;
          filename?: string;
          id?: never;
          inserted_count?: number;
          row_count?: number;
          status?: string;
          updated_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "csv_uploads_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      pathao_invoices: {
        Row: {
          additional_charge: number;
          business_id: number;
          cod_fee: number;
          collectable_amount: number;
          collected_amount: number;
          compensation_cost: number;
          consignment_id: string;
          created_at: string;
          delivery_fee: number;
          discount: number;
          final_fee: number;
          id: number;
          imported_at: string;
          invoice_type: string;
          merchant_order_id: string;
          payout: number;
          promo_discount: number;
          recipient_name: string;
          recipient_phone: string;
          store_name: string;
          upload_id: number;
        };
        Insert: {
          additional_charge?: number;
          business_id: number;
          cod_fee?: number;
          collectable_amount: number;
          collected_amount: number;
          compensation_cost?: number;
          consignment_id: string;
          created_at: string;
          delivery_fee?: number;
          discount?: number;
          final_fee?: number;
          id?: never;
          imported_at?: string;
          invoice_type: string;
          merchant_order_id?: string;
          payout: number;
          promo_discount?: number;
          recipient_name?: string;
          recipient_phone?: string;
          store_name?: string;
          upload_id: number;
        };
        Update: {
          additional_charge?: number;
          business_id?: number;
          cod_fee?: number;
          collectable_amount?: number;
          collected_amount?: number;
          compensation_cost?: number;
          consignment_id?: string;
          created_at?: string;
          delivery_fee?: number;
          discount?: number;
          final_fee?: number;
          id?: never;
          imported_at?: string;
          invoice_type?: string;
          merchant_order_id?: string;
          payout?: number;
          promo_discount?: number;
          recipient_name?: string;
          recipient_phone?: string;
          store_name?: string;
          upload_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pathao_invoices_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pathao_invoices_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: false;
            referencedRelation: "csv_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          business_id: number;
          created_at: string;
          id: number;
          is_default: boolean;
          name: string;
          selling_price: number | null;
        };
        Insert: {
          business_id: number;
          created_at?: string;
          id?: never;
          is_default?: boolean;
          name: string;
          selling_price?: number | null;
        };
        Update: {
          business_id?: number;
          created_at?: string;
          id?: never;
          is_default?: boolean;
          name?: string;
          selling_price?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_settings: {
        Row: {
          ai_api_key: string;
          ai_base_url: string | null;
          ai_model: string;
          ai_provider: string;
          business_id: number;
          default_item_type: string;
          default_item_weight: number;
          default_store_name: string;
          screenshot_batch_size: number;
          pathao_access_token: string;
          pathao_client_id: string;
          pathao_client_secret: string;
          pathao_connected_at: string | null;
          pathao_delivery_type: number;
          pathao_environment: string;
          pathao_password: string;
          pathao_refresh_token: string;
          pathao_store_id: number | null;
          pathao_store_name: string;
          pathao_token_expires_at: string | null;
          pathao_username: string;
          updated_at: string;
        };
        Insert: {
          ai_api_key?: string;
          ai_base_url?: string | null;
          ai_model?: string;
          ai_provider?: string;
          business_id: number;
          default_item_type?: string;
          default_item_weight?: number;
          default_store_name?: string;
          screenshot_batch_size?: number;
          pathao_access_token?: string;
          pathao_client_id?: string;
          pathao_client_secret?: string;
          pathao_connected_at?: string | null;
          pathao_delivery_type?: number;
          pathao_environment?: string;
          pathao_password?: string;
          pathao_refresh_token?: string;
          pathao_store_id?: number | null;
          pathao_store_name?: string;
          pathao_token_expires_at?: string | null;
          pathao_username?: string;
          updated_at?: string;
        };
        Update: {
          ai_api_key?: string;
          ai_base_url?: string | null;
          ai_model?: string;
          ai_provider?: string;
          business_id?: number;
          default_item_type?: string;
          default_item_weight?: number;
          default_store_name?: string;
          screenshot_batch_size?: number;
          pathao_access_token?: string;
          pathao_client_id?: string;
          pathao_client_secret?: string;
          pathao_connected_at?: string | null;
          pathao_delivery_type?: number;
          pathao_environment?: string;
          pathao_password?: string;
          pathao_refresh_token?: string;
          pathao_store_id?: number | null;
          pathao_store_name?: string;
          pathao_token_expires_at?: string | null;
          pathao_username?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      expected_order_intakes: {
        Row: {
          business_id: number;
          created_at: string;
          error_message: string | null;
          id: number;
          image_count: number;
          model: string | null;
          note: string | null;
          raw_ai_response: Json | null;
        };
        Insert: {
          business_id: number;
          created_at?: string;
          error_message?: string | null;
          id?: never;
          image_count?: number;
          model?: string | null;
          note?: string | null;
          raw_ai_response?: Json | null;
        };
        Update: {
          business_id?: number;
          created_at?: string;
          error_message?: string | null;
          id?: never;
          image_count?: number;
          model?: string | null;
          note?: string | null;
          raw_ai_response?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "expected_order_intakes_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      expected_orders: {
        Row: {
          amount_to_collect: number;
          business_id: number;
          created_at: string;
          exported_at: string | null;
          extraction: Json | null;
          id: number;
          intake_id: number | null;
          item_desc: string;
          item_quantity: number;
          item_type: string;
          item_weight: number;
          merchant_order_id: string;
          pathao_consignment_id: string;
          pathao_delivery_fee: number | null;
          pathao_error: string;
          pathao_submitted_at: string | null;
          product_id: number | null;
          recipient_address: string;
          recipient_address_raw: string;
          recipient_area: string;
          recipient_city: string;
          recipient_name: string;
          recipient_phone: string;
          recipient_zone: string;
          special_instruction: string;
          status: string;
          store_name: string;
          updated_at: string;
          warnings: Json;
        };
        Insert: {
          amount_to_collect?: number;
          business_id: number;
          created_at?: string;
          exported_at?: string | null;
          extraction?: Json | null;
          id?: never;
          intake_id?: number | null;
          item_desc?: string;
          item_quantity?: number;
          item_type?: string;
          item_weight?: number;
          merchant_order_id?: string;
          pathao_consignment_id?: string;
          pathao_delivery_fee?: number | null;
          pathao_error?: string;
          pathao_submitted_at?: string | null;
          product_id?: number | null;
          recipient_address?: string;
          recipient_address_raw?: string;
          recipient_area?: string;
          recipient_city?: string;
          recipient_name?: string;
          recipient_phone?: string;
          recipient_zone?: string;
          special_instruction?: string;
          status?: string;
          store_name?: string;
          updated_at?: string;
          warnings?: Json;
        };
        Update: {
          amount_to_collect?: number;
          business_id?: number;
          created_at?: string;
          exported_at?: string | null;
          extraction?: Json | null;
          id?: never;
          intake_id?: number | null;
          item_desc?: string;
          item_quantity?: number;
          item_type?: string;
          item_weight?: number;
          merchant_order_id?: string;
          pathao_consignment_id?: string;
          pathao_delivery_fee?: number | null;
          pathao_error?: string;
          pathao_submitted_at?: string | null;
          product_id?: number | null;
          recipient_address?: string;
          recipient_address_raw?: string;
          recipient_area?: string;
          recipient_city?: string;
          recipient_name?: string;
          recipient_phone?: string;
          recipient_zone?: string;
          special_instruction?: string;
          status?: string;
          store_name?: string;
          updated_at?: string;
          warnings?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "expected_orders_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expected_orders_intake_id_fkey";
            columns: ["intake_id"];
            isOneToOne: false;
            referencedRelation: "expected_order_intakes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expected_orders_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_cost_lines: {
        Row: {
          id: number;
          label: string;
          mode: string;
          product_id: number;
          slot: string;
          sort_order: number;
          source: string;
          value: number | null;
        };
        Insert: {
          id?: never;
          label: string;
          mode: string;
          product_id: number;
          slot: string;
          sort_order: number;
          source?: string;
          value?: number | null;
        };
        Update: {
          id?: never;
          label?: string;
          mode?: string;
          product_id?: number;
          slot?: string;
          sort_order?: number;
          source?: string;
          value?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_cost_lines_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      pathao_invoices_current: {
        Row: {
          additional_charge: number | null;
          business_id: number | null;
          cod_fee: number | null;
          collectable_amount: number | null;
          collected_amount: number | null;
          compensation_cost: number | null;
          consignment_id: string | null;
          created_at: string | null;
          delivery_fee: number | null;
          discount: number | null;
          final_fee: number | null;
          id: number | null;
          imported_at: string | null;
          invoice_type: string | null;
          merchant_order_id: string | null;
          payout: number | null;
          promo_discount: number | null;
          recipient_name: string | null;
          recipient_phone: string | null;
          store_name: string | null;
          upload_id: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "pathao_invoices_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pathao_invoices_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: false;
            referencedRelation: "csv_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      delete_csv_upload: {
        Args: { p_business_id: number; p_upload_id: number };
        Returns: Json;
      };
      get_cash_position: {
        Args: { p_business_id: number };
        Returns: Json;
      };
      get_stock_position: {
        Args: { p_business_id: number };
        Returns: Json;
      };
      get_dashboard_stats: {
        Args: { p_business_id: number; p_from?: string; p_to?: string };
        Returns: Json;
      };
      commit_expected_order_intake: {
        Args: {
          p_business_id: number;
          p_intake_id: number;
          p_model: string | null;
          p_raw: Json;
          p_orders: Json;
          p_updates?: Json;
        };
        Returns: Database["public"]["Tables"]["expected_orders"]["Row"][];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type PathaoInvoice = Database["public"]["Tables"]["pathao_invoices"]["Row"];
export type CsvUpload = Database["public"]["Tables"]["csv_uploads"]["Row"];
export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type InventoryMovement =
  Database["public"]["Tables"]["inventory_movements"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductCostLine =
  Database["public"]["Tables"]["product_cost_lines"]["Row"];
export type BusinessSettings =
  Database["public"]["Tables"]["business_settings"]["Row"];
export type ExpectedOrderIntake =
  Database["public"]["Tables"]["expected_order_intakes"]["Row"];
export type ExpectedOrder =
  Database["public"]["Tables"]["expected_orders"]["Row"];
