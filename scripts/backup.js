// scripts/backup.js
// Script de backup para Supabase - Compatible con GitHub Actions

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Para usar __dirname en ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuración desde variables de entorno
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno:')
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function backup() {
  try {
    const timestamp = new Date().toISOString().split('T')[0]
    console.log(`\n📦 Iniciando backup ${timestamp}...\n`)

    const backup = {
      fecha: timestamp,
      hora: new Date().toISOString(),
      version: '1.0',
      datos: {}
    }

    // Lista de tablas a respaldar (ajustá según tus tablas)
    const tablas = [
      'profesores',
      'estudiantes', 
      'ingresos',
      'gastos',
      'pagos',
      'asistencias'
    ]

    let totalRegistros = 0

    for (const tabla of tablas) {
      try {
        const { data, error } = await supabase
          .from(tabla)
          .select('*')

        if (error) {
          // Si la tabla no existe, skip
          if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
            console.log(`⚠️  ${tabla}: tabla no encontrada (skip)`)
            continue
          }
          throw error
        }

        backup.datos[tabla] = data || []
        totalRegistros += (data || []).length
        console.log(`✅ ${tabla}: ${(data || []).length} registros`)
      } catch (error) {
        console.error(`❌ Error en ${tabla}:`, error.message)
        backup.datos[tabla] = []
      }
    }

    // Crear carpeta backups si no existe
    const projectRoot = path.join(__dirname, '..')
    const backupDir = path.join(projectRoot, 'backups')
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
      console.log(`\n📁 Carpeta backups/ creada`)
    }

    // Guardar backup
    const filename = path.join(backupDir, `backup-${timestamp}.json`)
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2))

    console.log(`\n✅ Backup completado exitosamente!`)
    console.log(`📊 Total registros respaldados: ${totalRegistros}`)
    console.log(`💾 Archivo: backups/backup-${timestamp}.json`)

    // Limpiar backups viejos (mantener últimos 30)
    const archivos = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()

    if (archivos.length > 30) {
      const aEliminar = archivos.slice(0, archivos.length - 30)
      aEliminar.forEach(f => {
        fs.unlinkSync(path.join(backupDir, f))
        console.log(`🗑️  Eliminado backup viejo: ${f}`)
      })
    }

    console.log(`\n🎉 Proceso finalizado\n`)

  } catch (error) {
    console.error('\n❌ Error fatal en el backup:', error)
    process.exit(1)
  }
}

// Ejecutar
backup()