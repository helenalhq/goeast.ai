// Zi Wei Dou Shu (Purple Star Astrology) — Stars and Palaces Data

export interface ZiweiStar {
  slug: string;
  name_en: string;
  name_zh: string;
  element: string;
  element_zh: string;
  yin_yang: "Yin" | "Yang";
  category: "emperor" | "minister" | "general" | "support";
  description_en: string;
  description_zh: string;
  keywords_en: string[];
  keywords_zh: string[];
  modern_interpretation_en: string;
  modern_interpretation_zh: string;
}

export interface ZiweiPalace {
  slug: string;
  name_en: string;
  name_zh: string;
  life_area_en: string;
  life_area_zh: string;
  description_en: string;
  description_zh: string;
  questions_en: string[];
  questions_zh: string[];
}

export const ZIWEI_STARS: ZiweiStar[] = [
  {
    slug: "ziwei",
    name_en: "Zi Wei (Emperor Star)",
    name_zh: "紫微星",
    element: "Earth",
    element_zh: "土",
    yin_yang: "Yin",
    category: "emperor",
    description_en: "The Emperor Star is the most noble star in Zi Wei Dou Shu, representing leadership, authority, dignity, and the central axis around which all other stars revolve. Like a monarch on the throne, Zi Wei commands respect and naturally draws others into its orbit. It signifies a person's innate nobility, capacity for governance, and their relationship with power and status.",
    description_zh: "紫微星是紫微斗数中最尊贵的星曜，代表领导力、权威、尊严，是所有星曜运转的中心轴。如同帝王端坐龙庭，紫微星自带威仪，天然吸引他人环绕。它标志着一个人内在的高贵品质、驾驭全局的能力，以及与权力和地位的关系。",
    keywords_en: ["leadership", "authority", "nobility", "governance", "center"],
    keywords_zh: ["领导力", "权威", "尊贵", "治理", "中心"],
    modern_interpretation_en: "In modern life, Zi Wei energy manifests as natural leadership ability, executive presence, and the capacity to organize people and resources. People with prominent Zi Wei often become CEOs, senior managers, or influential figures in their communities. The challenge is balancing authority with humility.",
    modern_interpretation_zh: "在现代生活中，紫微星的能量表现为天然的领导才能、管理者气质以及组织人才和资源的能力。紫微星突出的人往往成为企业高管、资深管理者或社区中的影响力人物。挑战在于平衡权威与谦逊。",
  },
  {
    slug: "tianji",
    name_en: "Tian Ji (Heavenly Secret)",
    name_zh: "天机星",
    element: "Wood",
    element_zh: "木",
    yin_yang: "Yin",
    category: "minister",
    description_en: "Tian Ji is the star of intelligence, strategy, and mental agility. It represents the advisor behind the throne — the brilliant mind that sees patterns, devises plans, and navigates complexity with ease. This star governs thinking, analysis, learning ability, and adaptability to change.",
    description_zh: "天机星是智慧、谋略和思维敏捷的星曜。它代表着帝王身后的谋臣——那个洞察规律、制定方略、从容驾驭复杂局面的聪明头脑。天机星主管思考、分析、学习能力以及应对变化的适应力。",
    keywords_en: ["intelligence", "strategy", "adaptability", "analysis", "planning"],
    keywords_zh: ["智慧", "谋略", "应变", "分析", "策划"],
    modern_interpretation_en: "Tian Ji people thrive in technology, consulting, research, and any field requiring quick thinking and continuous learning. They are natural problem-solvers and often excel in rapidly changing industries. The challenge is overthinking and indecision.",
    modern_interpretation_zh: "天机星突出的人在科技、咨询、研究以及任何需要快速思考和持续学习的领域中如鱼得水。他们是天生的问题解决者，常在变化迅速的行业中脱颖而出。挑战在于过度思虑和优柔寡断。",
  },
  {
    slug: "taiyang",
    name_en: "Tai Yang (Sun Star)",
    name_zh: "太阳星",
    element: "Fire",
    element_zh: "火",
    yin_yang: "Yang",
    category: "minister",
    description_en: "Tai Yang is the Sun — radiant, generous, and illuminating everything it touches. It represents public life, reputation, generosity of spirit, and the masculine principle of active giving. The Sun Star governs fame, social influence, relationships with father and male figures, and one's capacity for selfless service.",
    description_zh: "太阳星如同太阳——光芒四射、慷慨无私、照耀万物。它代表公共生活、名望声誉、豁达的精神以及主动给予的阳性力量。太阳星主管名声、社会影响力、与父亲及男性长辈的关系，以及无私奉献的能力。",
    keywords_en: ["radiance", "generosity", "fame", "public service", "masculine"],
    keywords_zh: ["光辉", "慷慨", "名声", "公共服务", "阳性"],
    modern_interpretation_en: "Tai Yang people are drawn to public-facing roles — politics, media, education, philanthropy. They shine brightest when serving others and often sacrifice personal comfort for the greater good. The challenge is burnout from overgiving.",
    modern_interpretation_zh: "太阳星突出的人常被公共角色吸引——政治、媒体、教育、慈善。当服务他人时他们光芒最盛，常为大义牺牲个人舒适。挑战在于因过度付出而倦怠。",
  },
  {
    slug: "wuqu",
    name_en: "Wu Qu (Military Star)",
    name_zh: "武曲星",
    element: "Metal",
    element_zh: "金",
    yin_yang: "Yin",
    category: "general",
    description_en: "Wu Qu is the star of wealth, decisiveness, and martial valor. It carries the energy of a seasoned general — direct, practical, and results-oriented. Wu Qu governs financial aptitude, determination, courage in action, and the ability to cut through confusion to reach clear outcomes.",
    description_zh: "武曲星是财富、果断和武勇的星曜。它承载着身经百战将军的能量——直截了当、务实高效、目标导向。武曲星主管理财能力、决断力、行动中的勇气以及拨开迷雾直达目标的能力。",
    keywords_en: ["wealth", "decisiveness", "finance", "courage", "practical"],
    keywords_zh: ["财富", "果断", "理财", "勇气", "务实"],
    modern_interpretation_en: "Wu Qu people excel in finance, banking, engineering, and entrepreneurship. They are the doers who turn plans into results. Their straightforward nature makes them effective but sometimes abrupt in social situations. The challenge is balancing material pursuit with emotional connection.",
    modern_interpretation_zh: "武曲星突出的人在金融、银行、工程和创业领域表现出色。他们是将计划变为成果的实干家。直来直往的性格使他们高效但在社交中有时显得生硬。挑战在于平衡物质追求与情感联系。",
  },
  {
    slug: "tiantong",
    name_en: "Tian Tong (Heavenly Unity)",
    name_zh: "天同星",
    element: "Water",
    element_zh: "水",
    yin_yang: "Yang",
    category: "support",
    description_en: "Tian Tong is the star of harmony, enjoyment, and emotional well-being. It represents the gentle, nurturing aspect of life — contentment, leisure, artistic appreciation, and the simple pleasures that make existence worthwhile. This star governs emotional satisfaction, childhood happiness, and the capacity for relaxation.",
    description_zh: "天同星是和谐、享受与情感幸福的星曜。它代表生活中温柔、滋养的面向——知足常乐、闲适优雅、艺术品味以及让生命值得的简单快乐。天同星主管情感满足、童年幸福以及放松身心的能力。",
    keywords_en: ["harmony", "enjoyment", "gentleness", "contentment", "arts"],
    keywords_zh: ["和谐", "享受", "温和", "知足", "艺术"],
    modern_interpretation_en: "Tian Tong people gravitate toward the arts, hospitality, counseling, and creative industries. They bring warmth and harmony to any environment. Their gift is making others feel at ease. The challenge is overcoming complacency and developing drive.",
    modern_interpretation_zh: "天同星突出的人倾向于艺术、餐饮服务、心理咨询和创意产业。他们为任何环境带来温暖与和谐。天赋在于让他人感到自在。挑战在于克服安逸心态、培养进取动力。",
  },
  {
    slug: "lianzhen",
    name_en: "Lian Zhen (Incorruptible)",
    name_zh: "廉贞星",
    element: "Fire",
    element_zh: "火",
    yin_yang: "Yin",
    category: "minister",
    description_en: "Lian Zhen is a complex star of passion, intensity, and transformation. It carries both creative fire and destructive potential — like a volcano that can fertilize or devastate. This star governs passion, legal matters, romantic intensity, principled behavior, and the tension between desire and discipline.",
    description_zh: "廉贞星是一颗复杂的星曜，代表激情、强烈和转化。它既承载创造之火也蕴含毁灭之力——如同火山既能肥沃大地也能焚毁一切。廉贞星主管激情、法律事务、感情的浓烈、原则性行为以及欲望与纪律之间的张力。",
    keywords_en: ["passion", "intensity", "principle", "transformation", "discipline"],
    keywords_zh: ["激情", "强烈", "原则", "转化", "纪律"],
    modern_interpretation_en: "Lian Zhen people are drawn to law, politics, performing arts, and high-stakes professions. They feel things deeply and act with conviction. Their intensity can be magnetic or overwhelming. The challenge is channeling passion constructively without burning bridges.",
    modern_interpretation_zh: "廉贞星突出的人被法律、政治、表演艺术和高压行业吸引。他们感受深刻、行动坚定。这份强烈可以极具魅力也可能让人难以承受。挑战在于建设性地引导激情，不要过河拆桥。",
  },
  {
    slug: "tianfu",
    name_en: "Tian Fu (Heavenly Treasury)",
    name_zh: "天府星",
    element: "Earth",
    element_zh: "土",
    yin_yang: "Yang",
    category: "emperor",
    description_en: "Tian Fu is the star of abundance, stability, and material security. As the 'Empress Star' that partners Zi Wei, it represents accumulated wealth, conservative management, and the reliable foundation upon which prosperity is built. Tian Fu governs savings, property, material comfort, and steady growth.",
    description_zh: "天府星是丰饶、稳定和物质安全的星曜。作为与紫微星配对的'皇后星'，它代表财富积累、稳健管理以及繁荣所依赖的可靠根基。天府星主管储蓄、房产、物质舒适和稳步增长。",
    keywords_en: ["abundance", "stability", "treasury", "conservation", "foundation"],
    keywords_zh: ["丰饶", "稳定", "府库", "保守", "根基"],
    modern_interpretation_en: "Tian Fu people excel in banking, real estate, asset management, and administration. They are the steady hands that build lasting institutions. Their reliability makes them trusted stewards of resources. The challenge is avoiding excessive conservatism that misses opportunities.",
    modern_interpretation_zh: "天府星突出的人在银行、房地产、资产管理和行政管理方面表现出色。他们是建立持久机构的稳定力量。可靠性使他们成为受信赖的资源管理者。挑战在于避免过度保守而错失机遇。",
  },
  {
    slug: "taiyin",
    name_en: "Tai Yin (Moon Star)",
    name_zh: "太阴星",
    element: "Water",
    element_zh: "水",
    yin_yang: "Yin",
    category: "minister",
    description_en: "Tai Yin is the Moon — reflective, intuitive, and quietly powerful. It governs the inner world, emotions, hidden wealth, female figures, real estate, and the subtle influence that works through attraction rather than force. The Moon Star represents artistic sensitivity, financial acumen in property, and deep emotional intelligence.",
    description_zh: "太阴星如同月亮——内敛、直觉、静水流深。它主管内心世界、情感、暗财、女性人物、房产以及通过吸引而非强迫来发挥的隐性影响力。太阴星代表艺术敏感性、房产理财的眼光和深层的情商。",
    keywords_en: ["intuition", "reflection", "hidden wealth", "feminine", "emotion"],
    keywords_zh: ["直觉", "内省", "暗财", "阴柔", "情感"],
    modern_interpretation_en: "Tai Yin people thrive in interior design, psychology, real estate investment, art, and behind-the-scenes roles. They influence through quiet presence rather than loud action. Their emotional depth creates meaningful connections. The challenge is mood instability and overthinking.",
    modern_interpretation_zh: "太阴星突出的人在室内设计、心理学、房产投资、艺术和幕后角色中如鱼得水。他们通过安静的存在而非高调的行动来施加影响。情感深度创造有意义的联结。挑战在于情绪波动和过度思虑。",
  },
  {
    slug: "tanlang",
    name_en: "Tan Lang (Greedy Wolf)",
    name_zh: "贪狼星",
    element: "Water",
    element_zh: "水",
    yin_yang: "Yang",
    category: "general",
    description_en: "Tan Lang is the star of desire, charisma, and multifaceted talent. Named 'Greedy Wolf' for its insatiable appetite for experience, this star represents charm, romance, artistic ability, social skills, and the pursuit of pleasure. It governs attractiveness, versatility, entertainment, and the tension between indulgence and spiritual cultivation.",
    description_zh: "贪狼星是欲望、魅力和多才多艺的星曜。因对体验的贪婪渴求而得名'贪狼'，它代表迷人风采、浪漫情怀、艺术天赋、社交技巧和对快乐的追求。贪狼星主管吸引力、多面才华、娱乐以及放纵与修行之间的张力。",
    keywords_en: ["charisma", "desire", "talent", "romance", "versatility"],
    keywords_zh: ["魅力", "欲望", "才艺", "桃花", "多才"],
    modern_interpretation_en: "Tan Lang people shine in entertainment, sales, marketing, art, and social media. They are natural performers and networkers with magnetic personalities. Their versatility means they often have multiple talents and interests. The challenge is focus — avoiding scattered energy and superficiality.",
    modern_interpretation_zh: "贪狼星突出的人在娱乐、销售、营销、艺术和社交媒体领域光芒四射。他们是天生的表演者和社交达人，具有磁性人格。多面才华意味着往往兴趣广泛。挑战在于专注力——避免精力分散和浮于表面。",
  },
  {
    slug: "jumen",
    name_en: "Ju Men (Giant Gate)",
    name_zh: "巨门星",
    element: "Water",
    element_zh: "水",
    yin_yang: "Yin",
    category: "minister",
    description_en: "Ju Men is the star of speech, debate, and critical thinking. Like a great gate that can either welcome or block, this star governs verbal ability, analytical power, skepticism, and the capacity to question established truths. It represents lawyers, debaters, researchers — anyone who uses words and logic as primary tools.",
    description_zh: "巨门星是口才、辩论和批判性思维的星曜。如同一扇巨门既可迎客也可阻隔，巨门星主管言语能力、分析力、质疑精神以及挑战既定真理的能力。它代表律师、辩手、研究者——一切以言辞和逻辑为主要工具的人。",
    keywords_en: ["speech", "debate", "analysis", "skepticism", "communication"],
    keywords_zh: ["口才", "辩论", "分析", "质疑", "沟通"],
    modern_interpretation_en: "Ju Men people excel in law, journalism, academia, teaching, and content creation. Their sharp minds cut through deception and their verbal skills can persuade or dismantle. The challenge is managing the shadow side — gossip, excessive criticism, and difficulty trusting others.",
    modern_interpretation_zh: "巨门星突出的人在法律、新闻、学术、教学和内容创作方面表现出色。他们的犀利头脑能洞穿虚假，言语技巧可以说服或瓦解对手。挑战在于管理阴暗面——八卦、过度批评和难以信任他人。",
  },
  {
    slug: "tianxiang",
    name_en: "Tian Xiang (Heavenly Minister)",
    name_zh: "天相星",
    element: "Water",
    element_zh: "水",
    yin_yang: "Yang",
    category: "support",
    description_en: "Tian Xiang is the star of service, assistance, and diplomatic skill. It represents the loyal prime minister who supports the sovereign — capable, reliable, and skilled at mediating between different parties. This star governs helpfulness, document handling, official matters, and the ability to bring order through proper procedures.",
    description_zh: "天相星是服务、辅助和外交才能的星曜。它代表忠心辅佐君主的丞相——能干、可靠、善于在不同势力之间斡旋。天相星主管助人精神、文书处理、公务能力以及通过正当程序建立秩序的能力。",
    keywords_en: ["service", "diplomacy", "reliability", "administration", "support"],
    keywords_zh: ["服务", "外交", "可靠", "行政", "辅佐"],
    modern_interpretation_en: "Tian Xiang people are drawn to HR, diplomacy, executive assistance, project management, and public service. They excel at coordinating people and processes. Their gift is making complex organizations run smoothly. The challenge is over-dependence on others' approval and lack of independent direction.",
    modern_interpretation_zh: "天相星突出的人倾向于人力资源、外交、行政助理、项目管理和公共服务。他们擅长协调人员和流程。天赋在于让复杂组织顺畅运转。挑战在于过度依赖他人认可、缺乏独立方向。",
  },
  {
    slug: "tianliang",
    name_en: "Tian Liang (Heavenly Beam)",
    name_zh: "天梁星",
    element: "Earth",
    element_zh: "土",
    yin_yang: "Yang",
    category: "support",
    description_en: "Tian Liang is the star of wisdom, protection, and turning calamity into fortune. Like the main beam of a house that bears weight and provides shelter, this star represents the elder who guides through crisis, the mentor who protects, and the wisdom that transforms danger into opportunity.",
    description_zh: "天梁星是智慧、庇护和逢凶化吉的星曜。如同房屋的大梁承重提供庇护，天梁星代表危机中指引方向的长者、保护后辈的导师以及将危险转化为机遇的智慧。",
    keywords_en: ["wisdom", "protection", "mentoring", "transformation", "longevity"],
    keywords_zh: ["智慧", "庇护", "教导", "化险", "长寿"],
    modern_interpretation_en: "Tian Liang people are natural mentors, doctors, insurance professionals, and crisis managers. They have an uncanny ability to turn bad situations around. Their presence brings calm and reassurance. The challenge is becoming too detached or paternalistic.",
    modern_interpretation_zh: "天梁星突出的人是天生的导师、医生、保险专业人士和危机管理者。他们有化险为夷的神奇能力。其存在带来平静和安心。挑战在于变得过于超脱或家长式。",
  },
  {
    slug: "qisha",
    name_en: "Qi Sha (Seven Killings)",
    name_zh: "七杀星",
    element: "Metal",
    element_zh: "金",
    yin_yang: "Yin",
    category: "general",
    description_en: "Qi Sha is the star of courage, independence, and fierce determination. Named 'Seven Killings' for its warrior intensity, this star represents the lone warrior who fights against overwhelming odds — brave, direct, and uncompromising. It governs willpower, entrepreneurial spirit, and the courage to destroy the old to build the new.",
    description_zh: "七杀星是勇气、独立和刚烈决心的星曜。因其战士般的强烈而得名'七杀'，它代表以一敌众的孤勇者——勇敢、直接、决不妥协。七杀星主管意志力、创业精神以及破旧立新的勇气。",
    keywords_en: ["courage", "independence", "warrior", "willpower", "revolution"],
    keywords_zh: ["勇气", "独立", "战士", "意志力", "革新"],
    modern_interpretation_en: "Qi Sha people thrive as entrepreneurs, military leaders, surgeons, athletes, and disruptive innovators. They do not follow conventional paths. Their intensity drives breakthrough achievements but can alienate allies. The challenge is learning collaboration without losing edge.",
    modern_interpretation_zh: "七杀星突出的人作为创业者、军事领袖、外科医生、运动员和颠覆式创新者而茁壮成长。他们不走寻常路。强烈的个性驱动突破性成就但可能疏远盟友。挑战在于学会协作而不失锋芒。",
  },
  {
    slug: "pojun",
    name_en: "Po Jun (Army Breaker)",
    name_zh: "破军星",
    element: "Water",
    element_zh: "水",
    yin_yang: "Yin",
    category: "general",
    description_en: "Po Jun is the star of destruction and renewal, change and pioneering. Named 'Army Breaker' for its power to shatter existing structures, this star represents the creative destroyer — the force that breaks apart what no longer serves so that new growth can emerge. It governs consumption, expenditure, radical change, and the pioneering spirit.",
    description_zh: "破军星是破坏与重生、变革与开拓的星曜。因其粉碎既有结构的力量而得名'破军'，它代表创造性的破坏者——打碎不再有用之物以让新生长发生的力量。破军星主管消耗、开支、激进变革和开拓精神。",
    keywords_en: ["destruction", "renewal", "pioneering", "change", "consumption"],
    keywords_zh: ["破坏", "重生", "开拓", "变革", "消耗"],
    modern_interpretation_en: "Po Jun people are natural disruptors — startup founders, explorers, reformers, and creative revolutionaries. They cannot tolerate stagnation and will shake up any system they join. Their gift is seeing what needs to end so something better can begin. The challenge is instability and excessive expenditure of resources.",
    modern_interpretation_zh: "破军星突出的人是天然的颠覆者——创业者、探险家、改革者和创意革命者。他们无法容忍停滞，会撼动加入的任何体系。天赋在于看到什么需要结束以便更好的事物开始。挑战在于不稳定性和过度消耗资源。",
  },
];

