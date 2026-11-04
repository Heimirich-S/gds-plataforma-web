/* ============================================================
   GDS — Apps Script v2
   
   CAMBIO CLAVE vs versión anterior:
   doPost() ahora devuelve los links de Drive en la respuesta
   JSON, para que el proxy PHP (apps_script_proxy.php) pueda
   guardarlos en MySQL.
   
   ⚠️ CUENTA: Debe desplegarse desde gimnasiodomingosavio3@gmail.com
   ⚠️ DESPUÉS DE PEGAR: Implementar > Nueva implementación > Aplicación web
      Ejecutar como: Yo (gimnasiodomingosavio3@gmail.com)
      Acceso: Cualquier persona
   ============================================================ */

var SPREADSHEET_ID      = '1Y2xyj4lsn79C6RATiEAJ3uJwcrViRCSjrsW-ixAmSnQ';
var SHEET_INSCRIPCIONES = 'Inscripciones';
var SHEET_COLABORADORES = 'Colaboradores';
var DRIVE_ROOT_FOLDER_NAME = 'GDS - Documentos Web';

var COLUMNAS_INSCRIPCION = [
  { header: 'Fecha de registro',                  key: 'timestamp' },
  { header: 'Nombres',                             key: 'nombres' },
  { header: 'Apellidos',                           key: 'apellidos' },
  { header: 'Tipo de documento',                   key: 'tipo_doc' },
  { header: 'Numero de documento',                 key: 'num_doc' },
  { header: 'Fecha de nacimiento',                 key: 'fecha_nac' },
  { header: 'Lugar de nacimiento',                 key: 'lugar_nac' },
  { header: 'Genero',                              key: 'genero' },
  { header: 'Grado al que aspira',                 key: 'grado' },
  { header: 'Ano lectivo',                         key: 'ano_lectivo' },
  { header: 'Institucion anterior',                key: 'inst_anterior' },
  { header: 'Ciudad institucion ant.',             key: 'ciudad_anterior' },
  { header: 'Acudiente - Nombre',                  key: 'acudiente_nombre' },
  { header: 'Parentesco',                          key: 'parentesco' },
  { header: 'Telefono principal',                  key: 'tel_principal' },
  { header: 'Telefono alternativo',                key: 'tel_alt' },
  { header: 'Correo electronico',                  key: 'email' },
  { header: 'Ocupacion del acudiente',             key: 'ocupacion' },
  { header: 'Direccion de residencia',             key: 'direccion' },
  { header: 'Como se entero',                      key: 'referido' },
  { header: 'Observaciones',                       key: 'observaciones' },
  { header: 'Observador del estudiante (Drive)',   key: 'doc_observador_link' },
  { header: 'Boletin ultimo periodo (Drive)',      key: 'doc_boletin_link' },
  { header: 'Documentacion del estudiante (Drive)',key: 'doc_documentacion_link' }
];

var COLUMNAS_COLABORADOR = [
  { header: 'Fecha de registro',    key: 'timestamp' },
  { header: 'Nombres y apellidos',  key: 'nombre_completo' },
  { header: 'Tipo de documento',    key: 'col_tipo_doc' },
  { header: 'Numero de documento',  key: 'col_num_doc' },
  { header: 'Telefono',             key: 'col_telefono' },
  { header: 'Correo electronico',   key: 'col_email' },
  { header: 'Area de interes',      key: 'col_area' },
  { header: 'Mensaje / Comentario', key: 'col_mensaje' },
  { header: 'Hoja de vida (Drive)', key: 'doc_hoja_vida_link' }
];

var ARCHIVOS_INSCRIPCION = [
  { key: 'doc_observador',    folder: 'Observador del estudiante',    linkKey: 'doc_observador_link' },
  { key: 'doc_boletin',       folder: 'Boletin academico',            linkKey: 'doc_boletin_link' },
  { key: 'doc_documentacion', folder: 'Documentacion del estudiante', linkKey: 'doc_documentacion_link' }
];

var ARCHIVOS_COLABORADOR = [
  { key: 'doc_hoja_vida', folder: 'Hojas de vida', linkKey: 'doc_hoja_vida_link' }
];

