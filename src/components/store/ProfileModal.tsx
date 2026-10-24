import { useState, useEffect } from "react";
import { X, User, Phone, ChevronRight, Package, Heart, Send, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  telegramUsername?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (profile: ProfileData) => void;
}

const PROFILE_KEY = "alfacomp_profile_v1";

export function loadProfile(): ProfileData | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfile(data: ProfileData): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

const ProfileModal = ({ isOpen, onClose, onSave }: ProfileModalProps) => {
  const [profile, setProfile] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    phone: "",
    telegramUsername: "",
  });
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Partial<ProfileData>>({});

  useEffect(() => {
    if (isOpen) {
      const stored = loadProfile();
      if (stored) {
        setProfile(stored);
        setSaved(true);
      }
    }
  }, [isOpen]);

  const validate = () => {
    const errs: Partial<ProfileData> = {};
    if (!profile.firstName.trim()) errs.firstName = "Введите имя";
    if (!profile.lastName.trim()) errs.lastName = "Введите фамилию";
    if (!profile.phone.trim() || profile.phone.replace(/\D/g, "").length < 9)
      errs.phone = "Введите номер телефона";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    saveProfile(profile);
    setSaved(true);
    onSave?.(profile);
  };

  const handleClear = () => {
    setProfile({ firstName: "", lastName: "", phone: "", telegramUsername: "" });
    setSaved(false);
    try { localStorage.removeItem(PROFILE_KEY); } catch {}
  };

  const TELEGRAM_BOT_LINK = `https://t.me/alfacomp_ordersbot?start=profile`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
            className="relative w-full sm:max-w-[380px] h-full bg-[#08091a]
              border-l border-[#1565C0]/20 flex flex-col z-10
              shadow-[-24px_0_60px_rgba(0,0,0,0.60)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top hairline — blue */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#1565C0]/50 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06] bg-[#0a0c20]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1565C0] to-[#0D47A1]
                  flex items-center justify-center shadow-[0_4px_14px_rgba(21,101,192,0.3)]">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-white leading-none tracking-tight">
                    Профиль
                  </h2>
                  <span className="text-data text-[10px] text-white/35 mt-0.5 block">
                    {saved ? `${profile.firstName} ${profile.lastName}` : "Заполните данные"}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-white/20
                  flex items-center justify-center text-white/55 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Info banner */}
              <div className="p-3.5 rounded-xl bg-[#1565C0]/10 border border-[#1565C0]/20">
                <p className="text-[12px] text-blue-300/80 leading-relaxed">
                  Регистрация не обязательна. Укажите своё имя, фамилию и телефон для оформления заказа через Telegram.
                </p>
              </div>

              {/* Avatar placeholder */}
              {saved && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-3"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1565C0] to-[#0D47A1]
                    flex items-center justify-center mb-3 shadow-[0_8px_24px_rgba(21,101,192,0.35)]">
                    <span className="text-3xl font-bold text-white">
                      {profile.firstName[0]?.toUpperCase()}{profile.lastName[0]?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-white font-semibold text-[15px]">{profile.firstName} {profile.lastName}</p>
                  <p className="text-white/50 text-[12px] mt-0.5">{profile.phone}</p>
                </motion.div>
              )}

              {/* Form fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-mono block mb-1.5">
                    Имя *
                  </label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    placeholder="Иван"
                    className={`w-full h-11 px-4 rounded-xl bg-[#0f1220] border text-white text-[13px]
                      outline-none transition-all placeholder:text-white/20
                      ${errors.firstName
                        ? "border-red-500/60 focus:border-red-500"
                        : "border-white/[0.09] focus:border-[#1565C0]/60 focus:bg-[#111428]"
                      }`}
                  />
                  {errors.firstName && (
                    <p className="text-red-400 text-[11px] mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-mono block mb-1.5">
                    Фамилия *
                  </label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    placeholder="Петров"
                    className={`w-full h-11 px-4 rounded-xl bg-[#0f1220] border text-white text-[13px]
                      outline-none transition-all placeholder:text-white/20
                      ${errors.lastName
                        ? "border-red-500/60 focus:border-red-500"
                        : "border-white/[0.09] focus:border-[#1565C0]/60 focus:bg-[#111428]"
                      }`}
                  />
                  {errors.lastName && (
                    <p className="text-red-400 text-[11px] mt-1">{errors.lastName}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-mono block mb-1.5">
                    Номер телефона *
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+998 90 123-45-67"
                    className={`w-full h-11 px-4 rounded-xl bg-[#0f1220] border text-white text-[13px]
                      outline-none transition-all placeholder:text-white/20
                      ${errors.phone
                        ? "border-red-500/60 focus:border-red-500"
                        : "border-white/[0.09] focus:border-[#1565C0]/60 focus:bg-[#111428]"
                      }`}
                  />
                  {errors.phone && (
                    <p className="text-red-400 text-[11px] mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-mono block mb-1.5">
                    Telegram username
                    <span className="text-white/25 ml-1.5 normal-case">(необязательно)</span>
                  </label>
                  <input
                    type="text"
                    value={profile.telegramUsername || ""}
                    onChange={(e) => setProfile({ ...profile, telegramUsername: e.target.value })}
                    placeholder="@username"
                    className="w-full h-11 px-4 rounded-xl bg-[#0f1220] border border-white/[0.09]
                      text-white text-[13px] outline-none transition-all placeholder:text-white/20
                      focus:border-[#1565C0]/60 focus:bg-[#111428]"
                  />
                </div>
              </div>

              {/* Quick links */}
              {saved && (
                <div className="space-y-2 pt-2">
                  <div className="h-px bg-white/[0.05]" />
                  {[
                    { icon: Package, label: "Мои данные", sub: "Имя, телефон, адрес" },
                    { icon: Heart, label: "Избранное", sub: "Сохранённые товары" },
                    { icon: Phone, label: "Связаться с нами", sub: "Поддержка и вопросы" },
                  ].map(({ icon: Icon, label, sub }) => (
                    <button
                      key={label}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]
                        border border-white/[0.05] hover:border-white/[0.10] hover:bg-white/[0.04]
                        transition-all text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#1565C0]/10 border border-[#1565C0]/20
                        flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#42A5F5]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-white">{label}</p>
                        <p className="text-[11px] text-white/40">{sub}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-white/[0.06] bg-[#0a0c20] space-y-3">
              {/* Save button */}
              <button
                onClick={handleSave}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1565C0] to-[#1976D2]
                  text-white font-semibold text-[13.5px] flex items-center justify-center gap-2
                  hover:from-[#1976D2] hover:to-[#1E88E5] transition-all
                  shadow-[0_4px_20px_rgba(21,101,192,0.30)] active:scale-[0.98]"
              >
                {saved ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Обновить данные
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    Сохранить
                  </>
                )}
              </button>

              {/* Open Telegram bot */}
              <a
                href={TELEGRAM_BOT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 rounded-xl bg-[#0f1220] border border-[#1565C0]/25
                  text-blue-300 font-medium text-[13px] flex items-center justify-center gap-2
                  hover:border-[#1565C0]/50 hover:bg-[#1565C0]/10 transition-all"
              >
                <Send className="w-4 h-4" />
                Открыть Telegram бот
              </a>

              {saved && (
                <button
                  onClick={handleClear}
                  className="w-full text-[11px] text-white/28 hover:text-red-400 transition-colors py-1"
                >
                  Очистить данные профиля
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProfileModal;