export const ZIWEI_PALACES: ZiweiPalace[] = [
  {
    slug: "ming",
    name_en: "Life Palace (Ming Gong)",
    name_zh: "命宫",
    life_area_en: "Self, personality, destiny, innate potential",
    life_area_zh: "自我、性格、命运、先天潜质",
    description_en: "The Life Palace is the most important palace in the chart — it represents your core self, innate personality, fundamental character, and overall life trajectory. The stars here define who you are at the deepest level and set the tone for your entire chart.",
    description_zh: "命宫是命盘中最重要的宫位——代表核心自我、先天性格、基本品性和人生整体轨迹。此宫的星曜定义了你最深层的本质，奠定了整张命盘的基调。",
    questions_en: ["Who am I at my core?", "What is my life purpose?", "What are my innate strengths?"],
    questions_zh: ["我的核心本质是什么？", "我的人生目的是什么？", "我的先天优势是什么？"],
  },
  {
    slug: "xiongdi",
    name_en: "Siblings Palace",
    name_zh: "兄弟宫",
    life_area_en: "Siblings, close friends, peers, partnerships",
    life_area_zh: "兄弟姐妹、知己好友、同辈、合作伙伴",
    description_en: "The Siblings Palace governs your relationships with brothers, sisters, close friends, and peers. In modern interpretation, it extends to business partners, co-founders, and any relationship of equals. It reveals the quality of your support network.",
    description_zh: "兄弟宫主管你与兄弟姐妹、知己好友和同辈人的关系。在现代解读中，它延伸到商业伙伴、联合创始人和一切平等关系。它揭示你支持网络的质量。",
    questions_en: ["How strong is my support network?", "What kind of partnerships suit me?", "How do I relate to peers?"],
    questions_zh: ["我的支持网络有多强大？", "什么样的合伙关系适合我？", "我如何与同辈人相处？"],
  },
  {
    slug: "fuqi",
    name_en: "Spouse Palace",
    name_zh: "夫妻宫",
    life_area_en: "Marriage, romantic relationships, partner characteristics",
    life_area_zh: "婚姻、恋爱关系、伴侣特质",
    description_en: "The Spouse Palace reveals the nature of your romantic relationships, marriage quality, and the characteristics of your ideal partner. It shows how you approach intimate relationships and what patterns play out in love.",
    description_zh: "夫妻宫揭示你浪漫关系的本质、婚姻质量和理想伴侣的特征。它展示你如何对待亲密关系以及在爱情中会出现什么模式。",
    questions_en: ["What is my ideal partner like?", "What are my relationship patterns?", "How will my marriage be?"],
    questions_zh: ["我的理想伴侣是什么样的？", "我的感情模式是什么？", "我的婚姻将如何？"],
  },
  {
    slug: "zinv",
    name_en: "Children Palace",
    name_zh: "子女宫",
    life_area_en: "Children, creativity, subordinates, next generation",
    life_area_zh: "子女、创造力、下属、下一代",
    description_en: "The Children Palace governs offspring, fertility, and your relationship with the next generation. In modern interpretation, it also represents creativity, sexual expression, and relationships with subordinates or students — anything you 'give birth to' in life.",
    description_zh: "子女宫主管后代、生育以及你与下一代的关系。在现代解读中，它也代表创造力、性表达以及与下属或学生的关系——生命中你所'创造'的一切。",
    questions_en: ["What is my creative potential?", "How will my relationship with children be?", "How do I nurture others?"],
    questions_zh: ["我的创造力潜质如何？", "我和子女的关系如何？", "我如何培育他人？"],
  },
  {
    slug: "caibo",
    name_en: "Wealth Palace",
    name_zh: "财帛宫",
    life_area_en: "Finances, earning ability, attitudes toward money",
    life_area_zh: "财务、赚钱能力、金钱态度",
    description_en: "The Wealth Palace reveals your financial aptitude, earning potential, and relationship with money. It shows how you make money, how you spend it, and your overall financial destiny. Different stars here indicate different paths to prosperity.",
    description_zh: "财帛宫揭示你的理财能力、收入潜力和与金钱的关系。它展示你如何赚钱、如何花钱以及整体财运。不同的星曜指向不同的致富之路。",
    questions_en: ["What is my earning potential?", "How should I manage money?", "What industries suit me financially?"],
    questions_zh: ["我的收入潜力如何？", "我应该如何理财？", "什么行业最适合我赚钱？"],
  },
  {
    slug: "jie",
    name_en: "Health Palace",
    name_zh: "疾厄宫",
    life_area_en: "Health, body constitution, illness patterns",
    life_area_zh: "健康、体质、疾病模式",
    description_en: "The Health Palace reveals your physical constitution, potential health vulnerabilities, and illness patterns throughout life. It indicates which body systems need attention and what preventive measures to take. In traditional interpretation, it also relates to disasters and crises.",
    description_zh: "疾厄宫揭示你的身体体质、潜在健康弱点和一生的疾病模式。它指示哪些身体系统需要关注以及应采取何种预防措施。在传统解读中，它也与灾祸和危机相关。",
    questions_en: ["What are my health vulnerabilities?", "How should I maintain wellness?", "What crises might I face?"],
    questions_zh: ["我的健康弱点是什么？", "我应如何保持健康？", "我可能面对什么危机？"],
  },
  {
    slug: "qianyi",
    name_en: "Travel Palace",
    name_zh: "迁移宫",
    life_area_en: "Travel, relocation, external environment, social image",
    life_area_zh: "出行、迁移、外部环境、社会形象",
    description_en: "The Travel Palace governs movement, relocation, travel, and your relationship with the outside world. It shows how you are perceived by strangers, your fortune when away from home, and whether your destiny favors staying put or venturing abroad.",
    description_zh: "迁移宫主管出行、搬迁、旅行以及你与外部世界的关系。它展示陌生人如何看待你、离开家乡时的运势以及你的命运是适合安居还是远行。",
    questions_en: ["Should I relocate or travel?", "How am I perceived by strangers?", "Is my fortune abroad or at home?"],
    questions_zh: ["我应该搬迁或旅行吗？", "陌生人如何看待我？", "我的财运在国外还是国内？"],
  },
  {
    slug: "jiaoyou",
    name_en: "Friends Palace",
    name_zh: "交友宫",
    life_area_en: "Friends, social network, employees, community",
    life_area_zh: "朋友、社交网络、下属员工、社群",
    description_en: "The Friends Palace reveals the quality of your social connections, your ability to attract helpful friends, and your relationships with employees and staff. In modern life, it extends to your professional network, online community, and the people you work with.",
    description_zh: "交友宫揭示你社交联系的质量、吸引贵人的能力以及与员工和下属的关系。在现代生活中，它延伸到你的职业人脉、在线社群和共事的人。",
    questions_en: ["What kind of friends do I attract?", "How strong is my network?", "Can I trust my employees?"],
    questions_zh: ["我会吸引什么样的朋友？", "我的人脉有多强？", "我能信任员工吗？"],
  },
  {
    slug: "shiye",
    name_en: "Career Palace",
    name_zh: "事业宫",
    life_area_en: "Career, profession, achievements, life's work",
    life_area_zh: "事业、职业、成就、毕生工作",
    description_en: "The Career Palace is one of the most important palaces for modern life — it reveals your ideal profession, career trajectory, achievement potential, and relationship with work. Different stars here indicate different career paths and work styles.",
    description_zh: "事业宫是现代生活中最重要的宫位之一——它揭示你的理想职业、事业轨迹、成就潜力和与工作的关系。不同的星曜指向不同的职业道路和工作风格。",
    questions_en: ["What career suits me best?", "What is my achievement potential?", "How will my career develop?"],
    questions_zh: ["什么职业最适合我？", "我的成就潜力如何？", "我的事业将如何发展？"],
  },
  {
    slug: "tianzhai",
    name_en: "Property Palace",
    name_zh: "田宅宫",
    life_area_en: "Property, real estate, home environment, family assets",
    life_area_zh: "房产、不动产、家居环境、家族资产",
    description_en: "The Property Palace governs real estate, inherited wealth, home environment, and your relationship with physical spaces. It reveals your property fortune, living conditions, and the family legacy you inherit or build.",
    description_zh: "田宅宫主管房产、祖业遗产、家居环境以及你与物理空间的关系。它揭示你的置业运势、居住条件和继承或构建的家族传承。",
    questions_en: ["Will I own property?", "What kind of home environment suits me?", "Is there family inheritance?"],
    questions_zh: ["我会拥有房产吗？", "什么样的居家环境适合我？", "是否有家族遗产？"],
  },
  {
    slug: "fude",
    name_en: "Fortune Palace",
    name_zh: "福德宫",
    life_area_en: "Happiness, spiritual life, inner peace, leisure",
    life_area_zh: "福报、精神生活、内心平和、休闲",
    description_en: "The Fortune Palace reveals your inner happiness, spiritual inclination, quality of leisure time, and overall life satisfaction. It shows whether you will find contentment regardless of external circumstances — your capacity for inner peace and spiritual growth.",
    description_zh: "福德宫揭示你的内心幸福、精神倾向、休闲质量和整体人生满足感。它展示无论外在境遇如何你是否能找到知足——你内心平和和精神成长的能力。",
    questions_en: ["Will I find inner peace?", "What brings me true happiness?", "What is my spiritual path?"],
    questions_zh: ["我能找到内心平和吗？", "什么带给我真正的幸福？", "我的精神道路是什么？"],
  },
  {
    slug: "fumu",
    name_en: "Parents Palace",
    name_zh: "父母宫",
    life_area_en: "Parents, upbringing, education, authority figures",
    life_area_zh: "父母、成长环境、教育、权威人物",
    description_en: "The Parents Palace governs your relationship with parents, your upbringing environment, education quality, and relationships with authority figures. It reveals the family conditions you were born into and how parental influence shapes your life trajectory.",
    description_zh: "父母宫主管你与父母的关系、成长环境、教育质量以及与权威人物的关系。它揭示你出生的家庭条件以及父母影响如何塑造你的人生轨迹。",
    questions_en: ["How is my relationship with parents?", "What was my upbringing like?", "How do I relate to authority?"],
    questions_zh: ["我和父母的关系如何？", "我的成长环境怎样？", "我如何面对权威？"],
  },
];

// Helper functions
export function getStarBySlug(slug: string): ZiweiStar | undefined {
  return ZIWEI_STARS.find((s) => s.slug === slug);
}

export function getPalaceBySlug(slug: string): ZiweiPalace | undefined {
  return ZIWEI_PALACES.find((p) => p.slug === slug);
}

export function getAllStars(): ZiweiStar[] {
  return ZIWEI_STARS;
}

export function getAllPalaces(): ZiweiPalace[] {
  return ZIWEI_PALACES;
}
