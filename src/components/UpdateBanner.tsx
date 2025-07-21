"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { HiOutlineXMark } from "react-icons/hi2";

interface UpdateBannerProps {
  onUpdate: () => void;
  notes?: string;
  onDismiss?: () => void;
}

const UpdateBanner: React.FC<UpdateBannerProps> = ({ onUpdate, notes, onDismiss }) => {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const handleDismiss = () => {
    setHidden(true);
    onDismiss?.();
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white p-4 rounded-lg shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 z-50">
      <p className="text-sm">{t("updateBanner.message")}</p>
      {notes ? <p className="text-xs text-slate-300">{notes}</p> : null}
      <button
        onClick={onUpdate}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md text-sm transition-colors"
      >
        {t("updateBanner.reloadButton")}
      </button>
      <button
        onClick={handleDismiss}
        className="text-slate-400 hover:text-slate-200"
        aria-label={t("updateBanner.dismissButton")}
      >
        <HiOutlineXMark className="w-5 h-5" />
      </button>
    </div>
  );
};

export default UpdateBanner;
