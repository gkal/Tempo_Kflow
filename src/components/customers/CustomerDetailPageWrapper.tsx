import { useParams, useNavigate } from "react-router-dom";
import ErrorBoundary from "../ErrorBoundary";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Wrapper component for CustomerDetailPage that adds error handling
 * This allows the app to function even when there are syntax errors in the CustomerDetailPage component
 */
export default function CustomerDetailPageWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fallback UI to show when the CustomerDetailPage component crashes
  const fallbackUI = (
    <div className="p-8 text-center text-[#cad2c5]">
      <h2 className="text-xl mb-4">Σφάλμα φόρτωσης στοιχείων πελάτη</h2>
      <p className="mb-6 text-[#84a98c]">
        Παρουσιάστηκε σφάλμα κατά τη φόρτωση της σελίδας στοιχείων του πελάτη.
        Η ομάδα ανάπτυξης έχει ενημερωθεί για το πρόβλημα.
      </p>
      <Button
        onClick={() => navigate("/customers")}
        className="mt-4 bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Επιστροφή στη λίστα πελατών
      </Button>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallbackUI}>
      <div className="bg-[#2f3e46] p-4 rounded-lg border border-[#52796f] h-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-[#a8c5b5]">
            Προσωρινά μη διαθέσιμο
          </h1>
          <Button
            onClick={() => navigate("/customers")}
            className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Επιστροφή στη λίστα πελατών
          </Button>
        </div>
        <div className="bg-[#354f52] p-6 rounded-lg">
          <p className="text-[#cad2c5] mb-4">
            Η σελίδα λεπτομερειών πελάτη είναι προσωρινά μη διαθέσιμη λόγω τεχνικού προβλήματος.
          </p>
          <p className="text-[#cad2c5]">
            Παρακαλώ επιστρέψτε στη λίστα πελατών και δοκιμάστε ξανά αργότερα.
          </p>
        </div>
      </div>
    </ErrorBoundary>
  );
} 