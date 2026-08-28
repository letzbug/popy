
export function normalize(value=''){
  return value.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/ß/g,'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function parseFrDate(value){
  if(!value) return null;
  const m=String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m) return null;
  return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12,0,0);
}

function lev(a,b){
  a=normalize(a); b=normalize(b);
  if(a===b) return 0;
  if(!a.length) return b.length;
  if(!b.length) return a.length;
  const p=Array.from({length:b.length+1},(_,i)=>i);
  const c=new Array(b.length+1);
  for(let i=1;i<=a.length;i++){
    c[0]=i;
    for(let j=1;j<=b.length;j++){
      c[j]=Math.min(c[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));
    }
    for(let j=0;j<=b.length;j++) p[j]=c[j];
  }
  return p[b.length];
}

function similarity(a,b){
  a=normalize(a); b=normalize(b);
  if(!a||!b) return 0;
  if(a===b) return 1;
  if((a.includes(b)||b.includes(a)) && Math.min(a.length,b.length)>=4) return .91;
  const max=Math.max(a.length,b.length);
  return 1-(lev(a,b)/max);
}

function words(v){
  return normalize(v).split(' ').filter(Boolean);
}

function hasApprox(query, candidates, threshold=.74){
  const qw=words(query);
  return candidates.some(raw=>{
    const term=normalize(raw);
    if(query.includes(term)) return true;
    const tw=words(term);
    return tw.every(t=>qw.some(q=>similarity(q,t)>=threshold));
  });
}

const STOP=new Set([
  'je','cherche','voudrais','veux','aimerais','trouve','trouver','montre','montrer',
  'un','une','des','de','du','la','le','les','pour','avec','dans','sur','qui','que',
  'quoi','est','sont','me','moi','nous','vous','et','ou','au','aux','en','vers','pres',
  'ich','suche','mochte','einen','eine','der','die','das','fur','mit','und','oder','mir','zeigen',
  'i','want','looking','find','show','for','the','with','and','or','course','cours','kurs','kurse'
]);

function usefulWords(query){
  return words(query).filter(w=>w.length>=3 && !STOP.has(w));
}

const TOPICS=[
  {id:'photo', query:['photo','photographie','fotografie','foto','camera','kamera','lightroom','portrait'],
   course:['photo','photographie','fotografie','camera','lightroom','portrait']},
  {id:'wellbeing', query:['bien etre','bienetre','stress','relax','relaxation','yoga','pilates','meditation','sante','gesundheit'],
   course:['bien etre','bienetre','stress','relax','yoga','pilates','meditation','sante','gesundheit']},
  {id:'creative', query:['creatif','creative','creativite','kreativ','kunst','dessin','zeichnen','aquarelle','peinture','malen','artisanat'],
   course:['creativite','kreativ','kunst','dessin','zeichnen','aquarelle','peinture','artisanat','art']},
  {id:'languages', query:['langue','langues','sprache','sprachen','language','languages','luxembourgeois','letzebuergesch','francais','allemand','anglais'],
   course:['langue','luxembourgeois','letzebuergesch','francais','allemand','anglais','deutsch','english']},
  {id:'digital', query:['informatique','ordinateur','computer','digital','numerique','ia','ai','intelligence artificielle'],
   course:['informatique','ordinateur','computer','digital','numerique','ia','intelligence artificielle']},
  {id:'cooking', query:['cuisine','kochen','cooking','aliment','food','culinaire'],
   course:['cuisine','kochen','cooking','aliment','culinaire']},
  {id:'psychology', query:['psychologie','psychology','mental','psychisch'],
   course:['psychologie','psychology','mental']},
  {id:'wood', query:['bois','menuiserie','wood','holz','schreinern'],
   course:['bois','menuiserie','wood','holz']},
  {id:'sport', query:['sport','fitness','movement','mouvement','bewegung','danse','dance','tanz'],
   course:['sport','fitness','mouvement','bewegung','danse','dance','tanz']}
];

const LANGS=[
  {code:'FR', terms:['francais','franzoesisch','french','fr']},
  {code:'DE', terms:['allemand','deutsch','german','de']},
  {code:'LB', terms:['luxembourgeois','letzebuergesch','luxemburgisch','lb','lu']},
  {code:'EN', terms:['anglais','englisch','english','en']}
];

