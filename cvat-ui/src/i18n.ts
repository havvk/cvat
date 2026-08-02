import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import moment from 'moment';
import 'moment/locale/zh-cn';

export const normalizeLanguage = (language?: string | null): 'zh' | 'en-US' => {
    const normalized = language?.toLowerCase();
    return normalized?.startsWith('en') ? 'en-US' : 'zh';
};

export const isChineseLanguage = (language?: string | null): boolean => normalizeLanguage(language) === 'zh';

export const getMomentLocale = (language?: string | null): 'zh-cn' | 'en' => (
    isChineseLanguage(language) ? 'zh-cn' : 'en'
);

const initialLanguage = normalizeLanguage(window.localStorage.getItem('i18nextLng'));
moment.locale(getMomentLocale(initialLanguage));

i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        lng: initialLanguage,
        fallbackLng: 'zh',
        supportedLngs: ['zh', 'en-US'],
        debug: process.env.NODE_ENV === 'development',
        detection: {
            order: ['localStorage'],
            caches: ['localStorage'],
        },
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
    });

i18n.on('languageChanged', (lng) => {
    moment.locale(getMomentLocale(lng));
});

export default i18n;
