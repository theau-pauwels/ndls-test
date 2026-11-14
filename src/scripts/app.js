import { vocabulary } from '../data/vocabulary.js';

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const categoryNames = ['Salutations','Se présenter','Pays et langues','École et cours','Prononciation','Mots interrogatifs','Verbes','Nombres','Âge','Heure et transports','Dates et saisons','Famille','Cantine et loisirs','Noms divers','Adjectifs et adverbes','Vêtements','Couleurs et motifs','Phrases en contexte'];
const shuffle = (items) => [...items].sort(() => Math.random() - .5);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
const safe = (s) => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = (s) => String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,"'").replace(/[.,!?;:()–—]/g,' ').replace(/\s+/g,' ').trim();
const load = () => {try{return JSON.parse(localStorage.getItem('ndls-progress-v1')||'{}')}catch{return {}}};
let progress = load(), seenCount=0, rightCount=0, currentView='home', cards=[],cardIndex=0,cardRevealed=false,practiceList=[],practiceIndex=0,practiceDone=false,clockQuestion=null,clockDone=false,contextQuestion=null,contextDone=false,testItems=[],testLive=false;
const persist = () => {try{localStorage.setItem('ndls-progress-v1',JSON.stringify(progress))}catch{} renderStats()};
const getStat = (id) => progress[id]||{box:0,attempts:0,correct:0,due:0};
const record = (id,correct) => {const prev=getStat(id), box=correct?Math.min(prev.box+1,5):0;progress[id]={box,attempts:prev.attempts+1,correct:prev.correct+(correct?1:0),due:Date.now()+(correct?[0,60000,3600000,86400000,3*86400000,7*86400000][box]:0)};persist()};
const toast = (msg) => {const t=$('toast');t.textContent=msg;t.classList.add('visible');clearTimeout(window.ndlsToast);window.ndlsToast=setTimeout(()=>t.classList.remove('visible'),2500)};
function renderStats(){
 const values=Object.values(progress),mastered=values.filter(v=>v.box>=3).length,due=values.filter(v=>v.attempts&&v.due<=Date.now()).length,attempts=values.reduce((a,v)=>a+v.attempts,0),correct=values.reduce((a,v)=>a+v.correct,0),percent=Math.round(100*mastered/vocabulary.length);
 $('stat-total').textContent=vocabulary.length;$('stat-mastered').textContent=mastered;$('stat-due').textContent=due;$('stat-accuracy').textContent=attempts?Math.round(100*correct/attempts)+'%':'—';$('stat-mastered-sub').textContent=values.length+' cartes déjà rencontrées';$('sidebar-percent').textContent=percent+'%';$('sidebar-bar').style.width=percent+'%';$('sidebar-mastered').textContent=mastered+' / '+vocabulary.length+' mots maîtrisés';
 for(const el of $$('[data-count]'))el.textContent=vocabulary.filter(v=>v.category===Number(el.dataset.count)).length+' cartes';
 const days=new Set(values.filter(v=>v.attempts).map(v=>v.lastDay).filter(Boolean));$('streak').textContent=days.size?1:0;
}
function mark(id,correct){record(id,correct);progress[id].lastDay=new Date().toISOString().slice(0,10);persist()}
function navigate(view){
 currentView=view;for(const el of $$('.view'))el.classList.toggle('hidden',el.id!=='view-'+view);
 for(const el of $$('.nav-link'))el.classList.toggle('active',el.dataset.view===view);
 $('view-name').textContent=({home:'Vue d’ensemble',cards:'Flashcards',practice:'Entraînement',clock:'Lire l’heure',context:'Mise en situation',grammar:'Grammaire',test:'Test blanc'})[view];
 $('sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'instant'});
 if(view==='cards')initCards();if(view==='practice')initPractice();if(view==='clock')newClock();if(view==='context')newContext();if(view==='grammar')showGrammar();
 if(view==='test'&&!testLive){$('test-config').classList.remove('hidden');$('test-active').classList.add('hidden');$('test-results').classList.add('hidden')}
}
function optionsForCategory(id){$(id).innerHTML='<option value="all">Tout le vocabulaire ('+vocabulary.length+')</option>'+categoryNames.map((name,i)=>'<option value="'+(i+1)+'">'+safe(name)+' ('+vocabulary.filter(v=>v.category===i+1).length+')</option>').join('')}
for(const id of ['cards-category','practice-category'])optionsForCategory(id);
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
$$('[data-category]').forEach(b=>b.addEventListener('click',()=>{$('cards-category').value=b.dataset.category;navigate('cards')}));
$('hero-start').addEventListener('click',()=>navigate('cards'));
$('menu-toggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
$('reset-button').addEventListener('click',()=>{if(confirm('Effacer toute la progression sauvegardée sur cet appareil ?')){progress={};persist();toast('Progression réinitialisée')}});

function dirFor(mode){return mode==='mixed'?pick(['fr-nl','nl-fr']):mode}
function getSides(item,direction){return direction==='fr-nl'?{prompt:item.fr,answer:item.nl,label:'TRADUIS EN NÉERLANDAIS'}:{prompt:item.nl,answer:item.fr,label:'TRADUIS EN FRANÇAIS'}}
function cardPool(){
 let pool=vocabulary.filter(v=>$('cards-category').value==='all'||v.category===Number($('cards-category').value));
 let mode=$('cards-priority').value;if(mode==='due')pool=pool.filter(v=>getStat(v.id).attempts&&getStat(v.id).due<=Date.now());if(mode==='weak')pool=pool.filter(v=>getStat(v.id).attempts&&getStat(v.id).box<3);
 return shuffle(pool).sort((a,b)=>getStat(a.id).box-getStat(b.id).box);
}
function initCards(){cards=cardPool();cardIndex=0;showCard()}
function showCard(){
 cardRevealed=false;$('flashcard').classList.remove('revealed');$('card-actions').classList.add('hidden');$('card-placeholder').classList.remove('hidden');
 $('cards-counter').textContent=cards.length?'Carte '+(Math.min(cardIndex+1,cards.length))+' / '+cards.length:'Aucune carte à revoir';$('cards-bar').style.width=cards.length?(100*cardIndex/cards.length)+'%':'0%';$('cards-progress-text').textContent=cards.length?'Retiens chaque expression':'Choisis une autre priorité';
 if(cardIndex>=cards.length){$('card-label').textContent='SÉRIE TERMINÉE';$('card-question').textContent='Goed gedaan !';$('card-hint').textContent='Bravo ! Relance une nouvelle série.';return}
 const s=getSides(cards[cardIndex],dirFor($('cards-direction').value));cards[cardIndex].sides=s;
 $('card-label').textContent=s.label;$('card-question').textContent=s.prompt;$('card-hint').textContent='Clique pour révéler la traduction';
}
function flipCard(){if(cardIndex>=cards.length)return; if(cardRevealed)return;cardRevealed=true;$('flashcard').classList.add('revealed');$('card-label').textContent='LA BONNE RÉPONSE';$('card-question').textContent=cards[cardIndex].sides.answer;$('card-hint').textContent=cards[cardIndex].sides.prompt;$('card-actions').classList.remove('hidden');$('card-placeholder').classList.add('hidden')}
$('flashcard').addEventListener('click',flipCard);$('flashcard').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();flipCard()}});
$('card-again').addEventListener('click',()=>gradeCard(false));$('card-know').addEventListener('click',()=>gradeCard(true));
function gradeCard(correct){if(!cardRevealed||cardIndex>=cards.length)return;mark(cards[cardIndex].id,correct);if(!correct){const previous=cards[cardIndex];const target=Math.min(cardIndex+4,cards.length);cards.splice(target,0,previous)}cardIndex++;showCard()}
$('cards-restart').addEventListener('click',initCards);$('cards-category').addEventListener('change',initCards);$('cards-direction').addEventListener('change',initCards);$('cards-priority').addEventListener('change',initCards);
document.addEventListener('keydown',e=>{if(currentView==='cards'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)){if(e.code==='Space'){e.preventDefault();flipCard()}if(e.code==='ArrowRight'&&cardRevealed)gradeCard(true);if(e.code==='ArrowLeft'&&cardRevealed)gradeCard(false)}});