const LEVELS=[
  {id:'beginner', terms:['debutant','anfanger','anfaenger','beginner','initiation','commencer'], course:['debutant','anfanger','anfaenger','beginner','initiation']},
  {id:'intermediate', terms:['intermediaire','mittelstufe','intermediate'], course:['intermediaire','mittelstufe','intermediate']},
  {id:'advanced', terms:['avance','fortgeschritten','advanced'], course:['avance','fortgeschritten','advanced']}
];

const DAYS=[
  {id:1,terms:['lundi','montag','monday']},
  {id:2,terms:['mardi','dienstag','tuesday']},
  {id:3,terms:['mercredi','mittwoch','wednesday']},
  {id:4,terms:['jeudi','donnerstag','thursday']},
  {id:5,terms:['vendredi','freitag','friday']},
  {id:6,terms:['samedi','samstag','saturday']},
  {id:0,terms:['dimanche','sonntag','sunday']}
];

const MONTHS=[
  {m:0,terms:['janvier','januar','january']},{m:1,terms:['fevrier','februar','february']},
  {m:2,terms:['mars','marz','maerz','march']},{m:3,terms:['avril','april']},
  {m:4,terms:['mai','may']},{m:5,terms:['juin','juni','june']},
  {m:6,terms:['juillet','juli','july']},{m:7,terms:['aout','august']},
  {m:8,terms:['septembre','september']},{m:9,terms:['octobre','oktober','october']},
  {m:10,terms:['novembre','november']},{m:11,terms:['decembre','dezember','december']}
];

export function adaptUniPopCourse(raw){
  const a=raw.adresseCours||{};
  const teachers=Array.isArray(raw.enseignants)
    ? raw.enseignants.map(t=>[t.prenom,t.nom].filter(Boolean).join(' ')).join(', ')
    : '';
  return {
    id:raw.id ?? raw.coursId ?? raw.coursCode ?? String(Math.random()),
    code:raw.coursCode||raw.coursId||'',
    title:raw.intitule||'Cours UniPop',
    category:raw.categorieNom||'',
    subject:raw.matiereNom||'',
    location:a.localite||'',
    venue:a.nom||'',
    address:[a.rueNumero,a.codePostal,a.localite].filter(Boolean).join(', '),
    language:raw.langueCoursNom||raw.langueCoursCode||'',
    languageCode:raw.langueCoursCode||'',
    level:raw.niveau||'',
    description:raw.description||'',
    prerequisites:raw.prerequis||'',
    info:raw.renseignements||'',
    format:raw.format||'',
    schedule:raw.horairePrevu||'',
    schedules:Array.isArray(raw.horaires)?raw.horaires:[],
    startDate:raw.dateDebut||'',
    endDate:raw.dateFin||'',
    duration:raw.duree||'',
    teacher:teachers,
    price:raw.cout,
    capacity:raw.nbPlaces,
    enrolled:raw.nbInscrits,
    registration:!!raw.onlineRegistration,
    url:raw.onlineRegistrationUrl||raw.organisateur?.websiteUrl||'https://www.unipop.lu',
    organiserCode:normalize(raw.organisateur?.code||''),
    _raw:raw
  };
}

export function prepareCourses(data){
  const source=Array.isArray(data)?data:(data?.trainings||data?.courses||[]);
  const today=new Date(); today.setHours(0,0,0,0);
  return source
    .filter(r=>normalize(r?.organisateur?.code||'')==='unipop')
    .map(adaptUniPopCourse)
    .filter(c=>{
      const end=parseFrDate(c.endDate)||parseFrDate(c.startDate);
      return !end||end>=today;
    })
    .sort((a,b)=>(parseFrDate(a.startDate)?.getTime()??Infinity)-(parseFrDate(b.startDate)?.getTime()??Infinity));
}

