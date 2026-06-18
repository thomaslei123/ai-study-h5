/**
 * 人教版 初中数学 知识点树（方案 B：用于 AI 错题知识点归类）
 *
 * 说明：
 * - 本文件是“纯数据 + 简单读取函数”的独立模块，不依赖也不修改其它服务文件。
 * - 结构：科目 → 6 个分册（七上~九下）→ 章 → 知识点(节级)。
 * - 版本（混合，按学生实际在读年级跟进新教材铺开进度）：
 *     · 七年级 = 人教版 2024 新版（七上 4章→6章：有理数拆分+代数式独立；七下章号顺延 7~12）。
 *     · 八、九年级 = 人教版 2012 课标版（旧版）。八年级 2026 秋、九年级 2027 秋将换 2024 新版，届时再更新。
 *   每个分册对象带 edition 字段标注版次。
 *   ⚠️ 七年级新版章节依据 2024 秋官方目录建（数学已核），其余细节请拿到实际电子课本目录再校。
 * - 后续接入：可由 knowledge.getKnowledge('math') 改读本树，
 *   或在云函数判题时把 flatPoints() 作为可选知识点清单喂给 AI。
 */

var mathKnowledgeTree = {
  subjectId: "math",
  subjectName: "数学",
  edition: "人教版（2012课标版）",
  volumes: [
    {
      grade: "七年级",
      volume: "上册",
      edition: "人教版2024新版",
      chapters: [
        { no: 1, chapter: "有理数", points: ["正数和负数", "有理数的概念与分类", "数轴", "相反数", "绝对值", "有理数的大小比较"] },
        { no: 2, chapter: "有理数的运算", points: ["有理数的加法", "有理数的减法", "有理数的加减混合运算", "有理数的乘法", "有理数的除法", "有理数的乘方", "科学记数法", "近似数", "有理数的混合运算"] },
        { no: 3, chapter: "代数式", points: ["用字母表示数", "代数式", "列代数式表示数量关系", "代数式的值"] },
        { no: 4, chapter: "整式的加减", points: ["单项式", "多项式", "同类项与合并同类项", "去括号", "整式的加减运算"] },
        { no: 5, chapter: "一元一次方程", points: ["方程与一元一次方程", "等式的性质", "解一元一次方程-移项", "解一元一次方程-去括号", "解一元一次方程-去分母", "实际问题与一元一次方程"] },
        { no: 6, chapter: "几何图形初步", points: ["立体图形与平面图形", "点、线、面、体", "直线、射线、线段", "线段的比较与计算", "角", "角的比较与运算", "余角和补角", "方位角"] }
      ]
    },
    {
      grade: "七年级",
      volume: "下册",
      edition: "人教版2024新版（2025春）",
      chapters: [
        { no: 7, chapter: "相交线与平行线", points: ["相交线", "邻补角与对顶角", "垂线及其性质", "同位角、内错角、同旁内角", "平行线的判定", "平行线的性质", "平移"] },
        { no: 8, chapter: "实数", points: ["算术平方根", "平方根", "立方根", "无理数", "实数的概念与分类", "实数与数轴", "实数的运算"] },
        { no: 9, chapter: "平面直角坐标系", points: ["有序数对", "平面直角坐标系", "点的坐标特征", "用坐标表示平移"] },
        { no: 10, chapter: "二元一次方程组", points: ["二元一次方程(组)", "代入消元法", "加减消元法", "实际问题与二元一次方程组"] },
        { no: 11, chapter: "不等式与不等式组", points: ["不等式及其解集", "不等式的性质", "一元一次不等式的解法", "实际问题与一元一次不等式", "一元一次不等式组"] },
        { no: 12, chapter: "数据的收集、整理与描述", points: ["全面调查与抽样调查", "总体、个体、样本", "条形图与扇形图", "直方图", "频数分布表与频数分布直方图"] }
      ]
    },
    {
      grade: "八年级",
      volume: "上册",
      chapters: [
        { no: 11, chapter: "三角形", points: ["三角形的边", "三角形的高、中线与角平分线", "三角形的稳定性", "三角形的内角和", "三角形的外角", "多边形及其内角和"] },
        { no: 12, chapter: "全等三角形", points: ["全等图形与全等三角形", "全等三角形的性质", "全等判定-SSS", "全等判定-SAS", "全等判定-ASA", "全等判定-AAS", "直角三角形全等-HL", "角平分线的性质与判定"] },
        { no: 13, chapter: "轴对称", points: ["轴对称图形", "轴对称的性质", "线段的垂直平分线", "画轴对称图形", "坐标中的轴对称", "等腰三角形的性质与判定", "等边三角形", "含30°角的直角三角形", "最短路径问题"] },
        { no: 14, chapter: "整式的乘法与因式分解", points: ["同底数幂的乘法", "幂的乘方", "积的乘方", "单项式乘单项式", "单项式乘多项式", "多项式乘多项式", "同底数幂的除法", "整式的除法", "平方差公式", "完全平方公式", "因式分解-提公因式法", "因式分解-公式法"] },
        { no: 15, chapter: "分式", points: ["分式的概念", "分式的基本性质", "约分与通分", "分式的乘除", "分式的加减", "分式的混合运算", "整数指数幂", "分式方程"] }
      ]
    },
    {
      grade: "八年级",
      volume: "下册",
      chapters: [
        { no: 16, chapter: "二次根式", points: ["二次根式的概念", "最简二次根式", "二次根式的乘除", "二次根式的加减", "二次根式的混合运算"] },
        { no: 17, chapter: "勾股定理", points: ["勾股定理", "勾股定理的应用", "勾股定理的逆定理"] },
        { no: 18, chapter: "平行四边形", points: ["平行四边形的性质", "平行四边形的判定", "三角形的中位线", "矩形的性质与判定", "菱形的性质与判定", "正方形的性质与判定"] },
        { no: 19, chapter: "一次函数", points: ["变量与函数", "函数的图象", "正比例函数", "一次函数的图象与性质", "待定系数法求一次函数", "一次函数与方程、不等式", "一次函数的实际应用"] },
        { no: 20, chapter: "数据的分析", points: ["平均数与加权平均数", "中位数", "众数", "极差", "方差", "用样本估计总体"] }
      ]
    },
    {
      grade: "九年级",
      volume: "上册",
      chapters: [
        { no: 21, chapter: "一元二次方程", points: ["一元二次方程的概念", "配方法", "公式法", "因式分解法", "根的判别式", "根与系数的关系(韦达定理)", "实际问题与一元二次方程"] },
        { no: 22, chapter: "二次函数", points: ["二次函数的概念", "y=ax²的图象与性质", "y=a(x-h)²+k的图象与性质", "y=ax²+bx+c的图象与性质", "待定系数法求二次函数", "二次函数与一元二次方程", "二次函数的实际应用(最值)"] },
        { no: 23, chapter: "旋转", points: ["旋转的概念与性质", "中心对称", "中心对称图形", "坐标中的中心对称"] },
        { no: 24, chapter: "圆", points: ["圆的有关概念", "垂径定理", "圆心角、弧、弦的关系", "圆周角定理", "点与圆的位置关系", "直线与圆的位置关系", "切线的性质与判定", "切线长定理", "三角形的内切圆", "正多边形与圆", "弧长与扇形面积", "圆锥的侧面积与全面积"] },
        { no: 25, chapter: "概率初步", points: ["随机事件与概率", "用列举法求概率(列表法)", "用列举法求概率(树状图法)", "用频率估计概率"] }
      ]
    },
    {
      grade: "九年级",
      volume: "下册",
      chapters: [
        { no: 26, chapter: "反比例函数", points: ["反比例函数的概念", "反比例函数的图象与性质", "反比例函数的实际应用"] },
        { no: 27, chapter: "相似", points: ["图形的相似", "比例线段", "平行线分线段成比例", "相似三角形的判定", "相似三角形的性质", "相似三角形的应用举例", "位似", "位似与坐标"] },
        { no: 28, chapter: "锐角三角函数", points: ["正弦、余弦、正切", "特殊角的三角函数值", "解直角三角形", "解直角三角形的应用(仰角俯角)", "解直角三角形的应用(坡度坡角)", "解直角三角形的应用(方位角)"] },
        { no: 29, chapter: "投影与视图", points: ["平行投影与中心投影", "三视图", "由三视图想象几何体"] }
      ]
    }
  ]
};

