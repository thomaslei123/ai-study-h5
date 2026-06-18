/* 基础数据：年级、科目（广东中山·人教/统编版）。
   知识点树后续从小程序 services/knowledgeTrees.js 迁入，先放精简版保证可跑。 */
(function () {
  var GRADES = [
    { id: 'g7', name: '七年级' },
    { id: 'g8', name: '八年级' }
  ];

  // 七+八年级开设科目（化学九年级才有，物理八年级起）
  var SUBJECTS = [
    { id: 'math',      name: '数学',  icon: '➗', textbook: '人教版' },
    { id: 'chinese',   name: '语文',  icon: '📖', textbook: '人教统编版' },
    { id: 'english',   name: '英语',  icon: '🔤', textbook: '人教版' },
    { id: 'physics',   name: '物理',  icon: '🧲', textbook: '人教版', fromGrade: 'g8' },
    { id: 'biology',   name: '生物',  icon: '🌱', textbook: '人教版' },
    { id: 'geography', name: '地理',  icon: '🌏', textbook: '人教版' },
    { id: 'history',   name: '历史',  icon: '🏛️', textbook: '人教统编版' },
    { id: 'morality',  name: '道法',  icon: '⚖️', textbook: '人教统编版' }
  ];

  function subjectsForGrade(gradeId) {
    return SUBJECTS.filter(function (s) {
      return !s.fromGrade || s.fromGrade === gradeId || gradeId === 'g8';
    });
  }

  function getSubject(id) {
    return SUBJECTS.filter(function (s) { return s.id === id; })[0] || { id: id, name: id, textbook: '人教版' };
  }

  function getGradeName(id) {
    var g = GRADES.filter(function (x) { return x.id === id; })[0];
    return g ? g.name : id;
  }

  window.Data = {
    GRADES: GRADES,
    SUBJECTS: SUBJECTS,
    subjectsForGrade: subjectsForGrade,
    getSubject: getSubject,
    getGradeName: getGradeName
  };
})();
