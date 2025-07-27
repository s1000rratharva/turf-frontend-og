'use client';

import React, { Suspense } from 'react';
import PaymentComponent from './PaymentComponent';

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="text-center mt-12">Loading...</div>}>
      <PaymentComponent />
    </Suspense>
  );
}
