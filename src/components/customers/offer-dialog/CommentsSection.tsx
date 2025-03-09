import React, { useContext } from 'react';
import { OfferDialogContext } from '../OffersDialog';

const CommentsSection = () => {
  const { register } = useContext(OfferDialogContext);

  return (
    <div className="mt-4">
      <div className="bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
        <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
          <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
            ΣΧΟΛΙΑ
          </h2>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[#a8c5b5] text-sm mb-1">
                Σχόλια Πελάτη
              </div>
              <textarea
                id="customer_comments"
                className="w-full bg-[#2f3e46] text-[#cad2c5] p-2 rounded-sm"
                style={{
                  border: '1px solid #52796f',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
                placeholder="Σχόλια πελάτη..."
                rows={3}
                {...register("customer_comments")}
              ></textarea>
            </div>

            <div>
              <div className="text-[#a8c5b5] text-sm mb-1">
                Δικά μας Σχόλια
              </div>
              <textarea
                id="our_comments"
                className="w-full bg-[#2f3e46] text-[#cad2c5] p-2 rounded-sm"
                style={{
                  border: '1px solid #52796f',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
                placeholder="Δικά μας σχόλια..."
                rows={3}
                {...register("our_comments")}
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsSection; 