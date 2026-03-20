export type LandingLanguage = 'en' | 'hi' | 'ru';

export type LandingTabId = 'family' | 'business' | 'friendship' | 'seva';

export interface LandingCopy {
  nav: {
    product: string;
    feed: string;
    login: string;
    register: string;
    portal: string;
    admin: string;
    logoutTitle: string;
  };
  hero: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    descriptionPrefix: string;
    descriptionHighlight1: string;
    descriptionMiddle: string;
    descriptionHighlight2: string;
    descriptionSuffix: string;
    primaryCta: string;
    secondaryCta: string;
  };
  features: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    description: string;
    items: Array<{ title: string; description: string }>;
  };
  philosophy: {
    titleLine1: string;
    titleLine2: string;
    description: string;
    pillars: Array<{ title: string; text: string }>;
    quote: string;
  };
  union: {
    badge: string;
    titlePrefix: string;
    tabs: Record<LandingTabId, { label: string; description: string; totalLabel: string; join: string }>;
    maleLabel: string;
    femaleLabel: string;
    footer: string;
  };
  team: {
    badge: string;
    titlePrefix: string;
    titleAccent: string;
    description: string;
    members: Array<{ role: string; bio: string; specialty: string }>;
  };
  community: {
    titlePrefix: string;
    titleAccent: string;
    description: string;
    cta: string;
  };
  scroll: {
    title: string;
    description: string;
    imageAlts: string[];
  };
  footer: {
    tagline: string;
    sectionsTitle: string;
    home: string;
    feed: string;
    auth: string;
    admin: string;
    resourcesTitle: string;
    docs: string;
    blog: string;
    community: string;
    contactTitle: string;
    copyright: string;
  };
}

