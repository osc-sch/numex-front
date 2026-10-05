# Registro de alumnos

El formulario de `/register` crea la cuenta y el perfil mediante
`POST /api/auth/register`. Por ahora solo se registran alumnos; el backend
asigna el rol `3` y calcula el ciclo según la institución y el año escolar.
La foto es opcional y se guarda como una URL HTTP/HTTPS.

Para probarlo:

1. En `NUMEX-BACKEND`, configurá la base MySQL y `JWT_SECRET` según `AUTH.md`
   y ejecutá `npm run dev`.
2. En este proyecto, ejecutá `npm run dev` y abrí `/register`.
   El proxy ya apunta a `http://127.0.0.1:3000`. Si cambia el destino,
   copiá `.env.example` a `.env.local`, ajustá `BACKEND_URL` y reiniciá Vite.
3. Completá ambos pasos. Una respuesta exitosa muestra la confirmación en
   `/login`; un error mantiene los datos para corregirlos o reintentar.

Se validan la confirmación de contraseña, la fecha de nacimiento, el DNI y
el año escolar. La API devuelve `409` para email o DNI duplicados y guarda
el perfil y la cuenta dentro de una misma transacción.

En producción, configurá el servidor web para reenviar
`/api/auth` al backend en el mismo origen; el proxy de desarrollo de Vite
no forma parte de los archivos compilados.

Pruebas del frontend: `node --test tests/*.test.js`. Validaciones adicionales:
`npm run lint` y `npm run build`.

# Inicio y cierre de sesión

`/login` envía email y contraseña a `POST /api/auth/login` y luego consulta
`GET /api/auth/profile` para confirmar la sesión y cargar el perfil del alumno.
La API mantiene la sesión durante una hora mediante una cookie HttpOnly.
No se guardan contraseñas ni tokens en localStorage ni se imprimen en consola.

Al ingresar, se vuelve a la página protegida que se había intentado abrir o
a Inicio. La sesión se recupera al recargar y se comprueba al volver a la pestaña
y cada minuto. Si vence, se vuelve al login. Si hay un problema de conexión,
se muestra un error con la opción de reintentar.

El menú muestra el nombre y la foto del perfil y permite **Cerrar sesión**
mediante `POST /api/auth/logout`. El saludo y los datos enviados al diagnóstico
usan el alumno autenticado. Las opciones de recordar sesión por más tiempo
y recuperar contraseña quedan pendientes de soporte en el backend.

# Diagnóstico con n8n

El modal inicial depende de `profile.test_diagnostic_completed`, recibido en
`GET /api/auth/profile`: con `false` se muestra automáticamente; con `true`
se omite. Se actualiza cuando se refresca la sesión. La marca antigua
`numex_diagnostic_modal_seen` y los resultados locales no determinan si el
diagnóstico está completado. El campo debe llegar como booleano JSON.

El botón **Ir al test de diagnóstico** permite abrirlo manualmente incluso
si ya se completó. Iniciar el diagnóstico no modifica el estado de la base;
ese estado debe actualizarse desde el backend cuando corresponda.

El botón **Ir al test de diagnóstico** de Inicio envía un `POST` con:

```json
{
  "nombre": "Jose",
  "anio_curso": 4,
  "habilidades": [],
  "dificultades": []
}
```

`nombre` y `anio_curso` se completan con el perfil del alumno autenticado;
los valores del ejemplo son ilustrativos.

Para probarlo en desarrollo:

1. Ejecutá `npm run dev` (o `npm.cmd run dev` en PowerShell).
2. En n8n, configurá el nodo Webhook con método `POST` y ruta `crear_actividades`.
3. Pulsá **Listen for test event** o **Execute workflow** antes del envío.
4. En Inicio, pulsá **Ir al test de diagnóstico** y confirmá en el aviso.

La URL configurada es `https://osc-sch.app.n8n.cloud/webhook-test/crear_actividades`.
El webhook de prueba debe estar escuchando; si n8n devuelve `404` con el mensaje
`The requested webhook "crear_actividades" is not registered`, volvé a iniciar
la escucha antes de reintentar. La respuesta de n8n se registra en la consola del
navegador cuando ocurre un error.

En desarrollo, `/api/diagnostic` se reenvía al webhook mediante el proxy de Vite
para evitar el bloqueo CORS del navegador. Reiniciá Vite si no toma el cambio.
Este proxy solo se usa con `npm run dev`. La compilación de producción sigue
llamando directamente a la URL de n8n y requiere que n8n permita el origen del sitio.
Para un uso permanente, publicá el flujo y configurá su **Production URL** en
`src/pages/HomePage.jsx` y en el proxy de `vite.config.js`.

El test muestra las preguntas recibidas de la API. El archivo
`src/data/diagnostic-test.json` queda como ejemplo del formato interno y no se carga en la sesión.

La respuesta debe ser un objeto con `preguntas` o un arreglo que contenga ese objeto:

