/**
 * 人教版 初中全科 知识点树（方案 B：AI 错题知识点归类的统一数据源）
 *
 * - 纯数据 + 通用读取函数，不修改其它服务文件；数学复用 services/mathKnowledgeTree.js。
 * - 统一结构：{ subjectId, subjectName, edition, volumes:[{grade, volume, chapters:[{no, chapter, points}]}] }
 * - 版本：理科/地理=人教版；语文/历史/道德与法治=人教统编版；英语见下。
 * - 版次（混合，跟新教材铺开进度）：
 *     · 七年级 = 2024 新版（地理/道法/历史/生物 七年级已按 2024 秋官方目录更新；数学见 mathKnowledgeTree.js）。
 *     · 八、九年级 = 2012 旧版，待 2026 秋/2027 秋换新版再更新。各分册带 edition 字段标注。
 *     · 七年级各科已对照学生实际课本目录校准（来源：D盘下载的 2024/2025 人教版 PDF 提取，见 tools/extract_textbook.py）。
 * - 英语：本树按语法体系分级（与教材系列无关，归类够用）。已核学生英语七年级=2024新版人教（Starter Unit/Welcome 结构，非 Go for it；之前封面照是网店旧库存图）。如需按单元归类可另补 Unit 结构。
 * - 初中开课年级：物理八~九、化学九、生物七~八、地理七~八，其余七~九。
 * - 学习地广东中山，已用课本封面确认全科人教版（见项目记忆）。
 */

var mathModule = require("./mathKnowledgeTree");

var english = {
  subjectId: "english", subjectName: "英语", edition: "人教版（新目标 Go for it）",
  volumes: [
    { grade: "七年级", volume: "全册", chapters: [
      { no: 1, chapter: "词类与基础", points: ["名词单复数", "人称代词与物主代词", "指示代词this/that/these/those", "冠词a/an/the", "基数词与序数词", "常用介词in/on/at/under"] },
      { no: 2, chapter: "be动词与一般现在时", points: ["be动词am/is/are", "一般现在时(do/does)", "第三人称单数变化", "实义动词的否定与疑问", "频率副词"] },
      { no: 3, chapter: "句型与时态", points: ["There be 句型", "情态动词can", "祈使句", "特殊疑问句(what/where/when/who/how)", "现在进行时"] }
    ]},
    { grade: "八年级", volume: "全册", chapters: [
      { no: 1, chapter: "时态进阶", points: ["一般过去时(规则/不规则动词)", "一般将来时(will / be going to)", "过去进行时", "现在完成时(已完成/经历)"] },
      { no: 2, chapter: "比较与非谓语", points: ["形容词副词比较级", "形容词副词最高级", "动词不定式to do", "动名词doing", "情态动词should/must/have to"] },
      { no: 3, chapter: "句子结构", points: ["反身代词", "并列连词and/but/or/so", "宾语从句(初步)", "条件状语从句if", "时间状语从句when/while"] }
    ]},
    { grade: "九年级", volume: "全册", chapters: [
      { no: 1, chapter: "时态与语态", points: ["现在完成时(进阶/延续性动词)", "过去完成时", "一般现在时被动语态", "一般过去时被动语态", "含情态动词的被动语态"] },
      { no: 2, chapter: "复合句", points: ["宾语从句(陈述/一般疑问/特殊疑问语序)", "定语从句(that/which/who)", "状语从句(原因/结果/让步/目的)", "直接引语与间接引语"] },
      { no: 3, chapter: "综合", points: ["非谓语动词综合", "虚拟语气(初步 I wish / if)", "强调与倒装(了解)", "构词法(前缀后缀)"] }
    ]}
  ]
};

