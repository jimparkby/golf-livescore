import { useSettings } from "@/store/settingsStore";
import { translations } from "@/lib/translations";

export const useTranslation = () => {
  const { language } = useSettings();
  const t = translations[language];

  return { t, language };
};
