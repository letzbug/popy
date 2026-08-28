
import { searchCourses, prepareCourses } from './core/assistant.js';

const $ = s => document.querySelector(s);
const messages = $('#messages');
let courses = [];
let config = {};

async function boot(){
  config = await fetch('./config/tenant.json', {cache:'no-store'}).then(r=>{
    if(!r.ok) throw new Error(`Config HTTP ${r.status}`);
    return r.json();
  });

  const raw = await fetch(config.dataSource, {cache:'no-store'}).then(r=>{
    if(!r.ok) throw new Error(`Trainings HTTP ${r.status}`);
    return r.json();
  });

  courses = prepareCourses(raw);

  const chips = $('#chips');
  config.categories.forEach(cat=>{
    const b=document.createElement('button');
    b.textContent=cat;
    b.dataset.prompt=`Je cherche un cours dans la catégorie ${cat}.`;
    chips.appendChild(b);
  });

  addAssistant(
    `Bonjour ! Je suis <strong>popy</strong>, votre assistant UniPop. ` +
    `J'ai actuellement <strong>${courses.length}</strong> cours actuels ou à venir dans ma base. ` +
    `Comment puis-je vous aider aujourd'hui ?`
  );
  bindPromptButtons();
}

function bindPromptButtons(){
  document.querySelectorAll('[data-prompt]').forEach(btn=>{
    btn.onclick=()=>ask(btn.dataset.prompt);
  });
}

function safe(v=''){ return escapeHtml(String(v ?? '')); }

function courseCard(c){
  const place = [c.venue,c.location].filter(Boolean).join(' · ');
  const dates = c.startDate ? `${c.startDate}${c.endDate && c.endDate!==c.startDate ? ' → '+c.endDate : ''}` : '';
  const seats = Number.isFinite(Number(c.capacity))
    ? `${Math.max(0, Number(c.capacity)-Number(c.enrolled||0))} places restantes`
    : '';
  return `
    <article class="course">
      <strong>${safe(c.title)}</strong>
      ${c.code ? `<small>${safe(c.code)}</small>` : ''}
      ${place ? `<small>📍 ${safe(place)}</small>` : ''}
      ${dates ? `<small>📅 ${safe(dates)}</small>` : ''}
      ${c.schedule ? `<small>◷ ${safe(c.schedule)}</small>` : ''}
      ${c.language || c.level ? `<small>◌ ${safe(c.language)}${c.level ? ' · '+safe(c.level) : ''}</small>` : ''}
      ${c.description ? `<div class="courseDesc">${safe(c.description).slice(0,220)}${c.description.length>220?'…':''}</div>` : ''}
      ${seats ? `<small>${safe(seats)}</small>` : ''}
      ${c.url ? `<a class="courseLink" href="${safe(c.url)}" target="_blank" rel="noopener">Voir / s'inscrire →</a>` : ''}
    </article>`;
}

function addAssistant(html, found=[]){
  const row=document.createElement('div');
  row.className='msg assistant';
  const cards=found.length ? `<div class="courseGrid">${found.map(courseCard).join('')}</div>` : '';
  row.innerHTML=`<div class="avatar">☺</div><div class="bubble">${html}${cards}</div>`;
  messages.appendChild(row);
  messages.scrollTop=messages.scrollHeight;
}

function addUser(text){
  const row=document.createElement('div');
  row.className='msg user';
  row.innerHTML=`<div class="bubble">${escapeHtml(text)}</div>`;
  messages.appendChild(row);
  messages.scrollTop=messages.scrollHeight;
}

function ask(text){
  text=(text||'').trim();
  if(!text) return;
  addUser(text);
  $('#chatInput').value='';

  const q=text.toLowerCase();

  if(/combien.*cours|wie viele.*kurs|how many.*course/.test(q)){
    addAssistant(`J'ai actuellement <strong>${courses.length}</strong> cours actuels ou à venir dans les données UniPop.`);
    return;
  }

  if(/qui es-tu|qui es tu|wer bist|who are you|qu.?est.*unipop/.test(q)){
    addAssistant("Je suis <strong>popy</strong>, l'assistant UniPop. Je cherche uniquement dans les données UniPop chargées et je n'invente pas de cours.");
    return;
  }

  const found=searchCourses(courses,text);
  if(found.length){
    addAssistant(
      `Voici ${found.length === 1 ? 'un cours qui pourrait' : `${found.length} cours qui pourraient`} vous intéresser :`,
      found
    );
  } else {
    addAssistant("Je n'ai trouvé aucune correspondance suffisamment claire dans les cours UniPop actuels. Essayez avec un thème, un lieu, une langue, un niveau ou un moment de la semaine.");
  }
}

function escapeHtml(s=''){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

$('#chatForm').addEventListener('submit',e=>{e.preventDefault();ask($('#chatInput').value)});
$('#newChat').onclick=()=>{messages.innerHTML='';addAssistant(`Nouveau chat ouvert. J'ai ${courses.length} cours actuels ou à venir. Qu'avez-vous envie d'apprendre ?`)};
$('#infoBtn').onclick=()=>$('#infoDialog').showModal();
$('#closeInfo').onclick=()=>$('#infoDialog').close();

boot().catch(err=>{
  console.error(err);
  addAssistant(
    "Je n'arrive pas à charger la source UniPop pour le moment. " +
    "Vérifiez la connexion et que le site est ouvert via GitHub Pages."
  );
});
