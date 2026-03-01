import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// VIP emails that bypass payment
export const VIP_EMAILS = ['ceo@oxforder.uz'];

interface PaymentState {
  isPaid: boolean;
  isVip: boolean;
  vipEmail: string;
  verificationStatus: 'idle' | 'pending' | 'verified' | 'rejected';
  paidAmount: number;
  requiredAmount: number;
  verificationMessage: string;

  setIsPaid: (paid: boolean) => void;
  setIsVip: (vip: boolean) => void;
  setVipEmail: (email: string) => void;
  checkVipAccess: (email: string) => boolean;
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
      isVip: false,
      vipEmail: '',
      verificationStatus: 'idle',
      paidAmount: 0,
      requiredAmount: 0,
      verificationMessage: '',

      setIsPaid: (paid) => set({ isPaid: paid }),
      setIsVip: (vip) => set({ isVip: vip }),
      setVipEmail: (email) => set({ vipEmail: email }),
      checkVipAccess: (email: string) => {
        const isVip = VIP_EMAILS.includes(email.toLowerCase().trim());
        if (isVip) {
          set({ isVip: true, vipEmail: email.toLowerCase().trim(), isPaid: true });
        }
        return isVip;
      },
      setVerificationStatus: (status) => set({ verificationStatus: status }),
      setPaidAmount: (amount) => set({ paidAmount: amount }),
      setRequiredAmount: (amount) => set({ requiredAmount: amount }),
      setVerificationMessage: (msg) => set({ verificationMessage: msg }),
      reset: () => set({
        isPaid: false,
        isVip: false,
        vipEmail: '',
        verificationStatus: 'idle',
        paidAmount: 0,
        requiredAmount: 0,
        verificationMessage: '',
      }),
    }),
    { name: 'maqolachi-payment' }
  )
);