var physics = {
  subjectId: "physics", subjectName: "物理", edition: "人教版",
  volumes: [
    { grade: "八年级", volume: "上册", chapters: [
      { no: 1, chapter: "机械运动", points: ["长度和时间的测量", "运动的描述与参照物", "运动的快慢(速度)", "测量平均速度"] },
      { no: 2, chapter: "声现象", points: ["声音的产生与传播", "声音的特性(音调/响度/音色)", "声的利用", "噪声的危害和控制"] },
      { no: 3, chapter: "物态变化", points: ["温度与温度计", "熔化和凝固", "汽化和液化", "升华和凝华"] },
      { no: 4, chapter: "光现象", points: ["光的直线传播", "光的反射", "平面镜成像", "光的折射", "光的色散"] },
      { no: 5, chapter: "透镜及其应用", points: ["透镜(凸透镜/凹透镜)", "凸透镜成像规律", "眼睛和眼镜", "显微镜和望远镜"] },
      { no: 6, chapter: "质量与密度", points: ["质量及其测量", "密度的概念", "测量物质的密度", "密度与社会生活"] }
    ]},
    { grade: "八年级", volume: "下册", chapters: [
      { no: 7, chapter: "力", points: ["力的概念与作用效果", "弹力与弹簧测力计", "重力"] },
      { no: 8, chapter: "运动和力", points: ["牛顿第一定律与惯性", "二力平衡", "摩擦力"] },
      { no: 9, chapter: "压强", points: ["压强的概念", "液体的压强", "大气压强", "流体压强与流速的关系"] },
      { no: 10, chapter: "浮力", points: ["浮力的概念", "阿基米德原理", "物体的浮沉条件及应用"] },
      { no: 11, chapter: "功和机械能", points: ["功", "功率", "动能和势能", "机械能及其转化"] },
      { no: 12, chapter: "简单机械", points: ["杠杆", "滑轮", "机械效率"] }
    ]},
    { grade: "九年级", volume: "全册", chapters: [
      { no: 13, chapter: "内能", points: ["分子热运动", "内能", "比热容"] },
      { no: 14, chapter: "内能的利用", points: ["热机", "热机的效率", "能量的转化和守恒"] },
      { no: 15, chapter: "电流和电路", points: ["两种电荷", "电流和电路", "串联和并联", "电流的测量", "串并联电路电流规律"] },
      { no: 16, chapter: "电压 电阻", points: ["电压", "串并联电路电压规律", "电阻", "变阻器"] },
      { no: 17, chapter: "欧姆定律", points: ["电流与电压电阻的关系", "欧姆定律及应用", "电阻的测量", "欧姆定律与安全用电"] },
      { no: 18, chapter: "电功率", points: ["电能 电功", "电功率", "测量小灯泡的电功率", "焦耳定律"] },
      { no: 19, chapter: "生活用电", points: ["家庭电路", "家庭电路电流过大的原因", "安全用电"] },
      { no: 20, chapter: "电与磁", points: ["磁现象与磁场", "电生磁", "电磁铁与电磁继电器", "电动机", "磁生电"] },
      { no: 21, chapter: "信息的传递", points: ["现代顺风耳——电话", "电磁波的海洋", "广播电视和移动通信"] },
      { no: 22, chapter: "能源与可持续发展", points: ["能源", "核能", "太阳能", "能源与可持续发展"] }
    ]}
  ]
};

var chemistry = {
  subjectId: "chemistry", subjectName: "化学", edition: "人教版",
  volumes: [
    { grade: "九年级", volume: "上册", chapters: [
      { no: 1, chapter: "走进化学世界", points: ["物质的变化和性质", "化学是一门以实验为基础的科学", "走进化学实验室(基本操作)"] },
      { no: 2, chapter: "我们周围的空气", points: ["空气", "氧气的性质", "制取氧气"] },
      { no: 3, chapter: "物质构成的奥秘", points: ["分子和原子", "原子的结构", "元素", "离子"] },
      { no: 4, chapter: "自然界的水", points: ["爱护水资源", "水的净化", "水的组成", "化学式与化合价"] },
      { no: 5, chapter: "化学方程式", points: ["质量守恒定律", "如何正确书写化学方程式", "利用化学方程式的简单计算"] },
      { no: 6, chapter: "碳和碳的氧化物", points: ["碳单质的多样性", "二氧化碳制取的研究", "二氧化碳和一氧化碳"] },
      { no: 7, chapter: "燃料及其利用", points: ["燃烧和灭火", "燃料的合理利用与开发"] }
    ]},
    { grade: "九年级", volume: "下册", chapters: [
      { no: 8, chapter: "金属和金属材料", points: ["金属材料", "金属的化学性质", "金属活动性顺序", "金属资源的利用和保护"] },
      { no: 9, chapter: "溶液", points: ["溶液的形成", "溶解度", "溶质的质量分数"] },
      { no: 10, chapter: "酸和碱", points: ["常见的酸和碱", "酸碱的化学性质", "溶液酸碱度pH", "中和反应"] },
      { no: 11, chapter: "盐 化肥", points: ["生活中常见的盐", "复分解反应", "化学肥料"] },
      { no: 12, chapter: "化学与生活", points: ["人类重要的营养物质", "化学元素与人体健康", "有机合成材料"] }
    ]}
  ]
};

