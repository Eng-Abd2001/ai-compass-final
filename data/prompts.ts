// @ts-nocheck
export interface PromptItem {
  id: string;
  cat: "dark-cinematic" | "chrono-architecture" | "impossible-commercial" | "micro-worlds" | "tactile-branding";
  arT: string;
  enT: string;
  arC: string;
  enC: string;
  prompt: string;
  v1: [string, string, string];
  v2: [string, string, string];
  cam: string;
  pal: [string, string, string];
  tools: string[];
}

export const CATEGORIES = [
  { id: "all", ar: "جميع المسارات (50)", en: "All Vaults (50)" },
  { id: "dark-cinematic", ar: "السريالية والسينما المظلمة", en: "Dark Cinematic Surrealism" },
  { id: "chrono-architecture", ar: "الدمج الزمكاني والمعماري", en: "Chrono-Architecture" },
  { id: "impossible-commercial", ar: "الإعلانات التجارية المستحيلة", en: "Impossible Commercial" },
  { id: "micro-worlds", ar: "العوالم المجهرية الدقيقة", en: "Micro-Worlds Cutaways" },
  { id: "tactile-branding", ar: "الهويات والتايبوغرافي السائل", en: "3D Tactile & Liquid Type" }
] as const;

const CAM_TAIL = "ultra-detailed 8k photorealistic masterwork, physically based rendering, raytraced reflections, subsurface scattering, volumetric atmosphere, shot on Hasselblad H6D-100c";

