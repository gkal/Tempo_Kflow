import React from 'react';

const CustomerDetails = ({ customer }) => {
  if (!customer) {
    return <div>Loading customer details...</div>;
  }

  return (
    <div className="customer-details">
      <div className="section" id="contacts-section">
        <h2>Επαφές</h2>
        
        <div 
          className="contacts-container" 
          style={{
            maxHeight: "150px", /* Adjust height to show approximately 2 contacts */
            overflowY: "auto",
            border: "1px solid #e2e8f0",
            borderRadius: "0.375rem",
            padding: "0.5rem"
          }}
        >
          {customer.contacts && customer.contacts.length > 0 ? (
            customer.contacts.map((contact, index) => (
              <div key={contact.id || index} className="contact-item mb-2 pb-2 border-b border-gray-200 last:border-b-0">
                <p><strong>Όνομα:</strong> {contact.name}</p>
                <p><strong>Τηλέφωνο:</strong> {contact.phone}</p>
                <p><strong>Email:</strong> {contact.email}</p>
                {/* Add any other contact details you want to display */}
              </div>
            ))
          ) : (
            <p>Δεν υπάρχουν επαφές</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails; 