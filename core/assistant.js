
export function normalize(value=''){
  return value.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/ß/g,'ss')
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function parseFrDate(value){
  if(!value) return null;
  const m = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m) return null;
  return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]), 23,59,59);
}

function lev(a,b){
  a=normalize(a); b=normalize(b);
  if(a===b) return 0;
  if(!a.length) return b.length;
  if(!b.length) return a.length;
  const prev = Array.from({length:b.length+1},(_,i)=>i);
  const cur = new Array(b.length+1);
  for(let i=1;i<=a.length;i++){
    cur[0]=i;
    for(let j=1;j<=b.length;j++){
      cur[j]=Math.min(
        cur[j-1]+1,
        prev[j]+1,
        prev[j-1]+(a[i-1]===b[j-1]?0:1)
      );
    }
    for(let j=0;j<=b.length;j++) prev[j]=cur[j];
  }
  return prev[b.length];
}

function fuzzyWordMatch(qword, hword){
  if(qword===hword) return 1;
  if(hword.includes(qword) || qword.includes(hword)){
    const min = Math.min(qword.length,hword.length);
    if(min>=4) return .86;
  }
  const maxLen=Math.max(qword.length,hword.length);
  if(maxLen<4) return 0;
  const d=lev(qword,hword);
  const sim=1-(d/maxLen);
  return sim >= .72 ? sim : 0;
}

function queryWords(q){
  const stop=new Set([
    'je','j','cherche','voudrais','veux','un','une','des','de','du','la','le','les',
    'pour','avec','dans','sur','qui','que','quoi','est','sont','me','moi','nous',
    'vous','et','ou','a','au','aux','en','vers','pres','proche',
    'ich','suche','mochte','möchte','einen','eine','der','die','das','fur','für','mit','und','oder',
    'i','want','looking','for','a','an','the','with','and','or','course','cours','kurs'
  ]);
  return normalize(q).split(' ').filter(w=>w.length>=3 && !stop.has(w));
}

const concepts = [
  {
    query:['photo','foto','fotografie','photographie','camera','kamera','lightroom','portrait'],
    course:['photo','fotografie','photographie','camera','kamera','lightroom','portrait']
  },
  {
    query:['bien etre','bienetre','stress','relax','yoga','pilates','sante','santé','meditation'],
    course:['bien etre','bienetre','yoga','pilates','sante','meditation','relaxation']
  },
  {
    query:['creatif','creative','creativite','kreativ','kunst','dessin','zeichnen','aquarelle','peinture','malen','artisanat'],
    course:['creativite','kreativ','kunst','dessin','aquarelle','peinture','artisanat','art']
  },
  {
    query:['langue','sprachen','sprache','language','luxembourgeois','letzebuergesch','francais','allemand','anglais'],
    course:['langue','luxembourgeois','letzebuergesch','francais','allemand','anglais']
  },
  {
    query:['informatique','computer','ordinateur','digital','numerique','numérique','ia','ai','intelligence artificielle'],
    course:['informatique','computer','digital','numerique','ia','intelligence artificielle']
  },
  {
    query:['cuisine','kochen','cooking','restaurant','aliment','food'],
    course:['cuisine','kochen','cooking','aliment']
  },
  {
    query:['bois','menuiserie','wood','holz'],
    course:['bois','menuiserie','wood','holz']
  },
  {
    query:['psychologie','psychology','stress','mental'],
    course:['psychologie','psychology']
  }
];

export function adaptUniPopCourse(raw){
  const address=raw.adresseCours || {};
  const teachers=Array.isArray(raw.enseignants)
    ? raw.enseignants.map(t=>[t.prenom,t.nom].filter(Boolean).join(' ')).join(', ')
    : '';

  return {
    id:raw.id ?? raw.coursId ?? raw.coursCode ?? String(Math.random()),
    code:raw.coursCode || raw.coursId || '',
    title:raw.intitule || 'Cours UniPop',
    category:raw.categorieNom || '',
    subject:raw.matiereNom || '',
    location:address.localite || '',
    venue:address.nom || '',
    address:[address.rueNumero,address.codePostal,address.localite].filter(Boolean).join(', '),
    language:raw.langueCoursNom || raw.langueCoursCode || '',
    languageCode:raw.langueCoursCode || '',
    level:raw.niveau || '',
    description:raw.description || '',
    prerequisites:raw.prerequis || '',
    info:raw.renseignements || '',
    format:raw.format || '',
    schedule:raw.horairePrevu || '',
    schedules:Array.isArray(raw.horaires) ? raw.horaires : [],
    startDate:raw.dateDebut || '',
    endDate:raw.dateFin || '',
    duration:raw.duree || '',
    teacher:teachers,
    price:raw.cout,
    capacity:raw.nbPlaces,
    enrolled:raw.nbInscrits,
    registration:!!raw.onlineRegistration,
    url:raw.onlineRegistrationUrl || raw.organisateur?.websiteUrl || 'https://www.unipop.lu',
    organiserCode:normalize(raw.organisateur?.code || ''),
    organiserName:normalize(raw.organisateur?.nom || ''),
    _raw:raw
  };
}