export const landingCopy: Record<LandingLanguage, LandingCopy> = {
  en: {
    nav: {
      product: 'Ecosystem Agent',
      feed: 'Feed',
      login: 'Login',
      register: 'Register',
      portal: 'Portal',
      admin: 'Admin',
      logoutTitle: 'Logout',
    },
    hero: {
      badge: 'Evolution of Sanatana Dharma',
      titleLine1: 'Spiritual Technology',
      titleLine2: 'For a New Era',
      descriptionPrefix: 'A fusion of ',
      descriptionHighlight1: 'Vedic Wisdom',
      descriptionMiddle: ' and ',
      descriptionHighlight2: 'Artificial Intelligence',
      descriptionSuffix: ' for deeper service, connection, and community in the digital age.',
      primaryCta: 'Join the Ecosystem',
      secondaryCta: 'Explore More',
    },
    features: {
      badge: 'Built for Devotees',
      titleLine1: 'Everything You Need',
      titleLine2: 'In One Place',
      description: 'Tools for spiritual practice, relationships, learning, service, and conscious living inside one integrated platform.',
      items: [
        { title: 'Sattva Market', description: 'A marketplace for sattvic living. Discover trusted Vaishnava shops, products, clothing, and devotional goods with safe transactions and convenient delivery.' },
        { title: 'VedaMatch', description: 'Conscious relationships. Find a life partner, business collaborator, or meaningful friendship through filters based on ashrama, goals, and service.' },
        { title: 'Sanga Communication', description: 'Stay connected with your community through calls, chats, and devotee discovery for service, satsanga, and kirtan.' },
        { title: 'Sattva Cafe', description: 'Find nearby vegetarian cafes or arrange prasadam delivery from trusted places reviewed by devotees.' },
        { title: 'Wisdom Library', description: 'A study space for shastra, guided courses, and practice tools that help structure long-term learning.' },
        { title: 'Education', description: 'Courses in philosophy, music, cooking, and Vedic arts taught by experienced practitioners.' },
        { title: 'Seva Hub', description: 'A place for service. Find volunteers and service opportunities for temple projects, festivals, and meaningful initiatives.' },
        { title: 'News Feed', description: 'A cleaner news stream with filters by mathas and organizations, designed to reduce noise and preserve constructive focus.' },
        { title: 'Sacred Travel', description: 'Pilgrimages, dhama journeys, yoga retreats, and festival trips with support for logistics, stay, and transport.' },
        { title: 'Ecosystem Map', description: 'Temples, communities, centers, and cultural locations gathered on one map so people can stay connected locally.' },
        { title: 'Community Ads', description: 'A trusted board for buying, selling, gifting, and finding helpful services within the devotee network.' },
        { title: 'AI Assistant', description: 'A personal guide for questions on philosophy and practice, powered by retrieval and AI assistance.' },
      ],
    },
    philosophy: {
      titleLine1: 'The Philosophy of',
      titleLine2: 'VedaMatch Agent',
      description: 'Kali-yuga changes the environment, but devotion remains constant. We see technology as an instrument that should serve a higher purpose: connecting hearts with the Divine and with each other.',
      pillars: [
        { title: 'Tradition', text: 'We rely on the enduring guidance of acharyas and sacred texts, adapting the form while preserving the essence.' },
        { title: 'Innovation', text: 'We use AI and modern architecture to accelerate outreach and simplify everyday spiritual practice.' },
        { title: 'Community', text: 'We build a safe and inspiring digital environment where devotees can find support, belonging, and service.' },
        { title: 'Education', text: 'We make knowledge more interactive and accessible, helping people study shastra from anywhere.' },
      ],
      quote: '"Use everything in Krishna’s service. That is true renunciation and real perfection in the modern world."',
    },
    union: {
      badge: 'VedaMatch Ecosystem',
      titlePrefix: 'Find aligned people for',
      tabs: {
        family: { label: 'Family', description: 'Find a life partner through Vedic values, deeper compatibility, and a more intentional relationship path.', totalLabel: 'Participants', join: 'Join Now' },
        business: { label: 'Business', description: 'Collaborate with devotees, build ethical ventures, and exchange professional experience inside a shared-value network.', totalLabel: 'Members in this area', join: 'Join Now' },
        friendship: { label: 'Friendship', description: 'Meet friends and well-wishers in your city for growth, communication, and shared practice.', totalLabel: 'Members in this area', join: 'Join Now' },
        seva: { label: 'Seva', description: 'Join volunteer initiatives and discover opportunities for selfless service in real community projects.', totalLabel: 'Members in this area', join: 'Join Now' },
      },
      maleLabel: 'Men',
      femaleLabel: 'Women',
      footer: 'VedaMatch • Sattva • Community',
    },
    team: {
      badge: 'Project Creators',
      titlePrefix: 'A Team of',
      titleAccent: 'Aligned Builders',
      description: 'We combine modern engineering with fidelity to Vedic standards to create tools for a new era of spiritual growth.',
      members: [
        { role: 'Founder and public-facing visionary', bio: 'Responsible for external relationships, strategic coordination, and ecosystem development with communities and partners.', specialty: 'Public Relations' },
        { role: 'Founder and technical architect', bio: 'Responsible for system architecture, AI services, and the technical realization of the broader product vision.', specialty: 'Technology' },
      ],
    },
    community: {
      titlePrefix: 'Join the',
      titleAccent: 'Sangha',
      description: 'Discuss the ecosystem, contribute ideas, and connect with people building technology in a devotional spirit.',
      cta: 'Join our Telegram',
    },
    scroll: {
      title: 'Inspiration in Every Moment',
      description: 'Immerse yourself in an atmosphere of devotion, service, and beauty. The platform is designed to preserve and expand those values.',
      imageAlts: ['Kirtan', 'Temple', 'Study', 'Meditation', 'Service', 'Devotion'],
    },
    footer: {
      tagline: 'Modern technology in service of timeless values.',
      sectionsTitle: 'Sections',
      home: 'Home',
      feed: 'Feed',
      auth: 'Login',
      admin: 'Control Panel',
      resourcesTitle: 'Resources',
      docs: 'Documentation',
      blog: 'Blog',
      community: 'Community',
      contactTitle: 'Contact Us',
      copyright: '© 2025 VedaMatch Agent. All rights reserved. Hare Krishna.',
    },
  },
  hi: {
    nav: {
      product: 'Ecosystem Agent',
      feed: 'फ़ीड',
      login: 'लॉगिन',
      register: 'रजिस्टर',
      portal: 'पोर्टल',
      admin: 'एडमिन',
      logoutTitle: 'लॉगआउट',
    },
    hero: {
      badge: 'सनातन धर्म का विकास',
      titleLine1: 'आध्यात्मिक प्रौद्योगिकी',
      titleLine2: 'नए युग के लिए',
      descriptionPrefix: '',
      descriptionHighlight1: 'वैदिक ज्ञान',
      descriptionMiddle: ' और ',
      descriptionHighlight2: 'कृत्रिम बुद्धिमत्ता',
      descriptionSuffix: ' का संगम, जिससे डिजिटल युग में सेवा, संबंध और संगति और गहरी हो सके।',
      primaryCta: 'इकोसिस्टम से जुड़ें',
      secondaryCta: 'और जानें',
    },
    features: {
      badge: 'भक्तों के लिए निर्मित',
      titleLine1: 'जो कुछ आवश्यक है',
      titleLine2: 'एक ही स्थान पर',
      description: 'साधना, संबंध, शिक्षा, सेवा और सात्त्विक जीवन के लिए एकीकृत डिजिटल साधन।',
      items: [
        { title: 'Sattva Market', description: 'सात्त्विक जीवन के लिए मार्केटप्लेस। विश्वसनीय वैष्णव दुकानों से उत्पाद, वस्त्र और पूजा-सामग्री खोजें। सुरक्षित लेन-देन और सहज डिलीवरी।' },
        { title: 'VedaMatch', description: 'सचेत संबंध। जीवनसाथी, व्यावसायिक सहयोगी या समान मूल्यों वाले मित्र खोजें। आश्रम, उद्देश्य और सेवा पर आधारित फ़िल्टर।' },
        { title: 'Sanga Communication', description: 'समुदाय से जुड़े रहें। कॉल, चैट और आपके आसपास भक्तों की खोज, ताकि संगति और सेवा सुगम हो।' },
        { title: 'Sattva Cafe', description: 'निकटतम शाकाहारी कैफ़े खोजें या प्रसाद डिलीवरी का प्रबंध करें। भक्तों द्वारा परखे गए स्थानों का चयन।' },
        { title: 'Wisdom Library', description: 'शास्त्र अध्ययन, संरचित पाठ्यक्रम और अभ्यास उपकरणों के लिए एक समर्पित अध्ययन मंच।' },
        { title: 'Education', description: 'दर्शन, संगीत, पाक-कला और वैदिक कलाओं के पाठ्यक्रम, अनुभवी शिक्षकों के साथ।' },
        { title: 'Seva Hub', description: 'सेवा के अवसरों का केंद्र। मंदिर परियोजनाओं, उत्सवों और सेवा कार्यों के लिए स्वयंसेवक और अवसर खोजें।' },
        { title: 'News Feed', description: 'कम शोर वाला समाचार प्रवाह, जिसमें मठों और संगठनों के अनुसार फ़िल्टर कर रचनात्मक सामग्री देखी जा सके।' },
        { title: 'Sacred Travel', description: 'धाम यात्राएँ, योग रिट्रीट और उत्सव यात्राएँ, साथ में निवास और परिवहन समन्वय।' },
        { title: 'Ecosystem Map', description: 'मंदिर, समुदाय और सांस्कृतिक केंद्र एक ही मानचित्र पर, ताकि स्थानीय जुड़ाव मजबूत हो।' },
        { title: 'Community Ads', description: 'विश्वसनीय समुदाय बोर्ड जहाँ लोग खरीद, विक्रय, दान और आवश्यक सेवाएँ खोज सकें।' },
        { title: 'AI Assistant', description: 'दर्शन और साधना के प्रश्नों के लिए आपका निजी सहायक, AI और ज्ञान-स्रोतों से समर्थित।' },
      ],
    },
    philosophy: {
      titleLine1: 'VedaMatch Agent का',
      titleLine2: 'दर्शन',
      description: 'कलियुग का परिवेश बदलता है, पर भक्ति का केंद्र नहीं बदलता। हम प्रौद्योगिकी को ऐसा साधन मानते हैं जो हृदयों को भगवान और एक-दूसरे से जोड़ने में सहायक हो।',
      pillars: [
        { title: 'परंपरा', text: 'हम आचार्यों और शास्त्रों के शाश्वत मार्गदर्शन पर आधारित रहते हैं, रूप को समायोजित करते हैं पर सार को नहीं छोड़ते।' },
        { title: 'नवोन्मेष', text: 'AI और आधुनिक आर्किटेक्चर का उपयोग प्रचार और दैनिक साधना को अधिक सहज बनाने के लिए करते हैं।' },
        { title: 'समुदाय', text: 'हम एक सुरक्षित और प्रेरक डिजिटल वातावरण बनाते हैं जहाँ भक्त सहयोग, संगति और सेवा पा सकें।' },
        { title: 'शिक्षा', text: 'ज्ञान को अधिक सुलभ और इंटरैक्टिव बनाकर शास्त्र अध्ययन को कहीं से भी संभव बनाते हैं।' },
      ],
      quote: '"कृष्ण की सेवा में सब कुछ लगाओ। यही वास्तविक वैराग्य है और आधुनिक जीवन की सिद्धि भी।"',
    },
    union: {
      badge: 'VedaMatch Ecosystem',
      titlePrefix: 'समान भाव वाले लोगों को खोजें',
      tabs: {
        family: { label: 'परिवार', description: 'वैदिक मूल्यों, गहरी अनुकूलता और उद्देश्यपूर्ण संबंध-पथ पर आधारित जीवनसाथी की खोज करें।', totalLabel: 'सदस्य', join: 'अभी जुड़ें' },
        business: { label: 'व्यवसाय', description: 'भक्तों के साथ सहयोग करें, नैतिक परियोजनाएँ बनाएं और पेशेवर अनुभव साझा करें।', totalLabel: 'इस श्रेणी के सदस्य', join: 'अभी जुड़ें' },
        friendship: { label: 'मित्रता', description: 'अपने शहर में ऐसे मित्र और शुभचिंतक खोजें जिनके साथ साधना, विकास और संवाद हो सके।', totalLabel: 'इस श्रेणी के सदस्य', join: 'अभी जुड़ें' },
        seva: { label: 'सेवा', description: 'स्वयंसेवी परियोजनाओं से जुड़ें और निःस्वार्थ सेवा के अवसर खोजें।', totalLabel: 'इस श्रेणी के सदस्य', join: 'अभी जुड़ें' },
      },
      maleLabel: 'पुरुष',
      femaleLabel: 'महिला',
      footer: 'VedaMatch • सत्त्व • समुदाय',
    },
    team: {
      badge: 'परियोजना निर्माता',
      titlePrefix: 'समान उद्देश्य वाली',
      titleAccent: 'टीम',
      description: 'हम आधुनिक इंजीनियरिंग और वैदिक मानकों के प्रति निष्ठा को जोड़कर आध्यात्मिक विकास के नए युग के लिए उपकरण बना रहे हैं।',
      members: [
        { role: 'संस्थापक और सार्वजनिक दृष्टि-निर्देशक', bio: 'बाहरी संबंधों, रणनीतिक समन्वय और समुदायों व भागीदारों के साथ इकोसिस्टम विकास की ज़िम्मेदारी।', specialty: 'जनसंपर्क' },
        { role: 'संस्थापक और तकनीकी वास्तुकार', bio: 'सिस्टम आर्किटेक्चर, AI सेवाओं और परियोजना की तकनीकी दिशा की ज़िम्मेदारी।', specialty: 'प्रौद्योगिकी' },
      ],
    },
    community: {
      titlePrefix: 'हमारी',
      titleAccent: 'संग',
      description: 'इकोसिस्टम पर चर्चा करें, अपने विचार साझा करें और भक्ति-भाव से तकनीक बनाने वाले लोगों से जुड़ें।',
      cta: 'हमारे टेलीग्राम में आएँ',
    },
    scroll: {
      title: 'हर क्षण में प्रेरणा',
      description: 'भक्ति, सेवा और सुंदरता के वातावरण में प्रवेश करें। यह मंच उन मूल्यों को संरक्षित और विस्तारित करने के लिए बनाया गया है।',
      imageAlts: ['कीर्तन', 'मंदिर', 'अध्ययन', 'ध्यान', 'सेवा', 'भक्ति'],
    },
    footer: {
      tagline: 'शाश्वत मूल्यों की सेवा में आधुनिक तकनीक।',
      sectionsTitle: 'विभाग',
      home: 'मुख्य',
      feed: 'फ़ीड',
      auth: 'लॉगिन',
      admin: 'कंट्रोल पैनल',
      resourcesTitle: 'संसाधन',
      docs: 'दस्तावेज़',
      blog: 'ब्लॉग',
      community: 'समुदाय',
      contactTitle: 'संपर्क करें',
      copyright: '© 2025 VedaMatch Agent. सभी अधिकार सुरक्षित। हरे कृष्ण।',
    },
  },
  ru: {
    nav: {
      product: 'Ecosystem Agent',
      feed: 'Лента',
      login: 'Вход',
      register: 'Регистрация',
      portal: 'Портал',
      admin: 'Админ',
      logoutTitle: 'Выйти',
    },
    hero: {
      badge: 'Evolution of Sanatana Dharma',
      titleLine1: 'Духовные Технологии',
      titleLine2: 'Нового Времени',
      descriptionPrefix: 'Слияние ',
      descriptionHighlight1: 'Ведической Мудрости',
      descriptionMiddle: ' и ',
      descriptionHighlight2: 'Искусственного Интеллекта',
      descriptionSuffix: ' для глубокого служения и общения в цифровую эпоху.',
      primaryCta: 'Присоединиться',
      secondaryCta: 'Узнать больше',
    },
    features: {
      badge: 'Built for Devotees',
      titleLine1: 'Всё необходимое в',
      titleLine2: 'Одном Месте',
      description: 'Мы собрали лучшие инструменты для духовной практики, общения и жизни в гуне благости.',
      items: [
        { title: 'Sattva Market', description: 'Маркетплейс для благостной жизни. Находите продукты, одежду и атрибутику от проверенных вайшнавских магазинов. Безопасные сделки и удобная доставка.' },
        { title: 'VedaMatch', description: 'Осознанные знакомства. Ищите спутника жизни, деловых партнеров или друзей по интересам. Умные фильтры по ашраму, целям и служению.' },
        { title: 'Sanga Общение', description: 'Оставайтесь на связи с общиной. P2P звонки, чаты и поиск преданных рядом с вами для совместного служения и киртанов.' },
        { title: 'Sattva Cafe', description: 'Найдите ближайшее вегетарианское кафе или закажите доставку прасада. Каталог проверенных заведений с отзывами преданных.' },
        { title: 'Библиотека Мудрости', description: 'Образовательная платформа. Изучайте шастры, проходите курсы (Бхакти Шастры) и проверяйте знания в тренажерах.' },
        { title: 'Образование', description: 'Курсы по философии, музыке, кулинарии и другим ведическим искусствам. Обучение от мастеров своего дела.' },
        { title: 'Seva Hub', description: 'Раздел для тех, кто хочет служить. Поиск волонтеров для храмовых проектов, фестивалей и добрых дел.' },
        { title: 'Лента Новостей', description: 'Агрегатор чистого контента. Новости с фильтром по матхам и организациям, очищенные от негатива.' },
        { title: 'Священные Путешествия', description: 'Паломничества в святые места (Дхамы), йога-туры и поездки на фестивали. Организация жилья и трансферов.' },
        { title: 'Экосистема Карт', description: 'Все вайшнавские центры, храмы и культурные объекты на одной карте. Будьте в курсе событий в вашем регионе.' },
        { title: 'Объявления', description: 'Доска объявлений для своих. Покупайте, продавайте, дарите и находите нужные услуги внутри сообщества.' },
        { title: 'AI Ассистент', description: 'Ваш личный гид. Задавайте вопросы по философии и практике — искусственный интеллект найдет ответы.' },
      ],
    },
    philosophy: {
      titleLine1: 'Философия',
      titleLine2: 'VedaMatch Agent',
      description: 'Век Кали диктует свои правила, но преданность остается неизменной. Мы верим, что технологии — это лишь инструменты, которые должны служить высшей цели: соединению сердец с Божественным и друг другом.',
      pillars: [
        { title: 'Традиция', text: 'Мы опираемся на неизменные наставления ачарьев и священных писаний, адаптируя форму, но сохраняя суть.' },
        { title: 'Инновации', text: 'Использование AI и передовых архитектур для ускорения проповеди и упрощения повседневной духовной практики.' },
        { title: 'Община', text: 'Создание безопасной и вдохновляющей цифровой среды для сангхи, где каждый может найти поддержку и служение.' },
        { title: 'Образование', text: 'Доступ к знаниям в интерактивном формате, помогающий систематизировать изучение шастр в любом месте.' },
      ],
      quote: '"Используйте все ради Кришны. Это и есть истинное отречение и совершенство жизни в современном мире."',
    },
    union: {
      badge: 'VedaMatch Ecosystem',
      titlePrefix: 'Найдите единомышленников для',
      tabs: {
        family: { label: 'Семьи', description: 'Находите спутника жизни на основе ведических ценностей и астрологической совместимости.', totalLabel: 'Участников в категории', join: 'Присоединиться' },
        business: { label: 'Бизнеса', description: 'Сотрудничайте с преданными, создавайте этичные проекты и обменивайтесь профессиональным опытом.', totalLabel: 'Участников в категории', join: 'Присоединиться' },
        friendship: { label: 'Дружбы', description: 'Ищите друзей и единомышленников в вашем городе для совместного развития и общения.', totalLabel: 'Участников в категории', join: 'Присоединиться' },
        seva: { label: 'Служения', description: 'Присоединяйтесь к волонтерским проектам и находите возможности для бескорыстного служения.', totalLabel: 'Участников в категории', join: 'Присоединиться' },
      },
      maleLabel: 'М',
      femaleLabel: 'Ж',
      footer: 'VedaMatch • Благость • Сообщество',
    },
    team: {
      badge: 'Создатели Проекта',
      titlePrefix: 'Команда',
      titleAccent: 'Единомышленников',
      description: 'Мы объединили современную инженерную мысль и преданность ведическим стандартам, чтобы создать инструменты для новой эпохи духовного развития.',
      members: [
        { role: 'Основатель и идейный вдохновитель', bio: 'Связь с общественностью. Координация внешних связей и развитие стратегического партнерства в рамках экосистемы.', specialty: 'Общественные связи' },
        { role: 'Основатель и идейный вдохновитель', bio: 'Технический специалист. Архитектура системы, разработка AI-сервисов и технологическая реализация видения проекта.', specialty: 'Технологии' },
      ],
    },
    community: {
      titlePrefix: 'Присоединяйтесь к',
      titleAccent: 'Сангхе',
      description: 'Обсуждайте развитие экосистемы, предлагайте свои идеи и общайтесь с единомышленниками. Вместе мы создаем технологии будущего в служении преданным.',
      cta: 'В наш Телеграм',
    },
    scroll: {
      title: 'Вдохновение в каждом моменте',
      description: 'Погрузитесь в атмосферу преданности и служения. Наша платформа помогает сохранять и приумножать эти ценности.',
      imageAlts: ['Киртан', 'Храм', 'Изучение', 'Медитация', 'Служение', 'Преданность'],
    },
    footer: {
      tagline: 'Современные технологии на службе вечных ценностей.',
      sectionsTitle: 'Разделы',
      home: 'Главная',
      feed: 'Лента',
      auth: 'Авторизация',
      admin: 'Панель управления',
      resourcesTitle: 'Ресурсы',
      docs: 'Документация',
      blog: 'Блог',
      community: 'Сообщество',
      contactTitle: 'Свяжитесь с нами',
      copyright: '© 2025 VedaMatch Agent. All rights reserved. Hare Krishna.',
    },
  },
};

export function resolveDefaultLandingLanguage(hostname: string): LandingLanguage {
  const host = hostname.toLowerCase();
  if (host === 'vedamatch.com' || host === 'www.vedamatch.com' || host.endsWith('.vedamatch.com')) {
    return 'en';
  }
  return 'ru';
}
