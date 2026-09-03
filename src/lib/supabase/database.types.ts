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
        };
        Insert: {
          created_at?: string;
          id?: never;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          name?: string;
        };
        Relationships: [];
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
