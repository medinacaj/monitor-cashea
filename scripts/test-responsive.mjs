import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const origen=process.env.RESPONSIVE_URL || 'http://127.0.0.1:8000/';
const tamanos=[320,360,375,390,430,600,768,1024,1280];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let fallos=0;
try{
  for (const ancho of tamanos){
    const pagina=await browser.newPage({viewport:{width:ancho,height:850},deviceScaleFactor:1});
    await pagina.goto(origen,{waitUntil:'domcontentloaded'});
    await pagina.locator('.res-cuota-monto').waitFor({timeout:10000});
    const medidas=await pagina.evaluate(()=>{
      const rect=sel=>{
        const r=document.querySelector(sel).getBoundingClientRect();
        return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width};
      };
      return {
        viewport:window.innerWidth,
        documento:document.documentElement.scrollWidth,
        body:document.body.scrollWidth,
        form:rect('.panel-controles'),
        result:rect('.calc-resultados'),
        calculator:rect('.sim-grid'),
        cuota:rect('.calc-stepper'),
        tabla:rect('.tabla-wrap'),
        menuDisplay:getComputedStyle(document.querySelector('.mobile-nav')).display,
        shell:rect('.calculadora-shell'),
        shellBackground:getComputedStyle(document.querySelector('.calculadora-shell')).backgroundImage,
        firstSection:document.querySelector('main .contenedor > section')?.id,
        hasFakeHero:!!document.querySelector('.hero'),

      };
    });
    try {
      assert.equal(medidas.viewport,ancho,'viewport incorrecto');
      assert.equal(medidas.firstSection,'simulador','la calculadora debe ser la sección principal');
      assert.equal(medidas.hasFakeHero,false,'no debe haber hero ornamental');
      assert.match(medidas.shellBackground,/gradient/,'calculadora real sin fondo verde');
      assert.ok(medidas.shell.left>=-1 && medidas.shell.right<=ancho+1,'el contenedor verde se sale del viewport');
      assert.ok(medidas.form.left>=medidas.shell.left-1 && medidas.form.right<=medidas.shell.right+1,'formulario fuera del contenedor');
      assert.ok(medidas.result.left>=medidas.shell.left-1 && medidas.result.right<=medidas.shell.right+1,'resumen fuera del contenedor');
      assert.ok(medidas.documento<=ancho+1,'desbordamiento horizontal de página: '+JSON.stringify(medidas));
      for (const campo of ['form','result','calculator','cuota','tabla']){
        assert.ok(medidas[campo].left>=-1 && medidas[campo].right<=ancho+1, campo+' desborda: '+JSON.stringify(medidas[campo]));
      }
      assert.ok(medidas.result.top>=medidas.cuota.bottom-2,'los importes deben aparecer después de las cuotas');
      assert.ok(medidas.result.bottom<=medidas.form.bottom+1,'resultado fuera del formulario');
      if(ancho<=760){
        assert.notEqual(medidas.menuDisplay,'none','falta menú móvil');
        await pagina.locator('.mobile-nav summary').click();
        assert.equal(await pagina.locator('.mobile-nav').getAttribute('open'),'');
        await pagina.locator('.mobile-nav nav a[href="#simulador"]').click();
        assert.equal(await pagina.locator('.mobile-nav').getAttribute('open'),null);
      }
      await pagina.locator('#cuotas').fill('12');
      await pagina.locator('#cuotas').dispatchEvent('input');
      assert.equal(await pagina.locator('#cuotas').inputValue(),'12');
      assert.equal(await pagina.locator('#calendario tbody tr').count(),13,'no se generaron las 12 cuotas');
      await pagina.locator('#cuotas-menos').click();
      assert.equal(await pagina.locator('#cuotas').inputValue(),'11');
      console.log('OK responsive '+ancho+' px');
    }catch(e){
      fallos++;
      console.error('FAIL '+ancho+'px: '+e.message);
    }finally{
      await pagina.close();
    }
  }
}finally{
  await browser.close();
}
if(fallos)process.exitCode=1;
