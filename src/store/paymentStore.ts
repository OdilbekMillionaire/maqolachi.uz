import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PaymentState {
  isPaid: boolean;
  verificationStatus: 'idle' | 'pending' | 'verified' | 'rejected';
  paidAmount: number;
  requiredAmount: number;
  verificationMessage: string;

  setIsPaid: (paid: boolean) => void;
  setVerificationStatus: (status: PaymentState['verificationStatus']) => void;
  setPaidAmount: (amount: number) => void;
  setRequiredAmount: (amount: number) => void;
  setVerificationMessage: (msg: string) => void;
  reset: () => void;
}

export const usePaymentStore = create<PaymentState>()(
  persist(
    (set) => ({
      isPaid: false,
      verificationStatus: 'idle',
      paidAmount: 0,
      requiredAmount: 0,
      verificationMessage: '',

      setIsPaid: (paid) => set({ isPaid: paid }),
      setVerificationStatus: (status) => set({ verificationStatus: status }),
      setPaidAmount: (amount) => set({ paidAmount: amount }),
      setRequiredAmount: (amount) => set({ requiredAmount: amount }),
      setVerificationMessage: (msg) => set({ verificationMessage: msg }),
      reset: () => set({
        isPaid: false,
        verificationStatus: 'idle',
        paidAmount: 0,
        requiredAmount: 0,
        verificationMessage: '',
      }),
    }),
    { name: 'maqolachi-payment' }
  )
);