/* ── Punto de entrada ── */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var formType = data.formType || 'inscripcion';

    if (!data.timestamp) {
      data.timestamp = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    }

    if (formType === 'colaborador') {
      procesarArchivos(data, ARCHIVOS_COLABORADOR, 'Colaboradores');
      escribirFila(SHEET_COLABORADORES, COLUMNAS_COLABORADOR, data);
    } else {
      procesarArchivos(data, ARCHIVOS_INSCRIPCION, 'Inscripciones');
      escribirFila(SHEET_INSCRIPCIONES, COLUMNAS_INSCRIPCION, data);
    }

    /* ── CAMBIO CLAVE: devolver los links en la respuesta ──
       El proxy PHP (apps_script_proxy.php) lee estos links y
       los guarda en MySQL. En la celda de Sheets ya quedó el
       link como hipervínculo directo a Drive. */
    var linksRespuesta = {};
    if (formType === 'colaborador') {
      if (data.doc_hoja_vida_link) linksRespuesta.doc_hoja_vida_link = data.doc_hoja_vida_link;
    } else {
      if (data.doc_observador_link)    linksRespuesta.doc_observador_link    = data.doc_observador_link;
      if (data.doc_boletin_link)       linksRespuesta.doc_boletin_link       = data.doc_boletin_link;
      if (data.doc_documentacion_link) linksRespuesta.doc_documentacion_link = data.doc_documentacion_link;
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data: linksRespuesta }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function procesarArchivos(data, definiciones, categoriaRaiz) {
  definiciones.forEach(function(def) {
    var archivo = data[def.key];
    if (!archivo || !archivo.base64) return;
    try {
      data[def.linkKey] = subirArchivoADrive(archivo, def.folder, categoriaRaiz, data);
    } catch (err) {
      data[def.linkKey] = 'ERROR AL SUBIR: ' + err.message;
    }
  });
}

function subirArchivoADrive(archivo, subcarpeta, categoriaRaiz, data) {
  var raiz       = obtenerOCrearCarpeta(DRIVE_ROOT_FOLDER_NAME, DriveApp.getRootFolder());
  var categoria  = obtenerOCrearCarpeta(categoriaRaiz, raiz);
  var carpetaFinal = obtenerOCrearCarpeta(subcarpeta, categoria);

  var bytes    = Utilities.base64Decode(archivo.base64);
  var mimeType = archivo.mimeType || 'application/pdf';
  var blob     = Utilities.newBlob(bytes, mimeType, archivo.filename || 'documento.pdf');
  blob.setName(construirNombreArchivo(subcarpeta, data, archivo.filename));

  var file = carpetaFinal.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function construirNombreArchivo(tipo, data, nombreOriginal) {
  var persona = (data.nombres && data.apellidos)
    ? (data.nombres + ' ' + data.apellidos)
    : (data.nombre_completo || 'SinNombre');

  var limpio = persona.toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9]+/g,'').substring(0, 40);

  var tipoLimpio = tipo.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9]+/g,'');

  var f = new Date();
  var fecha = f.getFullYear() + '-'
    + String(f.getMonth()+1).padStart(2,'0') + '-'
    + String(f.getDate()).padStart(2,'0');

  var ext = '.pdf';
  if (nombreOriginal && nombreOriginal.indexOf('.') > -1) {
    ext = nombreOriginal.substring(nombreOriginal.lastIndexOf('.'));
  }
  return tipoLimpio + '_' + limpio + '_' + fecha + ext;
}

function obtenerOCrearCarpeta(nombre, padre) {
  var carpetas = padre.getFoldersByName(nombre);
  if (carpetas.hasNext()) return carpetas.next();
  return padre.createFolder(nombre);
}

function escribirFila(nombreHoja, columnas, data) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) {
    sheet = ss.insertSheet(nombreHoja);
    sheet.appendRow(columnas.map(function(c){ return c.header; }));
    sheet.setFrozenRows(1);
  }
  var LIMITE_CELDA = 5000; // Sheets soporta hasta 50,000, pero nada legítimo (texto/link) debería acercarse a esto

  var fila = columnas.map(function(c) {
    var v = data[c.key];
    if (v === undefined || v === null) return '';

    /* ── BLINDAJE ──
       Nunca escribir un objeto crudo (p.ej. {filename, mimeType, base64})
       en una celda. Esto es lo que causaba el texto gigante en el Sheet:
       si por algún motivo el campo _link no se generó (fallo al subir,
       versión desplegada desactualizada, etc.) NO debe caer aquí el
       objeto/base64 original. */
    if (typeof v === 'object' && !Array.isArray(v)) {
      return '[Archivo no procesado correctamente - revisar log]';
    }
    if (Array.isArray(v)) return v.join(', ');

    /* Si el valor es un link de Drive, Sheets lo muestra como hipervínculo
       clicable automáticamente al escribirlo como texto plano. */
    if (typeof v === 'string' && v.indexOf('https://drive.google.com') === 0) {
      return v;
    }

    /* Segunda red de seguridad: si por algún error un base64 gigante
       terminara en un campo de texto normal, lo cortamos en vez de
       inundar la celda (y dejamos evidencia clara del problema). */
    if (typeof v === 'string' && v.length > LIMITE_CELDA) {
      Logger.log('Valor sospechosamente largo en columna "' + c.header + '": ' + v.length + ' caracteres. Se truncó.');
      return v.substring(0, 200) + ' ...[TRUNCADO - valor original tenía ' + v.length + ' caracteres, revisar]';
    }

    return v;
  });
  sheet.appendRow(fila);
}

function doGet(e) {
  return ContentService.createTextOutput(
    'GDS Apps Script v2 activo. Usa POST para enviar datos.'
  );
}
