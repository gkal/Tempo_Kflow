import React from 'react';

const DetailsTab: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-[#354f52] rounded-md border border-[#52796f]">
        <h3 className="text-[#a8c5b5] text-sm font-medium mb-3">Λεπτομέρειες</h3>
        <p className="text-[#cad2c5] text-xs">
          Αυτή η ενότητα είναι προς το παρόν κενή και θα συμπληρωθεί με περισσότερες λεπτομέρειες στο μέλλον.
        </p>
      </div>
      
      {/* Add empty placeholder sections to match the height of the first tab */}
      <div className="p-4 bg-[#354f52] rounded-md border border-[#52796f] opacity-50">
        <h3 className="text-[#a8c5b5] text-sm font-medium mb-3">Επιπλέον Πληροφορίες</h3>
        <p className="text-[#cad2c5] text-xs">
          Αυτή η ενότητα θα περιέχει επιπλέον πληροφορίες στο μέλλον.
        </p>
      </div>
      
      <div className="p-4 bg-[#354f52] rounded-md border border-[#52796f] opacity-50">
        <h3 className="text-[#a8c5b5] text-sm font-medium mb-3">Πρόσθετα Στοιχεία</h3>
        <p className="text-[#cad2c5] text-xs">
          Αυτή η ενότητα θα περιέχει πρόσθετα στοιχεία στο μέλλον.
        </p>
      </div>
    </div>
  );
};

export default DetailsTab; 