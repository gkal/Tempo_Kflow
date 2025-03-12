import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, User, Clock, FileText, DollarSign, CheckCircle, AlertCircle } from "lucide-react";

interface OfferHistoryProps {
  offerId: string;
}

interface HistoryEntry {
  id: string;
  offer_id: string;
  previous_status: string | null;
  new_status: string;
  previous_assigned_to: string | null;
  new_assigned_to: string | null;
  previous_result: string | null;
  new_result: string | null;
  previous_amount: string | null;
  new_amount: string | null;
  previous_requirements: string | null;
  new_requirements: string | null;
  notes: string | null;
  changed_by: string;
  created_at: string;
  changed_by_user?: {
    fullname: string;
  };
  previous_assigned_user?: {
    fullname: string;
  };
  new_assigned_user?: {
    fullname: string;
  };
}

export default function OfferHistory({ offerId }: OfferHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOfferHistory();
  }, [offerId]);

  const fetchOfferHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simplified query that doesn't rely on foreign key relationships
      const { data, error } = await supabase
        .from("offer_history")
        .select("*")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // If we have history entries, fetch the user information separately
      if (data && data.length > 0) {
        // Get unique user IDs from the history entries
        const userIds = new Set<string>();
        data.forEach(entry => {
          if (entry.changed_by) userIds.add(entry.changed_by);
          if (entry.previous_assigned_to) userIds.add(entry.previous_assigned_to);
          if (entry.new_assigned_to) userIds.add(entry.new_assigned_to);
        });

        // Fetch user information for all relevant users
        if (userIds.size > 0) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id, fullname")
            .in("id", Array.from(userIds));

          if (userError) {
            console.error("Error fetching user data:", userError);
          } else if (userData) {
            // Create a map of user IDs to user data
            const userMap = userData.reduce((map, user) => {
              map[user.id] = user;
              return map;
            }, {});

            // Enhance history entries with user information
            const enhancedData = data.map(entry => ({
              ...entry,
              changed_by_user: userMap[entry.changed_by] ? { fullname: userMap[entry.changed_by].fullname } : undefined,
              previous_assigned_user: entry.previous_assigned_to && userMap[entry.previous_assigned_to] 
                ? { fullname: userMap[entry.previous_assigned_to].fullname } 
                : undefined,
              new_assigned_user: entry.new_assigned_to && userMap[entry.new_assigned_to] 
                ? { fullname: userMap[entry.new_assigned_to].fullname } 
                : undefined
            }));

            setHistory(enhancedData);
          }
        } else {
          setHistory(data);
        }
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Error fetching offer history:", err);
      setError("Failed to load offer history. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Format status for display
  const formatStatus = (status: string | null): string => {
    if (!status) return "—";
    
    switch (status) {
      case "wait_for_our_answer":
        return "Αναμονή για απάντησή μας";
      case "wait_for_customer_answer":
        return "Αναμονή για απάντηση πελάτη";
      case "ready":
        return "Ολοκληρώθηκε";
      default:
        return status;
    }
  };

  // Format result for display
  const formatResult = (result: string | null): string => {
    if (!result) return "—";
    
    switch (result) {
      case "success":
        return "Επιτυχία";
      case "failed":
        return "Αποτυχία";
      case "cancel":
        return "Ακύρωση";
      case "pending":
        return "Σε εξέλιξη";
      case "waiting":
        return "Αναμονή";
      case "none":
        return "Κανένα";
      default:
        return result;
    }
  };

  // Get status class for styling
  const getStatusClass = (status: string | null): string => {
    if (!status) return "text-gray-400";
    
    switch (status) {
      case "wait_for_our_answer":
        return "text-yellow-400";
      case "wait_for_customer_answer":
        return "text-blue-400";
      case "ready":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  // Get result class for styling
  const getResultClass = (result: string | null): string => {
    if (!result) return "text-gray-400";
    
    switch (result) {
      case "success":
        return "text-green-400";
      case "failed":
        return "text-red-400";
      case "cancel":
        return "text-yellow-400";
      case "pending":
        return "text-blue-400";
      case "waiting":
        return "text-purple-400";
      case "none":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84a98c]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-400 bg-red-900/20 rounded-md">
        <AlertCircle className="h-5 w-5 inline-block mr-2" />
        {error}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-4 text-[#84a98c] text-center">
        Δεν υπάρχει διαθέσιμο ιστορικό για αυτή την προσφορά.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      <h3 className="text-lg font-semibold text-[#a8c5b5] mb-4">
        Ιστορικό Προσφοράς
      </h3>
      
      <div className="space-y-4">
        {history.map((entry, index) => (
          <div 
            key={entry.id} 
            className="bg-[#2f3e46] p-4 rounded-md border border-[#52796f] shadow-sm"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-[#84a98c] mr-2" />
                <span className="text-sm text-[#84a98c]">
                  {formatDateTime(entry.created_at)}
                </span>
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 text-[#84a98c] mr-2" />
                <span className="text-sm text-[#84a98c]">
                  {entry.changed_by_user?.fullname || "Unknown User"}
                </span>
              </div>
            </div>
            
            <Separator className="my-3 bg-[#52796f]/30" />
            
            {/* Status Change */}
            {entry.previous_status !== entry.new_status && (
              <div className="mb-3">
                <div className="text-xs text-[#84a98c] mb-1">Κατάσταση</div>
                <div className="flex items-center">
                  <span className={`text-sm ${getStatusClass(entry.previous_status)}`}>
                    {formatStatus(entry.previous_status)}
                  </span>
                  <ArrowRight className="h-4 w-4 mx-2 text-[#84a98c]" />
                  <span className={`text-sm ${getStatusClass(entry.new_status)}`}>
                    {formatStatus(entry.new_status)}
                  </span>
                </div>
              </div>
            )}
            
            {/* Result Change */}
            {entry.previous_result !== entry.new_result && (
              <div className="mb-3">
                <div className="text-xs text-[#84a98c] mb-1">Αποτέλεσμα</div>
                <div className="flex items-center">
                  <span className={`text-sm ${getResultClass(entry.previous_result)}`}>
                    {formatResult(entry.previous_result)}
                  </span>
                  <ArrowRight className="h-4 w-4 mx-2 text-[#84a98c]" />
                  <span className={`text-sm ${getResultClass(entry.new_result)}`}>
                    {formatResult(entry.new_result)}
                  </span>
                </div>
              </div>
            )}
            
            {/* Assignment Change */}
            {entry.previous_assigned_to !== entry.new_assigned_to && (
              <div className="mb-3">
                <div className="text-xs text-[#84a98c] mb-1">Ανάθεση</div>
                <div className="flex items-center">
                  <span className="text-sm text-[#cad2c5]">
                    {entry.previous_assigned_user?.fullname || "Μη ανατεθειμένη"}
                  </span>
                  <ArrowRight className="h-4 w-4 mx-2 text-[#84a98c]" />
                  <span className="text-sm text-[#cad2c5]">
                    {entry.new_assigned_user?.fullname || "Μη ανατεθειμένη"}
                  </span>
                </div>
              </div>
            )}
            
            {/* Amount Change */}
            {entry.previous_amount !== entry.new_amount && (
              <div className="mb-3">
                <div className="text-xs text-[#84a98c] mb-1">Ποσό</div>
                <div className="flex items-center">
                  <span className="text-sm text-[#cad2c5]">
                    {entry.previous_amount || "—"}
                  </span>
                  <ArrowRight className="h-4 w-4 mx-2 text-[#84a98c]" />
                  <span className="text-sm text-[#cad2c5]">
                    {entry.new_amount || "—"}
                  </span>
                </div>
              </div>
            )}
            
            {/* Requirements Change - Only show if there's a change */}
            {entry.previous_requirements !== entry.new_requirements && (
              <div className="mb-3">
                <div className="text-xs text-[#84a98c] mb-1">Απαιτήσεις</div>
                <div className="text-sm text-[#cad2c5]">
                  <div className="bg-[#354f52] p-2 rounded-md mb-2 max-h-20 overflow-y-auto">
                    {entry.previous_requirements || "—"}
                  </div>
                  <ArrowRight className="h-4 w-4 mx-2 text-[#84a98c] inline-block" />
                  <div className="bg-[#354f52] p-2 rounded-md mt-2 max-h-20 overflow-y-auto">
                    {entry.new_requirements || "—"}
                  </div>
                </div>
              </div>
            )}
            
            {/* Notes */}
            {entry.notes && (
              <div className="mt-3 pt-3 border-t border-[#52796f]/30">
                <div className="text-xs text-[#84a98c] mb-1">Σημειώσεις</div>
                <div className="text-sm text-[#cad2c5]">{entry.notes}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 