var biology = {
  subjectId: "biology", subjectName: "生物", edition: "人教版",
  volumes: [
    { grade: "七年级", volume: "上册", edition: "人教版2024新版", chapters: [
      { no: 1, chapter: "认识生物", points: ["观察周边环境中的生物", "生物的特征"] },
      { no: 2, chapter: "认识细胞", points: ["学习使用显微镜", "植物细胞", "动物细胞", "细胞的生活"] },
      { no: 3, chapter: "从细胞到生物体", points: ["细胞通过分裂产生新细胞", "动物体的结构层次", "植物体的结构层次", "单细胞生物"] },
      { no: 4, chapter: "藻类与植物的类群", points: ["藻类、苔藓植物和蕨类植物", "种子植物"] },
      { no: 5, chapter: "动物的类群", points: ["无脊椎动物", "脊椎动物"] },
      { no: 6, chapter: "微生物", points: ["微生物的分布", "细菌", "真菌", "病毒"] },
      { no: 7, chapter: "生物分类的方法", points: ["尝试对生物进行分类", "从种到界"] }
    ]},
    { grade: "七年级", volume: "下册", edition: "人教版2024新版（2025春）", chapters: [
      { no: 1, chapter: "被子植物的一生", points: ["种子的萌发", "植株的生长", "开花和结果"] },
      { no: 2, chapter: "植物体内的物质与能量变化", points: ["水的利用与散失", "光合作用", "呼吸作用", "植物在自然界中的作用"] },
      { no: 3, chapter: "人的生殖和发育", points: ["人的生殖", "青春期"] },
      { no: 4, chapter: "人体的营养", points: ["食物中的营养物质", "消化和吸收", "合理营养与食品安全"] },
      { no: 5, chapter: "人体的呼吸", points: ["呼吸道对空气的处理", "发生在肺内的气体交换"] },
      { no: 6, chapter: "人体内物质的运输", points: ["流动的组织——血液", "血流的管道——血管", "输送血液的泵——心脏"] },
      { no: 7, chapter: "人体内废物的排出", points: ["尿的形成和排出"] }
    ]},
    { grade: "八年级", volume: "上册", chapters: [
      { no: 5, chapter: "生物圈中的其他生物", points: ["动物的主要类群(无脊椎/脊椎)", "动物的运动和行为", "动物在生物圈中的作用", "细菌和真菌", "病毒"] },
      { no: 6, chapter: "生物的多样性及其保护", points: ["根据生物特征进行分类", "认识生物的多样性", "保护生物的多样性"] }
    ]},
    { grade: "八年级", volume: "下册", chapters: [
      { no: 7, chapter: "生物圈中生命的延续和发展", points: ["生物的生殖和发育", "生物的遗传和变异", "基因与性状", "生物的进化"] },
      { no: 8, chapter: "健康地生活", points: ["传染病及其预防", "免疫与计划免疫", "用药和急救", "了解自己增进健康"] }
    ]}
  ]
};