function checkAnswer(input,expected){
 const normalized=normalize(input);if(!normalized)return false;
 const alternatives=expected.split(/\s+\/\s+|\s+=\s+/).map(s=>s.replace(/\([^)]*\)/g,'').trim()).filter(Boolean);
 const cleanExpected=normalize(expected.replace(/\([^)]*\)/g,''));
 return normalized===cleanExpected||alternatives.some(a=>normalize(a)===normalized)||normalize(expected)===normalized;
}
function questionPanel(opts){return '<div class="question-panel"><div class="question-top"><span>'+safe(opts.kicker)+'</span><span>'+safe(opts.counter||'')+'</span></div><div class="question-prompt">'+safe(opts.prompt)+'</div><div class="question-caption">'+safe(opts.sub||'Écris la traduction puis valide.')+'</div><form id="'+opts.form+'"><input class="answer-input" id="'+opts.input+'" autocomplete="off" spellcheck="false" placeholder="Ta réponse…" aria-label="Ta réponse" required/><div class="question-actions"><button class="btn btn-dark" type="submit">Vérifier ma réponse ↗</button></div></form><div id="'+opts.feedback+'"></div><div class="question-actions"><button class="btn btn-dark hidden" id="'+opts.next+'">Question suivante →</button></div></div>'}
function nextPracticeList(){let pool=vocabulary.filter(v=>$('practice-category').value==='all'||v.category===Number($('practice-category').value));return shuffle(pool).sort((a,b)=>getStat(a.id).box-getStat(b.id).box)}
function initPractice(){practiceList=nextPracticeList();practiceIndex=0;showPractice()}
function showPractice(){
 practiceDone=false;let v=practiceList[practiceIndex%practiceList.length];if(!v){$('practice-area').innerHTML='<p>Aucune carte disponible.</p>';return}
 const s=getSides(v,dirFor($('practice-direction').value));v.sides=s;
 $('practice-area').innerHTML=questionPanel({kicker:'TRADUCTION ACTIVE · '+categoryNames[v.category-1].toUpperCase(),counter:'QUESTION '+(practiceIndex+1),prompt:s.prompt,form:'practice-form',input:'practice-answer',feedback:'practice-feedback',next:'practice-next'});
 $('practice-answer').focus();
 $('practice-form').addEventListener('submit',e=>{e.preventDefault();if(practiceDone)return;practiceDone=true;
 const answer=$('practice-answer').value,ok=checkAnswer(answer,s.answer);mark(v.id,ok);
 $('practice-feedback').innerHTML='<div class="feedback '+(ok?'':'bad')+'"><strong>'+(ok?'✓ Goed gedaan !':'✕ Pas tout à fait.')+'</strong><p>Réponse attendue : <b>'+safe(s.answer)+'</b></p>'+(ok?'':'<small>Relis la phrase : fais attention aux articles <b>de/het</b>, à l’ordre des mots et aux formes alternatives. La carte reviendra plus tôt.</small>')+'</div>';
 $('practice-form').querySelector('button').disabled=true;$('practice-next').classList.remove('hidden');});
 $('practice-next').addEventListener('click',()=>{practiceIndex++;showPractice()});
}
$('practice-restart').addEventListener('click',initPractice);$('practice-category').addEventListener('change',initPractice);$('practice-direction').addEventListener('change',initPractice);

