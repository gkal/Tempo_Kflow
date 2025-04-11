import { useEffect } from 'react';

interface FormSuccessProps {
  customerName: string;
}

/**
 * Success component shown after successful form submission
 */
const FormSuccess = ({ customerName }: FormSuccessProps) => {
  // Add confetti effect on mount
  useEffect(() => {
    // Simple confetti effect - in a real app we might use a confetti library
    const createConfetti = () => {
      const confettiCount = 100;
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      
      for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        const size = Math.random() * 10 + 5;
        
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.position = 'fixed';
        confetti.style.top = '-10px';
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.opacity = '0';
        confetti.style.transform = 'translateY(0)';
        confetti.style.borderRadius = '50%';
        confetti.style.zIndex = '1000';
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
          confetti.style.transition = 'transform 3s ease-out, opacity 3s ease-out';
          confetti.style.transform = `translateY(${Math.random() * 500 + 500}px) rotate(${Math.random() * 360}deg)`;
          confetti.style.opacity = `${Math.random() * 0.7 + 0.3}`;
        }, 10);
        
        setTimeout(() => {
          document.body.removeChild(confetti);
        }, 3000);
      }
    };
    
    createConfetti();
    
    // Clean up any remaining confetti on unmount
    return () => {
      const confetti = document.querySelectorAll('div[style*="position: fixed"]');
      confetti.forEach(element => {
        if (document.body.contains(element)) {
          document.body.removeChild(element);
        }
      });
    };
  }, []);
  
  return (
    <div className="py-12 px-6 text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
        <svg
          className="h-10 w-10 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
        Ευχαριστούμε για την υποβολή!
      </h2>
      
      <p className="text-lg text-gray-600 mb-6">
        {customerName}, η φόρμα σας υποβλήθηκε με επιτυχία.
      </p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <h3 className="font-medium text-blue-800 mb-2">Τι συμβαίνει τώρα;</h3>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Θα λάβετε ένα email επιβεβαίωσης με τα στοιχεία της φόρμας σας</li>
          <li>Η ομάδα μας θα επεξεργαστεί το αίτημά σας</li>
          <li>Θα επικοινωνήσουμε μαζί σας εντός 24 ωρών για να συζητήσουμε τις λεπτομέρειες</li>
          <li>Θα λάβετε την προσφορά σας μέσω email</li>
        </ol>
      </div>
      
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 justify-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Εκτύπωση επιβεβαίωσης
        </button>
        
        <button
          type="button"
          onClick={() => window.location.href = "/"}
          className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Επιστροφή στην αρχική
        </button>
      </div>
    </div>
  );
};

export default FormSuccess; 