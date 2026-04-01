"use client";

import { LogOut, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: LogoutConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm rounded-[32px] border border-border-color bg-bg-primary p-8 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20">
                <LogOut className="h-10 w-10" />
              </div>
              
              <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">
                Sign Out
              </h2>
              <p className="mt-3 text-sm font-medium text-text-secondary leading-relaxed">
                Are you sure you want to end your active session? You will need to log back in to access the portal.
              </p>

              <div className="mt-10 flex w-full flex-col gap-3">
                <button
                  onClick={onConfirm}
                  className="w-full rounded-2xl bg-rose-500 py-3.5 text-sm font-black text-slate-950 transition-all hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/25 active:scale-[0.98]"
                >
                  Confirm Logout
                </button>
                <button
                  onClick={onClose}
                  className="w-full rounded-2xl border border-border-color bg-bg-secondary py-3.5 text-sm font-bold text-text-primary transition-all hover:bg-hover-bg active:scale-[0.98]"
                >
                  Stay Logged In
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute right-6 top-6 rounded-full p-2 text-text-secondary hover:bg-hover-bg hover:text-text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
