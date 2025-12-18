import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { TrendingUp, DollarSign, Receipt, Users, Search, Calendar } from 'lucide-react'
import './Progreso.css'

function Progreso({ profesorId }) {
  const now = new Date()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [q, setQ] = useState('')

  const [estudiantes, setEstudiantes] = useState([])
  const [pagosMes, setPagosMes] = useState([])
  const [gastosMes, setGastosMes] = useState([])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profesorId, mes, anio])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const [{ data: est, error: e1 }, { data: pagos, error: e2 }, { data: gastos, error: e3 }] =
        await Promise.all([
          supabase
            .from('estudiantes')
            .select('id, nombre, apellido')
            .eq('profesor_id', profesorId)
            .order('apellido', { ascending: true }),

          // Pagos: el profesor "sube" el pago => filtro por profesor_id + mes + anio
          supabase
            .from('pagos')
            .select('id, estudiante_id, monto, mes, anio, created_at')
            .eq('profesor_id', profesorId)
            .eq('mes', mes)
            .eq('anio', anio),

          // Gastos: mismo criterio
          supabase
            .from('gastos')
            .select('id, monto, mes, anio, created_at, descripcion')
            .eq('profesor_id', profesorId)
            .eq('mes', mes)
            .eq('anio', anio)
        ])

      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3

      setEstudiantes(est || [])
      setPagosMes(pagos || [])
      setGastosMes(gastos || [])
    } catch (err) {
      console.error(err)
      setError('No pude cargar el progreso. Revisá que existan las tablas y columnas esperadas.')
    } finally {
      setLoading(false)
    }
  }

  const idsConPago = useMemo(() => {
    return new Set((pagosMes || []).map(p => p.estudiante_id))
  }, [pagosMes])

  const totalCobrado = useMemo(() => {
    return (pagosMes || []).reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
  }, [pagosMes])

  const totalGastado = useMemo(() => {
    return (gastosMes || []).reduce((acc, g) => acc + (Number(g.monto) || 0), 0)
  }, [gastosMes])

  const balance = totalCobrado - totalGastado

  const estudiantesPagaron = useMemo(() => {
    return (estudiantes || []).filter(e => idsConPago.has(e.id))
  }, [estudiantes, idsConPago])

  const estudiantesPendientes = useMemo(() => {
    return (estudiantes || []).filter(e => !idsConPago.has(e.id))
  }, [estudiantes, idsConPago])

  const pctPagaron = useMemo(() => {
    const total = estudiantes?.length || 0
    if (!total) return 0
    return Math.round((estudiantesPagaron.length / total) * 100)
  }, [estudiantes, estudiantesPagaron])

  const filterByQuery = (list) => {
    const query = q.trim().toLowerCase()
    if (!query) return list
    return list.filter(e => (`${e.nombre} ${e.apellido}`).toLowerCase().includes(query))
  }

  const pagaronFiltrado = useMemo(() => filterByQuery(estudiantesPagaron), [estudiantesPagaron, q])
  const pendientesFiltrado = useMemo(() => filterByQuery(estudiantesPendientes), [estudiantesPendientes, q])

  const formatMoney = (n) => `$${Number(n || 0).toLocaleString('es-UY')}`

  if (loading) {
    return (
      <div className="progreso-loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="progreso">
      <div className="progreso-top">
        <div className="progreso-title">
          <div className="progreso-icon">
            <TrendingUp size={22} />
          </div>
          <div>
            <h2>Progreso</h2>
            <p>Pagos vs Gastos del mes</p>
          </div>
        </div>

        <div className="progreso-filters">
          <div className="filter">
            <Calendar size={18} />
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              <option value={1}>Enero</option>
              <option value={2}>Febrero</option>
              <option value={3}>Marzo</option>
              <option value={4}>Abril</option>
              <option value={5}>Mayo</option>
              <option value={6}>Junio</option>
              <option value={7}>Julio</option>
              <option value={8}>Agosto</option>
              <option value={9}>Septiembre</option>
              <option value={10}>Octubre</option>
              <option value={11}>Noviembre</option>
              <option value={12}>Diciembre</option>
            </select>

            <input
              className="year-input"
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              min={2000}
              max={2100}
            />
          </div>

          <div className="search">
            <Search size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar estudiante..."
            />
          </div>
        </div>
      </div>

      {error && <div className="progreso-error">{error}</div>}

      <div className="progreso-cards">
        <div className="progreso-card">
          <div className="pc-row">
            <div className="pc-meta">
              <p className="pc-label">Cobrado</p>
              <h3 className="pc-value">{formatMoney(totalCobrado)}</h3>
            </div>
            <div className="pc-badge ok">
              <DollarSign size={18} />
            </div>
          </div>
        </div>

        <div className="progreso-card">
          <div className="pc-row">
            <div className="pc-meta">
              <p className="pc-label">Gastado</p>
              <h3 className="pc-value">{formatMoney(totalGastado)}</h3>
            </div>
            <div className="pc-badge warn">
              <Receipt size={18} />
            </div>
          </div>
        </div>

        <div className="progreso-card">
          <div className="pc-row">
            <div className="pc-meta">
              <p className="pc-label">Balance</p>
              <h3 className={`pc-value ${balance >= 0 ? 'pos' : 'neg'}`}>
                {formatMoney(balance)}
              </h3>
            </div>
            <div className={`pc-badge ${balance >= 0 ? 'ok' : 'danger'}`}>
              <TrendingUp size={18} />
            </div>
          </div>
        </div>

        <div className="progreso-card">
          <div className="pc-row">
            <div className="pc-meta">
              <p className="pc-label">Pagaron</p>
              <h3 className="pc-value">{pctPagaron}%</h3>
              <p className="pc-sub">
                {estudiantesPagaron.length} / {estudiantes.length} estudiantes
              </p>
            </div>
            <div className="pc-badge info">
              <Users size={18} />
            </div>
          </div>

          <div className="progressbar">
            <div className="progressbar-fill" style={{ width: `${pctPagaron}%` }} />
          </div>
        </div>
      </div>

      <div className="progreso-lists">
        <div className="list-card">
          <div className="list-header">
            <h3>Pagaron</h3>
            <span className="pill">{pagaronFiltrado.length}</span>
          </div>

          {pagaronFiltrado.length === 0 ? (
            <div className="empty">Nadie pagó (todavía). Tranquilo, todavía es temprano… ¿no?</div>
          ) : (
            <div className="list">
              {pagaronFiltrado.map((e) => (
                <div key={e.id} className="row">
                  <div className="row-name">{e.nombre} {e.apellido}</div>
                  <span className="tag ok">Pagó</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="list-card">
          <div className="list-header">
            <h3>Pendientes</h3>
            <span className="pill danger">{pendientesFiltrado.length}</span>
          </div>

          {pendientesFiltrado.length === 0 ? (
            <div className="empty ok">Perfecto: cero pendientes. Tu yo del futuro te agradece.</div>
          ) : (
            <div className="list">
              {pendientesFiltrado.map((e) => (
                <div key={e.id} className="row">
                  <div className="row-name">{e.nombre} {e.apellido}</div>
                  <span className="tag danger">Pendiente</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Progreso
