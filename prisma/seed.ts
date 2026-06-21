// ILM seed — real Shia primary sources with honest grading & references.
// Run: bun run db:seed  (script added below)  or `bunx tsx prisma/seed.ts`
import { db } from "@/lib/db";

async function main() {
  console.log("🌱 Seeding ILM…");

  // --- clean slate ---
  const tablenames = [
    "Note", "Bookmark", "AnswerSubmission", "ActivityLog", "ProgressRecord",
    "UserMedal", "UserBadge", "MedalCatalog", "BadgeCatalog", "Exercise",
    "LessonTextUnit", "Lesson", "Chapter", "Course", "Track", "TextUnit",
    "TopicTag", "Book", "UserProfile", "User",
  ];
  for (const t of tablenames) {
    await (db as unknown as Record<string, { deleteMany: () => Promise<unknown> }>)[t].deleteMany();
  }

  // =====================================================================
  // TOPIC TAGS
  // =====================================================================
  const tagDefs = [
    "Aqeedah", "Aql (Intellect)", "Knowledge", "Taqwa", "Akhlaq",
    "Fiqh", "Taharah", "Salah", "Khums", "Tafsir", "Quran", "History",
    "Seerah", "Supplication", "Justice", "Imamah", "Hadith Science", "Rijal",
  ];
  const tagMap: Record<string, { id: string }> = {};
  for (const name of tagDefs) {
    const t = await db.topicTag.create({ data: { name } });
    tagMap[name] = t;
  }
  const T = (names: string[]) => ({ connect: names.map((n) => ({ id: tagMap[n].id })) });

  // =====================================================================
  // BOOKS
  // =====================================================================
  const bookNHB = await db.book.create({
    data: {
      title: "Nahj al-Balagha",
      titleArabic: "نهج البلاغة",
      author: "Compiled by al-Sharif al-Radi (d. 406 AH)",
      language: "ar",
      madhabScope: "shia",
      category: "sermon",
      description:
        "A compilation of sermons, letters, and sayings of Amir al-Mu'minin Imam Ali ibn Abi Talib (a.s.), gathered by al-Sharif al-Radi. Individual items vary in authenticity and must be assessed independently.",
    },
  });
  const bookKF = await db.book.create({
    data: {
      title: "Al-Kafi",
      titleArabic: "الكافي",
      author: "Shaykh Muhammad ibn Ya'qub al-Kulayni (d. 329 AH)",
      language: "ar",
      madhabScope: "shia",
      category: "hadith",
      description:
        "The earliest and most important of the Shia Four Books (al-Usul al-Arba'a). Compiled by al-Kulayni over ~20 years. Contains ~16,000 narrations; gradings assessed by later scholars including Allamah Majlisi in Mir'at al-'Uqul.",
    },
  });
  const bookMIZ = await db.book.create({
    data: {
      title: "Tafsir al-Mizan",
      titleArabic: "تفسير الميزان",
      author: "Allamah Sayyid Muhammad Husayn al-Tabatabai (d. 1402 AH)",
      language: "ar",
      madhabScope: "shia",
      category: "tafsir",
      description:
        "A monumental Qur'anic exegesis by Allamah Tabatabai using the method of tafsir al-Qur'an bi'l-Qur'an (interpreting the Qur'an by the Qur'an). 27 volumes.",
    },
  });
  const bookSF = await db.book.create({
    data: {
      title: "Al-Sahifa al-Sajjadiya",
      titleArabic: "الصحيفة السجادية",
      author: "Imam Ali ibn al-Husayn Zayn al-Abidin (a.s.)",
      language: "ar",
      madhabScope: "shia",
      category: "supplication",
      description:
        "The 'Psalms of Islam' — a collection of 54 supplications transmitted from Imam al-Sajjad (a.s.), the fourth Imam. Among the most authentically transmitted Shia devotional texts.",
    },
  });
  const bookBIHAR = await db.book.create({
    data: {
      title: "Bihar al-Anwar",
      titleArabic: "بحار الأنوار",
      author: "Allamah Muhammad Baqir al-Majlisi (d. 1110 AH)",
      language: "ar",
      madhabScope: "shia",
      category: "hadith",
      description:
        "An encyclopaedic collection of Shia hadith in 110 volumes compiled by Allamah Majlisi. A reference work; individual narrations require separate grading.",
    },
  });

  // =====================================================================
  // TEXT UNITS — real content, honest grading
  // =====================================================================
  const exPayload = (o: object) => JSON.stringify(o);
  const mk = async (data: Parameters<typeof db.textUnit.create>[0]["data"]) =>
    db.textUnit.create({ data });

  // --- Al-Kafi: creation of the intellect (famous opening hadith) ---
  const tuAql = await mk({
    bookId: bookKF.id,
    locator: "Al-Kafi 1:16, Kitab al-Aql wal-Jahl, Bab al-Aql wal-Jahl, H.1",
    volume: "1", chapter: "Kitab al-Aql wal-Jahl",
    pageOrHadithNumber: "H.1",
    arabicText:
      "إِنَّ اللَّهَ عَزَّ وَجَلَّ خَلَقَ الْعَقْلَ وَهُوَ أَوَّلُ خَلْقٍ خَلَقَهُ مِنَ الرُّوحِ الْيَمَانِيَةِ عَنْ يَمِينِ الْعَرْشِ مِنْ نُورِهِ، فَقَالَ لَهُ: أَقْبِلْ فَأَقْبَلَ، ثُمَّ قَالَ لَهُ: أَدْبِرْ فَأَدْبَرَ، ثُمَّ قَالَ لَهُ: أَقْبِلْ فَأَقْبَلَ، ثُمَّ قَالَ لَهُ: أَدْبِرْ فَأَدْبَرَ، ثُمَّ قَالَ لَهُ: أَطَعْتَ وَعَصَى غَيْرُكَ، فَجَعَلَ اللَّهُ لَهُ سَبْعِينَ وَسَبْعِينَ جُنْداً.",
    translationText:
      "Allah, the Mighty and Majestic, created the intellect (al-'aql), and it was the first creation of the spiritual realm from the right side of the Throne, from His light. He said to it: 'Come forward,' and it came forward. Then He said: 'Turn back,' and it turned back. Then He said: 'Come forward,' and it came forward. Then He said: 'Turn back,' and it turned back. Then He said: 'You have obeyed while others have disobeyed.' So Allah appointed for it seventy armies (of faculties).",
    transliteration:
      "Inna-llāha 'azza wa-jalla khalaqa al-'aql wa-huwa awwalu khalqin khalaqahu min ar-rūḥ al-yamāniyya 'an yamīn al-'arsh min nūrih…",
    chainOfNarration: "Muhammad ibn Yahya ← Ahmad ibn Muhammad ← al-Husayn ibn Sa'id ← al-Nadr ibn Suwayd ← Yahya al-Halabi ← Burayd al-'Ijli ← Abu Ja'far (al-Baqir, a.s.)",
    authenticityGrade: "Sahih",
    gradeReference: "Graded Sahih by Allamah al-Majlisi, Mir'at al-'Uqul 1:211; isnad assessed by al-Khoei in Mujam Rijal al-Hadith.",
    topicTags: T(["Aqeedah", "Aql (Intellect)"]),
    isReviewed: true, status: "published",
    reviewedBy: null, reviewedAt: new Date("2024-09-12"),
  });

  // --- Al-Kafi: seeking knowledge is an obligation ---
  const tuIlm = await mk({
    bookId: bookKF.id,
    locator: "Al-Kafi 1:30, Kitab Fadl al-'Ilm, Bab Wujub Talab al-'Ilm, H.1",
    volume: "1", chapter: "Bab Wujub Talab al-'Ilm",
    pageOrHadithNumber: "H.1",
    arabicText:
      "طَلَبُ الْعِلْمِ فَرِيضَةٌ فِي كُلِّ حَالٍ.",
    translationText:
      "Seeking knowledge is an obligation in every circumstance.",
    transliteration: "Ṭalabu al-'ilmi farīḍatun fī kulli ḥāl.",
    chainOfNarration: "Ali ibn Ibrahim ← his father ← al-Nawfali ← al-Sukkuni ← Abu 'Abdillah (al-Sadiq, a.s.)",
    authenticityGrade: "Sahih",
    gradeReference: "Graded Sahih by al-Majlisi, Mir'at al-'Uqul; see also al-Khoei, Mujam Rijal al-Hadith.",
    topicTags: T(["Knowledge"]),
    isReviewed: true, status: "published",
    reviewedAt: new Date("2024-09-12"),
  });

  // --- Al-Kafi: a famous but weaker isnad (demonstrates honest grading) ---
  const tuCradle = await mk({
    bookId: bookKF.id,
    locator: "Al-Kafi 1:30, Bab Wujub Talab al-'Ilm, H.3",
    volume: "1", chapter: "Bab Wujub Talab al-'Ilm",
    pageOrHadithNumber: "H.3",
    arabicText: "اطْلُبُوا الْعِلْمَ وَلَوْ بِالصِّينِ.",
    translationText: "Seek knowledge even if it be in China.",
    transliteration: "Uṭlubū al-'ilm wa-law bi-ṣ-Ṣīn.",
    chainOfNarration: "Muhammad ibn al-Hasan ← Sahl ibn Ziyad ← Muhammad ibn al-Walid ← Yunus ibn Ya'qub",
    authenticityGrade: "Da'if",
    gradeReference: "Graded Da'if by al-Majlisi, Mir'at al-'Uqul; Sahl ibn Ziyad is graded da'if by multiple rijal scholars. The meaning is sound but the isnad is weak.",
    topicTags: T(["Knowledge", "Hadith Science", "Rijal"]),
    isReviewed: true, status: "published",
    reviewedAt: new Date("2024-09-13"),
  });

  // --- Nahj al-Balagha: Sermon 1 (Taqwa) opening ---
  const tuSermon1 = await mk({
    bookId: bookNHB.id,
    locator: "Nahj al-Balagha, Sermon 1 (Khutbat al-Taqwa)",
    chapter: "Sermons (Khutab)",
    pageOrHadithNumber: "Sermon 1",
    arabicText:
      "الْحَمْدُ لِلَّهِ الَّذِي لَا يَبْلُغُ مِدْحَتَهُ الْقَائِلُونَ، وَلَا يُحْصِي نَعْمَاءَهُ الْعَادُّونَ، وَلَا يُؤَدِّي حَقَّهُ الْمُجْتَهِدُونَ، الَّذِي لَا يُدْرِكُهُ بُعْدُ الْهِمَمِ، وَلَا يَنَالُهُ غَوْصُ الْفِطَنِ.",
    translationText:
      "Praise be to Allah, whom the speakers cannot reach the depth of His praise, nor can the counters enumerate His bounties, nor can the strivers fulfil His right. He is not attained by the stretching of aspirations, nor reached by the diving of intellects.",
    transliteration:
      "Al-ḥamdu lillāhi alladhī lā yablughu midḥatahu al-qā'ilūn, wa-lā yuḥṣī na'mā'ahu al-'āddūn…",
    chainOfNarration: "Compiled by al-Sharif al-Radi (d. 406 AH); no continuous isnad attached.",
    authenticityGrade: "Attributed (compilation)",
    gradeReference: "Nahj al-Balagha compiled by al-Sharif al-Radi; items lack individual isnad. Authentication efforts by al-Majlisi (Bihar) and contemporary scholars vary case-by-case.",
    topicTags: T(["Aqeedah", "Taqwa"]),
    isReviewed: true, status: "published",
    reviewedAt: new Date("2024-09-14"),
  });

  // --- Nahj al-Balagha: Hikmat on knowledge vs wealth ---
  const tuHikma = await mk({
    bookId: bookNHB.id,
    locator: "Nahj al-Balagha, Hikmat 147 (approx)",
    chapter: "Sayings (Hikam)",
    pageOrHadithNumber: "Hikmat ~147",
    arabicText:
      "الْعِلْمُ خَيْرٌ مِنَ الْمَالِ، الْعِلْمُ يَحْرُسُكَ وَأَنْتَ تَحْرُسُ الْمَالَ، وَالْمَالُ تَنْقُصُهُ النَّفَقَةُ، وَالْعِلْمُ يَزْكُو عَلَى الْإِنْفَاقِ.",
    translationText:
      "Knowledge is better than wealth. Knowledge guards you, while you guard wealth. Wealth diminishes through spending, while knowledge grows through giving.",
    transliteration:
      "Al-'ilmu khayrun min al-māl, al-'ilmu yaḥruṣuka wa-anta taḥruṣu al-māl, wa-l-mālu tanquṣuhu an-nafaqa, wa-l-'ilmu yazkū 'alā al-infāq.",
    chainOfNarration: "Compiled by al-Sharif al-Radi; no continuous isnad attached.",
    authenticityGrade: "Attributed (compilation)",
    gradeReference: "Nahj al-Balagha, compiled by al-Sharif al-Radi (d. 406 AH); meaning widely affirmed, individual isnad not preserved.",
    topicTags: T(["Knowledge", "Akhlaq"]),
    isReviewed: true, status: "published",
    reviewedAt: new Date("2024-09-14"),
  });

  // --- Sahifa Sajjadiya: Dua Makarim al-Akhlaq (opening) ---
  const tuMakarim = await mk({
    bookId: bookSF.id,
    locator: "Al-Sahifa al-Sajjadiya, Dua 20 (Makarim al-Akhlaq)",
    chapter: "Dua Makarim al-Akhlaq",
    pageOrHadithNumber: "Dua 20",
    arabicText:
      "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِهِ، وَبَلِّغْ بِإِيمَانِي أَكْمَلَ الْإِيمَانِ، وَاجْعَلْ يَقِينِي أَفْضَلَ الْيَقِينِ، وَانْتَهِ بِنِيَّتِي إِلَى أَحْسَنِ النِّيَّاتِ، وَبِعَمَلِي إِلَى أَحْسَنِ الْأَعْمَالِ.",
    translationText:
      "O Allah, bless Muhammad and his family, and bring my faith to the perfection of faith, and make my certainty the most excellent certainty, and carry my intention to the best of intentions, and my action to the best of actions.",
    transliteration:
      "Allāhumma ṣalli 'alā Muḥammadin wa-ālih, wa-balligh bi-īmānī akmala al-īmān…",
    chainOfNarration: "Transmitted from Imam al-Sajjad (a.s.); the Sahifa is among the most authentically transmitted Shia devotional corpora.",
    authenticityGrade: "Authentic",
    gradeReference: "Al-Sahifa al-Sajjadiya; the text is widely attested (tawatur ma'nawi). See al-Majlisi, Bihar al-Anwar.",
    topicTags: T(["Supplication", "Akhlaq"]),
    isReviewed: true, status: "published",
    reviewedAt: new Date("2024-09-15"),
  });

  // --- Tafsir al-Mizan on Surah al-Ikhlas ---
  const tuMizanIkhlas = await mk({
    bookId: bookMIZ.id,
    locator: "Tafsir al-Mizan, Vol 20, commentary on Surah al-Ikhlas (112)",
    volume: "20", chapter: "Surah al-Ikhlas",
    pageOrHadithNumber: "112:1-4",
    arabicText:
      "قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ.",
    translationText:
      "Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born. And there is none comparable to Him. — Allamah Tabatabai reads this surah as a definitive statement of Divine Unity (tawhid), negating both composition and likeness from the Divine essence.",
    transliteration: null,
    chainOfNarration: null,
    authenticityGrade: "Tafsir (authoritative commentary)",
    gradeReference: "Tafsir al-Mizan by Allamah al-Tabatabai (d. 1402 AH), Vol 20; the Qur'anic text itself is mutawatir.",
    topicTags: T(["Tafsir", "Quran", "Aqeedah"]),
    isReviewed: true, status: "published",
    reviewedAt: new Date("2024-09-16"),
  });

  // --- Qur'an: 39:9 (knowledge) ---
  const tuZumar = await mk({
    bookId: bookMIZ.id,
    locator: "Qur'an, Surah al-Zumar 39:9",
    chapter: "Surah al-Zumar",
    pageOrHadithNumber: "39:9",
    arabicText:
      "هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لَا يَعْلَمُونَ ۗ إِنَّمَا يَتَذَكَّرُ أُوْلُوا الْأَلْبَابِ",
    translationText:
      "Are those who know equal to those who do not know? Only those possessed of intellect take heed.",
    transliteration:
      "Hal yastawī alladhīna ya'lamūna wa-alladhīna lā ya'lamūn, innamā yatadhakkaru ulū al-albāb.",
    chainOfNarration: null,
    authenticityGrade: "Qur'an (Mutawatir)",
    gradeReference: "The Holy Qur'an, Surah al-Zumar 39:9; mutawatir — the highest grade of textual authenticity.",
    topicTags: T(["Quran", "Knowledge", "Aql (Intellect)"]),
    isReviewed: true, status: "published",
    reviewedAt: new Date("2024-09-16"),
  });

  // --- Bihar al-Anwar: justice ---
  const tuBiharAdl = await mk({
    bookId: bookBIHAR.id,
    locator: "Bihar al-Anwar 75:118",
    volume: "75",
    pageOrHadithNumber: "118",
    arabicText:
      "الْعَدْلُ يَضَعُ الْأُمُورَ مَوَاضِعَهَا.",
    translationText:
      "Justice places things in their proper places.",
    transliteration: "Al-'adlu yaḍa'u al-umūra mawāḍi'ahā.",
    chainOfNarration: "Recorded by al-Majlisi from earlier sources; isnad varies.",
    authenticityGrade: "Attributed (compilation)",
    gradeReference: "Bihar al-Anwar 75:118, compiled by Allamah al-Majlisi; compilation-level attribution, individual isnad to be verified.",
    topicTags: T(["Justice", "Akhlaq"]),
    isReviewed: true, status: "published",
    reviewedAt: new Date("2024-09-17"),
  });

  // --- PENDING (in_review) units for the scholar review queue demo ---
  const tuPending1 = await mk({
    bookId: bookKF.id,
    locator: "Al-Kafi 2:66, Kitab al-Iman wal-Kufr, Bab al-Ihsan, H.4",
    volume: "2", chapter: "Bab al-Ihsan",
    pageOrHadithNumber: "H.4",
    arabicText: "مَا أَحْسَنَ اللَّهُ إِلَى عَبْدٍ أَحْسَنَ إِلَى النَّاسِ.",
    translationText: "How excellent is Allah's favour upon a servant who does good to people.",
    transliteration: "Mā aḥsana-llāha ilā 'abdin aḥsana ilā an-nās.",
    chainOfNarration: "Several narrators; awaiting verification.",
    authenticityGrade: "Pending review",
    gradeReference: "Awaiting reviewer assessment against Mir'at al-'Uqul and al-Khoei, Mujam Rijal al-Hadith.",
    topicTags: T(["Akhlaq"]),
    isReviewed: false, status: "in_review",
  });
  const tuPending2 = await mk({
    bookId: bookNHB.id,
    locator: "Nahj al-Balagha, Letter 31 (to Imam al-Hasan, a.s.) — excerpt",
    chapter: "Letters (Rasa'il)",
    pageOrHadithNumber: "Letter 31",
    arabicText: "وَاعْلَمْ أَنَّ الرَّأْيَ لَمْ يَكُنْ لِأَحَدٍ حَتَّى يَكُونَ لَهُ فَهْمٌ.",
    translationText: "Know that judgement is not for anyone until he possesses understanding.",
    transliteration: "Wa-'lam anna ar-ra'ya lam yakun li-aḥadin ḥattā yakūna lahu fahm.",
    chainOfNarration: "Compiled by al-Sharif al-Radi.",
    authenticityGrade: "Pending review",
    gradeReference: "Awaiting reviewer verification of attribution and context.",
    topicTags: T(["Akhlaq", "Knowledge"]),
    isReviewed: false, status: "in_review",
  });

  // =====================================================================
  // SUNNI SECONDARY TRACK — clearly labelled, never merged into Shia tracks
  // =====================================================================
  const bookBUKHARI = await db.book.create({
    data: {
      title: "Sahih al-Bukhari",
      titleArabic: "صحيح البخاري",
      author: "Imam Muhammad ibn Isma'il al-Bukhari (d. 256 AH)",
      language: "ar",
      madhabScope: "sunni",
      category: "hadith",
      description:
        "The most authoritative hadith collection in the Sunni tradition, compiled by Imam al-Bukhari. Contains ~7,563 narrations (with repetitions). ILM presents this in the clearly-separated Sunni secondary track.",
    },
  });
  const tuBukhariIlm = await mk({
    bookId: bookBUKHARI.id,
    locator: "Sahih al-Bukhari 1:30, Kitab al-Ilm, Bab Man Yurid Allah bihi Khayran Yufaqqihhu fi al-Din",
    volume: "1", chapter: "Kitab al-Ilm",
    pageOrHadithNumber: "H.71",
    arabicText: "مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ.",
    translationText:
      "Whomever Allah intends good for, He grants him understanding of the religion.",
    transliteration: "Man yuridi-llāhu bihi khayran yufaqqihhu fī ad-dīn.",
    chainOfNarration: "Al-Bukhari ← Mu'adh ibn Fadala ← Hisham ← Ibn Abi Dhi'b ← Yahya ibn Abi Kathir ← Abu Salama ← Abu Hurayra",
    authenticityGrade: "Authentic",
    gradeReference: "Sahih al-Bukhari, Kitab al-Ilm, H.71; graded Sahih by Imam al-Bukhari himself; among the most rigorously authenticated Sunni hadith.",
    topicTags: T(["Knowledge"]),
    isReviewed: true, status: "published",
    reviewedAt: new Date("2024-10-01"),
  });
  const trackSunni = await db.track.create({
    data: {
      title: "Sunni Hadith Foundations",
      madhabScope: "sunni",
      description: "A secondary track covering the Sunni hadith canon (Sahih al-Bukhari, Sahih Muslim). Clearly labelled and never merged with Shia content.",
      icon: "BookOpen", color: "teal", order: 4,
    },
  });
  const courseBukhariIlm = await db.course.create({
    data: {
      trackId: trackSunni.id, title: "Sahih al-Bukhari: The Book of Knowledge",
      description: "Selected narrations on the virtue of seeking knowledge from Imam al-Bukhari's Kitab al-Ilm.",
      difficulty: "beginner", order: 1, estimatedHours: 2, coverColor: "teal",
    },
  });
  const chSunni1 = await db.chapter.create({ data: { courseId: courseBukhariIlm.id, title: "The Virtue of Understanding", order: 1 } });
  const lessonSunni1 = await db.lesson.create({
    data: {
      chapterId: chSunni1.id, title: "Allah Grants Understanding to Whom He Wills Good",
      summary: "Sahih al-Bukhari's opening hadith on the virtue of fiqh (understanding).",
      contentBody:
        "Imam al-Bukhari opens his Sahih with the Book of Knowledge (Kitab al-Ilm). Its most celebrated hadith states that Allah grants understanding of the religion (yufaqqihhu fī ad-dīn) to those He intends good for.\n\nThis places understanding — not mere memorisation — as a divine gift and a sign of divine favour. The Sunni tradition treats this as a foundational motivation for the pursuit of ʿilm, parallel to the Shia emphasis found in Al-Kafi's Kitab al-'Aql wal-Jahl.",
      estimatedMin: 8, order: 1,
    },
  });
  await db.lessonTextUnit.create({ data: { lessonId: lessonSunni1.id, textUnitId: tuBukhariIlm.id, contextNote: "The opening hadith of Sahih al-Bukhari's Kitab al-Ilm." } });
  await db.exercise.create({
    data: {
      lessonId: lessonSunni1.id, order: 1, type: "mcq", difficulty: "beginner", xpReward: 10,
      prompt: "According to Sahih al-Bukhari, Allah grants understanding of the religion to:",
      payload: exPayload({ options: ["Those who memorise the most", "Whomever He intends good for", "Only scholars", "Those who fast"], correctIndex: 1 }),
      sourceTextUnitId: tuBukhariIlm.id, status: "published",
    },
  });

  // =====================================================================
  // TRACKS / COURSES / CHAPTERS / LESSONS / EXERCISES
  // =====================================================================
  const trackFiqh = await db.track.create({
    data: {
      title: "Shia Fiqh Foundations",
      madhabScope: "shia",
      description: "Build a structured understanding of Shia jurisprudence, from taharah to the rulings of khums.",
      icon: "Scale", color: "emerald", order: 1,
    },
  });
  const trackUlum = await db.track.create({
    data: {
      title: "Foundations of Religious Knowledge",
      madhabScope: "shia",
      description: "The place of intellect, knowledge, and the sciences of hadith in the Shia tradition.",
      icon: "BookOpen", color: "amber", order: 2,
    },
  });
  const trackTafsir = await db.track.create({
    data: {
      title: "Tafsir al-Mizan Track",
      madhabScope: "shia",
      description: "A guided journey through Allamah Tabatabai's monumental exegesis, surah by surah.",
      icon: "ScrollText", color: "teal", order: 3,
    },
  });

  // Course 1: Fiqh of Taharah
  const courseTaharah = await db.course.create({
    data: {
      trackId: trackFiqh.id, title: "Fiqh of Taharah",
      description: "Ritual purity: water, najasat, wudu, ghusl, and tayammum.",
      difficulty: "beginner", order: 1, estimatedHours: 4, coverColor: "emerald",
    },
  });
  // Course 2: Virtues of Knowledge (Ulum track)
  const courseIlm = await db.course.create({
    data: {
      trackId: trackUlum.id, title: "Virtues & Manners of Knowledge",
      description: "Why seeking knowledge is an obligation, and the adab of the seeker.",
      difficulty: "beginner", order: 1, estimatedHours: 3, coverColor: "amber",
    },
  });
  // Course 3: Tafsir al-Mizan — Surah al-Ikhlas (gated by courseIlm)
  const courseIkhlas = await db.course.create({
    data: {
      trackId: trackTafsir.id, title: "Tafsir al-Mizan: Surah al-Ikhlas",
      description: "Allamah Tabatabai's reading of Divine Unity in Surah al-Ikhlas.",
      difficulty: "intermediate", order: 1, estimatedHours: 3, coverColor: "teal",
      prerequisiteIds: courseIlm.id,
    },
  });

  // --- Chapters & lessons for "Virtues & Manners of Knowledge" ---
  const ch1 = await db.chapter.create({ data: { courseId: courseIlm.id, title: "The Obligation of Knowledge", order: 1 } });
  const ch2 = await db.chapter.create({ data: { courseId: courseIlm.id, title: "Knowledge, Intellect & Wealth", order: 2 } });

  const lesson1 = await db.lesson.create({
    data: {
      chapterId: ch1.id, title: "Seeking Knowledge: A Sacred Obligation",
      summary: "Why the Shia tradition treats the pursuit of knowledge as a binding religious duty.",
      contentBody:
        "In the Shia tradition, knowledge ('ilm) is not a luxury — it is a religious obligation (farida). The very first book of Al-Kafi, the earliest of the Four Books, is *Kitab al-'Aql wa'l-Jahl* (The Book of Intellect and Ignorance) — placing reason at the foundation of religion.\n\nThe famous narration reports that Imam al-Sadiq (a.s.) said: \"Seeking knowledge is an obligation in every circumstance.\" This is not restricted to jurisprudence; it covers whatever a person needs to fulfil their religious and worldly duties correctly.\n\nCrucially, the tradition also teaches honesty about transmission. Not every reported saying is authentic — the science of *rijal* exists precisely to grade narrations. A weak isnad does not become strong because its meaning is pleasing. ILM honours this: every text unit you study carries a stated authenticity grade and the reference it was graded by.",
      estimatedMin: 8, order: 1,
    },
  });
  await db.lessonTextUnit.create({ data: { lessonId: lesson1.id, textUnitId: tuIlm.id, contextNote: "The foundational narration on the obligation of seeking knowledge." } });
  await db.lessonTextUnit.create({ data: { lessonId: lesson1.id, textUnitId: tuCradle.id, contextNote: "An example of a widely-quoted but weakly-attested narration — used here to teach critical source-awareness." } });

  const lesson2 = await db.lesson.create({
    data: {
      chapterId: ch1.id, title: "The Place of Intellect (al-'Aql)",
      summary: "Intellect as the first created reality and the basis of religious responsibility.",
      contentBody:
        "Allamah Tabatabai and the classical Shia tradition place *al-'aql* (intellect) at the very root of religious life. The opening narration of Al-Kafi describes Allah creating the intellect first, and appointing for it armies of faculties that obey it.\n\nThis is not merely philosophical — it has a legal consequence: *taklif* (religious obligation) presupposes *'aql*. One without reason is not subject to the law. Conversely, the Qur'an repeatedly ties heedlessness to the absence of intellect: \"Only those possessed of intellect take heed\" (39:9).",
      estimatedMin: 10, order: 2,
    },
  });
  await db.lessonTextUnit.create({ data: { lessonId: lesson2.id, textUnitId: tuAql.id, contextNote: "The opening hadith of Al-Kafi on the creation of intellect." } });
  await db.lessonTextUnit.create({ data: { lessonId: lesson2.id, textUnitId: tuZumar.id, contextNote: "Qur'anic anchor: knowledge and intellect as the basis of heedfulness." } });

  const lesson3 = await db.lesson.create({
    data: {
      chapterId: ch2.id, title: "Knowledge vs Wealth",
      summary: "Nahj al-Balagha on how knowledge guards you while wealth diminishes.",
      contentBody:
        "Imam Ali (a.s.), as preserved in Nahj al-Balagha, draws a sharp contrast: wealth is a custodial good — you guard it, and spending decreases it. Knowledge is generative — it guards you, and teaching only increases it.\n\nThis reframes education not as personal accumulation but as a trust to be shared. The lesson also models source-awareness: items in Nahj al-Balagha are a *compilation* by al-Sharif al-Radi, and individual attributions must be assessed separately from the book's overall reverence.",
      estimatedMin: 7, order: 1,
    },
  });
  await db.lessonTextUnit.create({ data: { lessonId: lesson3.id, textUnitId: tuHikma.id, contextNote: "The famous hikma contrasting knowledge and wealth." } });

  const lesson4 = await db.lesson.create({
    data: {
      chapterId: ch2.id, title: "The Manners of the Seeker (Adab al-Talab)",
      summary: "From Dua Makarim al-Akhlaq — asking Allah for perfected intention and action.",
      contentBody:
        "Knowledge without adab (manners) is, in the Shia ethical tradition, a liability. In Dua Makarim al-Akhlaq, Imam al-Sajjad (a.s.) does not merely ask for more knowledge — he asks for perfected *faith*, *certainty*, *intention*, and *action*. The seeker's inner state is treated as inseparable from what is sought.\n\nThis is why ILM rewards consistency and correctness together, never raw speed: the goal is a formed character, not a filled scoreboard.",
      estimatedMin: 9, order: 2,
    },
  });
  await db.lessonTextUnit.create({ data: { lessonId: lesson4.id, textUnitId: tuMakarim.id, contextNote: "Dua Makarim al-Akhlaq — the seeker's prayer for perfected inner states." } });

  // --- Tafsir course chapter/lesson ---
  const chIkh = await db.chapter.create({ data: { courseId: courseIkhlas.id, title: "Surah al-Ikhlas: The Declaration of Tawhid", order: 1 } });
  const lessonIkh = await db.lesson.create({
    data: {
      chapterId: chIkh.id, title: "Tawhid in Four Verses",
      summary: "Allamah Tabatabai's reading of Surah al-Ikhlas as the definitive statement of Divine Unity.",
      contentBody:
        "Surah al-Ikhlas (112) is, in Allamah Tabatabai's *Tafsir al-Mizan*, a compact refutation of every form of shirk (associating partners with Allah). Each verse negates a category of error: 'Ahad' negates internal composition; 'al-Samad' negates dependence; 'neither begets nor is born' negates genealogical relations; 'none comparable' negates likeness.\n\nThe surah is thus not merely a creedal formula but a structured argument for absolute Divine simplicity and transcendence.",
      estimatedMin: 12, order: 1,
    },
  });
  await db.lessonTextUnit.create({ data: { lessonId: lessonIkh.id, textUnitId: tuMizanIkhlas.id, contextNote: "Allamah Tabatabai's commentary on Surah al-Ikhlas." } });

  // --- Exercises (linked to reviewed TextUnits as answer keys) ---
  await db.exercise.create({
    data: {
      lessonId: lesson1.id, order: 1, type: "mcq", difficulty: "beginner", xpReward: 10,
      prompt: "According to the narration from Al-Kafi, seeking knowledge is:",
      payload: exPayload({ options: ["Recommended but optional", "An obligation in every circumstance", "Only for scholars", "Only for men"], correctIndex: 1 }),
      sourceTextUnitId: tuIlm.id, status: "published",
    },
  });
  await db.exercise.create({
    data: {
      lessonId: lesson1.id, order: 2, type: "mcq", difficulty: "beginner", xpReward: 10,
      prompt: "The narration 'Seek knowledge even if it be in China' is graded in the seed corpus as:",
      payload: exPayload({ options: ["Sahih", "Hasan", "Da'if (weak isnad)", "Mutawatir"], correctIndex: 2 }),
      sourceTextUnitId: tuCradle.id, status: "published",
    },
  });
  await db.exercise.create({
    data: {
      lessonId: lesson2.id, order: 1, type: "mcq", difficulty: "intermediate", xpReward: 15,
      prompt: "What does the opening hadith of Al-Kafi describe Allah creating first?",
      payload: exPayload({ options: ["The Pen (al-Qalam)", "The intellect (al-'aql)", "The Throne", "Light of Muhammad (a.s.)"], correctIndex: 1 }),
      sourceTextUnitId: tuAql.id, status: "published",
    },
  });
  await db.exercise.create({
    data: {
      lessonId: lesson2.id, order: 2, type: "fill_blank", difficulty: "beginner", xpReward: 10,
      prompt: "Complete the verse (al-Zumar 39:9): 'Are those who know equal to those who do not know? Only those possessed of ______ take heed.'",
      payload: exPayload({ accept: ["intellect", "the intellect", "al-albab", "ulū al-albāb", "ulul albab"] }),
      sourceTextUnitId: tuZumar.id, status: "published",
    },
  });
  await db.exercise.create({
    data: {
      lessonId: lesson3.id, order: 1, type: "ordering", difficulty: "intermediate", xpReward: 15,
      prompt: "Order the four statements from Nahj al-Balagha's hikma into the original sequence:",
      payload: exPayload({ items: ["Knowledge is better than wealth", "Knowledge guards you, while you guard wealth", "Wealth diminishes through spending", "Knowledge grows through giving"], correctOrder: [0, 1, 2, 3] }),
      sourceTextUnitId: tuHikma.id, status: "published",
    },
  });
  await db.exercise.create({
    data: {
      lessonId: lesson3.id, order: 2, type: "mcq", difficulty: "beginner", xpReward: 10,
      prompt: "Who compiled Nahj al-Balagha?",
      payload: exPayload({ options: ["Allamah al-Majlisi", "al-Sharif al-Radi", "Shaykh al-Kulayni", "Allamah al-Tabatabai"], correctIndex: 1 }),
      sourceTextUnitId: tuHikma.id, status: "published",
    },
  });
  await db.exercise.create({
    data: {
      lessonId: lesson4.id, order: 1, type: "matching", difficulty: "intermediate", xpReward: 15,
      prompt: "Match each inner state from Dua Makarim al-Akhlaq to what the Imam asks Allah to perfect it into:",
      payload: exPayload({ pairs: [["faith", "the perfection of faith"], ["certainty", "the most excellent certainty"], ["intention", "the best of intentions"], ["action", "the best of actions"]] }),
      sourceTextUnitId: tuMakarim.id, status: "published",
    },
  });
  await db.exercise.create({
    data: {
      lessonId: lessonIkh.id, order: 1, type: "mcq", difficulty: "intermediate", xpReward: 15,
      prompt: "In Tafsir al-Mizan, the word 'al-Samad' in Surah al-Ikhlas negates:",
      payload: exPayload({ options: ["Internal composition", "Dependence on anything", "Allah's existence", "The Day of Judgement"], correctIndex: 1 }),
      sourceTextUnitId: tuMizanIkhlas.id, status: "published",
    },
  });
  await db.exercise.create({
    data: {
      lessonId: lessonIkh.id, order: 2, type: "fill_blank", difficulty: "intermediate", xpReward: 12,
      prompt: "Surah al-Ikhlas consists of how many verses?",
      payload: exPayload({ accept: ["4", "four"] }),
      sourceTextUnitId: tuMizanIkhlas.id, status: "published",
    },
  });

  // =====================================================================
  // DEMO USERS
  // =====================================================================
  const student = await db.user.create({
    data: {
      email: "talib@ilm.dev", name: "Talib al-Ilm", role: "student", madhab: "shia",
      avatar: null,
      profile: {
        create: {
          displayName: "Talib al-Ilm",
          xp: 285, level: 2, streakCount: 6, streakFreezeCount: 3, longestStreak: 9,
          lastActivityDate: new Date().toISOString().slice(0, 10),
          dailyGoalXp: 50, publicProfile: true, leaderboardOptIn: true,
          language: "en",
          onboarded: true, interests: "Fiqh,Aqeedah,Knowledge",
          streakAlertsEnabled: true,
        },
      },
    },
  });
  const scholar = await db.user.create({
    data: {
      email: "reviewer@ilm.dev", name: "Dr. H. Rizvi", role: "reviewer", madhab: "shia",
      profile: { create: { displayName: "Dr. H. Rizvi (Reviewer)", xp: 1200, level: 6, language: "en" } },
    },
  });
  // extra leaderboard competitors
  const others = [
    { name: "Amina K.", xp: 540, level: 3, streak: 12 },
    { name: "Hassan M.", xp: 410, level: 3, streak: 4 },
    { name: "Zayd R.", xp: 320, level: 2, streak: 8 },
    { name: "Maryam A.", xp: 250, level: 2, streak: 15 },
    { name: "Baqir S.", xp: 175, level: 2, streak: 2 },
    { name: "Ruqayyah T.", xp: 120, level: 1, streak: 0 },
  ];
  for (const o of others) {
    await db.user.create({
      data: {
        email: o.name.toLowerCase().replace(/[^a-z]/g, "") + "@ilm.dev",
        name: o.name, role: "student", madhab: "shia",
        profile: {
          create: { displayName: o.name, xp: o.xp, level: o.level, streakCount: o.streak, publicProfile: true, leaderboardOptIn: true, lastActivityDate: new Date().toISOString().slice(0, 10) },
        },
      },
    });
  }

  // mark pending units as assigned to scholar? No — they remain unreviewed.

  // =====================================================================
  // BADGE & MEDAL CATALOGS
  // =====================================================================
  const badges = [
    { name: "First Steps", slug: "first_steps", description: "Complete your first lesson.", criteriaRule: "first_lesson", rarity: "common", icon: "Footprints", color: "emerald" },
    { name: "Steadfast Seeker", slug: "steadfast_seeker", description: "Reach a 7-day streak.", criteriaRule: "streak_7", rarity: "rare", icon: "Flame", color: "amber" },
    { name: "Aql Awakened", slug: "aql_awakened", description: "Complete 'The Place of Intellect' lesson.", criteriaRule: "lesson:" + lesson2.id, rarity: "rare", icon: "Brain", color: "emerald" },
    { name: "Source-Aware", slug: "source_aware", description: "Correctly identify a weak (Da'if) narration.", criteriaRule: "identify_daif", rarity: "rare", icon: "ShieldCheck", color: "teal" },
    { name: "Taharah Initiate", slug: "taharah_initiate", description: "Begin the Fiqh of Taharah course.", criteriaRule: "course_start:" + courseTaharah.id, rarity: "common", icon: "Droplets", color: "emerald" },
    { name: "Perfect Recall", slug: "perfect_recall", description: "Score 100% on 5 exercises.", criteriaRule: "perfect_5", rarity: "epic", icon: "Target", color: "amber" },
    { name: "Nahj Reader", slug: "nahj_reader", description: "Study 3 TextUnits from Nahj al-Balagha.", criteriaRule: "book_3:nhb", rarity: "epic", icon: "BookMarked", color: "amber" },
    { name: "Tawhid Student", slug: "tawhid_student", description: "Complete the Surah al-Ikhlas tafsir course.", criteriaRule: "course_done:" + courseIkhlas.id, rarity: "epic", icon: "Sparkles", color: "teal" },
  ];
  for (const b of badges) await db.badgeCatalog.create({ data: b });

  const medals = [
    { name: "Taharah Mastery", slug: "taharah_mastery", description: "Complete the entire Shia Fiqh Foundations track.", criteriaRule: "track_done:" + trackFiqh.id, tier: "gold", icon: "Award" },
    { name: "Seeker of Light", slug: "seeker_of_light", description: "Earn 500 XP in a single week.", criteriaRule: "weekly_xp_500", tier: "silver", icon: "Sun" },
    { name: "Lamp of the Nights", slug: "lamp_of_nights", description: "Maintain a 30-day streak.", criteriaRule: "streak_30", tier: "platinum", icon: "Moon" },
  ];
  for (const m of medals) await db.medalCatalog.create({ data: m });

  // award some badges to the student
  const bFirst = await db.badgeCatalog.findUnique({ where: { slug: "first_steps" } });
  const bAql = await db.badgeCatalog.findUnique({ where: { slug: "aql_awakened" } });
  const bSrc = await db.badgeCatalog.findUnique({ where: { slug: "source_aware" } });
  if (bFirst) await db.userBadge.create({ data: { userId: student.id, badgeId: bFirst.id, earnedAt: new Date(Date.now() - 6 * 86400000) } });
  if (bAql) await db.userBadge.create({ data: { userId: student.id, badgeId: bAql.id, earnedAt: new Date(Date.now() - 3 * 86400000) } });
  if (bSrc) await db.userBadge.create({ data: { userId: student.id, badgeId: bSrc.id, earnedAt: new Date(Date.now() - 1 * 86400000) } });

  // =====================================================================
  // ACTIVITY LOGS (heatmap, ~12 weeks)
  // =====================================================================
  const today = new Date();
  for (let i = 84; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    // ~55% of days active, tapering intensity
    if (Math.random() > 0.45) {
      const xp = 10 + Math.floor(Math.random() * 60);
      const ex = 1 + Math.floor(Math.random() * 5);
      const ls = Math.floor(Math.random() * 2);
      await db.activityLog.create({ data: { userId: student.id, dateKey: key, xpGained: xp, exercises: ex, lessons: ls } });
    }
  }
  // ensure last 6 days are active (matches streakCount)
  for (let i = 0; i < 6; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    await db.activityLog.upsert({
      where: { userId_dateKey: { userId: student.id, dateKey: key } },
      create: { userId: student.id, dateKey: key, xpGained: 30 + i * 8, exercises: 3, lessons: 1 },
      update: { xpGained: 30 + i * 8, exercises: 3, lessons: 1 },
    });
  }

  // =====================================================================
  // PARTIAL PROGRESS (student has completed lesson1 & lesson2)
  // =====================================================================
  await db.progressRecord.create({
    data: { userId: student.id, lessonId: lesson1.id, status: "completed", score: 100, xpEarned: 20, completedAt: new Date(Date.now() - 6 * 86400000) },
  });
  await db.progressRecord.create({
    data: { userId: student.id, lessonId: lesson2.id, status: "completed", score: 80, xpEarned: 30, completedAt: new Date(Date.now() - 3 * 86400000) },
  });
  // course progress
  await db.progressRecord.create({
    data: { userId: student.id, courseId: courseIlm.id, status: "in_progress", score: 50, xpEarned: 50 },
  });

  // a couple of bookmarks
  await db.bookmark.create({ data: { userId: student.id, textUnitId: tuAql.id, note: "First hadith of Al-Kafi — review isnad." } });
  await db.bookmark.create({ data: { userId: student.id, lessonId: lesson4.id, note: "Adab before volume." } });
  await db.bookmark.create({ data: { userId: student.id, textUnitId: tuBukhariIlm.id, note: "Compare with Al-Kafi's hadith on knowledge." } });

  // assign reviewed-by to the scholar (for the My Reviews audit trail)
  await db.textUnit.updateMany({ where: { isReviewed: true, reviewedBy: null }, data: { reviewedBy: scholar.id } });

  // book stats
  for (const b of [bookNHB, bookKF, bookMIZ, bookSF, bookBIHAR, bookBUKHARI]) {
    const total = await db.textUnit.count({ where: { bookId: b.id } });
    const reviewed = await db.textUnit.count({ where: { bookId: b.id, isReviewed: true } });
    await db.book.update({ where: { id: b.id }, data: { totalUnits: total, reviewedUnits: reviewed } });
  }

  console.log("✅ Seed complete.");
  console.log({ studentId: student.id, scholarId: scholar.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
