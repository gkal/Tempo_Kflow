export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      history_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "history_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          department_id: string
          email: string | null
          fullname: string
          id: string
          last_login_at: string | null
          password: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string
          department_id: string
          email?: string | null
          fullname: string
          id?: string
          last_login_at?: string | null
          password: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string
          department_id?: string
          email?: string | null
          fullname?: string
          id?: string
          last_login_at?: string | null
          password?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: string
          priority: string | null
          due_date: string | null
          assigned_to: string | null
          created_by: string
          created_at: string
          updated_at: string | null
          completed_at: string | null
          is_deleted: boolean | null
          deleted_at: string | null
          customer_id: string | null
          offer_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status: string
          priority?: string | null
          due_date?: string | null
          assigned_to?: string | null
          created_by: string
          created_at?: string
          updated_at?: string | null
          completed_at?: string | null
          is_deleted?: boolean | null
          deleted_at?: string | null
          customer_id?: string | null
          offer_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string | null
          due_date?: string | null
          assigned_to?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string | null
          completed_at?: string | null
          is_deleted?: boolean | null
          deleted_at?: string | null
          customer_id?: string | null
          offer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          sender_id: string | null
          message: string
          type: string
          read: boolean
          created_at: string
          related_task_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          sender_id?: string | null
          message: string
          type: string
          read?: boolean
          created_at?: string
          related_task_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          sender_id?: string | null
          message?: string
          type?: string
          read?: boolean
          created_at?: string
          related_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      customers: {
        Row: {
          id: string
          company_name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string | null
          primary_contact_id: string | null
          customer_type: string | null
          afm: string | null
          doy: string | null
          postal_code: string | null
          town: string | null
          telephone: string | null
          webpage: string | null
          fax_number: string | null
          notes: string | null
          status: string | null
          service_level: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          company_name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string | null
          primary_contact_id?: string | null
          customer_type?: string | null
          afm?: string | null
          doy?: string | null
          postal_code?: string | null
          town?: string | null
          telephone?: string | null
          webpage?: string | null
          fax_number?: string | null
          notes?: string | null
          status?: string | null
          service_level?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          company_name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string | null
          primary_contact_id?: string | null
          customer_type?: string | null
          afm?: string | null
          doy?: string | null
          postal_code?: string | null
          town?: string | null
          telephone?: string | null
          webpage?: string | null
          fax_number?: string | null
          notes?: string | null
          status?: string | null
          service_level?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          id: string
          customer_id: string
          requirements: string | null
          amount: number | null
          offer_result: string | null
          result: string | null
          created_at: string
          updated_at: string | null
          assigned_to: string | null
          source: string | null
          customer_comments: string | null
          our_comments: string | null
          hma: boolean | null
          certificate: string | null
          address: string | null
          postal_code: string | null
          town: string | null
          status: string | null
          contact_id: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          requirements?: string | null
          amount?: number | null
          offer_result?: string | null
          result?: string | null
          created_at?: string
          updated_at?: string | null
          assigned_to?: string | null
          source?: string | null
          customer_comments?: string | null
          our_comments?: string | null
          hma?: boolean | null
          certificate?: string | null
          address?: string | null
          postal_code?: string | null
          town?: string | null
          status?: string | null
          contact_id?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          requirements?: string | null
          amount?: number | null
          offer_result?: string | null
          result?: string | null
          created_at?: string
          updated_at?: string | null
          assigned_to?: string | null
          source?: string | null
          customer_comments?: string | null
          our_comments?: string | null
          hma?: boolean | null
          certificate?: string | null
          address?: string | null
          postal_code?: string | null
          town?: string | null
          status?: string | null
          contact_id?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      contacts: {
        Row: {
          id: string
          customer_id: string
          full_name: string
          position: string | null
          telephone: string | null
          mobile: string | null
          email: string | null
          internal_telephone: string | null
          notes: string | null
          created_at: string
          updated_at: string | null
          status: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          full_name: string
          position?: string | null
          telephone?: string | null
          mobile?: string | null
          email?: string | null
          internal_telephone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          full_name?: string
          position?: string | null
          telephone?: string | null
          mobile?: string | null
          email?: string | null
          internal_telephone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      contact_positions: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      offer_history: {
        Row: {
          id: string
          offer_id: string
          previous_status: string | null
          new_status: string
          previous_assigned_to: string | null
          new_assigned_to: string | null
          previous_result: string | null
          new_result: string | null
          previous_amount: string | null
          new_amount: string | null
          previous_requirements: string | null
          new_requirements: string | null
          notes: string | null
          changed_by: string
          created_at: string
        }
        Insert: {
          id?: string
          offer_id: string
          previous_status?: string | null
          new_status: string
          previous_assigned_to?: string | null
          new_assigned_to?: string | null
          previous_result?: string | null
          new_result?: string | null
          previous_amount?: string | null
          new_amount?: string | null
          previous_requirements?: string | null
          new_requirements?: string | null
          notes?: string | null
          changed_by: string
          created_at?: string
        }
        Update: {
          id?: string
          offer_id?: string
          previous_status?: string | null
          new_status?: string
          previous_assigned_to?: string | null
          new_assigned_to?: string | null
          previous_result?: string | null
          new_result?: string | null
          previous_amount?: string | null
          new_amount?: string | null
          previous_requirements?: string | null
          new_requirements?: string | null
          notes?: string | null
          changed_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      offer_details: {
        Row: {
          id: string
          offer_id: string
          created_at: string
        }
        Insert: {
          id?: string
          offer_id: string
          created_at?: string
        }
        Update: {
          id?: string
          offer_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_details_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          }
        ]
      }
      service_categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      service_subcategories: {
        Row: {
          id: string
          name: string
          category_id: string
          subcategory_name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category_id: string
          subcategory_name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category_id?: string
          subcategory_name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      units: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string | null
          date_created: string | null
          date_updated: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string | null
          date_created?: string | null
          date_updated?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string | null
          date_created?: string | null
          date_updated?: string | null
        }
        Relationships: []
      }
      resource_locks: {
        Row: {
          id: string
          resource_type: string
          resource_id: string
          user_id: string
          user_name: string
          locked_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          resource_type: string
          resource_id: string
          user_id: string
          user_name: string
          locked_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          resource_type?: string
          resource_id?: string
          user_id?: string
          user_name?: string
          locked_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_locks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      customer_form_links: {
        Row: {
          id: string
          customer_id: string
          token: string
          submission_data: Json | null
          status: string
          notes: string | null
          is_used: boolean
          is_deleted: boolean
          created_at: string
          expires_at: string
          submitted_at: string | null
          approved_at: string | null
          deleted_at: string | null
          created_by: string | null
          updated_by: string | null
          approved_by: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          token: string
          submission_data?: Json | null
          status?: string
          notes?: string | null
          is_used?: boolean
          is_deleted?: boolean
          created_at?: string
          expires_at: string
          submitted_at?: string | null
          approved_at?: string | null
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          approved_by?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          token?: string
          submission_data?: Json | null
          status?: string
          notes?: string | null
          is_used?: boolean
          is_deleted?: boolean
          created_at?: string
          expires_at?: string
          submitted_at?: string | null
          approved_at?: string | null
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          approved_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_form_links_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_form_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_form_links_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_form_links_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      system_settings: {
        Row: {
          id: string
          document_path: string | null
          created_at: string
          created_by: string | null
          modified_at: string | null
          modified_by: string | null
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          document_path?: string | null
          created_at?: string
          created_by?: string | null
          modified_at?: string | null
          modified_by?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          document_path?: string | null
          created_at?: string
          created_by?: string | null
          modified_at?: string | null
          modified_by?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      docu_characteristics: {
        Row: {
          id: string
          name: string
          emoji: string | null
          created_at: string
          created_by: string | null
          modified_at: string | null
          modified_by: string | null
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          name: string
          emoji?: string | null
          created_at?: string
          created_by?: string | null
          modified_at?: string | null
          modified_by?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          emoji?: string | null
          created_at?: string
          created_by?: string | null
          modified_at?: string | null
          modified_by?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docu_characteristics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docu_characteristics_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docu_characteristics_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      docu_status: {
        Row: {
          id: string
          name: string
          emoji: string | null
          created_at: string
          created_by: string | null
          modified_at: string | null
          modified_by: string | null
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          name: string
          emoji?: string | null
          created_at?: string
          created_by?: string | null
          modified_at?: string | null
          modified_by?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          emoji?: string | null
          created_at?: string
          created_by?: string | null
          modified_at?: string | null
          modified_by?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docu_status_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docu_status_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docu_status_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      offer_documents: {
        Row: {
          id: string
          offer_id: string
          file_path: string
          file_name: string
          file_size: number | null
          document_category: string | null
          description: string | null
          fs_created_at: string | null
          fs_modified_at: string | null
          not_found: boolean
          created_at: string
          created_by: string | null
          modified_at: string | null
          modified_by: string | null
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
          docu_characteristic_id: string | null
          docu_status_id: string | null
        }
        Insert: {
          id?: string
          offer_id: string
          file_path: string
          file_name: string
          file_size?: number | null
          document_category?: string | null
          description?: string | null
          fs_created_at?: string | null
          fs_modified_at?: string | null
          not_found?: boolean
          created_at?: string
          created_by?: string | null
          modified_at?: string | null
          modified_by?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          docu_characteristic_id?: string | null
          docu_status_id?: string | null
        }
        Update: {
          id?: string
          offer_id?: string
          file_path?: string
          file_name?: string
          file_size?: number | null
          document_category?: string | null
          description?: string | null
          fs_created_at?: string | null
          fs_modified_at?: string | null
          not_found?: boolean
          created_at?: string
          created_by?: string | null
          modified_at?: string | null
          modified_by?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          docu_characteristic_id?: string | null
          docu_status_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_documents_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_documents_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_documents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_documents_docu_characteristic_id_fkey"
            columns: ["docu_characteristic_id"]
            isOneToOne: false
            referencedRelation: "docu_characteristics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_documents_docu_status_id_fkey"
            columns: ["docu_status_id"]
            isOneToOne: false
            referencedRelation: "docu_status"
            referencedColumns: ["id"]
          }
        ]
      }
      equipment_categories: {
        Row: {
          id: string;
          category_name: string;
          name?: string; // Optional field as we're removing it
          created_at: string;
          date_created: string;
          date_updated: string | null;
          user_create: string | null;
          user_updated: string | null;
          code_prefix: string | null;
        }
        Insert: {
          id?: string;
          category_name: string;
          name?: string;
          created_at?: string;
          date_created?: string;
          date_updated?: string | null;
          user_create?: string | null;
          user_updated?: string | null;
          code_prefix?: string | null;
        }
        Update: {
          id?: string;
          category_name?: string;
          name?: string;
          created_at?: string;
          date_created?: string;
          date_updated?: string | null;
          user_create?: string | null;
          user_updated?: string | null;
          code_prefix?: string | null;
        }
        Relationships: [
          {
            foreignKeyName: "equipment_categories_user_create_fkey"
            columns: ["user_create"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_categories_user_updated_fkey"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      equipment_items: {
        Row: {
          id: string;
          item_name: string;
          name?: string; // Optional field as we might be removing it
          category_id: string;
          created_at: string;
          date_created: string;
          date_updated: string | null;
          user_create: string | null;
          user_updated: string | null;
          status: string | null;
          code: string | null;
          is_available: boolean | null;
          date_rented: string | null;
          dates_available: string | null;
          assigned_user: string | null;
        }
        Insert: {
          id?: string;
          item_name: string;
          name?: string;
          category_id: string;
          created_at?: string;
          date_created?: string;
          date_updated?: string | null;
          user_create?: string | null;
          user_updated?: string | null;
          status?: string | null;
          code?: string | null;
          is_available?: boolean | null;
          date_rented?: string | null;
          dates_available?: string | null;
          assigned_user?: string | null;
        }
        Update: {
          id?: string;
          item_name?: string;
          name?: string;
          category_id?: string;
          created_at?: string;
          date_created?: string;
          date_updated?: string | null;
          user_create?: string | null;
          user_updated?: string | null;
          status?: string | null;
          code?: string | null;
          is_available?: boolean | null;
          date_rented?: string | null;
          dates_available?: string | null;
          assigned_user?: string | null;
        }
        Relationships: [
          {
            foreignKeyName: "equipment_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_items_user_create_fkey"
            columns: ["user_create"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_items_user_updated_fkey"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_items_assigned_user_fkey"
            columns: ["assigned_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      query_performance_logs: {
        Row: {
          id: string;
          query: string;
          execution_time_ms: number;
          executed_at: string;
          parameters: string | null;
          rows_affected: number | null;
          source: string | null;
          user_id: string | null;
          success: boolean;
          error_message: string | null;
          created_at: string;
          is_deleted: boolean;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          query: string;
          execution_time_ms: number;
          executed_at?: string;
          parameters?: string | null;
          rows_affected?: number | null;
          source?: string | null;
          user_id?: string | null;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
          is_deleted?: boolean;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          query?: string;
          execution_time_ms?: number;
          executed_at?: string;
          parameters?: string | null;
          rows_affected?: number | null;
          source?: string | null;
          user_id?: string | null;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
          is_deleted?: boolean;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "query_performance_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      soft_delete_record: {
        Args: {
          table_name: string
          record_id: string
        }
        Returns: string
      }
      list_deleted_records: {
        Args: {
          table_name: string
        }
        Returns: {
          id: string
          deleted_at: string
          [key: string]: any
        }[]
      }
      cleanup_all_soft_deleted_records: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      user_role: "Admin" | "Super User" | "User" | "Μόνο ανάγνωση"
      incoming_source: "Email" | "Phone" | "Site" | "Physical"
      offer_status: "wait_for_our_answer" | "wait_for_customer_answer" | "ready"
      offer_result: "success" | "failed" | "cancel"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
