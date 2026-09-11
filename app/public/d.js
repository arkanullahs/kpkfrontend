
(function(){
 var box=document.querySelector('.ofilt');if(!box)return;
 var rows=[].slice.call(document.querySelectorAll('.orow'));
 var sum=document.querySelector('.osum'),empty=document.querySelector('.oempty');
 var note=document.querySelector('.onote'),all=document.querySelector('.omore');
 var tabs=[].slice.call(box.querySelectorAll('.otabs .fb'));
 var sels=[].slice.call(box.querySelectorAll('select[data-axis]'));
 var SHOWN=6,open=false;
 var axes=['chan','cfg','color','region','stock'],sel={};
 axes.forEach(function(k){sel[k]='';});
 var tk='\u09F3';
 function money(n){
  /* the lakh grouping the rest of the site prints: 1,23,456 not 123,456 */
  var s=String(n),out=s.length>3?s.slice(-3):s,r=s.slice(0,-3);
  while(r.length>2){out=r.slice(-2)+','+out;r=r.slice(0,-2);}
  return tk+(r?r+','+out:out);
 }
 function has(r,k,v){
  var got=r.getAttribute('data-'+k)||'';
  return k==='color'?got.split('|').indexOf(v)>=0:got===v;
 }
 /* matches every axis except `skip`: used to filter the table, and to ask how
    many listings an option would return if it were picked */
 function hit(r,skip){
  for(var i=0;i<axes.length;i++){
   var k=axes[i];
   if(k===skip||!sel[k])continue;
   if(!has(r,k,sel[k]))return false;
  }
  return true;
 }
 function count(k,v){
  return rows.filter(function(r){return hit(r,k)&&(!v||has(r,k,v));}).length;
 }
 function paint(){
  var vis=[],shops={},allshops={},n_live=0,bp=0,ties=0,under=null;
  rows.forEach(function(r){
   var ok=hit(r,null);
   r.hidden=!ok;
   if(!ok)return;
   vis.push(r);
   allshops[r.getAttribute('data-shop')]=1;
   if(r.getAttribute('data-stock')!=='in')return;
   n_live++;shops[r.getAttribute('data-shop')]=1;
   var p=+r.getAttribute('data-price')||0;
   if(!p)return;
   if(!bp||p<bp){bp=p;ties=1;}else if(p===bp)ties++;
  });
  /* every listing at the lowest in-stock price is marked, and marked the
     same: two shops asking the same money are not ranked by sort order */
  vis.forEach(function(r){
   var d=r.querySelector('.odelta'),p=+r.getAttribute('data-price')||0,
    live=r.getAttribute('data-stock')==='in',low=!!bp&&live&&p===bp,gap;
   r.classList.toggle('low',low);
   if(!live&&p&&bp&&p<bp&&(!under||p<+under.getAttribute('data-price')))
    under=r;
   if(low){d.textContent=ties>1?'Joint lowest':'Lowest in stock';return;}
   gap=bp&&p?p-bp:0;
   d.innerHTML=gap?(gap>0?'+':'\u2212')+money(Math.abs(gap))
    +'<span class="vh"> '+(gap>0?'more':'less')
    +' than the cheapest in stock</span>':'';
  });
  /* the cheaper thing nobody can buy is the note worth printing: hiding it
     behind a reorder is what the old in-stock-first sort did */
  if(note){
   note.hidden=!under;
   note.textContent=under?under.getAttribute('data-taka')+' at '
    +under.getAttribute('data-shop')+' is lower, but '
    +(under.getAttribute('data-stock')==='out'?'that listing is out of stock.'
     :'that shop does not report stock for it.'):'';
  }
  /* the cap, applied to what SURVIVED the filters */
  if(all){
   if(!open)vis.forEach(function(r,i){if(i>=SHOWN)r.hidden=true;});
   all.hidden=vis.length<=SHOWN;
   all.setAttribute('aria-expanded',String(open));
   all.textContent=open?'Show fewer listings'
    :'Show all '+vis.length+' listings';
  }
  var n=0,ns=0,s;
  for(s in shops)n++;
  for(s in allshops)ns++;
  sum.innerHTML='<b>'+vis.length+'</b> listing'+(vis.length===1?'':'s')
   +' from <b>'+ns+'</b> shop'+(ns===1?'':'s')
   +(n_live?', '+n_live+' in stock at '+n+' shop'+(n===1?'':'s'):', none in stock');
  sum.hidden=!vis.length;
  empty.hidden=!!vis.length;
  /* an option that would return nothing is disabled, never removed: a
     control that reshuffles under the cursor is impossible to aim at */
  tabs.forEach(function(b){
   var k=b.parentNode.getAttribute('data-axis'),v=b.getAttribute('data-v'),
    c=count(k,v);
   b.querySelector('.fc').textContent=String(c);
   b.disabled=!!v&&!c&&sel[k]!==v;
  });
  sels.forEach(function(x){
   var k=x.getAttribute('data-axis');
   [].forEach.call(x.options,function(o){
    var c=count(k,o.value);
    o.textContent=o.getAttribute('data-l')+' ('+c+')';
    o.disabled=!!o.value&&!c&&x.value!==o.value;
   });
  });
 }
 function mark(){
  tabs.forEach(function(x){
   var k=x.parentNode.getAttribute('data-axis'),
    on=(x.getAttribute('data-v')||'')===sel[k];
   x.classList.toggle('on',on);
   x.setAttribute('aria-pressed',String(on));
  });
 }
 box.addEventListener('click',function(e){
  var b=e.target.closest('.fb');
  if(b&&!b.disabled){
   var k=b.parentNode.getAttribute('data-axis'),v=b.getAttribute('data-v');
   /* clicking the active tab clears it, so every filter is its own undo */
   sel[k]=sel[k]===v?'':v;
   mark();
   return paint();
  }
  if(e.target.closest('.freset')){
   axes.forEach(function(k){sel[k]='';});
   sels.forEach(function(x){x.value='';});
   mark();
   paint();
  }
 });
 box.addEventListener('change',function(e){
  var x=e.target;
  if(!x.matches||!x.matches('select[data-axis]'))return;
  sel[x.getAttribute('data-axis')]=x.value;
  paint();
 });
 if(all)all.addEventListener('click',function(){open=!open;paint();});
 /* A pick carried in from the buying panel's button, or a shared link:
    ?cfg=&chan=&stock= set the same filters a reader could set by hand. A
    value this board does not offer is dropped, never half-applied. */
 function fromUrl(){
  var P=new URLSearchParams(location.search);
  axes.forEach(function(k){
   var v=P.get(k)||'',ok=false;
   sels.forEach(function(x){
    if(x.getAttribute('data-axis')!==k)return;
    ok=[].some.call(x.options,function(o){return o.value===v;});
    x.value=ok?v:'';
   });
   tabs.forEach(function(b){
    if(b.parentNode.getAttribute('data-axis')===k&&b.getAttribute('data-v')===v)
     ok=true;
   });
   sel[k]=ok?v:'';
  });
  open=false;mark();paint();
 }
 document.addEventListener('dbpick',fromUrl);
 box.hidden=false;
 fromUrl();
})();
(function(){
 /* The video reviews. A reviewer button changes which review the pane shows
    and nothing else: the still and "Watch on YouTube" are the only ways out
    to YouTube, and nothing plays here. */
 var y=document.getElementById('video');if(!y)return;
 y.classList.add('js');
 var rs=[].slice.call(y.querySelectorAll('.ytr')),
  ps=[].slice.call(y.querySelectorAll('.ytp'));
 /* "Read summary" only where the clamp actually hides something */
 function fit(p){
  var s=p.querySelector('.ytsum'),b=p.querySelector('.ytx');
  if(!s||!b||b.getAttribute('aria-expanded')==='true')return;
  b.hidden=s.scrollHeight<=s.clientHeight+1;
 }
 rs.forEach(function(r){r.addEventListener('click',function(){
  var k=r.getAttribute('data-k');
  rs.forEach(function(x){x.setAttribute('aria-pressed',String(x===r));});
  ps.forEach(function(p){
   p.hidden=p.getAttribute('data-k')!==k;
   if(!p.hidden)fit(p);
  });
 });});
 y.addEventListener('click',function(e){
  var b=e.target.closest('.ytx'),a=e.target.closest('.ytall'),on;
  if(b){
   on=b.getAttribute('aria-expanded')!=='true';
   b.setAttribute('aria-expanded',String(on));
   b.textContent=on?'Show less':'Read summary';
   b.closest('.ytp').classList.toggle('open',on);
  }else if(a){
   on=a.getAttribute('aria-expanded')!=='true';
   a.setAttribute('aria-expanded',String(on));
   a.textContent=on?'Fewer themes':'All reported themes';
   y.querySelector('.rpcols').classList.toggle('all',on);
  }
 });
 ps.forEach(function(p){if(!p.hidden)fit(p);});
})();