var history = {
  subjectId: "history", subjectName: "历史", edition: "人教统编版",
  volumes: [
    { grade: "七年级", volume: "上册", edition: "人教统编2024版", chapters: [
      { no: 1, chapter: "第一单元 史前时期：原始社会与中华文明的起源", points: ["远古时期的人类活动", "原始农业与史前社会", "中华文明的起源"] },
      { no: 2, chapter: "第二单元 夏商周时期：奴隶制王朝的更替和向封建社会的过渡", points: ["夏商西周王朝的更替", "动荡变化中的春秋时期", "战国时期的社会变革", "百家争鸣", "夏商周时期的科技与文化"] },
      { no: 3, chapter: "第三单元 秦汉时期：统一多民族封建国家的建立和巩固", points: ["秦统一中国", "秦末农民大起义", "西汉建立和文景之治", "大一统王朝的巩固", "东汉的兴衰", "丝绸之路的开通与经营西域", "秦汉时期的科技与文化"] },
      { no: 4, chapter: "第四单元 三国两晋南北朝时期：政权分立与民族交融", points: ["三国鼎立", "西晋的短暂统一和北方各族的内迁", "东晋南朝政治和江南地区开发", "北朝政治和北方民族大交融", "三国两晋南北朝时期的科技与文化"] }
    ]},
    { grade: "七年级", volume: "下册", edition: "人教统编2024版（2025春）", chapters: [
      { no: 1, chapter: "第一单元 隋唐时期：繁荣与开放的时代", points: ["隋朝统一与灭亡", "唐朝建立与“贞观之治”", "“开元盛世”", "安史之乱与唐朝衰亡", "隋唐时期的民族交往与交融", "隋唐时期的中外文化交流", "隋唐时期的科技与文化"] },
      { no: 2, chapter: "第二单元 辽宋夏金元时期：民族关系发展和社会变化", points: ["北宋的政治", "辽、西夏与北宋并立", "金与南宋对峙", "元朝的建立与统一", "辽宋夏金元时期经济的繁荣", "辽宋夏金元时期的对外交流", "辽宋夏金元时期的科技与文化"] },
      { no: 3, chapter: "第三单元 明清时期：统一多民族国家的巩固与发展", points: ["明朝的统治", "明朝的对外关系", "明朝的灭亡和清朝的建立", "清朝的边疆治理", "清朝君主专制的强化", "明清时期社会经济的发展", "明清时期的科技与文化"] }
    ]},
    { grade: "八年级", volume: "上册", chapters: [
      { no: 1, chapter: "中国开始沦为半殖民地半封建社会", points: ["鸦片战争", "第二次鸦片战争", "太平天国运动"] },
      { no: 2, chapter: "近代化的早期探索与民族危机的加剧", points: ["洋务运动", "甲午中日战争", "戊戌变法", "八国联军侵华"] },
      { no: 3, chapter: "资产阶级民主革命与中华民国的建立", points: ["革命先行者孙中山", "辛亥革命", "中华民国的创建"] },
      { no: 4, chapter: "新民主主义革命的开始", points: ["新文化运动", "五四运动", "中国共产党诞生"] },
      { no: 5, chapter: "从国共合作到国共对立", points: ["北伐战争", "毛泽东开辟井冈山道路", "红军长征"] },
      { no: 6, chapter: "中华民族的抗日战争", points: ["九一八事变与西安事变", "七七事变与全民族抗战", "正面战场与敌后战场", "抗日战争的胜利"] },
      { no: 7, chapter: "人民解放战争", points: ["内战爆发", "人民解放战争的胜利"] }
    ]},
    { grade: "八年级", volume: "下册", chapters: [
      { no: 1, chapter: "中华人民共和国的成立和巩固", points: ["中华人民共和国成立", "抗美援朝", "土地改革"] },
      { no: 2, chapter: "社会主义制度的建立与社会主义建设的探索", points: ["第一个五年计划", "三大改造", "艰辛探索与建设成就"] },
      { no: 3, chapter: "中国特色社会主义道路", points: ["伟大的历史转折", "对内改革对外开放", "中国特色社会主义理论体系"] },
      { no: 4, chapter: "民族团结与祖国统一", points: ["民族大团结", "香港澳门回归", "海峡两岸的交往"] },
      { no: 5, chapter: "国防建设与外交成就", points: ["钢铁长城", "独立自主的和平外交", "外交事业的发展"] },
      { no: 6, chapter: "科技文化与社会生活", points: ["科技文化成就", "社会生活的变迁"] }
    ]},
    { grade: "九年级", volume: "上册", chapters: [
      { no: 1, chapter: "古代亚非文明", points: ["古代埃及", "古代两河流域", "古代印度"] },
      { no: 2, chapter: "古代欧洲文明", points: ["希腊城邦与亚历山大帝国", "罗马城邦和罗马帝国", "希腊罗马古典文化"] },
      { no: 3, chapter: "封建时代的欧洲", points: ["基督教的兴起与法兰克王国", "西欧庄园", "中世纪城市和大学的兴起", "拜占庭帝国"] },
      { no: 4, chapter: "封建时代的亚洲国家", points: ["古代日本", "阿拉伯帝国"] },
      { no: 5, chapter: "步入近代", points: ["文艺复兴运动", "探寻新航路", "早期殖民掠夺"] },
      { no: 6, chapter: "资本主义制度的初步确立", points: ["君主立宪制的英国", "美国的独立", "法国大革命和拿破仑帝国"] },
      { no: 7, chapter: "工业革命和国际共产主义运动的兴起", points: ["第一次工业革命", "马克思主义的诞生", "国际工人运动"] }
    ]},
    { grade: "九年级", volume: "下册", chapters: [
      { no: 1, chapter: "殖民地人民的反抗与资本主义制度的扩展", points: ["殖民地人民的反抗斗争", "俄国的改革", "美国内战", "日本明治维新"] },
      { no: 2, chapter: "第二次工业革命和近代科学文化", points: ["第二次工业革命", "近代科学与文化"] },
      { no: 3, chapter: "第一次世界大战和战后初期的世界", points: ["第一次世界大战", "列宁与十月革命", "凡尔赛—华盛顿体系", "苏联的社会主义建设"] },
      { no: 4, chapter: "经济大危机和第二次世界大战", points: ["罗斯福新政", "法西斯国家的侵略扩张", "第二次世界大战"] },
      { no: 5, chapter: "二战后的世界变化", points: ["冷战", "战后资本主义的新变化", "社会主义的发展与挫折", "亚非拉国家的新发展"] },
      { no: 6, chapter: "走向和平发展的世界", points: ["联合国与世界贸易组织", "经济全球化", "不断发展的现代社会"] }
    ]}
  ]
};