```json
{
  "test_id": "DIAG_JOSE_001",
  "titulo": "Diagnóstico de matemática",
  "alumno": { "nombre": "Jose", "anio_ingreso": 4 },
  "preguntas": [
    {
      "pregunta_id": "P001",
      "habilidad_id": "MAT_1A_C1_H01",
      "anio_origen": 3,
      "eje": "Álgebra",
      "enunciado": "¿Cuánto vale x si x + 2 = 5?",
      "opciones": {
        "A": "3",
        "B": "7"
      },
      "respuesta_correcta": "A",
      "explicaciones_incorrectas": {
        "B": "Restá 2 a ambos lados."
      }
    }
  ]
}
```

Cada pregunta necesita un `pregunta_id` único, un `enunciado` y al menos dos
`opciones`. Cuando las opciones son textos, `respuesta_correcta` debe indicar una
clave existente; `explicaciones_incorrectas` puede aportar la explicación de cada error.
El frontend convierte estos campos a `{ texto, Correct, feedback }` para
`ActivitySessionPage`, conservando todas las preguntas y sus metadatos.
También se acepta el formato interno con opciones que ya incluyen `texto` y
`Correct` booleano; al menos una opción debe ser correcta.
Si la respuesta no contiene preguntas válidas, Inicio muestra un error y permite
reintentar sin abrir el test. Acceder directamente a `/diagnostic` sin una sesión
muestra un aviso para volver a Inicio.

En n8n, configurá el Webhook para responder **When Last Node Finishes**, devolviendo
el objeto de actividades, o usá **Respond to Webhook** con ese JSON. El modo
**Immediately** solo confirma que empezó el flujo y no devuelve las preguntas.

Al confirmar la finalización del test, se envía un `POST` a
`https://osc-sch.app.n8n.cloud/webhook-test/corregir_test` con:

- `alumno`: `nombre` y `anio_ingreso` de la sesión recibida.
- `cantidad_practica_diaria`: `5`.
- `test`: `test_id` y todas las preguntas, incluyendo únicamente `pregunta_id`,
  `habilidad_id` y `respuesta_correcta`.
- `respuestas`: una entrada por pregunta con `pregunta_id` y la `respuesta`
  seleccionada por el alumno, incluso si es incorrecta.

En el formato interno, la respuesta correcta se obtiene de la opción con
`Correct: true` cuando no existe `respuesta_correcta`.
La respuesta de creación debe incluir los datos del alumno, el identificador
del test y el identificador de habilidad de cada pregunta para poder corregirlo.

Durante el envío se deshabilita la confirmación para evitar pedidos duplicados.
La pantalla de finalización aparece después de una respuesta HTTP exitosa.
Si falla, el aviso permanece abierto y las respuestas se conservan en la página
para reintentar (no se guardan al recargar o cerrar la página).

En desarrollo, el proxy `/api/test-correction` reenvía la petición a `corregir_test`.
Reiniciá Vite si no toma la nueva ruta y activá la escucha del webhook de prueba
de corrección antes de confirmar el test. La URL de producción del frontend
se configura en `src/services/testCorrection.js`; el proxy local, en `vite.config.js`.

Después de un envío exitoso, el botón **Ver resultados en Inicio** permite consultar
el último test finalizado: fecha, alumno, cantidad de aciertos y errores, porcentaje
y detalle de cada respuesta con la opción correcta y su explicación disponible.
El resumen de aciertos se calcula comparando las respuestas del alumno con la clave
incluida en las actividades.

La devolución de `corregir_test` se lee como un objeto o un arreglo de un solo
perfil con `perfil_id`, `test_id`, `alumno`, `temas` y `practica_diaria`.
En Inicio se muestran los temas agrupados por `eje`, cada `dominio_pct` recibido
y la `cantidad_recomendada` de actividades diarias junto con todas las habilidades
de `cola_inicial`. La cantidad recomendada no se usa para inventar entradas de la cola.
Los porcentajes de dominio se muestran como datos del diagnóstico, separados del
porcentaje de aciertos calculado a partir de las respuestas.

El perfil debe corresponder al `test_id` enviado. Una respuesta HTTP exitosa sin
perfil válido (por ejemplo, un `204` o una confirmación de inicio del flujo)
conserva el resumen de respuestas y muestra que no hay desglose por tema.

El último test finalizado, incluyendo su perfil de corrección, se guarda en `localStorage` bajo `numex_latest_test_result`
para conservarlo al volver a Inicio o recargar la página en el mismo navegador.
Un test nuevo reemplaza al anterior solo después de enviarse correctamente.
Si el navegador no permite guardar, los resultados siguen disponibles durante la
sesión y se muestra un aviso. Antes de completar un test se muestra un estado vacío.

Documentación: [webhooks de n8n](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
y [proxy de Vite](https://vite.dev/config/server-options#server-proxy).

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
