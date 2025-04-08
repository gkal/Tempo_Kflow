import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { OfferTableRowProps } from '../types/interfaces';
import { getStatusClass, getResultClass } from '../utils/formatters';

/**
 * OfferTableRow component for displaying an offer row in the customer offers table
 * This is extracted from the original CustomersPage component with no changes to functionality
 */
export const OfferTableRow: React.FC<OfferTableRowProps> = ({
  offer,
  customerId,
  onEdit,
  formatDateTime,
  formatStatus,
  formatResult,
  isAdminOrSuperUser,
  onDelete
}) => {
  return (
    <tr
      key={offer.id}
      className="border-b border-[#52796f]/20 hover:bg-[#354f52]/20"
    >
      <td className="p-2">{offer.name || 'Προσφορά'}</td>
      <td className="p-2">{offer.value ? `${offer.value}€` : '—'}</td>
      <td className="p-2">
        <span className={getStatusClass(offer.status)}>
          {formatStatus(offer.status)}
        </span>
      </td>
      <td className="p-2">
        <span className={getResultClass(offer.result)}>
          {formatResult(offer.result)}
        </span>
      </td>
      <td className="p-2">{offer.requirements || '—'}</td>
      <td className="p-2 text-sm">
        <div className="flex items-center">
          <span className="text-xs">{formatDateTime(offer.date)}</span>
          <div className="flex ml-auto">
            <button
              onClick={() => onEdit(customerId, offer.id)}
              className="p-1 rounded-full hover:bg-[#52796f]/20"
              title="Επεξεργασία"
            >
              <Edit className="h-3.5 w-3.5 text-[#84a98c]" />
            </button>
            {isAdminOrSuperUser && (
              <button
                onClick={() => onDelete(customerId, offer.id)}
                className="p-1 rounded-full hover:bg-red-500/20"
                title="Διαγραφή"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}; 