var geography = {
  subjectId: "geography", subjectName: "地理", edition: "人教版",
  volumes: [
    { grade: "七年级", volume: "上册", edition: "人教版2024新版", chapters: [
      { no: 1, chapter: "地球", points: ["地球的宇宙环境", "地球与地球仪", "地球的运动"] },
      { no: 2, chapter: "地图", points: ["地图的阅读", "地形图的判读", "地图的选择和应用"] },
      { no: 3, chapter: "陆地和海洋", points: ["大洲和大洋", "世界的地形", "海陆的变迁"] },
      { no: 4, chapter: "天气与气候", points: ["多变的天气", "气温的变化与分布", "降水的变化与分布", "世界的气候"] },
      { no: 5, chapter: "居民与文化", points: ["人口与人种", "城镇与乡村", "多样的文化"] },
      { no: 6, chapter: "发展与合作", points: ["发展与合作", "跨学科主题学习：探索外来食料作物传播史"] }
    ]},
    { grade: "七年级", volume: "下册", edition: "人教版2024新版（2025春）", chapters: [
      { no: 7, chapter: "我们生活的大洲——亚洲", points: ["位置和范围", "自然环境"] },
      { no: 8, chapter: "我们邻近的地区和国家", points: ["日本", "东南亚", "印度", "俄罗斯"] },
      { no: 9, chapter: "东半球其他的地区和国家", points: ["中东", "欧洲西部", "撒哈拉以南的非洲", "澳大利亚"] },
      { no: 10, chapter: "西半球的国家", points: ["美国", "巴西"] },
      { no: 11, chapter: "极地地区", points: ["南极地区", "北极地区"] }
    ]},
    { grade: "八年级", volume: "上册", chapters: [
      { no: 1, chapter: "从世界看中国", points: ["疆域", "人口", "民族"] },
      { no: 2, chapter: "中国的自然环境", points: ["地形和地势", "气候", "河流(长江黄河)", "自然灾害"] },
      { no: 3, chapter: "中国的自然资源", points: ["自然资源的基本特征", "土地资源", "水资源"] },
      { no: 4, chapter: "中国的经济发展", points: ["交通运输", "农业", "工业"] }
    ]},
    { grade: "八年级", volume: "下册", chapters: [
      { no: 5, chapter: "中国的地理差异", points: ["四大地理区域的划分"] },
      { no: 6, chapter: "北方地区", points: ["自然特征与农业", "东北三省", "黄土高原", "北京"] },
      { no: 7, chapter: "南方地区", points: ["自然特征与农业", "长江三角洲地区", "香港和澳门", "台湾省"] },
      { no: 8, chapter: "西北地区", points: ["自然特征与农业", "干旱的宝地——塔里木盆地"] },
      { no: 9, chapter: "青藏地区", points: ["自然特征与农业", "高原湿地——三江源地区"] },
      { no: 10, chapter: "中国在世界中", points: ["中国的发展与世界"] }
    ]}
  ]
};