/** 取某一分册（grade + volume），找不到返回 null。 */
function getVolume(grade, volume) {
  for (var i = 0; i < mathKnowledgeTree.volumes.length; i += 1) {
    var v = mathKnowledgeTree.volumes[i];
    if (v.grade === grade && v.volume === volume) {
      return v;
    }
  }
  return null;
}

/** 取某一分册的章列表（[{no, chapter, points}]），找不到返回 []。 */
function getChapters(grade, volume) {
  var v = getVolume(grade, volume);
  return v ? v.chapters : [];
}

/** 取整个年级（上下两册合并）的章列表。 */
function getGradeChapters(grade) {
  var result = [];
  mathKnowledgeTree.volumes.forEach(function (v) {
    if (v.grade === grade) {
      result = result.concat(v.chapters);
    }
  });
  return result;
}

/**
 * 拍平成知识点清单，每条带定位信息，供 AI 归类时作可选项。
 * 返回 [{ grade, volume, chapterNo, chapter, point, path }]
 */
function flatPoints() {
  var list = [];
  mathKnowledgeTree.volumes.forEach(function (v) {
    v.chapters.forEach(function (ch) {
      ch.points.forEach(function (pt) {
        list.push({
          grade: v.grade,
          volume: v.volume,
          chapterNo: ch.no,
          chapter: ch.chapter,
          point: pt,
          path: "数学 / " + ch.chapter + " / " + pt
        });
      });
    });
  });
  return list;
}

/** 全部章标题（去重，按出现顺序）。 */
function allChapters() {
  var seen = {};
  var result = [];
  mathKnowledgeTree.volumes.forEach(function (v) {
    v.chapters.forEach(function (ch) {
      if (!seen[ch.chapter]) {
        seen[ch.chapter] = true;
        result.push(ch.chapter);
      }
    });
  });
  return result;
}

module.exports = {
  tree: mathKnowledgeTree,
  getVolume: getVolume,
  getChapters: getChapters,
  getGradeChapters: getGradeChapters,
  flatPoints: flatPoints,
  allChapters: allChapters
};
