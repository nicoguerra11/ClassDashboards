import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { TrendingUp, DollarSign, Receipt, Users, Calendar, History } from 'lucide-react'
import './Progreso.css'

import CustomSelect from '../Common/CustomSelect'

function Progreso({ profesorId }) {
  const now = new Date()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())

  const [estudiantes, setEstudiantes] = useState([])
  const [pagosMes, setPagosMes] = useState([])
  const [gastosMes, setGastosMes] = useState([])

  // para historial + gráfica (últimos 12 meses)
  const [series, setSeries] = useState([])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profesorId, mes, anio])

  useEffect(() => {
    loadSeries12()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profesorId])

  const monthName = (m) => {
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    return meses[m - 1] || String(m)
  }

  const monthOptions = [...Array(12)].map((_, i) => ({ value: i + 1, label: monthName(i + 1) }))
  const yearOptions = [2023, 2024, 2025, 2026, 2027].map(y => ({ value: y, label: y.toString() }))

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const [{ data: est, error: e1 }, { data: pagos, error: e2 }, { data: gastosAll, error: e3 }] =
        await Promise.all([
          supabase
            .from('estudiantes')
            .select('id, nombre, apellido')
            .eq('profesor_id', profesorId)
            .order('apellido', { ascending: true }),

          supabase
            .from('pagos')
            .select('id, estudiante_id, monto, mes, anio, created_at')
            .eq('profesor_id', profesorId)
            .eq('mes', mes)
            .eq('anio', anio),

          supabase
            .from('gastos')
            .select('id, monto, fecha, created_at, descripcion, categoria')
            .eq('profesor_id', profesorId)
        ])

      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3

      setEstudiantes(est || [])
      setPagosMes(pagos || [])

      const gastosDelMes = (gastosAll || []).filter(g => {
        const fechaGasto = new Date(g.fecha)
        return fechaGasto.getMonth() + 1 === mes && fechaGasto.getFullYear() === anio
      })
      setGastosMes(gastosDelMes)
    } catch (err) {
      console.error(err)
      setError('No pude cargar el progreso. Revisá que existan las tablas y columnas esperadas.')
    } finally {
      setLoading(false)
    }
  }

  const loadSeries12 = async () => {
    try {
      const end = new Date()
      const start = new Date(end.getFullYear(), end.getMonth() - 11, 1)
      const minYear = start.getFullYear()

      const [{ data: pagosAll, error: pErr }, { data: gastosAll, error: gErr }] = await Promise.all([
        supabase
          .from('pagos')
          .select('monto, mes, anio')
          .eq('profesor_id', profesorId)
          .gte('anio', minYear),

        supabase
          .from('gastos')
          .select('monto, fecha')
          .eq('profesor_id', profesorId)
          .gte('fecha', start.toISOString().slice(0, 10))
      ])

      if (pErr) throw pErr
      if (gErr) throw gErr

      const map = new Map()

      for (let i = 0; i < 12; i++) {
        const d = new Date(end.getFullYear(), end.getMonth() - i, 1)
        const y = d.getFullYear()
        const m = d.getMonth() + 1
        const key = `${y}-${String(m).padStart(2, '0')}`
        map.set(key, { key, anio: y, mes: m, ingresos: 0, egresos: 0, balance: 0 })
      }

      for (const p of (pagosAll || [])) {
        const key = `${p.anio}-${String(p.mes).padStart(2, '0')}`
        if (!map.has(key)) continue
        map.get(key).ingresos += Number(p.monto) || 0
      }

      for (const g of (gastosAll || [])) {
        const d = new Date(g.fecha)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!map.has(key)) continue
        map.get(key).egresos += Number(g.monto) || 0
      }

      const arr = Array.from(map.values())
        .map(x => ({ ...x, balance: x.ingresos - x.egresos }))
        .sort((a, b) => (a.key > b.key ? 1 : -1))

      setSeries(arr)
    } catch (err) {
      console.error(err)
    }
  }

  const idsConPago = useMemo(() => new Set((pagosMes || []).map(p => p.estudiante_id)), [pagosMes])

  const totalCobrado = useMemo(() => (pagosMes || []).reduce((acc, p) => acc + (Number(p.monto) || 0), 0), [pagosMes])
  const totalGastado = useMemo(() => (gastosMes || []).reduce((acc, g) => acc + (Number(g.monto) || 0), 0), [gastosMes])
  const balance = totalCobrado - totalGastado

  const estudiantesPagaron = useMemo(() => (estudiantes || []).filter(e => idsConPago.has(e.id)), [estudiantes, idsConPago])
  const estudiantesPendientes = useMemo(() => (estudiantes || []).filter(e => !idsConPago.has(e.id)), [estudiantes, idsConPago])

  const pctPagaron = useMemo(() => {
    const total = estudiantes?.length || 0
    if (!total) return 0
    return Math.round((estudiantesPagaron.length / total) * 100)
  }, [estudiantes, estudiantesPagaron])

  const formatMoney = (n) => `$${Number(n || 0).toLocaleString('es-UY')}`

  const maxIngresos = useMemo(() => {
    const m = Math.max(...(series.map(s => s.ingresos)), 1)
    return m
  }, [series])

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
            <CustomSelect value={mes} onChange={setMes} options={monthOptions} />
            <CustomSelect value={anio} onChange={setAnio} options={yearOptions} />
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

      {/* Historial + Gráfica mejorada */}
      <div className="progreso-history">
        <div className="ph-history-header">
          <h3><History size={20} /> Historial (últimos 12 meses)</h3>
          <p>Comparativa de ingresos y balance mensual.</p>
        </div>

        <div className="ph-chart">
          {series.map((s) => {
            const h = Math.round((s.ingresos / maxIngresos) * 100)
            return (
              <div key={s.key} className="ph-bar">
                <div className="ph-bar-fill" style={{ height: `${h}%` }} />
                <div className="ph-bar-label">{String(s.mes).padStart(2, '0')}/{String(s.anio).slice(-2)}</div>
              </div>
            )
          })}
        </div>

        <div className="ph-table">
          {series.slice().reverse().map((s) => (
            <div key={s.key} className="ph-row">
              <div className="ph-row-left">
                <span className="ph-month">{monthName(s.mes)} {s.anio}</span>
              </div>
              <div className="ph-row-right">
                <span className="ph-pill ok">+ {formatMoney(s.ingresos)}</span>
                <span className="ph-pill warn">- {formatMoney(s.egresos)}</span>
                <span className={`ph-pill ${s.balance >= 0 ? 'pos' : 'neg'}`}>{formatMoney(s.balance)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="progreso-lists">
        <div className="list-card">
          <div className="list-header">
            <h3>Pagaron</h3>
            <span className="pill">{estudiantesPagaron.length}</span>
          </div>

          {estudiantesPagaron.length === 0 ? (
            <div className="empty">Nadie pagó (todavía). Tranquilo, todavía es temprano… ¿no?</div>
          ) : (
            <div className="list">
              {estudiantesPagaron.map((e) => (
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
            <span className="pill danger">{estudiantesPendientes.length}</span>
          </div>

          {estudiantesPendientes.length === 0 ? (
            <div className="empty ok">Perfecto: cero pendientes. Tu yo del futuro te agradece.</div>
          ) : (
            <div className="list">
              {estudiantesPendientes.map((e) => (
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