var morality = {
  subjectId: "morality", subjectName: "道德与法治", edition: "人教统编版",
  volumes: [
    { grade: "七年级", volume: "上册", edition: "人教统编2024版", chapters: [
      { no: 1, chapter: "第一单元 少年有梦", points: ["开启初中生活", "正确认识自我", "梦想始于当下"] },
      { no: 2, chapter: "第二单元 成长的时空", points: ["幸福和睦的家庭", "和谐的师生关系", "友谊之树常青", "在集体中成长"] },
      { no: 3, chapter: "第三单元 珍爱我们的生命", points: ["生命可贵", "守护生命安全", "保持身心健康"] },
      { no: 4, chapter: "第四单元 追求美好人生", points: ["确立人生目标", "端正人生态度", "实现人生价值"] }
    ]},
    { grade: "七年级", volume: "下册", edition: "人教统编2024版（2025春）", chapters: [
      { no: 1, chapter: "第一单元 珍惜青春时光", points: ["青春正当时", "成长的青春期烦恼与调适"] },
      { no: 2, chapter: "第二单元 焕发青春活力", points: ["人贵自尊", "自信给人力量", "人生当自强"] },
      { no: 3, chapter: "第三单元 传承中华优秀传统文化", points: ["传承核心思想理念", "弘扬中华人文精神", "践行中华传统美德"] },
      { no: 4, chapter: "第四单元 生活在法治社会", points: ["法律为我们护航", "走近民法典", "远离违法犯罪"] }
    ]},
    { grade: "八年级", volume: "上册", chapters: [
      { no: 1, chapter: "走进社会生活", points: ["丰富的社会生活", "网络生活新空间"] },
      { no: 2, chapter: "遵守社会规则", points: ["社会生活离不开规则", "社会生活讲道德", "做守法的公民"] },
      { no: 3, chapter: "勇担社会责任", points: ["责任与角色同在", "在社会中担当"] },
      { no: 4, chapter: "维护国家利益", points: ["维护国家利益", "树立总体国家安全观"] }
    ]},
    { grade: "八年级", volume: "下册", chapters: [
      { no: 1, chapter: "坚持宪法至上", points: ["维护宪法权威", "保障宪法实施"] },
      { no: 2, chapter: "理解权利义务", points: ["公民权利", "公民义务"] },
      { no: 3, chapter: "人民当家作主", points: ["我国的国家机构", "我国的基本制度"] },
      { no: 4, chapter: "崇尚法治精神", points: ["崇尚自由平等", "维护公平正义"] }
    ]},
    { grade: "九年级", volume: "上册", chapters: [
      { no: 1, chapter: "富强与创新", points: ["踏上强国之路(改革开放)", "创新驱动发展"] },
      { no: 2, chapter: "民主与法治", points: ["追求民主价值", "建设法治中国"] },
      { no: 3, chapter: "文明与家园", points: ["守望精神家园(文化)", "建设美丽中国(人口资源环境)"] },
      { no: 4, chapter: "和谐与梦想", points: ["促进民族团结", "中华一家亲与中国梦"] }
    ]},
    { grade: "九年级", volume: "下册", chapters: [
      { no: 1, chapter: "我们共同的世界", points: ["同住地球村", "构建人类命运共同体"] },
      { no: 2, chapter: "世界舞台上的中国", points: ["中国的机遇与挑战", "与世界深度互动"] },
      { no: 3, chapter: "走向未来的少年", points: ["少年的担当", "走向未来"] }
    ]}
  ]
};

