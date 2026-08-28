
import { searchCourses } from './core/assistant.js';

const $ = s => document.querySelector(s);
const messages = $('#messages');
let courses = [];
let config = {};

async function boot(){
  config = await fetch('./config/tenant.json').then(r=>r.json());
  courses = await fetch(config.dataSource).then(r=>r.json());

  const chips = $('#chips');
  config.categories.forEach(cat=>{
    const b=document.createElement('button');
    b.textContent=cat;
    b.dataset.prompt=`Je cherche un cours dans la catégorie ${cat}.`;
    chips.appendChild(b);
  });

  addAssistant("Bonjour ! Je suis <strong>popy</strong>, votre assistant UniPop. Comment puis-je vous aider aujourd'hui ?");
  bindPromptButtons();
}

function bindPromptButtons(){
  document.querySelectorAll('[data-prompt]').forEach(btn=>{
    btn.onclick=()=>ask(btn.dataset.prompt);
  });
}

function addAssistant(html, found=[]){
  const row=document.createElement('div');
  row.className='msg assistant';
  const cards=found.length ? `<div class="courseGrid">${found.map(c=>`
    <article class="course">
      <strong>${escapeHtml(c.title)}</strong>
      <small>📍 ${escapeHtml(c.location)} · ${escapeHtml(c.language)}</small>
      <small>◷ ${escapeHtml(c.time)} · ${escapeHtml(c.level)}</small>
      <div>${escapeHtml(c.description)}</div>
    </article>`).join('')}</div>` : '';
  row.innerHTML=`<div class="avatar">☺</div><div class="bubble">${html}${cards}</div>`;
  messages.appendChild(row);
  messages.scrollTop=messages.scrollHeight;
}

function addUser(text){
  const row=document.createElement('div');
  row.className='msg user';
  row.innerHTML=`<div class="bubble">${escapeHtml(text)}</div>`;
  messages.appendChild(row);
}

function ask(text){
  text=(text||'').trim();
  if(!text) return;
  addUser(text);
  $('#chatInput').value='';

  const q=text.toLowerCase();
  if(/qui es-tu|qui es tu|popy|unipop.*quoi|qu.?est.*unipop/.test(q)){
    addAssistant("Je suis popy, l'assistant UniPop. Je peux vous aider à découvrir les cours disponibles à partir des données officielles qui me sont fournies.");
    return;
  }

  const found=searchCourses(courses,text);
  if(found.length){
    addAssistant(`Voici ${found.length === 1 ? 'un cours qui pourrait' : 'des cours qui pourraient'} vous intéresser :`,found);
  } else {
    addAssistant("Je n'ai trouvé aucune correspondance suffisamment claire dans mes données actuelles. Essayez avec un thème, un lieu, une langue ou un moment de la semaine.");
  }
}

function escapeHtml(s=''){
  return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

$('#chatForm').addEventListener('submit',e=>{e.preventDefault();ask($('#chatInput').value)});
$('#newChat').onclick=()=>{messages.innerHTML='';addAssistant("Nouveau chat ouvert. Qu'avez-vous envie d'apprendre ?")};
$('#infoBtn').onclick=()=>$('#infoDialog').showModal();
$('#closeInfo').onclick=()=>$('#infoDialog').close();

boot().catch(err=>{
  console.error(err);
  addAssistant("Impossible de charger les données du prototype. Vérifiez que le site est servi via GitHub Pages ou un serveur local.");
});