const nums=['nul','een','twee','drie','vier','vijf','zes','zeven','acht','negen','tien','elf','twaalf','dertien','veertien','vijftien','zestien','zeventien','achttien','negentien','twintig','eenentwintig','tweeëntwintig','drieëntwintig','vierentwintig','vijfentwintig','zesentwintig','zevenentwintig','achtentwintig','negenentwintig'];
function hourName(hour){return ['twaalf','een','twee','drie','vier','vijf','zes','zeven','acht','negen','tien','elf'][hour%12]}
function nlNum(n){if(n<nums.length)return nums[n];if(n===30)return 'dertig';return String(n)}
function sayTime(h,m){
 const thisHour=hourName(h),next=hourName(h+1);let phrase='';
 if(m===0)phrase=thisHour+' uur';
 else if(m===15)phrase='kwart over '+thisHour;
 else if(m===30)phrase='half '+next;
 else if(m===45)phrase='kwart voor '+next;
 else if(m<=20)phrase=nlNum(m)+' over '+thisHour;
 else if(m<30)phrase=nlNum(30-m)+' voor half '+next;
 else if(m<40)phrase=nlNum(m-30)+' over half '+next;
 else phrase=nlNum(60-m)+' voor '+next;
 return phrase;
}
function printTime(h,m){return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')}
function clockExplanation(h,m){
 const following=hourName(h+1);
 if(m===30)return '<b>half '+following+'</b> signifie « la moitié avant '+following+' heures » : c’est '+printTime(h,m)+', pas '+printTime((h+1)%24,m)+'.';
 if(m>=21&&m<=29)return 'On est à '+(30-m)+' minute(s) <b>avant la demi-heure suivante</b> : « '+sayTime(h,m)+' ».';
 if(m>=31&&m<=39)return 'On est à '+(m-30)+' minute(s) <b>après la demi-heure</b> : « '+sayTime(h,m)+' ».';
 if(m>=40)return '<b>voor</b> = avant. On compte les '+(60-m)+' minutes qui restent avant '+hourName(h+1)+' heures.';
 if(m>0)return '<b>over</b> = après. On compte '+m+' minute(s) après '+hourName(h)+' heures.';
 return 'À l’heure pile, on utilise <b>uur</b> après le nombre.';
}
function newClock(){
 clockDone=false;let h=Math.floor(Math.random()*24),m=$('clock-level').value==='basic'?Math.floor(Math.random()*12)*5:Math.floor(Math.random()*60);
 const dir=dirFor($('clock-direction').value);clockQuestion={h,m,dir,id:'clock-'+printTime(h,m)};
 let html='<div class="question-panel"><div class="question-top"><span>'+(dir==='fr-nl'?'HEURE → NÉERLANDAIS':'NÉERLANDAIS → HEURE')+'</span><span>DE KLOK LEZEN</span></div>';
 if(dir==='fr-nl'){html+='<div class="clock-display"><div class="clock-face" id="clock-face"><div class="clock-hand hour" style="transform:rotate('+((h%12)*30+m/2)+'deg)"></div><div class="clock-hand minute" style="transform:rotate('+(m*6)+'deg)"></div></div><div class="clock-digital">'+printTime(h,m)+'</div></div><div class="question-caption">Comment dit-on cette heure en néerlandais ? (sans préciser le moment de la journée)</div>'}
 else html+='<div class="question-prompt">'+safe(sayTime(h,m))+'</div><div class="question-caption">Quelle heure indique cette expression ? Le néerlandais utilise un cadran de 12 h.</div>';
 const answers=dir==='fr-nl'?[sayTime(h,m)]:[printTime(h%12,m)];
 if(dir==='fr-nl'){
  const other=shuffle(Array.from({length:24},()=>{let oh=Math.floor(Math.random()*12)+1,om=Math.floor(Math.random()*12)*5;return sayTime(oh,om)})).filter(x=>x!==answers[0]);const choices=shuffle([answers[0],...new Set(other)].slice(0,4));clockQuestion.expected=answers[0];clockQuestion.choices=choices;
 }else{
  const other=shuffle(Array.from({length:24},()=>printTime(Math.floor(Math.random()*12),Math.floor(Math.random()*12)*5))).filter(x=>x!==answers[0]);clockQuestion.expected=answers[0];clockQuestion.choices=shuffle([answers[0],...new Set(other)].slice(0,4));
 }
 html+='<div class="options-grid">'+clockQuestion.choices.map(x=>'<button class="option" data-clock-choice="'+safe(x)+'">'+safe(x)+'</button>').join('')+'</div><div id="clock-feedback"></div><div class="question-actions"><button id="clock-continue" class="btn btn-dark hidden">Question suivante →</button></div></div>';
 $('clock-area').innerHTML=html;
 if(dir==='fr-nl'){for(let i=1;i<=12;i++){const a=(i/12)*Math.PI*2-Math.PI/2;const span=document.createElement('span');span.className='clock-number';span.textContent=i;span.style.left=(50+40*Math.cos(a))+'%';span.style.top=(50+40*Math.sin(a))+'%';$('clock-face').appendChild(span)}}
 $$('[data-clock-choice]').forEach(el=>el.addEventListener('click',()=>{if(clockDone)return;clockDone=true;const correct=el.dataset.clockChoice===clockQuestion.expected;mark(clockQuestion.id,correct);
  $$('[data-clock-choice]').forEach(b=>{b.disabled=true;if(b.dataset.clockChoice===clockQuestion.expected)b.classList.add('correct')});if(!correct)el.classList.add('wrong');
  $('clock-feedback').innerHTML='<div class="feedback '+(correct?'':'bad')+'"><strong>'+(correct?'✓ Exact !':'✕ Fais attention au cadran.')+'</strong><p>Réponse : <b>'+safe(sayTime(h,m))+'</b> = <b>'+printTime(h,m)+'</b> (ou '+printTime(h%12,m)+' sur 12 h).</p><p>'+clockExplanation(h,m)+'</p></div>';$('clock-continue').classList.remove('hidden');
 }));
 $('clock-continue').addEventListener('click',newClock);
}
$('clock-next').addEventListener('click',newClock);$('clock-direction').addEventListener('change',newClock);$('clock-level').addEventListener('change',newClock);

const situations=[
 {q:'Tu rencontres un camarade. Comment demandes-tu son prénom ?',a:'Hoe heet jij?',wrong:['Hoe oud ben je?','Waar woon je?','Hoe laat is het?'],why:'Hoe heet jij? = Comment t’appelles-tu ?'},
 {q:'Quelqu’un te demande « Waar woon je? ». Tu réponds…',a:'Ik woon in Bergen.',wrong:['Ik ben 22 jaar.','Ik kom uit België.','Ik spreek Frans.'],why:'wonen = habiter. « Ik woon in … » donne la ville où tu habites.'},
 {q:'Tu veux demander « Quel âge as-tu ? »',a:'Hoe oud ben je?',wrong:['Hoe heet jij?','Hoeveel talen spreek je?','Wat is je adres?'],why:'Pour l’âge, le néerlandais utilise zijn (être) : Ik ben 22 jaar.'},
 {q:'Tu commandes un café. Comment demander du lait ?',a:'Wil je melk in je koffie?',wrong:['Waar is mijn moeder?','Welke taal spreek je?','Wanneer vertrekken we?'],why:'melk = lait ; koffie = café ; Wil je…? = Veux-tu…?'},
 {q:'Tu veux annoncer « Je viens de Belgique »',a:'Ik kom uit België.',wrong:['Ik woon in België.','Ik ben in België.','Ik ga naar België.'],why:'komen uit = venir de ; wonen in = habiter à.'},
 {q:'Complète « … je in Brussel? » pour demander si tu habites à Bruxelles.',a:'Woon',wrong:['Woont','Wonen','Woonen'],why:'Dans une inversion avec je/jij après le verbe, on supprime le -t : Woon je…?'},
 {q:'Complète « Hij … Nederlands » (spreken).',a:'spreekt',wrong:['spreek','spreken','sprek'],why:'Avec hij, le verbe régulier prend -t : spreken → spreek → spreekt.'},
 {q:'Complète « Ik … een boek » (lezen).',a:'lees',wrong:['leest','lez','lezen'],why:'Avec ik, on utilise le radical. lezen → lees (z devient s et la voyelle longue est conservée).'},
 {q:'Tu veux dire « nos cours » (de lessen).',a:'onze lessen',wrong:['ons lessen','ons les','onze lesje'],why:'On utilise onze devant tous les pluriels et les noms en de.'},
 {q:'Tu veux dire « notre adresse » (het adres).',a:'ons adres',wrong:['onze adres','hun adres','mijn adressen'],why:'Devant un nom en het au singulier : ons ; sinon onze.'},
 {q:'Complète « De les begint … maandag ».',a:'op',wrong:['om','in','aan'],why:'op + jour/date ; om + heure ; in + mois/saison/année.'},
 {q:'Complète « De trein vertrekt … 18 uur ».',a:'om',wrong:['op','in','aan'],why:'Pour une heure précise : om (om 18 uur).'},
 {q:'Complète « Ik ben jarig … maart ».',a:'in',wrong:['op','om','naar'],why:'Pour les mois, les saisons et les années : in.'},
 {q:'Tu veux dire « je mets un pull ».',a:'Ik doe een trui aan.',wrong:['Ik aan doe een trui.','Ik doe een trui uit.','Ik kleed een trui.'],why:'aandoen est séparable : la particule aan va en fin de phrase.'},
 {q:'Tu veux dire « Je me réveille ».',a:'Ik word wakker.',wrong:['Ik ben wakker worden.','Ik wakker word.','Ik wordt wakker.'],why:'wakker worden = se réveiller ; avec ik, word sans -t.'},
 {q:'Tu dis « En ce moment, je ne travaille pas ».',a:'Momenteel werk ik niet.',wrong:['Momenteel ik werk niet.','Momenteel werkt ik niet.','Momenteel werk niet ik.'],why:'Le verbe conjugué reste en 2e position : Momenteel + werk + ik.'},
 {q:'Demande à quelle heure commence le cours.',a:'Hoe laat begint de les?',wrong:['Hoeveel begint de les?','Waar komt de les?','Hoe oud is de les?'],why:'Hoe laat? = À quelle heure ? ; beginnen = commencer.'},
 {q:'Quelqu’un te dit « Dank je! ». Comment répondre poliment ?',a:'Graag gedaan!',wrong:['Tot morgen!','Ik weet het niet.','Goedemorgen!'],why:'Graag gedaan signifie « de rien », une réponse courante à dank je.'},
 {q:'Comment traduire « Il porte des lunettes » ?',a:'Hij draagt een bril.',wrong:['Hij doet een bril uit.','Hij heeft een schoenen.','Hij is de bril.'],why:'dragen = porter ; de bril = les lunettes.'},
 {q:'On te demande « Hoeveel broers en zussen heb je? ». On parle de…',a:'tes frères et sœurs',wrong:['tes parents','tes langues parlées','tes cours'],why:'Hoeveel = combien ; broer(s) = frère(s) ; zus(sen) = sœur(s).'}
];
function newContext(){
 contextDone=false;contextQuestion=pick(situations);const q=contextQuestion,opts=shuffle([q.a,...q.wrong]);
 $('context-area').innerHTML='<div class="question-panel"><div class="question-top"><span>DIALOGUE & GRAMMAIRE</span><span>EN CONTEXTE</span></div><div class="question-prompt">'+safe(q.q)+'</div><div class="question-caption">Choisis la réponse la plus adaptée.</div><div class="options-grid">'+opts.map(o=>'<button class="option" data-context-choice="'+safe(o)+'">'+safe(o)+'</button>').join('')+'</div><div id="context-feedback"></div><div class="question-actions"><button class="btn btn-dark hidden" id="context-next">Autre situation →</button></div></div>';
 $$('[data-context-choice]').forEach(b=>b.addEventListener('click',()=>{if(contextDone)return;contextDone=true;let ok=b.dataset.contextChoice===q.a;mark('ctx-'+situations.indexOf(q),ok);$$('[data-context-choice]').forEach(x=>{x.disabled=true;if(x.dataset.contextChoice===q.a)x.classList.add('correct')});if(!ok)b.classList.add('wrong');
 $('context-feedback').innerHTML='<div class="feedback '+(ok?'':'bad')+'"><strong>'+(ok?'✓ Goed gedaan !':'✕ Pas tout à fait.')+'</strong><p>Réponse : <b>'+safe(q.a)+'</b></p><p>'+safe(q.why)+'</p></div>';$('context-next').classList.remove('hidden')}));
 $('context-next').addEventListener('click',newContext);
}
const rules=[
['Pronoms personnels','<p><strong>ik</strong> = je ; <strong>je/jij</strong> = tu ; <strong>u</strong> = vous de politesse ; <strong>hij</strong> = il ; <strong>ze/zij</strong> = elle/ils/elles ; <strong>we/wij</strong> = nous ; <strong>jullie</strong> = vous pluriel.</p><p>Les formes <code>jij, zij, wij</code> sont accentuées pour insister : <code>Kom jij ook mee?</code></p>'],
['Présent régulier','<p>On retire <code>-en</code> de l’infinitif pour trouver le radical. <code>werken → werk</code>.</p><table><tr><th>Personne</th><th>Forme</th></tr><tr><td>ik</td><td>werk</td></tr><tr><td>jij / hij / u</td><td>werkt</td></tr><tr><td>wij / jullie / zij</td><td>werken</td></tr></table><p><strong>Inversion avec je/jij :</strong> <code>Jij werkt → Werk jij?</code> (on retire le -t).</p>'],
['Zijn et hebben','<p><strong>zijn</strong> : ik <code>ben</code>, jij <code>bent</code>, hij <code>is</code>, wij <code>zijn</code>.</p><p><strong>hebben</strong> : ik <code>heb</code>, jij <code>hebt</code>, hij <code>heeft</code>, wij <code>hebben</code>.</p><p>Dans une question : <code>Ben je…?</code> / <code>Heb je…?</code></p>'],
['Orthographe du radical','<p>Voyelle longue préservée : <code>slapen → ik slaap</code>, <code>heten → ik heet</code>.</p><p>Voyelle courte : <code>pakken → ik pak</code>, <code>zitten → ik zit</code>.</p><p><strong>z → s</strong> : <code>lezen → ik lees</code> ; <strong>v → f</strong> : <code>blijven → ik blijf</code>.</p><p>Ne double jamais le -t final : <code>hij wacht</code>.</p>'],
['Inversion et ordre des mots','<p>Dans la phrase principale, le verbe conjugué est en <strong>2e position</strong> : <code>Ik werk in Brussel.</code></p><p>Avec un complément au début : <code>Momenteel werk ik niet.</code> (temps + verbe + sujet).</p><p>Question oui/non : <code>Werk jij in Brussel?</code> (verbe + sujet). Avec mot interrogatif : <code>Waar woon je?</code></p>'],
['Possessifs','<p><code>mijn</code> mon ; <code>jouw/je</code> ton ; <code>uw</code> votre (politesse) ; <code>zijn</code> son (à lui) ; <code>haar</code> son (à elle) ; <code>jullie</code> votre (pluriel) ; <code>hun</code> leur.</p><p><strong>ons</strong> devant un mot en <em>het</em> singulier : <code>ons adres</code>. Partout ailleurs : <strong>onze</strong>, par exemple <code>onze les</code> et <code>onze boeken</code>.</p>'],
['Nombres','<p>De 21 à 99 : unité + <code>en</code> + dizaine : <code>eenentwintig</code> (21), <code>zesendertig</code> (36), <code>tweeënnegentig</code> (92).</p><p>Tréma si deux voyelles se rencontrent : <code>tweeëntwintig</code>.</p><p>Âge : <code>Ik ben 22 jaar.</code> On utilise <strong>zijn</strong> (être), pas hebben.</p>'],
["Lire l’heure",'<p><code>elf uur</code> = 11:00 ; <code>tien over elf</code> = 11:10 ; <code>kwart over elf</code> = 11:15.</p><p><strong>half twaalf = 11:30</strong> : on annonce l’heure qui vient !</p><p><code>vijf voor half twaalf</code> = 11:25 ; <code>vijf over half twaalf</code> = 11:35 ; <code>kwart voor twaalf</code> = 11:45.</p><p>Le soir : <code>half elf ’s avonds</code> = 22:30.</p>'],
['Prépositions temporelles','<p><strong>om</strong> + heure : <code>om 18 uur</code>.</p><p><strong>op</strong> + jour/date : <code>op maandag</code>, <code>op 21 juli</code>.</p><p><strong>in</strong> + mois/saison/année : <code>in maart</code>, <code>in de winter</code>.</p><p><code>vandaag, morgen, gisteren</code> : aucune préposition.</p>'],
['Pluriels et adjectifs','<p>La plupart des pluriels prennent <code>-en</code> : <code>schoen → schoenen</code> ; beaucoup d’emprunts prennent <code>-s</code> : <code>T-shirt → T-shirts</code>.</p><p>Consonne doublée pour garder une voyelle brève : <code>pen → pennen</code>. Une voyelle en moins pour conserver un son long : <code>muur → muren</code>.</p><p>L’adjectif prend souvent <code>-e</code> devant un nom en de et au pluriel : <code>de witte huizen</code>.</p>'],
['Verbes séparables et réfléchis','<p>La particule séparable va à la fin : <code>aandoen → Ik doe een trui aan.</code></p><p>Réfléchi : <code>zich aankleden → Ik kleed me aan.</code> ; <code>Ze kleedt zich uit.</code></p>'],
['Prononciation','<p><strong>w</strong> proche du début de « huit » ; <strong>h</strong> aspiré ; <strong>g/ch</strong> au fond de la gorge.</p><p><code>oe</code> comme « ou » ; <code>ui</code> proche de « seuil » ; <code>ei/ij</code> proches de « veille » ; <code>eu</code> proche de « mieux ».</p><p>Le <strong>-t</strong> final se prononce. <code>-isch</code> se prononce proche de « -is ».</p>']
];
function showGrammar(){$('grammar-list').innerHTML=rules.map((r,i)=>'<details class="grammar-item" '+(i===0?'open':'')+'><summary><span style="color:#86a68a;font-size:12px">'+String(i+1).padStart(2,'0')+'</span>'+r[0]+'</summary><div class="grammar-text">'+r[1]+'</div></details>').join('')}
function newTest(){
 const count=Number($('test-count').value),type=$('test-type').value,direction=$('test-direction').value;
 const vocabPool=shuffle(vocabulary),contexts=shuffle(situations);
 const candidates=[];const vocabLimit=type==='vocab'?count:type==='mixed'?Math.round(count*.55):0;const clockLimit=type==='clock'?count:type==='mixed'?Math.round(count*.25):0;const contextLimit=type==='context'?count:type==='mixed'?count-vocabLimit-clockLimit:0;
 for(let i=0;i<vocabLimit;i++){let v=vocabPool[i%vocabPool.length],s=getSides(v,dirFor(direction));candidates.push({id:v.id,type:'text',prompt:s.prompt,answer:s.answer,tag:'VOCABULAIRE',why:'Catégorie : '+categoryNames[v.category-1]+'. Vérifie les articles, le radical et l’ordre des mots.'})}
 for(let i=0;i<clockLimit;i++){const h=Math.floor(Math.random()*24),m=Math.floor(Math.random()*12)*5,dir=dirFor(direction),correct=dir==='fr-nl'?sayTime(h,m):printTime(h%12,m);const distractors=new Set();for(let n=0;n<35&&distractors.size<3;n++){let oh=Math.floor(Math.random()*12),om=Math.floor(Math.random()*12)*5;let other=dir==='fr-nl'?sayTime(oh,om):printTime(oh,om);if(other!==correct)distractors.add(other)}candidates.push({id:'clock-'+printTime(h,m),type:'choice',prompt:dir==='fr-nl'?'Comment dit-on '+printTime(h,m)+' en néerlandais ?':sayTime(h,m)+' = quelle heure ?',answer:correct,options:shuffle([correct,...[...distractors].slice(0,3)]),tag:'L’HEURE',why:'Règle : '+clockExplanation(h,m).replace(/<[^>]+>/g,'')})}
 for(let i=0;i<contextLimit;i++){let q=contexts[i%contexts.length];candidates.push({id:'ctx-'+situations.indexOf(q),type:'choice',prompt:q.q,answer:q.a,options:shuffle([q.a,...q.wrong]),tag:'SITUATION',why:q.why})}
 testItems=shuffle(candidates).slice(0,count).map(q=>({...q,selected:''}));testLive=true;
 $('test-config').classList.add('hidden');$('test-results').classList.add('hidden');$('test-active').classList.remove('hidden');
 $('test-active').innerHTML='<div class="study-header"><span>'+testItems.length+' questions tirées au hasard</span><span>Correction uniquement à la fin</span></div><div class="progress-track study-track"><div class="progress-fill" id="test-bar"></div></div><div id="test-questions">'+testItems.map((q,i)=>'<div class="test-item"><div class="test-number">QUESTION '+String(i+1).padStart(2,'0')+' / '+safe(q.tag)+'</div><div class="test-prompt">'+safe(q.prompt)+'</div>'+(q.type==='text'?'<input data-test-input="'+i+'" placeholder="Écris ta réponse…" autocomplete="off" spellcheck="false"/>':'<div class="options-grid">'+q.options.map((a,j)=>'<button class="option" data-test-index="'+i+'" data-option-index="'+j+'">'+safe(a)+'</button>').join('')+'</div>')+'</div>').join('')+'</div><div class="test-footer"><span id="test-completion">0 / '+testItems.length+' réponses</span><button class="btn btn-dark" id="test-submit">Terminer & corriger →</button></div>';
 $$('[data-test-input]').forEach(el=>el.addEventListener('input',()=>{testItems[Number(el.dataset.testInput)].selected=el.value;renderTestCompletion()}));
 $$('[data-test-index]').forEach(el=>el.addEventListener('click',()=>{const idx=Number(el.dataset.testIndex);testItems[idx].selected=testItems[idx].options[Number(el.dataset.optionIndex)];$$('[data-test-index="'+idx+'"]').forEach(b=>b.classList.toggle('chosen',b===el));renderTestCompletion()}));
 $('test-submit').addEventListener('click',finishTest);renderTestCompletion();window.scrollTo({top:0,behavior:'smooth'});
}
function renderTestCompletion(){const n=testItems.filter(x=>x.selected.trim()).length;$('test-completion').textContent=n+' / '+testItems.length+' réponses';$('test-bar').style.width=(100*n/testItems.length)+'%'}
function finishTest(){
 const blanks=testItems.filter(q=>!q.selected.trim()).length;if(blanks&&!confirm('Il reste '+blanks+' question(s) sans réponse. Terminer quand même ?'))return;
 let score=0;
 for(const q of testItems){const ok=q.type==='text'?checkAnswer(q.selected,q.answer):q.selected===q.answer;if(ok)score++;mark(q.id,ok);q.ok=ok}
 testLive=false;$('test-active').classList.add('hidden');$('test-results').classList.remove('hidden');
 const percent=Math.round(100*score/testItems.length);
 $('test-results').innerHTML='<div class="results-head"><div class="score-ring">'+percent+'%</div><h2>'+(percent>=80?'Uitstekend ! Très beau résultat.':percent>=55?'Goed bezig ! Continue.':'Pas de panique, on révise.')+'</h2><p>'+score+' bonne(s) réponse(s) sur '+testItems.length+'. Voici toutes les corrections, sans exception.</p><button class="btn btn-dark" id="test-again">Refaire un test ↻</button></div><div class="section-heading"><div><div class="eyebrow">CORRECTION DÉTAILLÉE</div><h2>Revoir chaque question</h2></div></div><div class="question-panel" style="max-width:none">'+testItems.map((q,i)=>'<div class="review-result '+(q.ok?'correct':'wrong')+'"><strong>'+(q.ok?'✓':'✕')+' '+(i+1)+'. '+safe(q.prompt)+'</strong><small>Ta réponse : '+safe(q.selected||'— (sans réponse)')+'</small><div>Bonne réponse : <b>'+safe(q.answer)+'</b></div><small>Explication : '+safe(q.why)+'</small></div>').join('')+'</div>';
 $('test-again').addEventListener('click',()=>{testLive=false;$('test-results').classList.add('hidden');$('test-config').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})});window.scrollTo({top:0,behavior:'smooth'});
}
$('test-start').addEventListener('click',newTest);
renderStats();