export const PROMPTS: PromptItem[] = [
  // === 1. DARK CINEMATIC (p-01 to p-10) ===
  {
    id: "p-01", cat: "dark-cinematic",
    arT: "الذاكرة المحبوسة في الكهرمان المنصهر", enT: "Memory Trapped in Molten Amber",
    arC: "تجسيد بصري للذكريات البشرية كمنحوتة معلقة داخل قطرة كهرمان عملاقة تذوب ببطء في غرفة مظلمة.",
    enC: "Visualizing human memory as a suspended sculpture inside a colossal melting amber drop in a dark chamber.",
    prompt: "Extreme cinematic close-up of a colossal translucent droplet of [VAR1] suspended in mid-air inside an obsidian monolithic room, encapsulating a hyper-detailed miniature [VAR2] frozen in time, internal caustic light refraction, chiaroscuro rim lighting, slow dripping viscosity, 85mm f/1.4 macro lens, " + CAM_TAIL,
    v1: ["الخامة السائلة", "Liquid Material", "molten golden Baltic amber"],
    v2: ["العنصر المحبوس", "Trapped Subject", "vintage brass hourglass shattering into glowing dust"],
    cam: "85mm f/1.4 • Chiaroscuro • Caustics", pal: ["#0B0908", "#D97706", "#FDE68A"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-02", cat: "dark-cinematic",
    arT: "معمارية الصمت فوق الماء الأسود", enT: "Architecture of Silence on Black Water",
    arC: "مشهد سريالي صامت يجسد العزلة الفكرية عبر بوابة هندسية تطفو فوق بحيرة زئبقية سوداء.",
    enC: "A silent surrealist tableau embodying solitude through a geometric portal floating on black mercury water.",
    prompt: "A solitary figure wearing a flowing [VAR1] standing before a levitating brutalist ring made of fractured basalt and [VAR2], hovering above an infinite mirror-still black mercury lake, heavy moody fog, single vertical beam of cold moonlight piercing the clouds, 35mm anamorphic lens, Roger Deakins cinematography, " + CAM_TAIL,
    v1: ["رداء الشخصية", "Figure Attire", "charcoal matte silk cloak"],
    v2: ["معدن البوابة", "Portal Accent", "veins of glowing bioluminescent gold"],
    cam: "35mm Anamorphic • Volumetric Fog", pal: ["#090D16", "#334155", "#E2E8F0"], tools: ["midjourney", "flux"]
  },
  {
    id: "p-03", cat: "dark-cinematic",
    arT: "تشريح الوقت الميكانيكي", enT: "Anatomy of Mechanical Time",
    arC: "بورتريه سينمائي مظلم يدمج الملامح البشرية مع تروس الساعات السويسرية الدقيقة والضوء الخافت.",
    enC: "Dark cinematic portrait fusing human expression with intricate Swiss horology gears and moody lighting.",
    prompt: "Hyper-realistic side-profile portrait of a statue carved from [VAR1], its temple and cranium smoothly opening to reveal an intricate celestial clockwork mechanism of [VAR2], fine golden dust motes floating in a single shaft of dramatic Rembrandt lighting, pitch-black studio background, 100mm macro f/2.8, " + CAM_TAIL,
    v1: ["خامة التمثال", "Statue Material", "cracked matte black porcelain"],
    v2: ["الآلية الداخلية", "Inner Mechanism", "spinning tourbillon brass gears and glowing optical fibers"],
    cam: "100mm Macro • Rembrandt Light", pal: ["#0A0A0A", "#B45309", "#F59E0B"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-04", cat: "dark-cinematic",
    arT: "أوركسترا الدخان والزجاج المحطم", enT: "Symphony of Smoke and Shattered Glass",
    arC: "تجميد لحظة انفجار صوتي بصرياً عبر تداخل الدخان الكثيف مع شظايا الكريستال المعلقة بالهواء.",
    enC: "Freezing an acoustic explosion visually through dense smoke intertwining with levitating crystal shards.",
    prompt: "High-speed phantom flex 4k capture of a [VAR1] dissolving into swirling sculptural plumes of [VAR2] and thousands of razor-sharp refractive prism shards suspended in zero gravity, dramatic dual-tone rim lighting in deep crimson and icy cyan, ultra-sharp optical focus, " + CAM_TAIL,
    v1: ["العنصر المتشظي", "Shattering Object", "classical grand cello made of smoked glass"],
    v2: ["نوع الدخان", "Smoke Texture", "velvety obsidian ink smoke"],
    cam: "Phantom High-Speed • Dual Rim", pal: ["#111827", "#DC2626", "#06B6D4"], tools: ["midjourney", "krea-ai"]
  },
  {
    id: "p-05", cat: "dark-cinematic",
    arT: "المكتبة الغارقة تحت الجليد الكوني", enT: "Submerged Library Under Cosmic Ice",
    arC: "قاعة معرفة أثرية مغمورة تحت طبقة جليدية شفافة تعكس سديماً فضائياً في الأعلى.",
    enC: "An ancient hall of knowledge submerged beneath translucent ice reflecting a cosmic nebula above.",
    prompt: "Wide cinematic low-angle shot of an infinite subterranean library carved from [VAR1], submerged under crystal-clear dark water with a frozen ceiling looking up into a [VAR2], glowing parchment manuscripts floating gently like jellyfish, god rays penetrating the ice, 24mm tilt-shift lens, " + CAM_TAIL,
    v1: ["حجر المكتبة", "Library Stone", "wet carved volcanic basalt"],
    v2: ["السماء العلوية", "Overhead Sky", "violet and emerald deep-space nebula"],
    cam: "24mm Tilt-Shift • Underwater Caustics", pal: ["#06101E", "#6D28D9", "#10B981"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-06", cat: "dark-cinematic",
    arT: "الازدواجية خلف المرآة السائلة", enT: "Duality Behind the Liquid Mirror",
    arC: "تعبير بصري عن الصراع الداخلي عبر مرآة عمودية من المعدن السائل تفصل بين عالمين متناقضين.",
    enC: "Visualizing inner conflict through a vertical liquid-metal mirror separating two contrasting realities.",
    prompt: "Surreal psychological cinema shot of a vertical rippling mirror of [VAR1] standing in a desolate salt flat at twilight, one side reflecting a stormy monochrome wasteland while the other side emanates [VAR2], ripples frozen at the center touchpoint, 50mm Summilux f/1.2 lens, " + CAM_TAIL,
    v1: ["مادة المرآة", "Mirror Material", "liquid chrome mercury"],
    v2: ["العالم المقابل", "Opposite World", "a warm golden bioluminescent sanctuary"],
    cam: "50mm f/1.2 • Split Reality", pal: ["#0F172A", "#94A3B8", "#FBBF24"], tools: ["midjourney", "flux"]
  },
  {
    id: "p-07", cat: "dark-cinematic",
    arT: "عرش الألياف الضوئية في الكهف المطير", enT: "Fiber-Optic Throne in the Rain Cavern",
    arC: "تباين حاد بين الطبيعة الصخرية القاسية والتكنولوجيا الضوئية الدقيقة تحت مطر سينمائي.",
    enC: "Stark contrast between raw geological brutality and delicate optical technology under cinematic rain.",
    prompt: "A monumental monolithic chair hewn from raw [VAR1] inside a colossal wet cavern, thousands of glowing [VAR2] cascading down like roots from the ceiling into shallow black puddles, heavy atmospheric rain droplets caught in backlight, Denis Villeneuve visual style, 28mm wide lens, " + CAM_TAIL,
    v1: ["مادة العرش", "Throne Material", "layered dark slate and oxidized iron"],
    v2: ["الخيوط الضوئية", "Luminous Strands", "warm amber fiber-optic filaments"],
    cam: "28mm Wide • Villeneuve Mood", pal: ["#090A0F", "#78350F", "#F59E0B"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-08", cat: "dark-cinematic",
    arT: "كسوف الشمس داخل قاعة المرايا", enT: "Solar Eclipse Inside the Hall of Mirrors",
    arC: "احتجاز ظاهرة فلكية مهيبة داخل فضاء معماري مغلق مليء بالانعكاسات اللانهائية.",
    enC: "Capturing a celestial phenomenon inside an enclosed architectural space of infinite reflections.",
    prompt: "A miniature artificial [VAR1] levitating in the exact center of an octagonal grand hall lined with [VAR2], casting dramatic coronal light rings and infinite recursive reflections into the dark abyss, suspended dust particles, intense dynamic range HDR, 35mm f/1.8 lens, " + CAM_TAIL,
    v1: ["الظاهرة المركزية", "Central Phenomenon", "total solar eclipse with a blazing diamond-ring corona"],
    v2: ["جدران القاعة", "Hall Walls", "tall smoked-bronze antique mirrors"],
    cam: "35mm HDR • Infinite Reflections", pal: ["#050505", "#EA580C", "#FEF3C7"], tools: ["midjourney", "krea-ai"]
  },
  {
    id: "p-09", cat: "dark-cinematic",
    arT: "رسائل تحترق تحت الماء", enT: "Letters Burning Underwater",
    arC: "تحدي قوانين الفيزياء عبر جمالية النار المشتعلة ببطء داخل أعماق المحيط المظلم.",
    enC: "Defying physics through the poetic aesthetics of slow-burning embers deep underwater.",
    prompt: "Macro cinematic shot of ancient [VAR1] gracefully floating in deep midnight-blue ocean water while glowing with [VAR2] along their edges, tiny silvery oxygen micro-bubbles rising alongside glowing ash, dramatic spotlight from above, 90mm macro lens, " + CAM_TAIL,
    v1: ["العنصر العائم", "Floating Subject", "calligraphic scrolls written in metallic ink"],
    v2: ["تأثير الاشتعال", "Combustion Effect", "weightless incandescent golden embers that never extinguish"],
    cam: "90mm Macro • Sub-Aquatic Ember", pal: ["#040B16", "#1E3A8A", "#F97316"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-10", cat: "dark-cinematic",
    arT: "رقصة الجاذبية المعكوسة", enT: "Inverted Gravity Nocturne",
    arC: "مشهد ليلي شاعري تتساقط فيه قطرات المطر للأعلى نحو سماء مرصعة بالهندسة الضوئية.",
    enC: "A poetic nocturnal scene where rain falls upward toward a geometrically illuminated sky.",
    prompt: "Cinematic street-level night shot of a deserted cobblestone courtyard in [VAR1], where thousands of luminous [VAR2] are rising upward from the ground toward the dark sky in inverted gravity, crisp puddle reflections, moody teal and amber color grading, 50mm anamorphic lens with subtle horizontal flare, " + CAM_TAIL,
    v1: ["طراز المكان", "Courtyard Style", "neo-noir rainy Prague"],
    v2: ["العناصر الصاعدة", "Rising Elements", "liquid silver raindrops and glowing lanterns"],
    cam: "50mm Anamorphic • Inverted Physics", pal: ["#0B132B", "#1C2541", "#F59E0B"], tools: ["midjourney", "flux"]
  },

  // === 2. CHRONO-ARCHITECTURE (p-11 to p-20) ===
  {
    id: "p-11", cat: "chrono-architecture",
    arT: "زقورة بابل البارامترية 2099", enT: "Parametric Ziggurat of Babylon 2099",
    arC: "إعادة إحياء عمارة وادي الرافدين العريقة بخطوط انسيابية مستقبلية وزجاج ضوئي ذكي.",
    enC: "Reimagining ancient Mesopotamian monumental architecture with futuristic fluid parametric lines.",
    prompt: "Monumental architectural photography of a futuristic Mesopotamian Ziggurat crafted from [VAR1] and [VAR2], fluid Zaha Hadid parametric terraces interwoven with geometric cuneiform reliefs, cantilevered hanging gardens with bioluminescent flora, golden hour desert dust atmosphere, 17mm tilt-shift architectural lens, " + CAM_TAIL,
    v1: ["المادة الأساسية", "Primary Material", "glazed lapis-lazuli ceramic panels"],
    v2: ["المادة الرديفة", "Secondary Material", "brushed champagne-gold titanium ribs"],
    cam: "17mm Tilt-Shift • Golden Hour", pal: ["#1E3A8A", "#D97706", "#FEF3C7"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-12", cat: "chrono-architecture",
    arT: "قصر المشربية البلوري العائم", enT: "Floating Crystalline Mashrabiya Pavilion",
    arC: "توظيف هندسة المشربيات العربية في تشتيت أشعة الشمس داخل جناح معماري يطفو فوق السحاب.",
    enC: "Utilizing Arabic Mashrabiya lattice geometry to diffract sunlight inside a cloud-floating pavilion.",
    prompt: "Interior architectural masterwork of a serene sanctuary enclosed by a giant parametric dome of [VAR1], casting intricate sacred geometric light patterns across a floor of [VAR2], overlooking a sea of soft golden clouds outside, natural sunbeams, 24mm f/4 architectural lens, " + CAM_TAIL,
    v1: ["مادة القبة", "Dome Material", "3D-printed translucent aerogel Mashrabiya lattice"],
    v2: ["أرضية القاعة", "Floor Material", "polished white onyx with shallow reflecting pools"],
    cam: "24mm f/4 • Geometric Caustics", pal: ["#F8FAFC", "#D97706", "#0F172A"], tools: ["midjourney", "flux"]
  },
  {
    id: "p-13", cat: "chrono-architecture",
    arT: "واحة المكتبة المعلقة في وادي الصخور", enT: "Cantilevered Cliff Oasis Sanctuary",
    arC: "مبنى مستقبلي يخرج من قلب جبل صخري شاهق بانسيابية تحترم تضاريس الطبيعة.",
    enC: "A futuristic structure emerging seamlessly from a sheer desert canyon cliffside.",
    prompt: "Dusk architectural exterior shot of a multi-level [VAR1] cantilevered dramatically out of a towering red sandstone canyon cliff, curved [VAR2] glowing warmly from within, infinity waterfalls cascading into the desert valley below, twilight purple sky, 21mm wide-angle lens, " + CAM_TAIL,
    v1: ["نوع المبنى", "Building Type", "futuristic research conservatory and library"],
    v2: ["الواجهات", "Facade Style", "electrochromic curved glass and rammed earth fins"],
    cam: "21mm Wide • Twilight Blue Hour", pal: ["#431407", "#EA580C", "#38BDF8"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-14", cat: "chrono-architecture",
    arT: "محطة قطار الأندلس الفضائية", enT: "Neo-Andalusian Orbital Transit Hub",
    arC: "دمج الأقواس الأندلسية المتداخلة والمقرنصات مع هياكل المحطات الفضائية العملاقة.",
    enC: "Fusing interlocking Andalusian arches and Muqarnas vaults with orbital space-station engineering.",
    prompt: "Soaring interior perspective of a grand transit concourse combining [VAR1] with [VAR2], sunlit gardens beneath a transparent geodesic ceiling showing Earth's curvature on the horizon, sleek maglev trains arriving silently, ultra-clean architectural render, 16mm rectilinear lens, " + CAM_TAIL,
    v1: ["العنصر التراثي", "Heritage Element", "Alhambra-inspired fractal Muqarnas vaults"],
    v2: ["العنصر المستقبلي", "Futuristic Element", "white carbon-fiber structural arches and holographic wayfinding"],
    cam: "16mm Rectilinear • Orbital Light", pal: ["#0F172A", "#E2E8F0", "#F59E0B"], tools: ["midjourney", "ideogram"]
  },
  {
    id: "p-15", cat: "chrono-architecture",
    arT: "البرج الحلزوني الحيوي في طوكيو القديمة", enT: "Biophilic Edo Helix Tower",
    arC: "تزاوج نجارة الخشب اليابانية التقليدية (بدون مسامير) مع ناطحات السحاب البيئية الذكية.",
    enC: "Marrying traditional Japanese timber joinery with high-altitude biophilic skyscraper design.",
    prompt: "Architectural telephoto shot of a spiraling supertall tower constructed from [VAR1] and [VAR2], wrapped in cascading vertical terraced forests and mist-shrouded sky bridges, rising above traditional tiled roofs at sunrise, crisp morning fog, 70mm f/2.8 lens, " + CAM_TAIL,
    v1: ["الهيكل الخشبي", "Timber Structure", "interlocking charred cedar Kigumi joinery"],
    v2: ["التقنية المدمجة", "Integrated Tech", "self-healing solar glass facades"],
    cam: "70mm Telephoto • Morning Mist", pal: ["#14532D", "#78350F", "#FDE047"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-16", cat: "chrono-architecture",
    arT: "متحف الصوت المنحوت بالرياح", enT: "Wind-Carved Acoustic Desert Museum",
    arC: "عمارة عضوية صُممت وكأن رياح الصحراء نحتتها عبر آلاف السنين لتعزف ألحاناً عند هبوب الهواء.",
    enC: "Organic architecture shaped as if sculpted by desert winds over millennia to resonate acoustically.",
    prompt: "Minimalist architectural photography of a monolithic museum in the Arabian desert shaped like [VAR1], built from [VAR2] with aerodynamic acoustic flutes that channel wind and sunlight into the interior galleries, long dramatic afternoon shadows, 35mm medium format lens, " + CAM_TAIL,
    v1: ["الشكل الهندسي", "Geometric Form", "interlocking wind-swept sand dunes and soundwaves"],
    v2: ["خامة البناء", "Construction Material", "3D-printed desert sand concrete and weathered brass"],
    cam: "35mm Medium Format • Desert Sun", pal: ["#78350F", "#D97706", "#FFFBEB"], tools: ["midjourney", "flux"]
  },
  {
    id: "p-17", cat: "chrono-architecture",
    arT: "المدرج الروماني المغمور بالضوء الكمي", enT: "Quantum-Lit sunken Amphitheater",
    arC: "إعادة ابتكار المسارح الكلاسيكية المدرجة تحت سطح البحر مع قبة مائية شفافة.",
    enC: "Reinventing classical stepped amphitheaters beneath the ocean surface under a refractive water dome.",
    prompt: "Symmetrical wide shot of a circular stepped amphitheater built from [VAR1], recessed into the ocean floor beneath a hemispherical dome of [VAR2], manta rays gliding overhead casting dappled aquatic caustics across a floating holographic stage, 20mm lens, " + CAM_TAIL,
    v1: ["مادة المدرجات", "Terrace Material", "veined Carrara marble with embedded warm LED strips"],
    v2: ["سقف القبة", "Dome Ceiling", "ultra-thick refractive sapphire glass holding back the sea"],
    cam: "20mm Symmetrical • Aquatic Caustics", pal: ["#082F49", "#0284C7", "#F8FAFC"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-18", cat: "chrono-architecture",
    arT: "جسر الخط العربي المعلق بين قمتين", enT: "Calligraphic Suspension Bridge Across Peaks",
    arC: "جسر معماري عملاق يستمد انحناءاته الإنشائية الحاملة من انسيابية حروف الخط العربي.",
    enC: "A megastructure bridge whose load-bearing structural curves are derived from Arabic calligraphy.",
    prompt: "Epic aerial architectural photograph of a pedestrian suspension bridge spanning two misty mountain peaks, its structural arches sculpted in the fluid form of [VAR1] forged from [VAR2], illuminated walkways suspended over a cloud inversion at sunset, 24mm drone perspective, " + CAM_TAIL,
    v1: ["التشكيل الهندسي", "Structural Form", "three-dimensional Thuluth Arabic calligraphy ribbons"],
    v2: ["معدن الجسر", "Bridge Metal", "matte pearl-white steel and glowing gold cables"],
    cam: "24mm Aerial • Cloud Inversion", pal: ["#1E1B4B", "#F59E0B", "#F8FAFC"], tools: ["midjourney", "ideogram"]
  },
  {
    id: "p-19", cat: "chrono-architecture",
    arT: "معبد الطاقة الشمسية القطبي", enT: "Arctic Aurora Geothermal Sanctuary",
    arC: "ملاذ معماري دافئ من الكريستال الحراري يتوهج وسط ثلوج القطب الشمالي تحت الشفق القطبي.",
    enC: "A thermal crystalline sanctuary glowing amidst Arctic snowfields beneath the Aurora Borealis.",
    prompt: "Nighttime architectural shot of a geometric pavilion made of [VAR1] nestled in an untouched snowfield, steaming geothermal pools surrounding the entrance with [VAR2], vibrant green and violet aurora borealis dancing across the starry sky, 24mm f/1.4 astrophotography lens, " + CAM_TAIL,
    v1: ["هيكل الجناح", "Pavilion Structure", "faceted prism glass and dark Nordic pine"],
    v2: ["الإضاءة الداخلية", "Interior Glow", "warm hearth-fire amber illumination"],
    cam: "24mm f/1.4 • Aurora Night", pal: ["#022C22", "#10B981", "#F59E0B"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-20", cat: "chrono-architecture",
    arT: "حديقة الأعمدة المغناطيسية المعلقة", enT: "Levitating Magnetic Colonnade Courtyard",
    arC: "فناء تاريخي مهيب تنفصل فيه تيجان الأعمدة لترتفع في الهواء بفعل حقول مغناطيسية فائقة.",
    enC: "A majestic courtyard where classical column capitals levitate via superconducting magnetic fields.",
    prompt: "Architectural perspective of a serene courtyard surrounded by colonnades of [VAR1], where the upper segments of each column levitate two meters in mid-air stabilized by [VAR2], a mirror-flat courtyard pool reflecting the impossible geometry, soft diffused overcast light, 35mm lens, " + CAM_TAIL,
    v1: ["طراز الأعمدة", "Column Style", "fluted black obsidian Corinthian columns"],
    v2: ["الطاقة المرئية", "Visible Energy", "subtle shimmering rings of golden magnetic plasma"],
    cam: "35mm Architectural • Levitation", pal: ["#18181B", "#A1A1AA", "#EAB308"], tools: ["midjourney", "flux"]
  },

  // === 3. IMPOSSIBLE COMMERCIAL (p-21 to p-30) ===
  {
    id: "p-21", cat: "impossible-commercial",
    arT: "عطر منحوت من الموجات الصوتية المتجمدة", enT: "Perfume Sculpted from Frozen Soundwaves",
    arC: "لقطة إعلانية فاخرة لزجاجة عطر تتشكل حولها ترددات الصوت كحلقات من الذهب السائل والزجاج.",
    enC: "Luxury commercial shot of a perfume flacon surrounded by acoustic frequencies frozen as liquid gold.",
    prompt: "High-end luxury product photography of a [VAR1] levitating at the epicenter of concentric cymatic soundwave rings made of [VAR2], micro-droplets of fragrant mist suspended in mid-air, razor-sharp studio rim lighting, dark textured slate backdrop, 100mm f/2.8 macro lens, " + CAM_TAIL,
    v1: ["تصميم الزجاجة", "Bottle Design", "faceted smoked-crystal perfume flacon with a minimal gold cap"],
    v2: ["المحيط المتجمد", "Frozen Aura", "rippling 24k liquid gold and translucent rose petals"],
    cam: "100mm Macro • Studio Rim Light", pal: ["#09090B", "#CA8A04", "#F43F5E"], tools: ["midjourney", "krea-ai"]
  },
  {
    id: "p-22", cat: "impossible-commercial",
    arT: "ساعة ميكانيكية تولد من انفجار نجمي", enT: "Chronograph Forged in a Supernova",
    arC: "تصوير إعلاني لساعة فاخرة تخرج تروسها وعقاربها من سحابة غبار كوني ومعادن منصهرة.",
    enC: "Hero commercial shot of a luxury timepiece assembling itself from cosmic stardust and molten alloy.",
    prompt: "Ultra-crisp commercial macro shot of a luxury skeleton mechanical watch crafted from [VAR1], floating at a 45-degree angle as its sapphire bezel emerges from a swirling vortex of [VAR2], anti-reflective coating glint, dramatic specular highlights, 90mm tilt-shift macro lens, " + CAM_TAIL,
    v1: ["معدن الساعة", "Watch Alloy", "forged carbon fiber and brushed rose gold"],
    v2: ["التأثير المحيط", "Surrounding Effect", "incandescent cosmic nebula dust and micro-meteorite sparks"],
    cam: "90mm Macro • Specular Hero", pal: ["#0F172A", "#D97706", "#38BDF8"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-23", cat: "impossible-commercial",
    arT: "حذاء رياضي يركض فوق البرق المتجمد", enT: "Sneaker Sprinting on Solidified Lightning",
    arC: "إعلان رياضي ديناميكي يحول طاقة الحركة والسرعة إلى مسار بلوري مضيء تحت الحذاء.",
    enC: "Dynamic sportswear campaign turning kinetic velocity into a solidified luminous lightning track.",
    prompt: "Dynamic commercial hero shot of a futuristic [VAR1] captured mid-stride, stepping onto a solid branching bolt of [VAR2] that shatters into glowing kinetic prisms on impact, dramatic dark storm studio background, high-speed strobe lighting, 50mm f/2 lens, " + CAM_TAIL,
    v1: ["تصميم الحذاء", "Sneaker Design", "aerodynamic knit runner with translucent air-sole"],
    v2: ["مسار الطاقة", "Energy Track", "crystallized electric cyan lightning"],
    cam: "50mm Strobe • Kinetic Freeze", pal: ["#020617", "#06B6D4", "#F8FAFC"], tools: ["midjourney", "flux"]
  },
  {
    id: "p-24", cat: "impossible-commercial",
    arT: "قهوة مختصة تتحدى الجاذبية في الفضاء", enT: "Zero-Gravity Artisanal Espresso Crema",
    arC: "تصوير مشروبات احترافي تتلاقى فيه كرات الإسبريسو الكثيفة مع الحليب الحريري في انعدام الجاذبية.",
    enC: "Beverage photography where rich espresso spheres collide with silky milk ribbons in zero gravity.",
    prompt: "High-speed commercial food photography of a minimalist [VAR1] as ribbons of rich tiger-striped espresso crema and [VAR2] spiral upwards out of the cup in zero gravity, roasted coffee beans orbiting the liquid helix, warm bronzed studio key light, 85mm macro lens, " + CAM_TAIL,
    v1: ["نوع الكوب", "Cup Style", "matte black ceramic artisanal espresso cup"],
    v2: ["المكون المضاف", "Swirling Element", "velvety micro-foam milk and golden caramel droplets"],
    cam: "85mm Macro • High-Speed Liquid", pal: ["#1C1917", "#92400E", "#FDE68A"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-25", cat: "impossible-commercial",
    arT: "سماعات رأس محاطة بهالة هولوغرافية صوتية", enT: "Headphones Wrapped in Acoustic Holography",
    arC: "إبراز نقاء الصوت العالي عبر موجات لونية حريرية تخرج من السماعة في إضاءة استوديو داكنة.",
    enC: "Visualizing lossless audio fidelity through silk-like iridescent waves radiating from headphones.",
    prompt: "Sleek product photography of flagship over-ear headphones made of [VAR1] floating in a dark anechoic studio, emitting tangible translucent ribbons of [VAR2] that ripple outward in harmonic geometric waves, crisp edge lighting, 85mm f/1.8 lens, " + CAM_TAIL,
    v1: ["خامة السماعة", "Headphone Material", "anodized midnight aluminum and stitched lambskin"],
    v2: ["الموجات المرئية", "Visible Waves", "iridescent liquid silk light in violet and gold"],
    cam: "85mm f/1.8 • Anechoic Studio", pal: ["#090D16", "#8B5CF6", "#F59E0B"], tools: ["midjourney", "krea-ai"]
  },
  {
    id: "p-26", cat: "impossible-commercial",
    arT: "سيارة خارقة تتشكل من نفق الرياح الضوئي", enT: "Hypercar Sculpted by Photonic Wind Tunnel",
    arC: "دمج هندسة الديناميكا الهوائية مع التصميم الصناعي عبر خطوط ضوء تنحت هيكل السيارة.",
    enC: "Merging aerodynamics with industrial design as photonic streamlines sculpt a hypercar silhouette.",
    prompt: "Automotive commercial photography of a sleek [VAR1] inside a pitch-black wind tunnel, where glowing streamlines of [VAR2] flow smoothly over the bodywork, revealing its aerodynamic downforce curves, wet asphalt floor reflection, 35mm automotive rig lens, " + CAM_TAIL,
    v1: ["طراز السيارة", "Car Silhouette", "matte gunmetal electric Le Mans hypercar"],
    v2: ["خطوط الهواء", "Airflow Lines", "laser-thin neon orange and white laminar light trails"],
    cam: "35mm Automotive • Wind Tunnel", pal: ["#09090B", "#EA580C", "#E2E8F0"], tools: ["midjourney", "flux"]
  },
  {
    id: "p-27", cat: "impossible-commercial",
    arT: "إكسير العناية بالبشرة داخل زهرة جليدية", enT: "Botanical Serum Inside a Cryo-Crystal Bloom",
    arC: "لقطة تجميلية فائقة النقاء تجمع بين العلم الدقيق والطبيعة عبر تجميد الزهور في الكريستال.",
    enC: "Ultra-pure cosmetic campaign merging clinical science and nature by encasing flora in ice crystal.",
    prompt: "Luxury skincare commercial shot of a dropper bottle made of [VAR1] resting inside a blooming flower sculpted entirely from [VAR2], a single glowing golden serum drop hanging from the glass pipette, bright clean clinical backlight with rainbow prism refractions, 100mm macro, " + CAM_TAIL,
    v1: ["زجاجة السيروم", "Serum Bottle", "frosted emerald laboratory glass with platinum dropper"],
    v2: ["الزهرة المحيطة", "Surrounding Bloom", "crystal-clear melting botanical ice"],
    cam: "100mm Macro • Prism Backlight", pal: ["#064E3B", "#6EE7B7", "#F8FAFC"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-28", cat: "impossible-commercial",
    arT: "نظارة مستقبلية تعكس مدينة سيبرانية", enT: "Avant-Garde Eyewear Reflecting Cyber Horizon",
    arC: "تصوير إكسسوارات أزياء يركز على انعكاس عالم كامل داخل عدسات منحوتة بدقة هندسية.",
    enC: "High-fashion eyewear shot focusing on a complete world reflected across precision-cut lenses.",
    prompt: "Editorial product close-up of avant-garde rimless sunglasses crafted from [VAR1] resting on a block of [VAR2], the curved mirrored lenses reflecting a breathtaking panoramic sunset skyline, razor-sharp caustics and shadow play, 90mm macro lens, " + CAM_TAIL,
    v1: ["مادة العدسات والإطار", "Frame & Lens", "dichroic titanium and single-piece sculpted ruby crystal"],
    v2: ["قاعدة العرض", "Display Pedestal", "raw volcanic obsidian rock"],
    cam: "90mm Macro • Dichroic Reflection", pal: ["#18181B", "#E11D48", "#FBBF24"], tools: ["midjourney", "krea-ai"]
  },
  {
    id: "p-29", cat: "impossible-commercial",
    arT: "عصير فواكه استوائي ينفجر من بلورة هندسية", enT: "Tropical Nectar Erupting from Geometric Prism",
    arC: "تباين بصري مدهش بين الصرامة الهندسية للكريستال والانفجار الحيوي الطازج للسوائل والفواكه.",
    enC: "Striking visual contrast between rigid crystal geometry and a fresh organic splash of fruit nectar.",
    prompt: "High-speed commercial beverage shot of a levitating geometric icosahedron prism made of [VAR1] cracking open in mid-air to release a vibrant splash of [VAR2], dewy condensation droplets, sunlit tropical studio lighting, 85mm f/2.8 high-speed sync, " + CAM_TAIL,
    v1: ["البلورة الخارجية", "Outer Prism", "ultra-clear refractive quartz glass"],
    v2: ["الانفجار الداخلي", "Inner Splash", "fresh mango nectar, passionfruit seeds, and crushed mint leaves"],
    cam: "85mm High-Speed • Organic Splash", pal: ["#065F46", "#F59E0B", "#FEF08A"], tools: ["midjourney", "flux"]
  },
  {
    id: "p-30", cat: "impossible-commercial",
    arT: "حقيبة فاخرة منسوجة من خيوط الضوء والجلد", enT: "Couture Handbag Woven from Photons and Leather",
    arC: "تصوير أزياء راقية يظهر عملية حياكة الحقيبة في الهواء من خيوط ذهبية مضيئة وجلد طبيعي.",
    enC: "Haute couture campaign showing a luxury bag being woven in mid-air from luminous golden threads.",
    prompt: "Haute couture commercial photography of a structured luxury handbag crafted from [VAR1], suspended on an invisible pedestal as glowing threads of [VAR2] actively weave its geometric clasp in mid-air, soft museum spotlighting, rich dark velvet shadows, 85mm lens, " + CAM_TAIL,
    v1: ["خامة الحقيبة", "Bag Material", "deep burgundy grained calfskin leather"],
    v2: ["خيوط الحياكة", "Weaving Threads", "spun 24k gold light filaments"],
    cam: "85mm Couture • Museum Spotlight", pal: ["#450A0A", "#D97706", "#FDE68A"], tools: ["midjourney", "leonardo-ai"]
  },

  // === 4. MICRO-WORLDS (p-31 to p-40) ===
  {
    id: "p-31", cat: "micro-worlds",
    arT: "مرصد فلكي داخل ساعة جيب سويسرية", enT: "Astronomical Observatory Inside a Pocket Watch",
    arC: "عالم مجهري متكامل يحول تروس الساعة الذهبية إلى قبة مرصد فلكي يراقب المجرات.",
    enC: "A complete miniature world transforming golden watch gears into a working astronomical observatory.",
    prompt: "Isometric macro cutaway shot of an antique open pocket watch made of [VAR1], inside which tiny brass staircases, rotating gear balconies, and a miniature [VAR2] are built seamlessly into the mechanical movement, glowing starlight projection, tilt-shift 100mm macro lens, " + CAM_TAIL,
    v1: ["معدن الساعة", "Watch Case", "engraved 18k rose gold and sapphire crystal"],
    v2: ["العالم الداخلي", "Miniature World", "celestial planetarium dome with tiny astronomers"],
    cam: "100mm Macro • Isometric Cutaway", pal: ["#1E1B4B", "#D97706", "#FEF3C7"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-32", cat: "micro-worlds",
    arT: "مدينة مستقبلية داخل شريحة معالج بلورية", enT: "Metropolis Inside a Silicon Quantum Chip",
    arC: "تحويل المسارات الإلكترونية الدقيقة في المعالج إلى شوارع وأبراج مدينة مضيئة.",
    enC: "Transforming microscopic semiconductor pathways into the glowing avenues and towers of a metropolis.",
    prompt: "Extreme macro tilt-shift photography of a translucent [VAR1], where the microscopic gold circuit traces rise vertically into [VAR2], tiny pulses of data traveling like traffic along fiber-optic highways, depth-of-field bokeh, 120mm macro lens, " + CAM_TAIL,
    v1: ["نوع الشريحة", "Chip Base", "quantum silicon processor wafer"],
    v2: ["المعالم المصغرة", "Micro Structures", "crystalline skyscrapers and cooling-tower waterfalls"],
    cam: "120mm Macro • Circuit Metropolis", pal: ["#042F2E", "#14B8A6", "#F59E0B"], tools: ["midjourney", "flux"]
  },
  {
    id: "p-33", cat: "micro-worlds",
    arT: "غابة استوائية ممطرة داخل لمبة زجاجية قديمة", enT: "Bioluminescent Rainforest Inside an Edison Bulb",
    arC: "نظام بيئي حي متكامل ينمو حول سلك التنجستن المضيء داخل زجاجة مصباح كلاسيكي.",
    enC: "A self-contained living ecosystem thriving around the warm tungsten filament of a vintage bulb.",
    prompt: "Macro studio shot of a vintage glass Edison lightbulb resting on dark oak, containing a lush miniature [VAR1] growing around the warm glowing tungsten filament like a sun, tiny [VAR2] cascading down the inner glass wall, condensation micro-drops, 85mm macro, " + CAM_TAIL,
    v1: ["البيئة الداخلية", "Inner Biome", "misty terraced rainforest with bioluminescent ferns"],
    v2: ["التفاصيل المائية", "Water Detail", "crystal-clear miniature waterfalls"],
    cam: "85mm Macro • Terrarium Light", pal: ["#064E3B", "#F59E0B", "#ECFDF5"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-34", cat: "micro-worlds",
    arT: "قلعة جبلية منحوتة على رأس قلم رصاص", enT: "Citadel Carved into a Graphite Pencil Tip",
    arC: "فن النحت المجهري المستحيل على معدن الجرافيت الأسود بدقة هندسية وإضاءة درامية.",
    enC: "Impossible micro-sculpture carved directly into black pencil graphite with dramatic rim lighting.",
    prompt: "Extreme microscope-level macro photography of the tip of a [VAR1], intricately micro-carved into a multi-tiered [VAR2] complete with spiral stairs, tiny arched bridges, and warm glowing windows, shallow depth of field, dramatic side rim light, " + CAM_TAIL,
    v1: ["أداة الرسم", "Drawing Tool", "cedarwood artist pencil with dark metallic graphite core"],
    v2: ["المنحوتة الدقيقة", "Micro Sculpture", "ancient cliffside library citadel"],
    cam: "Micro-Lens • Graphite Sculpture", pal: ["#18181B", "#71717A", "#FBBF24"], tools: ["midjourney", "krea-ai"]
  },
  {
    id: "p-35", cat: "micro-worlds",
    arT: "مختبر كيميائي داخل حبة قهوة محمصة", enT: "Alchemist Roastery Inside a Coffee Bean",
    arC: "مقطع عرضي ساحر لحبة قهوة يكشف عن مصنع ومختبر مصغر لاستخلاص النكهة الذهبية.",
    enC: "Enchanting cross-section of a coffee bean revealing a miniature brass alchemy roastery inside.",
    prompt: "Cross-section cutaway macro shot of a single giant [VAR1], split open to reveal a bustling multi-level miniature [VAR2] with tiny copper distillation pipes, glowing warm furnaces, and golden espresso streams, rich aromatic steam, 90mm macro lens, " + CAM_TAIL,
    v1: ["الغلاف الخارجي", "Outer Shell", "dark-roasted Arabica coffee bean"],
    v2: ["المعمل الداخلي", "Inner Workshop", "steampunk brass alchemy roastery lab"],
    cam: "90mm Cutaway • Warm Steam", pal: ["#271206", "#B45309", "#FDE68A"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-36", cat: "micro-worlds",
    arT: "أطلال حضارة مفقودة في قاع فنجان شاي", enT: "Sunken Temple Ruins Inside a Porcelain Teacup",
    arC: "النظر من الأعلى داخل فنجان شاي صيني لترى معبداً غارقاً تحت تموجات الشاي الذهبي.",
    enC: "Looking down into a fine porcelain teacup to discover sunken temple ruins beneath amber tea.",
    prompt: "Top-down macro perspective looking into a fine [VAR1] filled with crystal-clear amber oolong tea, revealing miniature [VAR2] submerged at the bottom of the cup, tiny glowing koi fish swimming between carved pillars, soft natural window light, 85mm macro, " + CAM_TAIL,
    v1: ["نوع الفنجان", "Teacup Style", "blue-and-white Ming dynasty porcelain teacup"],
    v2: ["المعالم الغارقة", "Submerged Scene", "ancient mossy stone temple steps and lanterns"],
    cam: "85mm Top-Down • Liquid Refraction", pal: ["#1E3A8A", "#D97706", "#F8FAFC"], tools: ["midjourney", "flux"]
  },
  {
    id: "p-37", cat: "micro-worlds",
    arT: "مسرح أوبرا ملكي داخل آلة كمان مفتوحة", enT: "Grand Opera House Inside a Stradivarius Violin",
    arC: "استغلال التجويف الخشبي الدافئ لآلة الكمان لبناء قاعة موسيقية مصغرة مضاءة بالثريات.",
    enC: "Transforming the resonant wooden chamber of a violin into a chandelier-lit miniature concert hall.",
    prompt: "Architectural cutaway macro shot inside the hollow body of a [VAR1], where the curved maple ribs form the tiered balconies of a miniature [VAR2], sunlight streaming through the f-holes like cathedral windows onto a tiny orchestral stage, 50mm macro probe lens, " + CAM_TAIL,
    v1: ["الآلة الموسيقية", "Instrument", "varnished antique Stradivarius violin"],
    v2: ["القاعة الداخلية", "Interior Hall", "baroque velvet and gold-leaf grand opera house"],
    cam: "Probe Lens • Cathedral Rays", pal: ["#451A03", "#D97706", "#FEF3C7"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-38", cat: "micro-worlds",
    arT: "محطة قطار جبلية تخرج من كتاب مفتوح", enT: "Alpine Railway Emerging from an Antique Grimoire",
    arC: "تحول صفحات الكتاب الورقية إلى تضاريس جبلية ثلجية وجسور يعبرها قطار مصغر.",
    enC: "Book pages folding upward into snow-dusted mountain peaks and bridges crossed by a miniature train.",
    prompt: "Magical realism macro shot of an open leather-bound [VAR1] on a wooden desk, its thick parchment pages carved and folded into [VAR2], a miniature illuminated steam train crossing a stone viaduct between the pages, glowing lantern light, 85mm tilt-shift lens, " + CAM_TAIL,
    v1: ["نوع الكتاب", "Book Style", "ancient gilded-edge encyclopedia"],
    v2: ["التضاريس المنحوتة", "Carved Terrain", "snowy Alpine mountain peaks and pine forests"],
    cam: "85mm Tilt-Shift • Paper Diorama", pal: ["#1E293B", "#D97706", "#F1F5F9"], tools: ["midjourney", "ideogram"]
  },
  {
    id: "p-39", cat: "micro-worlds",
    arT: "مصفوفة تلسكوبات داخل عدسة كاميرا سينمائية", enT: "Deep-Space Array Inside a Cinema Camera Lens",
    arC: "النظر داخل العناصر الزجاجية لعدسة كاميرا احترافية لاكتشاف مرصد فضائي متكامل بداخلها.",
    enC: "Peering into the multi-coated glass elements of a cinema lens to find a deep-space radar array.",
    prompt: "Front-facing macro cutaway into the barrel of a [VAR1], where the internal aperture blades and violet-coated glass elements house a miniature [VAR2] illuminated by holographic star maps, exquisite optical flare and reflections, 100mm macro, " + CAM_TAIL,
    v1: ["نوع العدسة", "Camera Lens", "vintage anamorphic cinema prime lens"],
    v2: ["المنشأة الداخلية", "Internal Facility", "circular deep-space radio telescope array"],
    cam: "100mm Macro • Optical Coating", pal: ["#0F172A", "#7C3AED", "#38BDF8"], tools: ["midjourney", "krea-ai"]
  },
  {
    id: "p-40", cat: "micro-worlds",
    arT: "واحة صحراوية داخل جوهرة أوبال مقطوعة", enT: "Mirage Oasis Inside a Raw Opal Geode",
    arC: "تكوين جيولوجي خام يخفي بداخله واحة مائية مصغرة تتلألأ بألوان الأوبال الطبيعية.",
    enC: "A split raw geode concealing a miniature desert oasis shimmering with natural opal fire.",
    prompt: "Macro studio shot of a split raw [VAR1], its hollow crystalline interior forming a miniature [VAR2] illuminated by the natural rainbow fire of the gemstone walls, ultra-crisp mineral textures, dark museum background, 100mm f/2.8 macro, " + CAM_TAIL,
    v1: ["نوع الحجر", "Gemstone Type", "black Australian boulder opal geode"],
    v2: ["المشهد الداخلي", "Inner Scene", "turquoise lagoon oasis with tiny golden palm trees"],
    cam: "100mm Macro • Gemstone Fire", pal: ["#090D16", "#0D9488", "#F59E0B"], tools: ["midjourney", "leonardo-ai"]
  },

  // === 5. TACTILE BRANDING & LIQUID TYPE (p-41 to p-50) ===
  {
    id: "p-41", cat: "tactile-branding",
    arT: "حرف عربي منحوت من الكروم السائل والزجاج", enT: "Arabic Monogram in Liquid Chrome and Obsidian",
    arC: "تصميم هوية بصرية ثلاثية الأبعاد تجمع بين انسيابية الزئبق السائل وفخامة الزجاج الأسود المطفي.",
    enC: "3D branding monogram combining the fluidity of liquid mercury with matte frosted obsidian glass.",
    prompt: "3D tactile branding centerpiece featuring a sculptural [VAR1] formed from [VAR2], suspended in a minimalist dark studio, razor-sharp studio softbox reflections, subtle iridescent dispersion along the edges, Cinema4D and Octane Render style, 85mm lens, " + CAM_TAIL,
    v1: ["الشكل الأساسي", "Core Symbol", "abstract calligraphic Arabic letter Ain monogram"],
    v2: ["الخامات المدمجة", "Material Fusion", "intertwining liquid mirror chrome and frosted matte obsidian glass"],
    cam: "Octane Render • Liquid Chrome", pal: ["#09090B", "#A1A1AA", "#38BDF8"], tools: ["midjourney", "ideogram"]
  },
  {
    id: "p-42", cat: "tactile-branding",
    arT: "شعار مضيء داخل مكعب إيروجيل بلوري", enT: "Bioluminescent Emblem Encased in Aerogel Cube",
    arC: "إبراز الشعارات التقنية عبر وضعها كجسم مشع داخل مكعب شبه شفاف يشتت الضوء بنعومة.",
    enC: "Showcasing tech emblems by suspending them as glowing cores inside light-diffusing aerogel cubes.",
    prompt: "Minimalist industrial design render of a chamfered cube made of [VAR1], encapsulating a floating geometric [VAR2] at its center, strong subsurface scattering creating a dreamy halo glow inside the block, dark slate surface, 90mm ortho-style lens, " + CAM_TAIL,
    v1: ["خامة المكعب", "Cube Material", "translucent smoky silica aerogel and frosted quartz"],
    v2: ["الشعار الداخلي", "Inner Emblem", "glowing molten-gold compass emblem"],
    cam: "Subsurface Scattering • Isometric", pal: ["#0F172A", "#F59E0B", "#E2E8F0"], tools: ["midjourney", "flux"]
  },
  {
    id: "p-43", cat: "tactile-branding",
    arT: "تايبوغرافي منسوج من ألياف الكربون والذهب", enT: "Typography Woven from Carbon Fiber and Gold Leaf",
    arC: "تشكيل الحروف من شرائط هندسية متداخلة تعطي إحساساً ملموساً بالقوة والفخامة الصناعية.",
    enC: "Sculpting kinetic letterforms from interlocking ribbons that convey industrial luxury and strength.",
    prompt: "Macro 3D typographic sculpture of the word [VAR1] constructed from continuous Mobius ribbons of [VAR2], dramatic top-down rim lighting highlighting the microscopic weave texture, shallow depth of field, pitch-black background, " + CAM_TAIL,
    v1: ["الكلمة أو الحرف", "Word or Letter", "'FUTURE' in bold architectural sans-serif"],
    v2: ["خامة الشرائط", "Ribbon Material", "matte forged carbon fiber lined with 24k gold leaf edges"],
    cam: "Macro Type • Forged Carbon", pal: ["#111111", "#D97706", "#71717A"], tools: ["ideogram", "midjourney"]
  },
  {
    id: "p-44", cat: "tactile-branding",
    arT: "أيقونة ثلاثية الأبعاد من السيراميك المطفي والنحاس", enT: "Tactile UI Icon in Matte Ceramic and Brushed Brass",
    arC: "تحويل أيقونات التطبيقات المسطحة إلى قطع فنية ملموسة تشبه أزرار الأجهزة الصوتية الفاخرة.",
    enC: "Elevating flat UI icons into physical industrial-design objects inspired by high-end audio gear.",
    prompt: "Tactile industrial product render of a physical 3D app icon tile crafted from [VAR1], featuring a recessed precision-milled [VAR2] with warm micro-LED edge illumination, resting on a dark acoustic felt surface, soft studio key light, 85mm macro, " + CAM_TAIL,
    v1: ["جسم الأيقونة", "Tile Body", "warm ivory matte ceramic with anodized aluminum chamfers"],
    v2: ["الرمز الوسطي", "Center Glyph", "knurled brushed-brass AI spark dial"],
    cam: "85mm Industrial • Braun Aesthetic", pal: ["#1C1917", "#D97706", "#F5F5F4"], tools: ["midjourney", "krea-ai"]
  },
  {
    id: "p-45", cat: "tactile-branding",
    arT: "حروف زجاجية محشوة بالدخان الملون السائل", enT: "Hollow Glass Letterforms Filled with Swirling Ink",
    arC: "حروف منفوخة من الزجاج المخبري النقي يتحرك بداخلها حبر حريري كثيف بألوان متباينة.",
    enC: "Hand-blown borosilicate glass letters filled with dense swirling acrylic ink in motion.",
    prompt: "High-speed studio shot of hollow 3D hand-blown borosilicate glass typography spelling [VAR1], filled inside with [VAR2] actively swirling in clear water, crisp glass refractive highlights, dark studio background, 85mm f/2.8 lens, " + CAM_TAIL,
    v1: ["الحروف الزجاجية", "Glass Letters", "'AI' in rounded tubular sculpture form"],
    v2: ["السائل الداخلي", "Internal Fluid", "bioluminescent cobalt blue and liquid gold ink clouds"],
    cam: "85mm Refractive • Ink in Glass", pal: ["#090D16", "#2563EB", "#F59E0B"], tools: ["ideogram", "midjourney"]
  },
  {
    id: "p-46", cat: "tactile-branding",
    arT: "شعار منحوت من طبقات الورق الأسود والضوء", enT: "Layered Papercut Emblem with Backlit Gold Core",
    arC: "فن القص الورقي الهندسي العميق (Paper Diorama) بطبقات متدرجة تكشف عن توهج ضوئي ساحر.",
    enC: "Architectural multi-layered dark papercut topography revealing a warm backlit core.",
    prompt: "Macro top-down shot of a 30-layer topographic contour emblem shaped like [VAR1], precision laser-cut from [VAR2], warm golden backlight radiating from the deepest central layer creating soft gradient shadows across every step, 90mm macro lens, " + CAM_TAIL,
    v1: ["شكل الشعار", "Emblem Shape", "a stylized geometric falcon wing"],
    v2: ["خامة الطبقات", "Layer Material", "textured charcoal cotton cardstock with gilt metallic edges"],
    cam: "90mm Top-Down • Layered Diorama", pal: ["#18181B", "#B45309", "#FDE68A"], tools: ["midjourney", "ideogram"]
  },
  {
    id: "p-47", cat: "tactile-branding",
    arT: "كرة الطاقة السائلة المغناطيسية (Ferrofluid)", enT: "Magnetic Ferrofluid Crown Branding Sculpture",
    arC: "تشكيل أشواك هندسية متناظرة من السائل المغناطيسي الأسود المطعم بانعكاسات قوس قزح.",
    enC: "Sculpting symmetrical geometric spikes from black magnetic ferrofluid with iridescent sheen.",
    prompt: "Macro studio photography of a levitating sphere of [VAR1] reacting to a hidden magnetic field, forming razor-sharp symmetrical harmonic spikes coated in [VAR2], suspended above a polished black marble plinth, crisp studio rim light, 100mm macro, " + CAM_TAIL,
    v1: ["المادة الأساسية", "Core Substance", "glossy black magnetic ferrofluid"],
    v2: ["الانعكاس اللوني", "Surface Sheen", "dichroic oil-slick emerald and violet iridescence"],
    cam: "100mm Macro • Ferrofluid Physics", pal: ["#09090B", "#10B981", "#8B5CF6"], tools: ["midjourney", "krea-ai"]
  },
  {
    id: "p-48", cat: "tactile-branding",
    arT: "ختم ملكي منحوت من حجر النيزك والذهب", enT: "Celestial Seal Forged from Meteorite and Gold",
    arC: "استخدام النقوش البلورية الطبيعية لحجر النيزك الحديدي (Widmanstätten) مع تطعيمات الذهب.",
    enC: "Combining natural Widmanstätten crystalline meteorite patterns with flush kintsugi gold inlays.",
    prompt: "Extreme macro product shot of a heavy circular medallion forged from [VAR1], inlaid with flush geometric [VAR2], resting at an angle on dark basalt sand, dramatic grazing side light revealing the crystalline metal grain, 100mm macro lens, " + CAM_TAIL,
    v1: ["معدن الختم", "Medallion Metal", "etched Gibeon iron meteorite with natural crystalline cross-hatching"],
    v2: ["التطعيم البارز", "Inlay Detail", "glowing 24k gold Kintsugi sacred geometry veins"],
    cam: "100mm Grazing Light • Meteorite", pal: ["#18181B", "#71717A", "#EAB308"], tools: ["midjourney", "leonardo-ai"]
  },
  {
    id: "p-49", cat: "tactile-branding",
    arT: "نسيج الحرير الرقمي المتطاير بالضوء", enT: "Iridescent Organza Silk Wave Abstract Wallpaper",
    arC: "خلفية بصرية فائقة النعومة من قماش حريري شبه شفاف يتطاير في الهواء وينكسر عبره الضوء.",
    enC: "Ultra-smooth abstract brand backdrop of translucent organza silk flowing in mid-air.",
    prompt: "Abstract 3D luxury wallpaper of flowing weightless [VAR1] billowing gracefully in a dark void, internal fiber-optic threads weaving a subtle [VAR2], silky micro-mesh texture with pearl and champagne specular highlights, 85mm f/1.4 lens, " + CAM_TAIL,
    v1: ["نوع النسيج", "Fabric Type", "translucent holographic organza silk"],
    v2: ["التأثير الضوئي", "Light Effect", "warm sunset gold and deep sapphire caustic glow"],
    cam: "85mm f/1.4 • Silk Simulation", pal: ["#0F172A", "#3B82F6", "#F59E0B"], tools: ["midjourney", "flux"]
  },
  {
    id: "p-50", cat: "tactile-branding",
    arT: "بوصلة الذكاء الاصطناعي البلورية (شعار الموقع)", enT: "The Quantum AI Compass Monolith Emblem",
    arC: "البرومبت الرسمي لهوية AI Compass: بوصلة مستقبلية معلقة من الكريستال المظلم والذهب الضوئي.",
    enC: "Signature AI Compass hero emblem: a levitating futuristic compass of smoked crystal and photonic gold.",
    prompt: "Masterpiece 3D icon render of a futuristic minimalist compass composed of [VAR1] and [VAR2], suspended in mid-air above a dark reflective horizon grid, emitting subtle volumetric light rays and precision optical degree markings, 85mm studio macro lens, " + CAM_TAIL,
    v1: ["حلقة البوصلة", "Compass Ring", "chamfered dark titanium and smoked sapphire glass"],
    v2: ["إبرة البوصلة", "Compass Needle", "a levitating diamond-cut prism glowing with electric indigo and gold light"],
    cam: "85mm Hero Macro • Signature Emblem", pal: ["#0B0F19", "#6B7CFF", "#9A7BFF"], tools: ["midjourney", "leonardo-ai", "ideogram"]
  }
];
