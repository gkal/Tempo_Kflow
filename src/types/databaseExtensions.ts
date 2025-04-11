import { Database } from './supabase';

// Extend the Database type to include additional views and functions
declare module './supabase' {
  interface Database {
    public: {
      Views: {
        admin_sql_execution_log: {
          Row: {
            id: string;
            created_at: string;
            executed_by: string;
            sql_query: string;
            success: boolean;
            result_message: string | null;
          };
        };
      } & Database['public']['Views'];
      Functions: {
        run_sql_query: {
          Args: {
            sql_query: string;
          };
          Returns: {
            success: boolean;
            message: string;
            timestamp: string;
            error_detail?: string;
          };
        } & Database['public']['Functions'];
        reset_and_start_monitoring: {
          Args: Record<string, never>;
          Returns: string;
        };
      } & Database['public']['Functions'];
    } & Database['public'];
  }
}

// Export extended types for use in components
export type SqlExecutionLogRow = Database['public']['Views']['admin_sql_execution_log']['Row'];
export type RunSqlQueryArgs = Database['public']['Functions']['run_sql_query']['Args'];
export type RunSqlQueryReturn = Database['public']['Functions']['run_sql_query']['Returns']; 