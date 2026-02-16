import { motion } from "framer-motion";
import { useState, useRef } from "react";
import {
  CreditCard, Upload, Loader2, CheckCircle2, XCircle,
  ShieldCheck, Copy, ArrowRight, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaymentStore } from "@/store/paymentStore";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_CARD, formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PaymentGateProps {
  requiredAmount: number;
  language: string;
  onVerified: () => void;
}

export const PaymentGate = ({ requiredAmount, language, onVerified }: PaymentGateProps) => {
  const { verificationStatus, setVerificationStatus, setIsPaid, setVerificationMessage, verificationMessage } = usePaymentStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lang = language || 'uz';

  const t = {
    uz: {
      title: "To'lov",
      subtitle: "Maqola yaratish uchun to'lovni amalga oshiring",
      cardLabel: "To'lov kartasi",
      amountLabel: "To'lov summasi",
      step1: "1. Quyidagi kartaga pul o'tkazing",
      step2: "2. To'lov screenshotini yuklang",
      step3: "3. AI tekshiruvdan o'tkazing",
      uploadBtn: "Screenshot yuklash",
      changeFile: "Boshqa fayl tanlash",
      verifyBtn: "Tekshirish",
      verifying: "Tekshirilmoqda...",
      verified: "To'lov tasdiqlandi!",
      rejected: "To'lov tasdiqlanmadi",
      continueBtn: "Davom etish",
      tryAgain: "Qaytadan urinish",
      copied: "Nusxalandi!",
      note: "Summa ko'proq bo'lishi mumkin, lekin kam bo'lmasligi kerak",
    },
    en: {
      title: "Payment",
      subtitle: "Complete payment to generate your article",
      cardLabel: "Payment card",
      amountLabel: "Amount due",
      step1: "1. Transfer to the card below",
      step2: "2. Upload payment screenshot",
      step3: "3. Pass AI verification",
      uploadBtn: "Upload screenshot",
      changeFile: "Choose different file",
      verifyBtn: "Verify",
      verifying: "Verifying...",
      verified: "Payment verified!",
      rejected: "Payment not verified",
      continueBtn: "Continue",
      tryAgain: "Try again",
      copied: "Copied!",
      note: "Amount can be more but not less than required",
    },
    ru: {
      title: "Оплата",
      subtitle: "Оплатите для создания статьи",
      cardLabel: "Карта для оплаты",
      amountLabel: "Сумма к оплате",
      step1: "1. Переведите на карту ниже",
      step2: "2. Загрузите скриншот оплаты",
      step3: "3. Пройдите AI-верификацию",
      uploadBtn: "Загрузить скриншот",
      changeFile: "Выбрать другой файл",
      verifyBtn: "Проверить",
      verifying: "Проверяется...",
      verified: "Оплата подтверждена!",
      rejected: "Оплата не подтверждена",
      continueBtn: "Продолжить",
      tryAgain: "Попробовать снова",
      copied: "Скопировано!",
      note: "Сумма может быть больше, но не меньше требуемой",
    },
  }[lang] || {
    title: "To'lov", subtitle: "", cardLabel: "", amountLabel: "",
    step1: "", step2: "", step3: "", uploadBtn: "", changeFile: "",
    verifyBtn: "", verifying: "", verified: "", rejected: "",
    continueBtn: "", tryAgain: "", copied: "", note: "",
  };

  const handleCopyCard = () => {
    navigator.clipboard.writeText(PAYMENT_CARD.replace(/\s/g, ''));
    toast.success(t.copied);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setVerificationStatus('idle');
    setVerificationMessage('');
  };

  const handleVerify = async () => {
    if (!selectedFile) return;

    setIsVerifying(true);
    setVerificationStatus('pending');

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:image/...;base64, prefix
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: {
          imageBase64: base64,
          mimeType: selectedFile.type || 'image/jpeg',
          requiredAmount,
        }
      });

      if (error) throw error;

      if (data?.verified) {
        setVerificationStatus('verified');
        setVerificationMessage(data.message || t.verified);
        setIsPaid(true);
      } else {
        setVerificationStatus('rejected');
        setVerificationMessage(data?.message || t.rejected);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setVerificationStatus('rejected');
      setVerificationMessage(error?.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRetry = () => {
    setVerificationStatus('idle');
    setVerificationMessage('');
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <div className="glass-panel p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t.title}</h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {/* Step 1: Card info */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">{t.step1}</p>
            <div className="bg-secondary/50 border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{t.cardLabel}</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-mono font-bold text-foreground tracking-wider">
                  {PAYMENT_CARD}
                </span>
                <button
                  onClick={handleCopyCard}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">{t.amountLabel}</p>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(requiredAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t.note}
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Upload screenshot */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">{t.step2}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!previewUrl ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl p-8 hover:border-primary/50 transition-colors flex flex-col items-center gap-3"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t.uploadBtn}</span>
              </button>
            ) : (
              <div className="space-y-3">
                <img
                  src={previewUrl}
                  alt="Payment screenshot"
                  className="w-full rounded-xl border border-border max-h-64 object-contain bg-secondary/30"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-primary hover:underline"
                >
                  {t.changeFile}
                </button>
              </div>
            )}
          </div>

          {/* Step 3: Verify */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">{t.step3}</p>

            {verificationStatus === 'idle' && selectedFile && (
              <Button
                onClick={handleVerify}
                className="w-full gap-2"
                size="lg"
              >
                <ShieldCheck className="w-5 h-5" />
                {t.verifyBtn}
              </Button>
            )}

            {verificationStatus === 'pending' && (
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-foreground font-medium">{t.verifying}</span>
              </div>
            )}

            {verificationStatus === 'verified' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">{t.verified}</p>
                    <p className="text-sm text-muted-foreground">{verificationMessage}</p>
                  </div>
                </div>
                <Button onClick={onVerified} className="w-full gap-2" variant="hero" size="lg">
                  {t.continueBtn}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            )}

            {verificationStatus === 'rejected' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <XCircle className="w-6 h-6 text-destructive flex-shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">{t.rejected}</p>
                    <p className="text-sm text-muted-foreground">{verificationMessage}</p>
                  </div>
                </div>
                <Button onClick={handleRetry} variant="outline" className="w-full gap-2">
                  {t.tryAgain}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