export function prepareCourses(data){
  const source=Array.isArray(data) ? data : (data?.trainings || data?.courses || []);
  const today=new Date();
  today.setHours(0,0,0,0);

  return source
    // HARD FILTER: UniPop only. No courses from any other organiser.
    .filter(raw => normalize(raw?.organisateur?.code || '') === 'unipop')
    .map(adaptUniPopCourse)
    .filter(c=>{
      const end=parseFrDate(c.endDate) || parseFrDate(c.startDate);
      return !end || end>=today;
    })
    .sort((a,b)=>{
      const da=parseFrDate(a.startDate), db=parseFrDate(b.startDate);
      return (da?.getTime() ?? Infinity)-(db?.getTime() ?? Infinity);
    });
}

function courseHay(course){
  return normalize([
    course.title,course.category,course.subject,course.location,course.venue,course.address,
    course.language,course.languageCode,course.level,course.description,course.prerequisites,
    course.info,course.schedule,course.teacher,course.code
  ].join(' '));
}

function temporalScore(course,q){
  const nq=normalize(q);
  let s=0;
  const schedule=normalize(course.schedule);
  if(/week ?end|samedi|dimanche|wochenende|weekend/.test(nq) &&
     /(samedi|dimanche|saturday|sunday|sonntag|samstag)/.test(schedule)) s+=15;
  if(/soir|soiree|abend|evening|apres travail/.test(nq) &&
     /(17:|18:|19:|20:|21:)/.test(schedule)) s+=12;
  if(/matin|morgen|morning/.test(nq) && /(08:|09:|10:|11:)/.test(schedule)) s+=10;
  if(/debutant|anfanger|anfänger|beginner|initiation/.test(nq) &&
     /debutant|anfanger|beginner|initiation/.test(normalize(course.level+' '+course.title))) s+=14;
  return s;
}

export function searchCourses(courses,query){
  const nq=normalize(query);
  const qwords=queryWords(nq);

  const ranked=courses.map(course=>{
    const hay=courseHay(course);
    const hwords=[...new Set(hay.split(' ').filter(w=>w.length>=3))];

    let score=0;
    let matchedWords=0;

    // Whole phrase / substring
    if(nq.length>=4 && hay.includes(nq)) score+=30;

    // Fuzzy token matching: tolerates typos such as "fotogrfie", "anfnger", "belvall".
    for(const qw of qwords){
      let best=0;
      for(const hw of hwords){
        const m=fuzzyWordMatch(qw,hw);
        if(m>best) best=m;
        if(best===1) break;
      }
      if(best){
        matchedWords++;
        score += best>=.95 ? 9 : best>=.82 ? 7 : 5;
      }
    }

    // Context concepts: infer topic even if wording is imperfect.
    for(const concept of concepts){
      const wanted=concept.query.some(term=>{
        const nt=normalize(term);
        if(nq.includes(nt)) return true;
        return qwords.some(qw=>fuzzyWordMatch(qw,nt)>=.75);
      });
      if(wanted && concept.course.some(term=>hay.includes(normalize(term)))) score+=18;
    }

    score += temporalScore(course,nq);

    // Location gets extra weight
    const locWords=normalize(course.location+' '+course.venue).split(' ').filter(w=>w.length>=3);
    for(const qw of qwords){
      if(locWords.some(lw=>fuzzyWordMatch(qw,lw)>=.75)) score+=10;
    }

    // Encourage matches that explain more of the user's sentence.
    if(qwords.length) score += (matchedWords/qwords.length)*10;

    return {course,score,matchedWords};
  })
  .filter(x=>x.score>=6)
  .sort((a,b)=>b.score-a.score);

  // If the query is very typo-heavy, keep plausible contextual results rather than returning nothing.
  if(!ranked.length && qwords.length){
    return courses.map(course=>{
      const hay=courseHay(course), hwords=hay.split(' ').filter(w=>w.length>=3);
      let s=0;
      for(const qw of qwords){
        let best=0;
        for(const hw of hwords) best=Math.max(best,fuzzyWordMatch(qw,hw));
        s+=best;
      }
      return {course,score:s};
    })
    .filter(x=>x.score>=.72)
    .sort((a,b)=>b.score-a.score)
    .slice(0,6)
    .map(x=>x.course);
  }

  return ranked.slice(0,6).map(x=>x.course);
}