/* 语文按“能力板块”组织（错题多对应能力点，而非课次），统编版。 */
var chinese = {
  subjectId: "chinese", subjectName: "语文", edition: "人教统编版",
  volumes: [
    { grade: "全学段", volume: "全册", chapters: [
      { no: 1, chapter: "积累与运用", points: ["字音(易错读音)", "字形(易错字)", "词语理解与运用", "成语运用", "病句辨析与修改", "标点符号", "文学文化常识", "名著阅读", "古诗文默写"] },
      { no: 2, chapter: "现代文阅读", points: ["记叙文/散文阅读", "说明文阅读", "议论文阅读", "非连续性文本阅读", "词句赏析与表达效果", "内容概括与主旨把握"] },
      { no: 3, chapter: "古诗文阅读", points: ["文言实词", "文言虚词", "文言句子翻译", "文言断句", "文言文内容理解", "古诗词鉴赏(意象/情感/手法)"] },
      { no: 4, chapter: "写作", points: ["审题立意", "记叙文写作", "议论文写作", "应用文写作", "选材与构思", "语言表达与文采"] },
      { no: 5, chapter: "口语交际与综合性学习", points: ["口语交际", "材料探究与图表分析", "综合性学习活动"] }
    ]}
  ]
};

var trees = {
  english: english,
  physics: physics,
  chemistry: chemistry,
  biology: biology,
  history: history,
  geography: geography,
  morality: morality,
  chinese: chinese
};

/** 取某科目的整棵树；数学复用 mathKnowledgeTree。找不到返回 null。 */
function getTree(subjectId) {
  if (subjectId === "math") {
    return mathModule.tree;
  }
  return trees[subjectId] || null;
}

/** 取某科目的章列表（[{no,chapter,points}]）；grade/volume 不传则返回全部。 */
function getChapters(subjectId, grade, volume) {
  var tree = getTree(subjectId);
  if (!tree) {
    return [];
  }
  var result = [];
  tree.volumes.forEach(function (v) {
    if ((!grade || v.grade === grade) && (!volume || v.volume === volume)) {
      result = result.concat(v.chapters);
    }
  });
  return result;
}

/**
 * 拍平某科目的知识点清单，供 AI 归类作可选项。
 * 返回 [{ subjectId, subjectName, grade, volume, chapterNo, chapter, point, path }]
 */
function flatPoints(subjectId) {
  var tree = getTree(subjectId);
  if (!tree) {
    return [];
  }
  var list = [];
  tree.volumes.forEach(function (v) {
    v.chapters.forEach(function (ch) {
      ch.points.forEach(function (pt) {
        list.push({
          subjectId: tree.subjectId,
          subjectName: tree.subjectName,
          grade: v.grade,
          volume: v.volume,
          chapterNo: ch.no,
          chapter: ch.chapter,
          point: pt,
          path: tree.subjectName + " / " + ch.chapter + " / " + pt
        });
      });
    });
  });
  return list;
}

/** 已覆盖的科目 id 列表（含数学）。 */
function subjects() {
  return ["math"].concat(Object.keys(trees));
}

module.exports = {
  getTree: getTree,
  getChapters: getChapters,
  flatPoints: flatPoints,
  subjects: subjects
};