function discoverLocation(query,courses){
  const candidates=new Map();
  courses.forEach(c=>{
    [c.location,c.venue].filter(Boolean).forEach(v=>{
      const n=normalize(v);
      if(n.length>=4) candidates.set(n,v);
      words(n).filter(w=>w.length>=4).forEach(w=>candidates.set(w,v));
    });
  });
  let best=null;
  for(const [key,label] of candidates){
    if(query.includes(key)) return {key,label,confidence:1};
    for(const qw of usefulWords(query)){
      const s=similarity(qw,key);
      if(s>=.80 && (!best||s>best.confidence)) best={key,label,confidence:s};
    }
  }
  return best;
}

function analyseQuery(query,courses){
  const nq=normalize(query);
  const topic=TOPICS.find(t=>hasApprox(nq,t.query,.72))||null;
  const language=LANGS.find(l=>hasApprox(nq,l.terms,.80))||null;
  const level=LEVELS.find(l=>hasApprox(nq,l.terms,.72))||null;
  const day=DAYS.find(d=>hasApprox(nq,d.terms,.80))||null;
  const month=MONTHS.find(m=>hasApprox(nq,m.terms,.80))||null;
  const location=discoverLocation(nq,courses);

  let daypart=null;
  if(hasApprox(nq,['soir','soiree','abend','evening','apres travail'],.76)) daypart='evening';
  else if(hasApprox(nq,['matin','morgen','morning'],.80)) daypart='morning';
  else if(hasApprox(nq,['apres midi','apresmidi','nachmittag','afternoon'],.76)) daypart='afternoon';
  else if(hasApprox(nq,['weekend','week end','wochenende'],.80)) daypart='weekend';

  const wantsPlaces=hasApprox(nq,['places libres','place libre','disponible','disponibles','freie platze','frei','available'],.74);

  return {nq,topic,language,level,day,month,location,daypart,wantsPlaces};
}

function scheduleHours(course){
  const arr=[];
  const raw=[course.schedule,...course.schedules.map(s=>s.heure||'')].join(' ');
  for(const m of raw.matchAll(/(\d{1,2}):(\d{2})/g)) arr.push(Number(m[1])+Number(m[2])/60);
  return arr;
}

function matchesDay(course,day){
  if(!day) return true;
  const hay=normalize(course.schedule+' '+course.schedules.map(s=>s.jour||'').join(' '));
  return day.terms.some(t=>hay.includes(normalize(t)));
}

function matchesMonth(course,month){
  if(!month) return true;
  const d=parseFrDate(course.startDate);
  return !!d && d.getMonth()===month.m;
}

function matchesDaypart(course,part){
  if(!part) return true;
  const hay=normalize(course.schedule+' '+course.schedules.map(s=>s.jour||'').join(' '));
  const hrs=scheduleHours(course);
  if(part==='weekend') return /(samedi|dimanche|samstag|sonntag|saturday|sunday)/.test(hay);
  if(part==='morning') return hrs.some(h=>h>=6&&h<12);
  if(part==='afternoon') return hrs.some(h=>h>=12&&h<17);
  if(part==='evening') return hrs.some(h=>h>=17);
  return true;
}

function matchesLanguage(course,lang){
  if(!lang) return true;
  return normalize(course.languageCode)===normalize(lang.code) ||
         lang.terms.some(t=>normalize(course.language).includes(normalize(t)));
}

function matchesLevel(course,level){
  if(!level) return true;
  const hay=normalize(course.level+' '+course.title+' '+course.description);
  return level.course.some(t=>hay.includes(normalize(t)));
}

function matchesLocation(course,loc){
  if(!loc) return true;
  const hay=normalize(course.location+' '+course.venue+' '+course.address);
  const lk=normalize(loc.key);
  if(hay.includes(lk)) return true;
  return words(hay).some(hw=>similarity(hw,lk)>=.82);
}

function matchesTopic(course,topic){
  if(!topic) return true;
  const title=normalize(course.title);
  const subject=normalize(course.subject);
  const category=normalize(course.category);
  const desc=normalize(course.description);
  return topic.course.some(term=>{
    term=normalize(term);
    return title.includes(term)||subject.includes(term)||category.includes(term)||desc.includes(term);
  });
}

