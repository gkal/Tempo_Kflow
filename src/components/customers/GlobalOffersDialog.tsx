import React, { useState, useEffect } from 'react';
import OffersDialog from './OffersDialog';

// Create a global event system
const eventSystem = {
  listeners: new Set(),
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },
  publish(event) {
    this.listeners.forEach(listener => listener(event));
  }
};

// Dialog state
let dialogState = {
  isOpen: false,
  customerId: null,
  offerId: null,
  defaultSource: 'Email',
  onSave: () => {}
};

// Public API
export function openOfferDialog(props) {
  dialogState = {
    isOpen: true,
    customerId: props.customerId,
    offerId: props.offerId,
    defaultSource: props.defaultSource || 'Email',
    onSave: props.onSave || (() => {})
  };
  
  eventSystem.publish(dialogState);
  console.log(`Opening offer dialog for customer ${props.customerId}`);
}

export function closeOfferDialog() {
  dialogState = {
    ...dialogState,
    isOpen: false
  };
  
  eventSystem.publish(dialogState);
  console.log('Closing offer dialog');
}

// Component that renders the dialog
export default function GlobalOffersDialog() {
  const [state, setState] = useState(dialogState);
  
  useEffect(() => {
    // Subscribe to dialog state changes
    const unsubscribe = eventSystem.subscribe(newState => {
      setState(newState);
    });
    
    return unsubscribe;
  }, []);
  
  if (!state.isOpen || !state.customerId) {
    return null;
  }
  
  return (
    <OffersDialog
      key={`offer-dialog-${state.customerId}-${Date.now()}`}
      open={state.isOpen}
      onOpenChange={(open) => {
        if (!open) closeOfferDialog();
      }}
      customerId={state.customerId}
      offerId={state.offerId}
      defaultSource={state.defaultSource}
      onSave={state.onSave}
    />
  );
} 