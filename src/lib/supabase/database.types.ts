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
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductCostLine =
  Database["public"]["Tables"]["product_cost_lines"]["Row"];
