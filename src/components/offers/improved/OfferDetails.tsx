import React from "react";
import { formatDateTime } from "@/utils/formatUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, ExternalLink } from "lucide-react";

interface OfferDetailsProps {
  offer: any;
  onEditClick: (offerId: string) => void;
}

export function OfferDetails({ offer, onEditClick }: OfferDetailsProps) {
  if (!offer) return null;

  // Format status for display
  const formatStatus = (status: string) => {
    switch (status) {
      case "wait_for_our_answer":
        return "Αναμονή για απάντησή μας";
      case "wait_for_customer_answer":
        return "Αναμονή για απάντηση πελάτη";
      case "ready":
        return "Ολοκληρώθηκε";
      default:
        return status || "—";
    }
  };

  // Format result for display
  const formatResult = (result: string) => {
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
        return result || "—";
    }
  };

  // Format source for display
  const formatSource = (source: string) => {
    switch (source) {
      case "phone":
        return "Τηλέφωνο";
      case "email":
        return "Email";
      case "site":
        return "Ιστοσελίδα";
      case "personal":
        return "Προσωπική επαφή";
      case "other":
        return "Άλλο";
      default:
        return source || "—";
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "wait_for_our_answer":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-400/30";
      case "wait_for_customer_answer":
        return "bg-blue-500/20 text-blue-400 border-blue-400/30";
      case "ready":
        return "bg-green-500/20 text-green-400 border-green-400/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-400/30";
    }
  };

  // Get result color
  const getResultColor = (result: string) => {
    switch (result) {
      case "success":
        return "bg-green-500/20 text-green-400 border-green-400/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-400/30";
      case "cancel":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-400/30";
      case "pending":
        return "bg-purple-500/20 text-purple-400 border-purple-400/30";
      case "waiting":
        return "bg-blue-500/20 text-blue-400 border-blue-400/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-400/30";
    }
  };

  return (
    <div className="p-4 bg-[#2f3e46] border-t border-[#52796f] animate-fadeIn">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-[#cad2c5] mb-1">
            Λεπτομέρειες Προσφοράς
          </h3>
          <p className="text-sm text-[#84a98c]">
            Δημιουργήθηκε: {formatDateTime(offer.created_at)}
            {offer.updated_at && offer.updated_at !== offer.created_at && (
              <span> | Ενημερώθηκε: {formatDateTime(offer.updated_at)}</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52]"
          onClick={() => onEditClick(offer.id)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Επεξεργασία
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          <Card className="bg-[#354f52] border-[#52796f]">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-[#84a98c] mb-2">Πληροφορίες Πελάτη</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-[#84a98c]">Εταιρεία</p>
                  <p className="text-sm text-[#cad2c5]">
                    {offer.customer?.[0]?.company_name || "—"}
                  </p>
                </div>
                {offer.customer?.[0]?.id && (
                  <div className="pt-1">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-6 p-0 text-[#84a98c] hover:text-[#cad2c5]"
                      asChild
                    >
                      <a href={`/customers/${offer.customer[0].id}`}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Προβολή Πελάτη
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#354f52] border-[#52796f]">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-[#84a98c] mb-2">Κατάσταση & Αποτέλεσμα</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className={`${getStatusColor(offer.offer_result)}`}>
                  {formatStatus(offer.offer_result)}
                </Badge>
                <Badge className={`${getResultColor(offer.result)}`}>
                  {formatResult(offer.result)}
                </Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-[#84a98c]">Πηγή</p>
                  <p className="text-sm text-[#cad2c5]">
                    {formatSource(offer.source)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#84a98c]">Ποσό</p>
                  <p className="text-sm text-[#cad2c5] font-medium">
                    {offer.amount ? `${offer.amount}€` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card className="bg-[#354f52] border-[#52796f]">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-[#84a98c] mb-2">Ζήτηση Πελάτη</h4>
              <p className="text-sm text-[#cad2c5] whitespace-pre-wrap">
                {offer.requirements || "—"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#354f52] border-[#52796f]">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-[#84a98c] mb-2">Σχόλια</h4>
              <p className="text-sm text-[#cad2c5] whitespace-pre-wrap">
                {offer.comments || "—"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#354f52] border-[#52796f]">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-[#84a98c] mb-2">Υπεύθυνοι</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-[#84a98c]">Δημιουργήθηκε από</p>
                  <p className="text-sm text-[#cad2c5]">
                    {offer.created_user?.fullname || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#84a98c]">Ανατέθηκε σε</p>
                  <p className="text-sm text-[#cad2c5]">
                    {offer.assigned_user?.fullname || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 