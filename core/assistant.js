
export function normalize(value=''){
  return value.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .trim();
}

function parseFrDate(value){
  if(!value) return null;
  const m = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m) return null;
  return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]), 23, 59, 59);
}

export function adaptUniPopCourse(raw){
  const address = raw.adresseCours || {};
  const teachers = Array.isArray(raw.enseignants)
    ? raw.enseignants.map(t => [t.prenom,t.nom].filter(Boolean).join(' ')).join(', ')
    : '';

  return {
    id: raw.id ?? raw.coursId ?? raw.coursCode ?? crypto.randomUUID(),
    code: raw.coursCode || raw.coursId || '',
    title: raw.intitule || 'Cours UniPop',
    category: raw.categorieNom || raw.matiereNom || '',
    subject: raw.matiereNom || '',
    location: address.localite || address.nom || '',
    venue: address.nom || '',
    address: [address.rueNumero,address.codePostal,address.localite].filter(Boolean).join(', '),
    language: raw.langueCoursNom || raw.langueCoursCode || '',
    languageCode: raw.langueCoursCode || '',
    level: raw.niveau || '',
    description: raw.description || '',
    prerequisites: raw.prerequis || '',
    info: raw.renseignements || '',
    format: raw.format || '',
    schedule: raw.horairePrevu || '',
    schedules: raw.horaires || [],
    startDate: raw.dateDebut || '',
    endDate: raw.dateFin || '',
    duration: raw.duree || '',
    teacher: teachers,
    price: raw.cout,
    capacity: raw.nbPlaces,
    enrolled: raw.nbInscrits,
    registration: !!raw.onlineRegistration,
    url: raw.onlineRegistrationUrl || raw.organisateur?.websiteUrl || 'https://www.unipop.lu',
    _raw: raw
  };
}

export function prepareCourses(data){
  const source = Array.isArray(data) ? data : (data?.trainings || data?.courses || []);
  const today = new Date();
  today.setHours(0,0,0,0);

  return source
    .map(adaptUniPopCourse)
    .filter(c => {
      const end = parseFrDate(c.endDate) || parseFrDate(c.startDate);
      return !end || end >= today;
    })
    .sort((a,b)=>{
      const da = parseFrDate(a.startDate);
      const db = parseFrDate(b.startDate);
      return (da?.getTime() ?? Infinity) - (db?.getTime() ?? Infinity);
    });
}

export function searchCourses(courses, query){
  const q = normalize(query);
  const tokens = q.split(/\s+/).filter(t => t.length > 2);

  const intent = {
    weekend: /week.?end|samedi|dimanche|wochenende/.test(q),
    evening: /soir|soiree|abend|apres le travail/.test(q),
    beginner: /debutant|anfanger|beginner|commencer|initiation/.test(q)
  };

  const synonymGroups = [
    [['photo','photographie','camera','kamera'], ['photo','photographie']],
    [['bien-etre','bien etre','stress','yoga','pilates','relax'], ['bien-etre','yoga','pilates']],
    [['creatif','creative','creativite','dessin','aquarelle','kunst'], ['creativite','dessin','aquarelle','art']],
    [['langue','langues','luxembourgeois','letzebuergesch','allemand','francais','anglais'], ['langue','luxembourgeois','allemand','francais','anglais']],
    [['informatique','ordinateur','computer','digital','ia','ai'], ['informatique','digital','ia']]
  ];

  return courses.map(course => {
    const hay = normalize([
      course.title, course.category, course.subject, course.location, course.venue,
      course.address, course.language, course.level, course.description,
      course.prerequisites, course.info, course.schedule, course.teacher, course.code
    ].join(' '));

    let score = tokens.reduce((s,t)=>s+(hay.includes(t)?3:0),0);

    if(intent.weekend && /(samedi|dimanche)/.test(normalize(course.schedule))) score += 8;
    if(intent.evening && /(17:|18:|19:|20:|soir)/.test(normalize(course.schedule))) score += 7;
    if(intent.beginner && /(debutant|anfanger|beginner)/.test(normalize(course.level + ' ' + course.title))) score += 8;

    for(const [wanted, targets] of synonymGroups){
      if(wanted.some(w=>q.includes(normalize(w))) && targets.some(t=>hay.includes(normalize(t)))) score += 10;
    }

    return {course,score};
  })
  .filter(x=>x.score>0)
  .sort((a,b)=>b.score-a.score)
  .slice(0,6)
  .map(x=>x.course);
}
