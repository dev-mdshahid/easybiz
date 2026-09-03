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
      csv_uploads: {
        Row: {
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
        Relationships: [];
      };
      pathao_invoices: {
        Row: {
          additional_charge: number;
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
          upload_id: number | null;
        };
        Insert: {
          additional_charge?: number;
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
          upload_id?: number | null;
        };
        Update: {
          additional_charge?: number;
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
          upload_id?: number | null;
        };
        Relationships: [
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
      [_ in never]: never;
    };
    Functions: {
      get_dashboard_stats: {
        Args: { p_from?: string; p_to?: string };
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
