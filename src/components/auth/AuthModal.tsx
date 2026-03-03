import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, Loader2, BookOpen, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    lang?: "uz" | "en" | "ru";
}

const LABELS = {
    uz: {
        login: "Kirish",
        signup: "Ro'yxatdan o'tish",
        email: "Email",
        password: "Parol",
        name: "Ism",
        loginBtn: "Kirish",
        signupBtn: "Ro'yxatdan o'tish",
        noAccount: "Hisob yo'qmi?",
        hasAccount: "Hisobingiz bormi?",
        emailPlaceholder: "email@example.com",
        passwordPlaceholder: "Parolni kiriting",
        namePlaceholder: "To'liq ismingiz",
        loginSuccess: "Xush kelibsiz!",
        signupSuccess: "Hisob yaratildi! Email tasdiqlang.",
        error: "Xatolik yuz berdi",
        orContinue: "yoki",
        tagline: "Ilmiy maqolalaringizni yarating",
    },
    en: {
        login: "Login",
        signup: "Sign Up",
        email: "Email",
        password: "Password",
        name: "Full Name",
        loginBtn: "Sign In",
        signupBtn: "Create Account",
        noAccount: "No account?",
        hasAccount: "Already have an account?",
        emailPlaceholder: "email@example.com",
        passwordPlaceholder: "Enter your password",
        namePlaceholder: "Your full name",
        loginSuccess: "Welcome back!",
        signupSuccess: "Account created! Check your email.",
        error: "Something went wrong",
        orContinue: "or",
        tagline: "Create academic articles with AI",
    },
    ru: {
        login: "Войти",
        signup: "Регистрация",
        email: "Email",
        password: "Пароль",
        name: "Имя",
        loginBtn: "Войти",
        signupBtn: "Создать аккаунт",
        noAccount: "Нет аккаунта?",
        hasAccount: "Уже есть аккаунт?",
        emailPlaceholder: "email@example.com",
        passwordPlaceholder: "Введите пароль",
        namePlaceholder: "Ваше полное имя",
        loginSuccess: "Добро пожаловать!",
        signupSuccess: "Аккаунт создан! Проверьте email.",
        error: "Произошла ошибка",
        orContinue: "или",
        tagline: "Создавайте научные статьи с ИИ",
    },
};

export const AuthModal = ({ isOpen, onClose, lang = "uz" }: AuthModalProps) => {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const t = LABELS[lang];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                toast.success(t.loginSuccess);
                onClose();
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: name } },
                });
                if (error) throw error;
                toast.success(t.signupSuccess);
                onClose();
            }
        } catch (err: any) {
            toast.error(err?.message || t.error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
                    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        {/* Header */}
                        <div className="relative p-6 pb-4 text-center border-b border-border">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground">Maqolachi AI</h2>
                            <p className="text-sm text-muted-foreground mt-1">{t.tagline}</p>
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-secondary hover:bg-muted flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Tab switcher */}
                        <div className="flex mx-6 mt-4 mb-0 bg-secondary rounded-xl p-1">
                            {(["login", "signup"] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === m
                                            ? "bg-card text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {m === "login" ? t.login : t.signup}
                                </button>
                            ))}
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {mode === "signup" && (
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={t.namePlaceholder}
                                        required={mode === "signup"}
                                        className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    />
                                </div>
                            )}

                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t.emailPlaceholder}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t.passwordPlaceholder}
                                    required
                                    minLength={6}
                                    className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full gap-2"
                                variant="hero"
                                size="lg"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                {mode === "login" ? t.loginBtn : t.signupBtn}
                            </Button>
                        </form>

                        {/* Footer */}
                        <div className="px-6 pb-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                {mode === "login" ? t.noAccount : t.hasAccount}{" "}
                                <button
                                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                                    className="text-primary font-medium hover:underline"
                                >
                                    {mode === "login" ? t.signup : t.login}
                                </button>
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
