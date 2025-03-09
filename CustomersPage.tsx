const handleDeleteOffer = (customerId: string, offerId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  e.preventDefault();
  
  console.log("Delete clicked for offer:", offerId, "of customer:", customerId);
  setOfferToDelete({ customerId, offerId });
  setShowDeleteOfferDialog(true);
}; 