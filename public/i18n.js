// ═══════════════════════════════════════════════════════════════════════
// ALSL — Full translation system (all 3 languages everywhere)
// ═══════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  ar: {
    // App chrome
    appTitle:             "لغة الإشارة",
    pageTitle:            "تقييم لغة الإشارة",
    logoText:             "لغة الإشارة",
    // Login / Register
    loginTitle:           "لغة الإشارة الجزائرية",
    loginSubtitle:        "منصة تقييم إشارات اللغة الجزائرية",
    tabLogin:             "تسجيل الدخول",
    tabRegister:          "حساب جديد",
    regFullName:          "الاسم الكامل",
    regEmail:             "البريد الإلكتروني",
    regUsername:          "اسم المستخدم (للدخول)",
    regPassword:          "كلمة المرور (6 أحرف على الأقل)",
    loginUsername:        "اسم المستخدم",
    loginPassword:        "كلمة المرور",
    btnLogin:             "دخول",
    btnRegister:          "إنشاء حساب",
    loginHint:            "تقدمك يُحفظ تلقائياً — يمكنك الدخول من أي جهاز",
    // Errors
    errFillFields:        "أكمل جميع الحقول",
    errUsernamePass:      "أدخل اسم المستخدم وكلمة المرور",
    errConnection:        "لا يمكن الاتصال بالخادم",
    errAuthFail:          "خطأ في تسجيل الدخول",
    errRegisterFail:      "خطأ في إنشاء الحساب",
    errInvalidEmail:      "بريد إلكتروني غير صحيح",
    confirmLogout:        "هل تريد تسجيل الخروج؟",
    // Header
    btnCategories:        "الفئات",
    btnEndSession:        "إنهاء",
    // Picker
    pickerTitle:          "اختر فئة للبدء",
    pickerSubtitle:       "يمكنك البدء من أي فئة والعودة لاحقاً",
    remaining:            "متبقية",
    allSigns:             "جميع الإشارات",
    // Categories
    catNouns:             "أسماء",
    catVerbs:             "أفعال",
    catAdjectives:        "صفات",
    catAdverbs:           "ظروف",
    catPrepositions:      "حروف جر",
    catPronouns:          "ضمائر",
    // Eval card
    conceptLabel:         "المفهوم",
    btnYes:               "صحيح",
    btnNo:                "خطأ",
    btnAlmost:            "تقريباً",
    btnPrev:              "السابق",
    btnNext:              "التالي",
    btnFlag:              "إبلاغ",
    shortcuts:            "اختصارات:",
    commentLabel:         "تعليق (اختياري):",
    commentPlaceholder:   "اكتب ملاحظة حول هذه الإشارة…",
    alreadyEvaluated:     "تم تقييمه",
    variantOf:            "نسخة {pos} من {total}",
    // Flag modal
    flagTitle:            "أرسل تقريرًا",
    flagSubtitle:         "ما المشاكل التي تراها في هذه الإشارة؟",
    flagWrong:            "إشارة خاطئة",
    flagWrongDesc:        "الإشارة لا تطابق المفهوم المعروض.",
    flagQuality:          "جودة رديئة",
    flagQualityDesc:      "المقطع غير واضح أو الإضاءة سيئة.",
    flagOther:            "أخرى",
    flagCommentPlaceholder: "ملاحظة إضافية (اختياري)",
    flagSubmit:           "أبلغ",
    // Finished screen
    doneTitle:            "شكراً لك 🙏",
    doneThanks:           "نثمّن مساهمتكم في بناء قاعدة بيانات لغة الإشارة الجزائرية",
    finOverallLabel:      "التقدم الإجمالي",
    btnBackToCategories:  "العودة للفئات",
    btnRestart:           "مراجعة هذه الفئة",
    totalRated:           "مقيّم في هذه الجلسة",
    btnDownloadCsv:       "📥 تحميل عملي (CSV)",
    // Session
    endSessionConfirm:    "إنهاء الجلسة الحالية؟",
    // Alerts
    alertSaveFail:        "فشل الحفظ — حاول مرة أخرى.",
    alertNoServer:        "لا يمكن الاتصال بالخادم. هل هو يعمل؟",
    // Profile menu
    profileSettings:      "إعدادات الحساب",
    profileLogout:        "تسجيل الخروج",
    profileDownload:      "تحميل عملي",
  },
  en: {
    // App chrome
    appTitle:             "Sign Language",
    pageTitle:            "Sign Language Evaluation",
    logoText:             "ALSL",
    // Login / Register
    loginTitle:           "Algerian Sign Language",
    loginSubtitle:        "Sign evaluation platform for ALSL",
    tabLogin:             "Login",
    tabRegister:          "Register",
    regFullName:          "Full name",
    regEmail:             "Email",
    regUsername:          "Username (for login)",
    regPassword:          "Password (at least 6 characters)",
    loginUsername:        "Username",
    loginPassword:        "Password",
    btnLogin:             "Login",
    btnRegister:          "Create account",
    loginHint:            "Your progress saves automatically — log in from any device",
    // Errors
    errFillFields:        "Please fill all fields",
    errUsernamePass:      "Enter your username and password",
    errConnection:        "Cannot reach the server",
    errAuthFail:          "Login failed",
    errRegisterFail:      "Registration failed",
    errInvalidEmail:      "Invalid email address",
    confirmLogout:        "Log out?",
    // Header
    btnCategories:        "Categories",
    btnEndSession:        "End",
    // Picker
    pickerTitle:          "Choose a category",
    pickerSubtitle:       "Start anywhere — you can return anytime",
    remaining:            "left",
    allSigns:             "All Signs",
    // Categories
    catNouns:             "Nouns",
    catVerbs:             "Verbs",
    catAdjectives:        "Adjectives",
    catAdverbs:           "Adverbs",
    catPrepositions:      "Prepositions",
    catPronouns:          "Pronouns",
    // Eval card
    conceptLabel:         "Concept",
    btnYes:               "Correct",
    btnNo:                "Wrong",
    btnAlmost:            "Almost",
    btnPrev:              "Previous",
    btnNext:              "Next",
    btnFlag:              "Report",
    shortcuts:            "Shortcuts:",
    commentLabel:         "Comment (optional):",
    commentPlaceholder:   "Add a note about this sign…",
    alreadyEvaluated:     "Already rated",
    variantOf:            "Variant {pos} of {total}",
    // Flag modal
    flagTitle:            "Send a Report",
    flagSubtitle:         "What issues do you see with this sign?",
    flagWrong:            "Wrong sign",
    flagWrongDesc:        "The sign does not match the displayed concept.",
    flagQuality:          "Poor quality",
    flagQualityDesc:      "The clip is unclear or poorly lit.",
    flagOther:            "Other",
    flagCommentPlaceholder: "Additional note (optional)",
    flagSubmit:           "Report",
    // Finished screen
    doneTitle:            "Thank you 🙏",
    doneThanks:           "We appreciate your contribution to building the Algerian Sign Language database",
    finOverallLabel:      "Overall dataset progress",
    btnBackToCategories:  "Back to Categories",
    btnRestart:           "Review this category",
    totalRated:           "Rated this session",
    btnDownloadCsv:       "📥 Download my work (CSV)",
    // Session
    endSessionConfirm:    "End the current session?",
    // Alerts
    alertSaveFail:        "Save failed — please try again.",
    alertNoServer:        "Cannot reach the server. Is it running?",
    // Profile menu
    profileSettings:      "Account settings",
    profileLogout:        "Log out",
    profileDownload:      "Download my work",
  },
  fr: {
    // App chrome
    appTitle:             "Langue des Signes",
    pageTitle:            "Évaluation de la Langue des Signes",
    logoText:             "ALSL",
    // Login / Register
    loginTitle:           "Langue des Signes Algérienne",
    loginSubtitle:        "Plateforme d'évaluation des signes ALSL",
    tabLogin:             "Connexion",
    tabRegister:          "Nouveau compte",
    regFullName:          "Nom complet",
    regEmail:             "Email",
    regUsername:          "Nom d'utilisateur (pour la connexion)",
    regPassword:          "Mot de passe (au moins 6 caractères)",
    loginUsername:        "Nom d'utilisateur",
    loginPassword:        "Mot de passe",
    btnLogin:             "Connexion",
    btnRegister:          "Créer un compte",
    loginHint:            "Votre progression est sauvegardée — connectez-vous depuis n'importe quel appareil",
    // Errors
    errFillFields:        "Remplissez tous les champs",
    errUsernamePass:      "Entrez votre nom d'utilisateur et mot de passe",
    errConnection:        "Impossible de contacter le serveur",
    errAuthFail:          "Échec de la connexion",
    errRegisterFail:      "Échec de l'inscription",
    errInvalidEmail:      "Adresse email invalide",
    confirmLogout:        "Se déconnecter ?",
    // Header
    btnCategories:        "Catégories",
    btnEndSession:        "Terminer",
    // Picker
    pickerTitle:          "Choisissez une catégorie",
    pickerSubtitle:       "Commencez où vous voulez — revenez à tout moment",
    remaining:            "restants",
    allSigns:             "Tous les signes",
    // Categories
    catNouns:             "Noms",
    catVerbs:             "Verbes",
    catAdjectives:        "Adjectifs",
    catAdverbs:           "Adverbes",
    catPrepositions:      "Prépositions",
    catPronouns:          "Pronoms",
    // Eval card
    conceptLabel:         "Concept",
    btnYes:               "Correct",
    btnNo:                "Incorrect",
    btnAlmost:            "Presque",
    btnPrev:              "Précédent",
    btnNext:              "Suivant",
    btnFlag:              "Signaler",
    shortcuts:            "Raccourcis:",
    commentLabel:         "Commentaire (optionnel):",
    commentPlaceholder:   "Ajoutez une note sur ce signe…",
    alreadyEvaluated:     "Déjà évalué",
    variantOf:            "Variante {pos} sur {total}",
    // Flag modal
    flagTitle:            "Envoyer un rapport",
    flagSubtitle:         "Quels problèmes voyez-vous dans ce signe ?",
    flagWrong:            "Signe incorrect",
    flagWrongDesc:        "Le signe ne correspond pas au concept affiché.",
    flagQuality:          "Mauvaise qualité",
    flagQualityDesc:      "Le clip est flou ou mal éclairé.",
    flagOther:            "Autre",
    flagCommentPlaceholder: "Note supplémentaire (optionnel)",
    flagSubmit:           "Signaler",
    // Finished screen
    doneTitle:            "Merci 🙏",
    doneThanks:           "Nous apprécions votre contribution à la construction de la base de données de la langue des signes algérienne",
    finOverallLabel:      "Progression globale",
    btnBackToCategories:  "Retour aux catégories",
    btnRestart:           "Revoir cette catégorie",
    totalRated:           "Évalués cette session",
    btnDownloadCsv:       "📥 Télécharger mon travail (CSV)",
    // Session
    endSessionConfirm:    "Terminer la session en cours ?",
    // Alerts
    alertSaveFail:        "Échec de la sauvegarde — réessayez.",
    alertNoServer:        "Impossible de contacter le serveur. Est-il démarré ?",
    // Profile menu
    profileSettings:      "Paramètres du compte",
    profileLogout:        "Se déconnecter",
    profileDownload:      "Télécharger mon travail",
  }
};

const RTL_LANGS = new Set(["ar"]);
let currentLang = localStorage.getItem("lang") || "ar";

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  const tr = TRANSLATIONS[lang];
  const isRTL = RTL_LANGS.has(lang);

  document.documentElement.lang = lang;
  document.documentElement.dir = isRTL ? "rtl" : "ltr";
  document.title = tr.pageTitle;

  // Text nodes
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (tr[key] !== undefined) el.textContent = tr[key];
  });

  // Placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (tr[key] !== undefined) el.placeholder = tr[key];
  });

  // Highlight active lang button
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  // Fire event so script.js can re-render anything dynamic (categories, picker, sign)
  document.dispatchEvent(new CustomEvent("langchanged", { detail: { lang } }));
}

function t(key) {
  return (TRANSLATIONS[currentLang] || TRANSLATIONS.ar)[key] || key;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => applyLang(btn.dataset.lang));
  });
  applyLang(currentLang);
});
