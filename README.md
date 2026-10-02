# Mis Cuentas

Registro personal de ingresos y gastos. Es una PWA: se instala en el celular desde el navegador y
funciona sin internet. No tiene servidor ni base de datos: **los datos quedan guardados solo en el
celular** (localStorage), por eso tiene exportar/importar copia.

## Qué hace

- Anotar gastos e ingresos con monto, categoría, fecha y descripción.
- Resumen del mes: ingresos, gastos, saldo y qué porcentaje de lo que entró se gastó.
- Saldo inicial (Ajustes) y acumulado: con cuánto arrancó el mes y con cuánto lo cierra.
- Vista por categoría (en qué se va la plata) y tabla de los últimos 12 meses con promedio.
- Movimientos fijos (alquiler, sueldo, servicios): al pasar de mes ofrece cargarlos solos.
- Copia de seguridad (.json) para no perder los datos, y planilla (.csv) para Excel.

## Probarla en la PC

Necesita servirse por http (no anda abriendo el `index.html` con doble clic, por el service worker):

```
npx serve .
```

## Publicarla (GitHub Pages)

1. Crear un repo público y subir esta carpeta.
2. En el repo: Settings → Pages → Branch `main` / carpeta raíz → Save.
3. Abrir en el celular `https://<usuario>.github.io/<repo>/` y elegir «Instalar app»
   (Android/Chrome) o Compartir → «Agregar a inicio» (iPhone/Safari).

El código es público; los datos no, porque nunca salen del celular.

## Publicar un cambio

La app se actualiza sola: cada vez que se abre con internet baja los archivos nuevos por detrás, y
el cambio se ve **en la apertura siguiente**. Al publicar, subir igual la versión en `sw.js`
(`mis-cuentas-v1` → `v2`) y en `VERSION` de `app.js`, para que la caché vieja se descarte entera.
