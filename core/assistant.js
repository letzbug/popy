
export function normalize(value=''){
  return value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

export function searchCourses(courses, query){
  const q = normalize(query);
  const tokens = q.split(/\s+/).filter(t => t.length > 2);

  const intent = {
    weekend: /week.?end|samedi|dimanche/.test(q),
    evening: /soir|soiree|apres le travail/.test(q),
    beginner: /debutant|commencer|initiation/.test(q)
  };

  const scored = courses.map(course => {
    const hay = normalize([
      course.title, course.category, course.location, course.language,
      course.level, course.time, course.description
    ].join(' '));

    let score = tokens.reduce((s,t) => s + (hay.includes(t) ? 3 : 0), 0);
    if(intent.weekend && normalize(course.time).includes('weekend')) score += 6;
    if(intent.evening && normalize(course.time).includes('soir')) score += 6;
    if(intent.beginner && normalize(course.level).includes('debutant')) score += 6;

    const synonyms = [
      [['photo','photographie','camera'], 'photo'],
      [['bien-etre','bien etre','stress','yoga','pilates'], 'bien-etre'],
      [['creatif','creative','creativite','dessin','aquarelle'], 'creativite'],
      [['langue','langues','luxembourgeois','letzebuergesch'], 'langues']
    ];
    for(const [words,target] of synonyms){
      if(words.some(w => q.includes(w)) && hay.includes(target)) score += 8;
    }

    return {course, score};
  }).filter(x => x.score > 0).sort((a,b) => b.score-a.score);

  return scored.slice(0,3).map(x=>x.course);
}
