import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function backup() {
  const timestamp = new Date().toISOString().split('T')[0]
  console.log(`📦 Iniciando backup ${timestamp}...`)

  const backup = { fecha: timestamp, datos: {} }

  // Lista de todas tus tablas
  const tablas = ['profesores', 'estudiantes', 'ingresos', 'gastos', 'pagos']

  for (const tabla of tablas) {
    try {
      const { data, error } = await supabase.from(tabla).select('*')
      if (error) throw error
      backup.datos[tabla] = data
      console.log(`✅ ${tabla}: ${data.length} registros`)
    } catch (error) {
      console.error(`❌ Error en ${tabla}:`, error.message)
    }
  }

  // Guardar backup
  const backupDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir)
  
  const filename = path.join(backupDir, `backup-${timestamp}.json`)
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2))
  
  console.log(`✅ Backup guardado: ${filename}`)
  
  // Limpiar backups viejos (mantener últimos 30)
  const archivos = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup-'))
    .sort()
  
  if (archivos.length > 30) {
    const aEliminar = archivos.slice(0, archivos.length - 30)
    aEliminar.forEach(f => {
      fs.unlinkSync(path.join(backupDir, f))
      console.log(`🗑️  Eliminado backup viejo: ${f}`)
    })
  }
}

backup().catch(console.error)