function weightedTextScore(course,q){
  const qwords=usefulWords(q);
  const fields=[
    [course.title,12],
    [course.subject,10],
    [course.category,8],
    [course.location+' '+course.venue,8],
    [course.level,7],
    [course.language,6],
    [course.description,3],
    [course.info+' '+course.prerequisites,2],
    [course.teacher,2]
  ];
  let score=0;
  for(const qw of qwords){
    let best=0;
    for(const [field,weight] of fields){
      for(const fw of words(field)){
        const s=similarity(qw,fw);
        if(s>=.74) best=Math.max(best,s*weight);
      }
    }
    score+=best;
  }
  return score;
}

function strictPass(course,a){
  if(a.topic&&!matchesTopic(course,a.topic)) return false;
  if(a.language&&!matchesLanguage(course,a.language)) return false;
  if(a.level&&!matchesLevel(course,a.level)) return false;
  if(a.day&&!matchesDay(course,a.day)) return false;
  if(a.month&&!matchesMonth(course,a.month)) return false;
  if(a.location&&!matchesLocation(course,a.location)) return false;
  if(a.daypart&&!matchesDaypart(course,a.daypart)) return false;
  if(a.wantsPlaces && Number.isFinite(Number(course.capacity)) &&
     Math.max(0,Number(course.capacity)-Number(course.enrolled||0))<=0) return false;
  return true;
}

function scoreCourse(course,a){
  let score=weightedTextScore(course,a.nq);
  if(a.topic&&matchesTopic(course,a.topic)) score+=35;
  if(a.location&&matchesLocation(course,a.location)) score+=32;
  if(a.level&&matchesLevel(course,a.level)) score+=22;
  if(a.language&&matchesLanguage(course,a.language)) score+=20;
  if(a.day&&matchesDay(course,a.day)) score+=18;
  if(a.month&&matchesMonth(course,a.month)) score+=16;
  if(a.daypart&&matchesDaypart(course,a.daypart)) score+=18;
  if(a.wantsPlaces){
    const free=Number(course.capacity)-Number(course.enrolled||0);
    if(Number.isFinite(free)&&free>0) score+=12;
  }
  return score;
}

function constraintLabels(a){
  const x=[];
  if(a.topic) x.push(a.topic.id);
  if(a.location) x.push(a.location.label);
  if(a.level) x.push(a.level.id);
  if(a.language) x.push(a.language.code);
  if(a.day) x.push(a.day.terms[0]);
  if(a.month) x.push(a.month.terms[0]);
  if(a.daypart) x.push(a.daypart);
  if(a.wantsPlaces) x.push('places disponibles');
  return x;
}

export function searchCourses(courses,query){
  const analysis=analyseQuery(query,courses);

  // 1) Exact intent: ALL explicitly detected constraints must match.
  let exact=courses
    .filter(c=>strictPass(c,analysis))
    .map(c=>({course:c,score:scoreCourse(c,analysis)}))
    .filter(x=>x.score>0 || constraintLabels(analysis).length>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,6);

  if(exact.length){
    exact.forEach(x=>x.course._match={mode:'exact',score:x.score,constraints:constraintLabels(analysis)});
    return {courses:exact.map(x=>x.course),mode:'exact',constraints:constraintLabels(analysis)};
  }

  // 2) No exact result: calculate close alternatives, but DO NOT pretend they are exact.
  const near=courses
    .map(c=>{
      const checks=[
        !analysis.topic||matchesTopic(c,analysis.topic),
        !analysis.location||matchesLocation(c,analysis.location),
        !analysis.level||matchesLevel(c,analysis.level),
        !analysis.language||matchesLanguage(c,analysis.language),
        !analysis.day||matchesDay(c,analysis.day),
        !analysis.month||matchesMonth(c,analysis.month),
        !analysis.daypart||matchesDaypart(c,analysis.daypart)
      ];
      const explicit=checks.length;
      const matched=checks.filter(Boolean).length;
      return {course:c,coverage:matched/explicit,score:scoreCourse(c,analysis)};
    })
    .filter(x=>x.score>=8)
    .sort((a,b)=>b.coverage-a.coverage||b.score-a.score)
    .slice(0,6);

  near.forEach(x=>x.course._match={mode:'near',score:x.score,constraints:constraintLabels(analysis)});
  return {courses:near.map(x=>x.course),mode:near.length?'near':'none',constraints:constraintLabels(analysis)};
}
