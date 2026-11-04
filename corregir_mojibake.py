import os

root = os.getcwd()
extensions = (".html", ".js", ".php", ".css", ".md")
skip = ("archive", "vendor", "node_modules", "storage", ".git")

print("🔍 Iniciando Reparación Binaria Definitiva (Letras Chinas y Espaciados)...\n")
archivos_reparados = 0

for dirpath, dirnames, filenames in os.walk(root):
    if any(s in dirpath for s in skip):
        continue
        
    for fn in filenames:
        if fn.endswith(extensions):
            if fn == "corregir_mojibake.py":
                continue
                
            path = os.path.join(dirpath, fn)
            rel_path = os.path.relpath(path, root)
            
            try:
                # 1. Leer el archivo como bytes puros del disco
                with open(path, "rb") as f:
                    content_bytes = f.read()
                
                if not content_bytes:
                    continue
                
                decoded_text = None
                
                # Prueba A: Detectar si contiene texto asiático o patrones UTF-16
                # Si el archivo está codificado al revés, se leerá como caracteres chinos.
                # Intentamos decodificarlo explícitamente en las variantes de UTF-16.
                if b'\x00' in content_bytes:
                    for encoding_variant in ["utf-16le", "utf-16be", "utf-16"]:
                        try:
                            text_try = content_bytes.decode(encoding_variant)
                            if "<!DOCTYPE" in text_try or "html" in text_try or "function" in text_try or "const" in text_try:
                                decoded_text = text_try
                                break
                        except:
                            pass
                
                # Prueba B: Corrección de la distorsión del carácter fantasma ("ó" intercalada)
                if decoded_text is None:
                    try:
                        text_latin = content_bytes.decode("latin-1")
                        if "ó<" in text_latin or "ó!" in text_latin or "óD" in text_latin or "óh" in text_latin:
                            decoded_text = text_latin.replace("ó", "")
                    except:
                        pass

                # 2. Si logramos recuperar el texto original limpio, lo guardamos en UTF-8 estándar
                if decoded_text:
                    print(f"⚠️ Detectada codificación corrupta en: {rel_path}")
                    
                    # Limpieza final por si quedó alguna "ó" huérfana al inicio
                    if "ó<" in decoded_text[:20]:
                        decoded_text = decoded_text.replace("ó", "")
                        
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(decoded_text)
                        
                    print(f"  🔥 ¡Archivo restaurado con éxito a UTF-8 estándar!")
                    archivos_reparados += 1
                    
            except Exception as e:
                print(f"❌ Error al procesar {rel_path}: {e}")

print(f"\n✨ Proceso terminado. Se recuperaron y normalizaron {archivos_reparados} archivos.")