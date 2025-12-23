import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { TrendingUp, DollarSign, Receipt, Users, Calendar, History } from 'lucide-react'
import './Progreso.css'

import CustomSelect from '../Common/CustomSelect'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function Progreso({ profesorId }) {
  const now = new Date()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())

  const [estudiantes, setEstudiantes] = useState([])
  const [pagosMes, setPagosMes] = useState([])
  const [gastosMes, setGastosMes] = useState([])

  // 12 meses: ingresos, egresos, balance, pctPaid
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
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return meses[m - 1] || String(m)
  }

  const monthOptions = [...Array(12)].map((_, i) => ({ value: i + 1, label: monthName(i + 1) }))

  const START_YEAR = 2023
  const FUTURE_YEARS = 3
  const yearOptions = Array.from(
    { length: (now.getFullYear() + FUTURE_YEARS) - START_YEAR + 1 },
    (_, i) => START_YEAR + i
  ).map((y) => ({ value: y, label: y.toString() }))

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

      const gastosDelMes = (gastosAll || []).filter((g) => {
        const fechaGasto = new Date(`${g.fecha}T00:00:00`)
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

      const [{ data: estAll, error: eErr }, { data: pagosAll, error: pErr }, { data: gastosAll, error: gErr }] =
        await Promise.all([
          supabase
            .from('estudiantes')
            .select('id')
            .eq('profesor_id', profesorId),

          supabase
            .from('pagos')
            .select('monto, mes, anio, estudiante_id')
            .eq('profesor_id', profesorId)
            .gte('anio', minYear),

          supabase
            .from('gastos')
            .select('monto, fecha')
            .eq('profesor_id', profesorId)
            .gte('fecha', start.toISOString().slice(0, 10))
        ])

      if (eErr) throw eErr
      if (pErr) throw pErr
      if (gErr) throw gErr

      const totalStudents = (estAll || []).length || 0
      const map = new Map()

      for (let i = 0; i < 12; i++) {
        const d = new Date(end.getFullYear(), end.getMonth() - i, 1)
        const y = d.getFullYear()
        const m = d.getMonth() + 1
        const key = `${y}-${pad2(m)}`
        map.set(key, {
          key,
          anio: y,
          mes: m,
          ingresos: 0,
          egresos: 0,
          balance: 0,
          pctPaid: 0,
          paidSet: new Set()
        })
      }

      for (const p of (pagosAll || [])) {
        const key = `${p.anio}-${pad2(p.mes)}`
        if (!map.has(key)) continue
        const row = map.get(key)
        row.ingresos += Number(p.monto) || 0
        if (p.estudiante_id) row.paidSet.add(p.estudiante_id)
      }

      for (const g of (gastosAll || [])) {
        const d = new Date(`${g.fecha}T00:00:00`)
        const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
        if (!map.has(key)) continue
        map.get(key).egresos += Number(g.monto) || 0
      }

      const arr = Array.from(map.values())
        .map((x) => {
          const balance = x.ingresos - x.egresos
          const pctPaid = totalStudents ? Math.round((x.paidSet.size / totalStudents) * 100) : 0
          return {
            key: x.key,
            anio: x.anio,
            mes: x.mes,
            ingresos: x.ingresos,
            egresos: x.egresos,
            balance,
            pctPaid
          }
        })
        .sort((a, b) => (a.key > b.key ? 1 : -1))

      setSeries(arr)
    } catch (err) {
      console.error(err)
    }
  }

  const idsConPago = useMemo(() => new Set((pagosMes || []).map((p) => p.estudiante_id)), [pagosMes])

  const totalCobrado = useMemo(
    () => (pagosMes || []).reduce((acc, p) => acc + (Number(p.monto) || 0), 0),
    [pagosMes]
  )

  const totalGastado = useMemo(
    () => (gastosMes || []).reduce((acc, g) => acc + (Number(g.monto) || 0), 0),
    [gastosMes]
  )

  const balance = totalCobrado - totalGastado

  const estudiantesPagaron = useMemo(
    () => (estudiantes || []).filter((e) => idsConPago.has(e.id)),
    [estudiantes, idsConPago]
  )

  const estudiantesPendientes = useMemo(
    () => (estudiantes || []).filter((e) => !idsConPago.has(e.id)),
    [estudiantes, idsConPago]
  )

  const pctPagaron = useMemo(() => {
    const total = estudiantes?.length || 0
    if (!total) return 0
    return Math.round((estudiantesPagaron.length / total) * 100)
  }, [estudiantes, estudiantesPagaron])

  const formatMoney = (n) => `$${Number(n || 0).toLocaleString('es-UY')}`

  const handlePickMonthFromBar = (m, y) => {
    setMes(Number(m))
    setAnio(Number(y))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const maxPositive = (key) => {
    const m = Math.max(...series.map((s) => Number(s[key]) || 0), 1)
    return m
  }

  const maxAbsBalance = useMemo(() => {
    const m = Math.max(...series.map((s) => Math.abs(Number(s.balance) || 0)), 1)
    return m
  }, [series])

  const maxIngresos = useMemo(() => maxPositive('ingresos'), [series])
  const maxEgresos = useMemo(() => maxPositive('egresos'), [series])
  const maxPct = useMemo(() => Math.max(...series.map((s) => Number(s.pctPaid) || 0), 1), [series])

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
              <h3 className={`pc-value ${balance >= 0 ? 'pos' : 'neg'}`}>{formatMoney(balance)}</h3>
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

      <div className="progreso-history">
        <div className="ph-history-header">
          <h3>
            <History size={20} /> Historial (últimos 12 meses)
          </h3>
          <p>Clickeá una barra para cambiar el mes.</p>
        </div>

        {/* COBRADO */}
        <div className="ph-chart-wrap">
          <div className="ph-chart-title">
            <h4>Cobrado</h4>
            <span>Ingresos mensuales</span>
          </div>

          <div className="ph-chart2">
            <div className="ph-yaxis">
              <div>{formatMoney(maxIngresos)}</div>
              <div>{formatMoney(Math.round(maxIngresos * 0.75))}</div>
              <div>{formatMoney(Math.round(maxIngresos * 0.5))}</div>
              <div>{formatMoney(Math.round(maxIngresos * 0.25))}</div>
              <div>{formatMoney(0)}</div>
            </div>

            <div className="ph-plot ph-plot--pos">
              <div className="ph-gridlines">
                <div />
                <div />
                <div />
                <div />
              </div>

              <div className="ph-bars">
                {series.map((s) => {
                  const h = Math.round((Number(s.ingresos || 0) / maxIngresos) * 100)
                  return (
                    <button
                      key={s.key}
                      type="button"
                      className="ph-bar2"
                      onClick={() => handlePickMonthFromBar(s.mes, s.anio)}
                      title={`${pad2(s.mes)}/${String(s.anio).slice(-2)}: ${formatMoney(s.ingresos)}`}
                    >
                      <div className="ph-bar2-fill ph-blue" style={{ height: `${h}%` }} />
                      <div className="ph-bar2-label">{pad2(s.mes)}/{String(s.anio).slice(-2)}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* GASTADO */}
        <div className="ph-chart-wrap">
          <div className="ph-chart-title">
            <h4>Gastado</h4>
            <span>Egresos mensuales</span>
          </div>

          <div className="ph-chart2">
            <div className="ph-yaxis">
              <div>{formatMoney(maxEgresos)}</div>
              <div>{formatMoney(Math.round(maxEgresos * 0.75))}</div>
              <div>{formatMoney(Math.round(maxEgresos * 0.5))}</div>
              <div>{formatMoney(Math.round(maxEgresos * 0.25))}</div>
              <div>{formatMoney(0)}</div>
            </div>

            <div className="ph-plot ph-plot--pos">
              <div className="ph-gridlines">
                <div />
                <div />
                <div />
                <div />
              </div>

              <div className="ph-bars">
                {series.map((s) => {
                  const h = Math.round((Number(s.egresos || 0) / maxEgresos) * 100)
                  return (
                    <button
                      key={s.key}
                      type="button"
                      className="ph-bar2"
                      onClick={() => handlePickMonthFromBar(s.mes, s.anio)}
                      title={`${pad2(s.mes)}/${String(s.anio).slice(-2)}: ${formatMoney(s.egresos)}`}
                    >
                      <div className="ph-bar2-fill ph-amber" style={{ height: `${h}%` }} />
                      <div className="ph-bar2-label">{pad2(s.mes)}/{String(s.anio).slice(-2)}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* BALANCE */}
        <div className="ph-chart-wrap">
          <div className="ph-chart-title">
            <h4>Balance</h4>
            <span>Ingresos - egresos</span>
          </div>

          <div className="ph-chart2">
            <div className="ph-yaxis">
              <div>{formatMoney(maxAbsBalance)}</div>
              <div>{formatMoney(Math.round(maxAbsBalance * 0.5))}</div>
              <div>{formatMoney(0)}</div>
              <div>-{formatMoney(Math.round(maxAbsBalance * 0.5)).replace('$', '$')}</div>
              <div>-{formatMoney(maxAbsBalance).replace('$', '$')}</div>
            </div>

            <div className="ph-plot ph-plot--balance">
              <div className="ph-gridlines ph-gridlines--balance">
                <div />
                <div />
                <div className="ph-zero-line" />
                <div />
                <div />
              </div>

              <div className="ph-bars">
                {series.map((s) => {
                  const v = Number(s.balance || 0)
                  const absH = Math.round((Math.abs(v) / maxAbsBalance) * 50) // 0..50

                  const style =
                    v >= 0
                      ? { top: `calc(50% - ${absH}%)`, height: `${absH}%` }
                      : { top: `50%`, height: `${absH}%` }

                  return (
                    <button
                      key={s.key}
                      type="button"
                      className="ph-bar2 ph-bar2--balance"
                      onClick={() => handlePickMonthFromBar(s.mes, s.anio)}
                      title={`${pad2(s.mes)}/${String(s.anio).slice(-2)}: ${formatMoney(v)}`}
                    >
                      <div className="ph-bar2-zone">
                        <div
                          className={`ph-bar2-fill ph-bar2-fill--abs ${
                            v >= 0 ? 'ph-green is-pos' : 'ph-red is-neg'
                          }`}
                          style={style}
                        />
                      </div>

                      <div className="ph-bar2-label">
                        {pad2(s.mes)}/{String(s.anio).slice(-2)}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* PAGARON */}
        <div className="ph-chart-wrap">
          <div className="ph-chart-title">
            <h4>Pagaron</h4>
            <span>% de estudiantes que pagaron</span>
          </div>

          <div className="ph-chart2">
            <div className="ph-yaxis">
              <div>{Math.max(100, maxPct)}%</div>
              <div>75%</div>
              <div>50%</div>
              <div>25%</div>
              <div>0%</div>
            </div>

            <div className="ph-plot ph-plot--pos">
              <div className="ph-gridlines">
                <div />
                <div />
                <div />
                <div />
              </div>

              <div className="ph-bars">
                {series.map((s) => {
                  const h = Math.round((Number(s.pctPaid || 0) / 100) * 100)
                  return (
                    <button
                      key={s.key}
                      type="button"
                      className="ph-bar2"
                      onClick={() => handlePickMonthFromBar(s.mes, s.anio)}
                      title={`${pad2(s.mes)}/${String(s.anio).slice(-2)}: ${s.pctPaid}%`}
                    >
                      <div className="ph-bar2-fill ph-blue" style={{ height: `${h}%` }} />
                      <div className="ph-bar2-label">{pad2(s.mes)}/{String(s.anio).slice(-2)}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
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
                  <div className="row-name">
                    {e.nombre} {e.apellido}
                  </div>
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
                  <div className="row-name">
                    {e.nombre} {e.apellido}
                  </div>
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
