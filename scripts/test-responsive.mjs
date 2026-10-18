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
      const selectors=['modalidad','nivel','ciudad','categoria'].map(id=>{
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
        selectors,
      };
    });
    assert.equal(details.width,width,'viewport');
    assert.deepEqual(details.sectionIds,['estado','simulador','directorio'],'orden de secciones');
    assert.ok(details.doc<=width+1,'scroll horizontal no deseado: '+JSON.stringify(details));
    for (const name of ['shell','form','result','stepper','table','status','directory']) {
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
    // Native dropdowns remain usable after replacing the decorative arrow.
    await page.locator('#modalidad').selectOption('principal');
    assert.equal(await page.locator('#cuotas').inputValue(),'3');
    await page.locator('#nivel').selectOption('1');
    assert.equal(await page.locator('#inicial').inputValue(),'60');
    await page.locator('#modalidad').selectOption('personalizada');
    await page.locator('#cuotas').fill('12');
    await page.locator('#cuotas').dispatchEvent('input');
    assert.equal(await page.locator('#calendario tbody tr').count(),13,'12 cuotas no calculadas');
    await page.locator('#cuotas-menos').click();
    assert.equal(await page.locator('#cuotas').inputValue(),'11');
    await page.locator('#q').fill('Locatel');
    await page.waitForFunction(()=>document.querySelector('#contador')?.textContent?.includes('de 21'),null,{timeout:12000});
    assert.ok((await page.locator('#lista li').count())>=1,'filtro de comercios no funciona');
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
