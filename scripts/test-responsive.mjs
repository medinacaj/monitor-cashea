import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

// UI contract: document must fit, select controls must suppress native graphics,
// mode switches must keep the correct finance behavior and mobile controls usable.
const origin=process.env.RESPONSIVE_URL || 'http://127.0.0.1:8000/';
const profiles=[
 {name:'Chromium',engine:chromium,widths:[320,360,375,390,430,600,768,1024,1280]},
 {name:'WebKit',engine:webkit,widths:[320,375,390,430,768,1280]},
];
const problems=[];
for (const profile of profiles) {
 const browser=await profile.engine.launch({headless:true,args:profile.name==='Chromium'?['--no-sandbox']:[]});
 try {
  for(const width of profile.widths) {
   const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:2,isMobile:profile.name==='WebKit'&&width<=430,hasTouch:profile.name==='WebKit'&&width<=430});
   const page=await context.newPage();
   try {
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.locator('.res-cuota-monto').waitFor({timeout:12000});
    const details=await page.evaluate(()=>{
      const rect=sel=>{const b=document.querySelector(sel).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width};};
      const selectors=['modalidad','categoria'].map(id=>{
        const el=document.getElementById(id),style=getComputedStyle(el);
        const parent=el.closest('.select-control');
        return {id,appearance:style.appearance,webkitAppearance:style.webkitAppearance,
          color:style.color,background:style.backgroundColor,backgroundImage:style.backgroundImage,
          fontSize:style.fontSize,paddingRight:parseFloat(style.paddingRight),wrapped:!!parent,
          arrow:parent?getComputedStyle(parent,'::after').content:'none',
          height:el.getBoundingClientRect().height};
      });
      return {
        width:window.innerWidth,doc:document.documentElement.scrollWidth,
        sectionIds:[...document.querySelectorAll('main .contenedor > section')].map(el=>el.id),
        nav:getComputedStyle(document.querySelector('.mobile-nav')).display,
        shell:rect('.calculadora-shell'),form:rect('.panel-controles'),
        result:rect('.calc-resultados'),stepper:rect('.calc-stepper'),
        table:rect('.tabla-wrap'),status:rect('#estado'),directory:rect('#directorio'),
        unified:rect('.monitor-unificado'),
        hasStatusInsidePanel:!!document.querySelector('.monitor-unificado #estado-lista .estado-card'),
        hasChartInsidePanel:!!document.querySelector('.monitor-unificado #estado-grafica'),
        hasTitleInsidePanel:!!document.querySelector('.monitor-unificado #estado-titulo'),
        hasIntroInsidePanel:!!document.querySelector('.monitor-unificado .monitor-encabezado > p:last-child'),
        hasRefreshInsidePanel:!!document.querySelector('.monitor-unificado #refrescar'),
        monitorHeader:rect('.monitor-encabezado'),
        timeline:rect('.grafica-estado-card'),
        footer:rect('.monitor-unificado .estado-pie'),
        noOldPercentage:!document.querySelector('.monitor-unificado .estado-metricas'),
        lastCheckLabel:document.querySelector('.monitor-unificado .estado-ultima')?.textContent||'',
        monitorCoverage:document.querySelector('#monitor-salud')?.textContent||'',
        statusCardBorder:getComputedStyle(document.querySelector('.monitor-unificado .estado-card')).borderTopWidth,
        chartCardBorder:getComputedStyle(document.querySelector('.monitor-unificado .grafica-estado-card')).borderLeftWidth,
        selectors,
        // Contraste WCAG AA de cada texto visible contra su fondo efectivo. En fondos con degradado
        // se usa el color opaco menos favorable de sus paradas.
        contrast:(()=>{
          const parse=c=>{const m=c.match(/[\d.]+/g);return m?m.map(Number):[0,0,0,0];};
          const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};return .2126*f(r)+.7152*f(g)+.0722*f(b);};
          const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
          const fondos=el=>{for(let e=el;e;e=e.parentElement){const st=getComputedStyle(e);const c=parse(st.backgroundColor);
            if((c[3]??1)>=.9)return [c];
            if(st.backgroundImage!=='none'){const stops=[...st.backgroundImage.matchAll(/rgba?\([^)]*\)/g)].map(m=>parse(m[0])).filter(x=>(x[3]??1)===1);if(stops.length)return stops;}}
            return [[255,255,255]];};
          const fallos=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
          while(walker.nextNode()){const el=walker.currentNode.parentElement;if(!walker.currentNode.textContent.trim()||!el)continue;
            const b=el.getBoundingClientRect(),st=getComputedStyle(el);
            if(!b.width||st.visibility==='hidden'||el.closest('[aria-hidden="true"]:not(#grafica-eje)')||el.closest('.saltar'))continue;
            const size=parseFloat(st.fontSize),minimo=(size>=24||(size>=18.66&&+st.fontWeight>=700))?3:4.5;
            const peor=Math.min(...fondos(el).map(f=>ratio(parse(st.color),f)));
            if(peor<minimo)fallos.push(walker.currentNode.textContent.trim().slice(0,30)+' '+peor.toFixed(2));}
          return fallos;
        })(),
        minFont:Math.min(...[...document.querySelectorAll('body *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.getBoundingClientRect().width).map(e=>parseFloat(getComputedStyle(e).fontSize))),
        axisFont:parseFloat(getComputedStyle(document.querySelector('#grafica-eje span')||document.body).fontSize),
        tableOverflow:(()=>{const t=document.querySelector('#calendario');return t.scrollWidth-t.clientWidth;})(),
      };
    });
    assert.equal(details.width,width,'viewport');
    assert.deepEqual(details.sectionIds,['simulador','estado','directorio'],'orden de secciones');
    assert.deepEqual(details.contrast,[],'textos sin contraste AA');
    assert.ok(details.minFont>=12,'texto menor de 12px: '+details.minFont);
    assert.ok(details.axisFont>=12,'eje del gráfico ilegible');
    if(width<=620) assert.ok(details.tableOverflow<=1,'el calendario requiere desplazamiento horizontal en móvil');
    assert.ok(details.hasStatusInsidePanel,'estado no integrado');
    assert.ok(details.hasChartInsidePanel,'gráfico no integrado');
    assert.ok(details.hasTitleInsidePanel&&details.hasIntroInsidePanel&&details.hasRefreshInsidePanel,
      'título, explicación o botón quedaron fuera de la tarjeta');
    assert.ok(details.monitorHeader.bottom<=details.timeline.top+1,'título no precede a la gráfica');
    assert.ok(details.footer.top>=details.timeline.bottom-1,'botón fuera de la sección');
    assert.ok(details.noOldPercentage,'continúa el bloque de porcentajes redundantes');
    assert.match(details.lastCheckLabel,/Última comprobación/,'falta fecha de comprobación');
    assert.match(details.monitorCoverage,/Cobertura del monitor:/,'no se muestra la cobertura');
    assert.equal(details.statusCardBorder,'0px','la tarjeta del estado tiene un borde duplicado');
    assert.equal(details.chartCardBorder,'0px','la gráfica tiene un borde duplicado');
    assert.ok(details.doc<=width+1,'scroll horizontal no deseado: '+JSON.stringify(details));
    for (const name of ['shell','form','result','stepper','table','status','directory','unified','monitorHeader','timeline','footer']) {
      const b=details[name];
      assert.ok(b.left>=-1&&b.right<=width+1,name+' desborda a '+width+': '+JSON.stringify(b));
    }
    assert.ok(details.result.top>=details.stepper.bottom-2,'resultado antes de controles');
    assert.ok(details.result.bottom<=details.form.bottom+1,'resultado fuera del formulario');
    for(const sel of details.selectors) {
      assert.equal(sel.wrapped,true,sel.id+' sin envoltura');
      assert.equal(sel.appearance,'none',sel.id+' tiene apariencia nativa: '+JSON.stringify(sel));
      assert.equal(sel.backgroundImage,'none',sel.id+' superpone flechas CSS');
      assert.match(sel.arrow,/""|''|["][^"]+["]/,sel.id+' sin flecha única');
      assert.ok(sel.fontSize==='16px',sel.id+' permite zoom iOS');
      assert.ok(sel.height>=48,sel.id+' superficie táctil pequeña');
      const rgb=sel.color.match(/\d+/g)?.map(Number) || [];
      assert.ok(rgb.length>=3 && rgb[0]<75 && rgb[1]<110 && rgb[2]<95,sel.id+' texto sin contraste: '+sel.color);
    }
    if(width<=760) {
      assert.notEqual(details.nav,'none','menú móvil oculto');
      await page.locator('.mobile-nav summary').click();
      assert.equal(await page.locator('#mobile-nav').getAttribute('open'),'');
      await page.locator('.mobile-nav nav a[href="#simulador"]').click();
      assert.equal(await page.locator('#mobile-nav').getAttribute('open'),null);
    }
    // The chart is populated from the status JSON endpoint; empty windows remain gray.
    const chart=page.locator('#estado-grafica svg');
    await chart.waitFor({timeout:12000});
    assert.equal(await page.locator('#estado-grafica svg rect').count(),24,'gráfica de 24 barras');
    await page.locator('[data-periodo="72"]').click();
    assert.equal(await page.locator('[data-periodo="72"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#estado-grafica svg rect').count(),72,'gráfica de 72 barras');
    await page.locator('[data-periodo="24"]').click();
    assert.equal(await page.locator('[data-periodo="24"]').getAttribute('aria-pressed'),'true');

    // Native dropdowns remain usable after replacing the decorative arrow.
    await page.locator('#modalidad').selectOption('principal');
    assert.equal(await page.locator('#cuotas').inputValue(),'3');
    assert.equal(await page.locator('#inicial').inputValue(),'40');
    await page.locator('#inicial').fill('25');
    await page.locator('#inicial').dispatchEvent('input');
    assert.equal(await page.locator('#inicial').inputValue(),'25');
    assert.equal(await page.locator('#nivel').count(),0,'el nivel orientativo ya no debe existir');
    await page.locator('#modalidad').selectOption('personalizada');
    await page.locator('#cuotas').fill('12');
    await page.locator('#cuotas').dispatchEvent('input');
    assert.equal(await page.locator('#calendario tbody tr').count(),13,'12 cuotas no calculadas');
    await page.locator('#cuotas-menos').click();
    assert.equal(await page.locator('#cuotas').inputValue(),'11');
    await page.locator('#q').fill('Locatel');
    await page.waitForFunction(()=>document.querySelector('#contador')?.textContent?.includes('de 21'),null,{timeout:12000});
    assert.ok((await page.locator('#lista li').count())>=1,'filtro de comercios no funciona');
    // Validación por campo: el error se asocia al control exacto.
    await page.locator('#inicial').fill('150');
    await page.locator('#inicial').dispatchEvent('input');
    assert.equal(await page.locator('#inicial').getAttribute('aria-invalid'),'true');
    assert.match(await page.locator('#inicial').getAttribute('aria-describedby'),/error-inicial/);
    await page.locator('#inicial').fill('40');
    await page.locator('#inicial').dispatchEvent('input');
    assert.equal(await page.locator('#error-inicial').count(),0,'el error no desaparece al corregir');
    // Filtro por ciudad mediante chips.
    await page.locator('#q').fill('');
    await page.locator('#ciudad-chips [data-ciudad="Maracaibo"]').click();
    assert.equal(await page.locator('#ciudad-chips [data-ciudad="Maracaibo"]').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#contador').textContent(),/ de 21/);
    // Cuota flotante: solo en móvil, con los controles a la vista y el resultado fuera de pantalla.
    await page.evaluate(()=>window.scrollTo(0,document.querySelector('#monto').getBoundingClientRect().top+scrollY-120));
    await page.locator('#cuotas-mas').click();
    await page.waitForTimeout(250);
    const resultadoVisible=await page.evaluate(()=>{const r=document.querySelector('#resultado').getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;});
    if(width<=760&&!resultadoVisible) assert.ok(await page.locator('#cuota-flotante').isVisible(),'cuota flotante ausente');
    if(width>760) assert.ok(await page.locator('#cuota-flotante').isHidden(),'cuota flotante en escritorio');
    console.log('OK '+profile.name+' '+width+' px · selects y formularios');
   }catch(error){
    const entry=profile.name+' '+width+'px: '+error.message;
    problems.push(entry);
    console.error('FAIL '+entry);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
}
if(problems.length){console.error(problems.join('\n'));process.exitCode=1;}
