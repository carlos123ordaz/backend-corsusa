const VacEmpleado = require('../models/VacEmpleado');
const VacSolicitud = require('../models/VacSolicitud');
const VacPolitica  = require('../models/VacPolitica');
const VacFeriado   = require('../models/VacFeriado');
const Area         = require('../models/Area');
const User         = require('../models/User');
const { sendSuccess, sendError } = require('../helpers/responseHelper');

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_CONFIG = {
  'vacaciones':      { descuenta: true,  gozaSueldo: true  },
  'permiso-goce':    { descuenta: false, gozaSueldo: true  },
  'permiso-singoce': { descuenta: false, gozaSueldo: false },
  'medica':          { descuenta: false, gozaSueldo: true  },
  'cumple':          { descuenta: false, gozaSueldo: true  },
};

// Datos semilla para poblar la BD en el primer arranque
const FERIADOS_SEED = {
  '2025-01-01': 'Año Nuevo',
  '2025-04-17': 'Jueves Santo',
  '2025-04-18': 'Viernes Santo',
  '2025-05-01': 'Día del Trabajo',
  '2025-06-07': 'Batalla de Arica',
  '2025-06-29': 'San Pedro y San Pablo',
  '2025-07-28': 'Independencia',
  '2025-07-29': 'Independencia',
  '2025-08-30': 'Santa Rosa de Lima',
  '2025-10-08': 'Combate de Angamos',
  '2025-11-01': 'Todos los Santos',
  '2025-12-08': 'Inmaculada Concepción',
  '2025-12-25': 'Navidad',
  '2026-01-01': 'Año Nuevo',
  '2026-04-02': 'Jueves Santo',
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajo',
  '2026-06-07': 'Batalla de Arica',
  '2026-06-29': 'San Pedro y San Pablo',
  '2026-07-23': 'Día de la Fuerza Aérea',
  '2026-07-28': 'Independencia',
  '2026-07-29': 'Independencia',
  '2026-08-30': 'Santa Rosa de Lima',
  '2026-10-08': 'Combate de Angamos',
  '2026-11-01': 'Todos los Santos',
  '2026-12-08': 'Inmaculada Concepción',
  '2026-12-25': 'Navidad',
};

// Colores por defecto según el código de área (se aplican si Area.color no ha sido personalizado)
const DEFAULT_AREA_COLORS = {
  td:    '#2563eb',
  ops:   '#0a9d6f',
  comer: '#ea8035',
  fin:   '#8a4ad1',
  rrhh:  '#d65a96',
};

// ─── Feriados Cache (para countWorkdays síncrono) ─────────────────────────────

let _feriadosCache = null;
const invalidateFeriadosCache = () => { _feriadosCache = null; };

async function getFeriadosSet() {
  if (_feriadosCache) return _feriadosCache;
  let docs = await VacFeriado.find().lean();
  if (docs.length === 0) {
    const toInsert = Object.entries(FERIADOS_SEED).map(([iso, nombre]) => ({
      iso, nombre, year: parseInt(iso.substring(0, 4)),
    }));
    await VacFeriado.insertMany(toInsert, { ordered: false }).catch(() => {});
    docs = await VacFeriado.find().lean();
  }
  _feriadosCache = new Set(docs.map(d => d.iso));
  return _feriadosCache;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad2(n) { return String(n).padStart(2, '0'); }

function toIsoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

async function countWorkdays(desde, hasta) {
  const feriados = await getFeriadosSet();
  const start = new Date(desde + 'T12:00:00');
  const end   = new Date(hasta + 'T12:00:00');
  let count   = 0;
  const cur   = new Date(start);
  while (cur <= end) {
    const wd = cur.getDay();
    if (wd !== 0 && wd !== 6 && !feriados.has(toIsoDate(cur))) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function formatEmpleado(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id:         obj._id.toString(),
    name:       obj.name,
    role:       obj.role || '',
    area:       obj.area,
    lead:       obj.leadId ? obj.leadId.toString() : null,
    avatar:     obj.avatar || 'var(--av-blue)',
    ingreso:    obj.ingreso instanceof Date ? toIsoDate(obj.ingreso) : obj.ingreso,
    saldoTotal: obj.saldoTotal,
    tomados:    obj.tomados,
    pendientes: obj.pendientes,
  };
}

function formatSolicitud(doc) {
  if (!doc) return null;
  const obj    = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const result = {
    id:         obj._id.toString(),
    empId:      obj.empId ? obj.empId.toString() : null,
    tipo:       obj.tipo,
    desde:      obj.desde,
    hasta:      obj.hasta,
    dias:       obj.dias,
    estado:     obj.estado,
    motivo:     obj.motivo,
    solicitada: obj.solicitada instanceof Date ? toIsoDate(obj.solicitada) : obj.solicitada,
    aprobador:  obj.aprobadorId ? obj.aprobadorId.toString() : null,
    nivel:      obj.nivel,
  };
  if (obj.aprobada) {
    result.aprobada = obj.aprobada instanceof Date ? toIsoDate(obj.aprobada) : obj.aprobada;
  }
  if (obj.motivoRechazo) {
    result.motivoRechazo = obj.motivoRechazo;
  }
  return result;
}

// ─── Áreas ────────────────────────────────────────────────────────────────────

// Derivar el código corto de área desde el doc de Area
// Usa shortName si está definido, si no aplica el mismo mapeo regex de mapAreaName
function areaDocToCode(areaDoc) {
  if (areaDoc.shortName) return areaDoc.shortName.toLowerCase();
  return mapAreaName(areaDoc.name) || null;
}

const getAreas = async (_req, res) => {
  try {
    const docs = await Area.find({ status: 'active' }).sort({ name: 1 }).lean();
    const areas = docs
      .map(a => {
        const code = areaDocToCode(a);
        if (!code) return null;
        return {
          id:    code,
          label: a.name,
          // Usa el color almacenado si fue personalizado, si no aplica el default por código
          color: (a.color && a.color !== '#6b7280') ? a.color : (DEFAULT_AREA_COLORS[code] || '#6b7280'),
        };
      })
      .filter(Boolean);
    return sendSuccess(res, areas);
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Empleados ────────────────────────────────────────────────────────────────

const getEmpleados = async (req, res) => {
  try {
    const { area, search, active = 'true' } = req.query;
    const filter = {};
    if (active !== 'all') filter.active = active === 'true';
    if (area) filter.area = area;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
      ];
    }

    let docs = await VacEmpleado.find(filter).sort({ area: 1, name: 1 }).lean();

    if (docs.length === 0 && !area && !search) {
      await _doSyncFromUsers({ dryRun: false, modo: 'solo-nuevos' });
      docs = await VacEmpleado.find(filter).sort({ area: 1, name: 1 }).lean();
    }

    return sendSuccess(res, docs.map(formatEmpleado));
  } catch (err) {
    return sendError(res, err.message);
  }
};

const getEmpleadoById = async (req, res) => {
  try {
    const doc = await VacEmpleado.findById(req.params.id).lean();
    if (!doc) return sendError(res, 'Empleado no encontrado', 404);
    return sendSuccess(res, formatEmpleado(doc));
  } catch (err) {
    return sendError(res, err.message);
  }
};

const createEmpleado = async (req, res) => {
  try {
    const { name, role, area, leadId, avatar, ingreso, saldoTotal } = req.body;
    if (!name || !area || !ingreso) {
      return sendError(res, 'name, area e ingreso son requeridos', 400);
    }

    const areaDocs = await Area.find({ status: 'active' }).lean();
    const validCodes = areaDocs.map(areaDocToCode).filter(Boolean);
    if (!validCodes.includes(area)) {
      return sendError(res, `Área inválida. Valores: ${validCodes.join(', ')}`, 400);
    }

    if (leadId) {
      const lead = await VacEmpleado.findById(leadId);
      if (!lead) return sendError(res, 'Líder no encontrado', 404);
    }
    const doc = await VacEmpleado.create({
      name, role, area, leadId: leadId || null, avatar, ingreso,
      saldoTotal: saldoTotal ?? 30,
    });
    return sendSuccess(res, formatEmpleado(doc), 201);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return sendError(res, Object.values(err.errors).map(e => e.message).join(', '), 400);
    }
    return sendError(res, err.message);
  }
};

const updateEmpleado = async (req, res) => {
  try {
    const allowed = ['name','role','area','leadId','avatar','ingreso','saldoTotal','active'];
    const update  = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (update.area) {
      const areaDocs = await Area.find({ status: 'active' }).lean();
      const validCodes = areaDocs.map(areaDocToCode).filter(Boolean);
      if (!validCodes.includes(update.area)) {
        return sendError(res, `Área inválida: ${update.area}`, 400);
      }
    }
    const doc = await VacEmpleado.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) return sendError(res, 'Empleado no encontrado', 404);
    return sendSuccess(res, formatEmpleado(doc));
  } catch (err) {
    return sendError(res, err.message);
  }
};

const getEmpleadoHistorial = async (req, res) => {
  try {
    const docs = await VacSolicitud.find({ empId: req.params.id })
      .sort({ solicitada: -1 })
      .lean();
    return sendSuccess(res, docs.map(formatSolicitud));
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Solicitudes ──────────────────────────────────────────────────────────────

const getSolicitudes = async (req, res) => {
  try {
    const { estado, empId, tipo, desde, hasta } = req.query;
    const filter = {};
    if (estado) filter.estado = estado;
    if (empId)  filter.empId  = empId;
    if (tipo)   filter.tipo   = tipo;
    if (desde)  filter.desde  = { $gte: desde };
    if (hasta)  filter.hasta  = { $lte: hasta };
    const docs = await VacSolicitud.find(filter).sort({ solicitada: -1 }).lean();
    return sendSuccess(res, docs.map(formatSolicitud));
  } catch (err) {
    return sendError(res, err.message);
  }
};

const getSolicitudById = async (req, res) => {
  try {
    const doc = await VacSolicitud.findById(req.params.id).lean();
    if (!doc) return sendError(res, 'Solicitud no encontrada', 404);
    return sendSuccess(res, formatSolicitud(doc));
  } catch (err) {
    return sendError(res, err.message);
  }
};

const createSolicitud = async (req, res) => {
  try {
    const { empId, tipo, desde, hasta, motivo } = req.body;

    if (!empId || !tipo || !desde || !hasta || !motivo) {
      return sendError(res, 'empId, tipo, desde, hasta y motivo son requeridos', 400);
    }
    if (!TIPOS_CONFIG[tipo]) {
      return sendError(res, `Tipo inválido: ${tipo}`, 400);
    }
    if (desde > hasta) {
      return sendError(res, 'La fecha de inicio no puede ser posterior a la fecha de fin', 400);
    }

    const emp = await VacEmpleado.findById(empId);
    if (!emp || !emp.active) {
      return sendError(res, 'Empleado no encontrado o inactivo', 404);
    }

    const dias = await countWorkdays(desde, hasta);
    if (dias < 1) {
      return sendError(res, 'El rango de fechas no contiene días hábiles', 400);
    }

    if (TIPOS_CONFIG[tipo].descuenta) {
      const disponible = emp.saldoTotal - emp.tomados - emp.pendientes;
      if (disponible < dias) {
        return sendError(
          res,
          `Saldo insuficiente. Disponible: ${disponible}d · Solicitado: ${dias}d`,
          400
        );
      }
    }

    const overlap = await VacSolicitud.findOne({
      empId,
      estado: { $in: ['pendiente', 'aprobado'] },
      desde: { $lte: hasta },
      hasta: { $gte: desde },
    });
    if (overlap) {
      return sendError(
        res,
        `Ya existe una solicitud que se superpone con el período ${overlap.desde} – ${overlap.hasta}`,
        409
      );
    }

    let aprobadorId = emp.leadId || null;
    let nivel = dias > 5 ? 'rrhh' : 'lider';

    if (!aprobadorId) {
      const rrhhLead = await VacEmpleado.findOne({ area: 'rrhh', leadId: null, active: true });
      aprobadorId = rrhhLead ? rrhhLead._id : null;
      nivel = 'rrhh';
    }

    const solicitud = await VacSolicitud.create({
      empId, tipo, desde, hasta, dias, motivo,
      aprobadorId, nivel, estado: 'pendiente', solicitada: new Date(),
    });

    if (TIPOS_CONFIG[tipo].descuenta) {
      await VacEmpleado.findByIdAndUpdate(empId, { $inc: { pendientes: dias } });
    }

    return sendSuccess(res, formatSolicitud(solicitud), 201);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return sendError(res, Object.values(err.errors).map(e => e.message).join(', '), 400);
    }
    return sendError(res, err.message);
  }
};

const aprobarSolicitud = async (req, res) => {
  try {
    const solicitud = await VacSolicitud.findById(req.params.id);
    if (!solicitud) return sendError(res, 'Solicitud no encontrada', 404);
    if (solicitud.estado !== 'pendiente') {
      return sendError(res, `La solicitud ya fue ${solicitud.estado}`, 409);
    }

    solicitud.estado  = 'aprobado';
    solicitud.aprobada = new Date();
    if (req.body.aprobadorId) solicitud.aprobadorId = req.body.aprobadorId;
    await solicitud.save();

    if (TIPOS_CONFIG[solicitud.tipo]?.descuenta) {
      await VacEmpleado.findByIdAndUpdate(solicitud.empId, {
        $inc: { tomados: solicitud.dias, pendientes: -solicitud.dias },
      });
    }

    return sendSuccess(res, formatSolicitud(solicitud));
  } catch (err) {
    return sendError(res, err.message);
  }
};

const rechazarSolicitud = async (req, res) => {
  try {
    const { motivo } = req.body;
    if (!motivo || !motivo.trim()) {
      return sendError(res, 'El motivo de rechazo es requerido', 400);
    }

    const solicitud = await VacSolicitud.findById(req.params.id);
    if (!solicitud) return sendError(res, 'Solicitud no encontrada', 404);
    if (solicitud.estado !== 'pendiente') {
      return sendError(res, `La solicitud ya fue ${solicitud.estado}`, 409);
    }

    solicitud.estado        = 'rechazado';
    solicitud.motivoRechazo = motivo.trim();
    await solicitud.save();

    if (TIPOS_CONFIG[solicitud.tipo]?.descuenta) {
      await VacEmpleado.findByIdAndUpdate(solicitud.empId, {
        $inc: { pendientes: -solicitud.dias },
      });
    }

    return sendSuccess(res, formatSolicitud(solicitud));
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const getDashboard = async (req, res) => {
  try {
    const [empleados, solicitudes] = await Promise.all([
      VacEmpleado.find({ active: true }).lean(),
      VacSolicitud.find({}).sort({ solicitada: -1 }).lean(),
    ]);

    const pendientes  = solicitudes.filter(s => s.estado === 'pendiente').length;
    const aprobados   = solicitudes.filter(s => s.estado === 'aprobado').length;
    const rechazados  = solicitudes.filter(s => s.estado === 'rechazado').length;

    const today = toIsoDate(new Date());
    const mesActual = today.substring(0, 7);

    const diasEsteMes = solicitudes
      .filter(s => s.estado === 'aprobado' && s.desde.startsWith(mesActual))
      .reduce((acc, s) => acc + s.dias, 0);

    const totalDisponibles = empleados.reduce(
      (acc, e) => acc + Math.max(0, e.saldoTotal - e.tomados - e.pendientes),
      0
    );

    const ausenciasHoy = solicitudes
      .filter(s => s.estado === 'aprobado' && s.desde <= today && s.hasta >= today)
      .map(formatSolicitud);

    const recientes = solicitudes.slice(0, 8).map(formatSolicitud);

    const bajosaldo = empleados
      .map(e => ({
        ...formatEmpleado(e),
        disponible: Math.max(0, e.saldoTotal - e.tomados - e.pendientes),
      }))
      .sort((a, b) => a.disponible - b.disponible)
      .slice(0, 5);

    return sendSuccess(res, {
      totalEmpleados: empleados.length,
      pendientes, aprobados, rechazados,
      diasEsteMes, totalDisponibles,
      ausenciasHoy, recientes, bajosaldo,
    });
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Calendario ───────────────────────────────────────────────────────────────

const getCalendario = async (req, res) => {
  try {
    const now   = new Date();
    const y     = parseInt(req.query.year)  || now.getFullYear();
    const m     = parseInt(req.query.month) || now.getMonth() + 1;
    const desde = `${y}-${pad2(m)}-01`;
    const lastD = new Date(y, m, 0).getDate();
    const hasta = `${y}-${pad2(m)}-${pad2(lastD)}`;

    const docs = await VacSolicitud.find({
      estado: { $in: ['pendiente', 'aprobado'] },
      desde:  { $lte: hasta },
      hasta:  { $gte: desde },
    }).lean();

    return sendSuccess(res, docs.map(formatSolicitud));
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Reportes ─────────────────────────────────────────────────────────────────

const getReportes = async (req, res) => {
  try {
    const [empleados, solicitudes] = await Promise.all([
      VacEmpleado.find({ active: true }).lean(),
      VacSolicitud.find({}).lean(),
    ]);

    const porTipo = {};
    for (const s of solicitudes) {
      if (!porTipo[s.tipo]) porTipo[s.tipo] = { count: 0, dias: 0 };
      porTipo[s.tipo].count++;
      porTipo[s.tipo].dias += s.dias;
    }

    const empMap = Object.fromEntries(empleados.map(e => [e._id.toString(), e]));
    const porArea = {};
    for (const s of solicitudes) {
      const emp  = empMap[s.empId.toString()];
      const area = emp?.area || 'desconocido';
      if (!porArea[area]) porArea[area] = { count: 0, dias: 0 };
      porArea[area].count++;
      porArea[area].dias += s.dias;
    }

    const porMes = {};
    for (const s of solicitudes.filter(s => s.estado === 'aprobado')) {
      const mes = s.desde.substring(0, 7);
      if (!porMes[mes]) porMes[mes] = { count: 0, dias: 0 };
      porMes[mes].count++;
      porMes[mes].dias += s.dias;
    }

    const balanceSummary = empleados.map(e => ({
      ...formatEmpleado(e),
      disponible: Math.max(0, e.saldoTotal - e.tomados - e.pendientes),
    }));

    return sendSuccess(res, { porTipo, porArea, porMes, balanceSummary });
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Políticas ────────────────────────────────────────────────────────────────

const DEFAULT_POLITICA = {
  diasBase:     30,
  periodo:      'aniversario',
  anticipacion: 15,
  maxBloque:    15,
  adelantar:    true,
  doblePaso:    true,
  autoAprobar:  false,
  notifEmail:   true,
  notifSlack:   true,
  tiposHabilitados: [
    { id: 'vacaciones',      enabled: true },
    { id: 'permiso-goce',    enabled: true },
    { id: 'permiso-singoce', enabled: true },
    { id: 'medica',          enabled: true },
    { id: 'cumple',          enabled: true },
  ],
};

function formatPolitica(doc) {
  return {
    diasBase:         doc.diasBase,
    periodo:          doc.periodo,
    anticipacion:     doc.anticipacion,
    maxBloque:        doc.maxBloque,
    adelantar:        doc.adelantar,
    doblePaso:        doc.doblePaso,
    autoAprobar:      doc.autoAprobar,
    notifEmail:       doc.notifEmail,
    notifSlack:       doc.notifSlack,
    tiposHabilitados: doc.tiposHabilitados,
  };
}

const getPoliticas = async (_req, res) => {
  try {
    let doc = await VacPolitica.findOne().lean();
    if (!doc) {
      doc = (await VacPolitica.create(DEFAULT_POLITICA)).toObject();
    }
    return sendSuccess(res, formatPolitica(doc));
  } catch (err) {
    return sendError(res, err.message);
  }
};

const updatePoliticas = async (req, res) => {
  try {
    const allowed = [
      'diasBase','periodo','anticipacion','maxBloque',
      'adelantar','doblePaso','autoAprobar',
      'notifEmail','notifSlack','tiposHabilitados',
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const doc = await VacPolitica.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    return sendSuccess(res, formatPolitica(doc));
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Feriados ─────────────────────────────────────────────────────────────────

const getFeriados = async (req, res) => {
  try {
    // Asegura que la semilla esté cargada en BD
    await getFeriadosSet();
    const filter = {};
    if (req.query.year) filter.year = parseInt(req.query.year);
    const docs = await VacFeriado.find(filter).sort({ iso: 1 }).lean();
    return sendSuccess(res, Object.fromEntries(docs.map(d => [d.iso, d.nombre])));
  } catch (err) {
    return sendError(res, err.message);
  }
};

const createFeriado = async (req, res) => {
  try {
    const { iso, nombre } = req.body;
    if (!iso || !nombre) return sendError(res, 'iso y nombre son requeridos', 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      return sendError(res, 'iso debe tener formato YYYY-MM-DD', 400);
    }
    const year = parseInt(iso.substring(0, 4));
    const doc = await VacFeriado.create({ iso, nombre: nombre.trim(), year });
    invalidateFeriadosCache();
    return sendSuccess(res, { iso: doc.iso, nombre: doc.nombre }, 201);
  } catch (err) {
    if (err.code === 11000) return sendError(res, 'Ya existe un feriado con esa fecha', 409);
    return sendError(res, err.message);
  }
};

const deleteFeriado = async (req, res) => {
  try {
    const { iso } = req.params;
    const doc = await VacFeriado.findOneAndDelete({ iso });
    if (!doc) return sendError(res, 'Feriado no encontrado', 404);
    invalidateFeriadosCache();
    return sendSuccess(res, { deleted: iso });
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Seed ─────────────────────────────────────────────────────────────────────

const seedData = async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const count = await VacEmpleado.countDocuments();

    if (count > 0 && !force) {
      return sendError(
        res,
        `Ya existen ${count} empleados. Usa ?force=true para reinicializar.`,
        409
      );
    }

    if (force) {
      await VacEmpleado.deleteMany({});
      await VacSolicitud.deleteMany({});
    }

    // ── Fase 1: crear empleados sin leads ────────────────────────────────────
    const raw = [
      { _t: 'e1',  name: 'Luis Taipe H.',         role: 'Asistente de Soporte TD',         area: 'td',    _tl: 'e3',  avatar: 'var(--av-blue)',   ingreso: '2023-03-15', saldoTotal: 30, tomados: 12, pendientes: 2 },
      { _t: 'e2',  name: 'Victor Balboa M.',       role: 'Desarrollador Backend',           area: 'td',    _tl: 'e3',  avatar: 'var(--av-red)',    ingreso: '2022-08-01', saldoTotal: 30, tomados: 20, pendientes: 0 },
      { _t: 'e3',  name: 'Luis Suarez R.',         role: 'Líder de Transformación Digital', area: 'td',    _tl: null,  avatar: 'var(--av-green)',  ingreso: '2020-01-12', saldoTotal: 30, tomados: 8,  pendientes: 5 },
      { _t: 'e4',  name: 'Carlos Jesús Ordaz H.', role: 'Desarrollador Frontend',          area: 'td',    _tl: 'e3',  avatar: 'var(--av-orange)', ingreso: '2024-05-10', saldoTotal: 30, tomados: 3,  pendientes: 7 },
      { _t: 'e5',  name: 'María Quispe T.',        role: 'Analista de Recursos Humanos',    area: 'rrhh',  _tl: 'e6',  avatar: 'var(--av-pink)',   ingreso: '2021-11-22', saldoTotal: 30, tomados: 18, pendientes: 0 },
      { _t: 'e6',  name: 'Patricia Núñez L.',      role: 'Jefa de Recursos Humanos',        area: 'rrhh',  _tl: null,  avatar: 'var(--av-purple)', ingreso: '2019-04-03', saldoTotal: 30, tomados: 24, pendientes: 0 },
      { _t: 'e7',  name: 'Diego Vargas C.',        role: 'Coordinador de Operaciones',      area: 'ops',   _tl: 'e8',  avatar: 'var(--av-teal)',   ingreso: '2022-02-18', saldoTotal: 30, tomados: 10, pendientes: 0 },
      { _t: 'e8',  name: 'Ana Reyes M.',           role: 'Gerente de Operaciones',          area: 'ops',   _tl: null,  avatar: 'var(--av-amber)',  ingreso: '2018-07-09', saldoTotal: 30, tomados: 6,  pendientes: 0 },
      { _t: 'e9',  name: 'Sofía Mendoza P.',       role: 'Asistente de Operaciones',        area: 'ops',   _tl: 'e7',  avatar: 'var(--av-slate)',  ingreso: '2023-09-01', saldoTotal: 30, tomados: 14, pendientes: 0 },
      { _t: 'e10', name: 'Jorge Ramos S.',         role: 'Ejecutivo Comercial',             area: 'comer', _tl: 'e11', avatar: 'var(--av-blue)',   ingreso: '2024-01-15', saldoTotal: 30, tomados: 5,  pendientes: 5 },
      { _t: 'e11', name: 'Lucía Espinoza V.',      role: 'Gerente Comercial',               area: 'comer', _tl: null,  avatar: 'var(--av-red)',    ingreso: '2017-11-30', saldoTotal: 30, tomados: 28, pendientes: 0 },
      { _t: 'e12', name: 'Renato Pérez A.',        role: 'Analista de Finanzas',            area: 'fin',   _tl: 'e13', avatar: 'var(--av-green)',  ingreso: '2022-06-20', saldoTotal: 30, tomados: 16, pendientes: 0 },
      { _t: 'e13', name: 'Karen Salas D.',         role: 'Contadora General',               area: 'fin',   _tl: null,  avatar: 'var(--av-purple)', ingreso: '2019-09-15', saldoTotal: 30, tomados: 22, pendientes: 0 },
    ];

    const idMap = {};
    for (const e of raw) {
      const doc = await VacEmpleado.create({
        name: e.name, role: e.role, area: e.area, avatar: e.avatar,
        ingreso: new Date(e.ingreso),
        saldoTotal: e.saldoTotal, tomados: e.tomados, pendientes: e.pendientes,
      });
      idMap[e._t] = doc._id;
    }

    // ── Fase 2: asignar leads ─────────────────────────────────────────────────
    for (const e of raw) {
      if (e._tl) {
        await VacEmpleado.findByIdAndUpdate(idMap[e._t], { leadId: idMap[e._tl] });
      }
    }

    // ── Fase 3: crear solicitudes ─────────────────────────────────────────────
    const sols = [
      { _te: 'e4',  tipo: 'vacaciones',      desde: '2026-05-18', hasta: '2026-05-22', dias: 5,  estado: 'pendiente',  motivo: 'Viaje familiar a Cusco.',                 solicitada: '2026-05-08', _ta: 'e3',  nivel: 'lider' },
      { _te: 'e1',  tipo: 'vacaciones',      desde: '2026-05-25', hasta: '2026-05-29', dias: 5,  estado: 'pendiente',  motivo: 'Vacaciones programadas.',                 solicitada: '2026-05-10', _ta: 'e3',  nivel: 'lider' },
      { _te: 'e3',  tipo: 'vacaciones',      desde: '2026-06-01', hasta: '2026-06-05', dias: 5,  estado: 'pendiente',  motivo: 'Descanso anual.',                         solicitada: '2026-05-11', _ta: 'e6',  nivel: 'rrhh'  },
      { _te: 'e10', tipo: 'permiso-goce',    desde: '2026-05-20', hasta: '2026-05-20', dias: 1,  estado: 'pendiente',  motivo: 'Trámite bancario personal.',              solicitada: '2026-05-12', _ta: 'e11', nivel: 'lider' },
      { _te: 'e4',  tipo: 'permiso-singoce', desde: '2026-06-15', hasta: '2026-06-17', dias: 3,  estado: 'pendiente',  motivo: 'Curso de capacitación externo.',          solicitada: '2026-05-13', _ta: 'e3',  nivel: 'lider' },
      { _te: 'e3',  tipo: 'vacaciones',      desde: '2026-05-04', hasta: '2026-05-08', dias: 5,  estado: 'aprobado',   motivo: 'Descanso anual.',                         solicitada: '2026-04-15', _ta: 'e6',  aprobada: '2026-04-18' },
      { _te: 'e9',  tipo: 'medica',          desde: '2026-05-11', hasta: '2026-05-13', dias: 3,  estado: 'aprobado',   motivo: 'Licencia médica con descanso por gripe.', solicitada: '2026-05-11', _ta: 'e6',  aprobada: '2026-05-11' },
      { _te: 'e7',  tipo: 'vacaciones',      desde: '2026-05-25', hasta: '2026-06-05', dias: 10, estado: 'aprobado',   motivo: 'Viaje al extranjero.',                    solicitada: '2026-04-20', _ta: 'e8',  aprobada: '2026-04-22' },
      { _te: 'e2',  tipo: 'vacaciones',      desde: '2026-05-11', hasta: '2026-05-15', dias: 5,  estado: 'aprobado',   motivo: 'Vacaciones programadas.',                 solicitada: '2026-04-10', _ta: 'e3',  aprobada: '2026-04-12' },
      { _te: 'e12', tipo: 'cumple',          desde: '2026-05-19', hasta: '2026-05-19', dias: 1,  estado: 'aprobado',   motivo: 'Día por cumpleaños.',                     solicitada: '2026-05-05', _ta: 'e13', aprobada: '2026-05-05' },
      { _te: 'e5',  tipo: 'vacaciones',      desde: '2026-05-13', hasta: '2026-05-19', dias: 5,  estado: 'aprobado',   motivo: 'Vacaciones programadas.',                 solicitada: '2026-04-05', _ta: 'e6',  aprobada: '2026-04-08' },
      { _te: 'e1',  tipo: 'permiso-goce',    desde: '2026-04-22', hasta: '2026-04-22', dias: 1,  estado: 'rechazado',  motivo: 'Cita personal.',                          solicitada: '2026-04-20', _ta: 'e3',  motivoRechazo: 'Cierre mensual coincide con esa fecha.' },
    ];

    for (const s of sols) {
      await VacSolicitud.create({
        empId:         idMap[s._te],
        tipo:          s.tipo,
        desde:         s.desde,
        hasta:         s.hasta,
        dias:          s.dias,
        estado:        s.estado,
        motivo:        s.motivo,
        solicitada:    new Date(s.solicitada),
        aprobadorId:   s._ta ? idMap[s._ta] : null,
        nivel:         s.nivel || 'lider',
        aprobada:      s.aprobada   ? new Date(s.aprobada)   : null,
        motivoRechazo: s.motivoRechazo || null,
      });
    }

    return sendSuccess(res, {
      message:    'Datos inicializados correctamente',
      empleados:  raw.length,
      solicitudes: sols.length,
    }, 201);
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Sync desde Users ─────────────────────────────────────────────────────────

const AVATARS = [
  'var(--av-blue)', 'var(--av-red)',    'var(--av-green)', 'var(--av-orange)',
  'var(--av-purple)', 'var(--av-teal)', 'var(--av-pink)',  'var(--av-amber)',
  'var(--av-slate)',
];

function mapAreaName(name = '') {
  const n = name.toLowerCase();
  if (/digital|tecnolog|sistem|software|\bti\b|\btd\b/.test(n)) return 'td';
  if (/comer|venta|sales|marketing|negoc/.test(n))               return 'comer';
  if (/financ|contab|admin|tesor|contad/.test(n))                return 'fin';
  if (/recurso|rrhh|human|people|talent|personal/.test(n))       return 'rrhh';
  if (/oper|logist|distribuci|almac/.test(n))                    return 'ops';
  return null;
}

async function _doSyncFromUsers({ dryRun = false, modo = 'upsert' } = {}) {
  const users = await User.find({ active: true })
    .populate('areas', 'name shortName')
    .lean();

  if (users.length === 0) return { creados: 0, actualizados: 0, omitidos: 0, sinArea: [] };

  const existentes = await VacEmpleado.find({
    userId: { $in: users.map(u => u._id) },
  }).lean();
  const existenteMap = Object.fromEntries(existentes.map(e => [e.userId.toString(), e]));

  const resultado = { creados: 0, actualizados: 0, omitidos: 0, sinArea: [] };

  for (let i = 0; i < users.length; i++) {
    const user     = users[i];
    const fullName = [user.name, user.lname].filter(Boolean).join(' ').trim();
    if (!fullName) { resultado.omitidos++; continue; }

    const areaObj  = user.areas?.[0];
    const areaCode = areaObj ? mapAreaName(areaObj.name ?? areaObj.shortName) : null;

    if (!areaCode) {
      resultado.sinArea.push({
        userId:   user._id,
        nombre:   fullName,
        areaName: areaObj?.name ?? '(sin área)',
      });
      resultado.omitidos++;
      continue;
    }

    const vacData = {
      name:       fullName,
      role:       user.position || '',
      area:       areaCode,
      avatar:     AVATARS[i % AVATARS.length],
      ingreso:    user.createdAt || new Date(),
      userId:     user._id,
      active:     true,
      saldoTotal: 30,
    };

    const existente = existenteMap[user._id.toString()];

    if (!existente) {
      if (!dryRun) await VacEmpleado.create(vacData);
      resultado.creados++;
    } else if (modo === 'upsert') {
      if (!dryRun) {
        await VacEmpleado.findByIdAndUpdate(existente._id, {
          $set: { name: vacData.name, role: vacData.role, area: vacData.area },
        });
      }
      resultado.actualizados++;
    } else {
      resultado.omitidos++;
    }
  }

  return resultado;
}

const syncFromUsers = async (req, res) => {
  try {
    const dryRun = req.query.dryRun === 'true';
    const modo   = req.query.modo ?? 'upsert';
    const result = await _doSyncFromUsers({ dryRun, modo });
    return sendSuccess(res, { ...result, dryRun });
  } catch (err) {
    return sendError(res, err.message);
  }
};

module.exports = {
  // Áreas
  getAreas,
  // Empleados
  getEmpleados,
  getEmpleadoById,
  createEmpleado,
  updateEmpleado,
  getEmpleadoHistorial,
  // Solicitudes
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  aprobarSolicitud,
  rechazarSolicitud,
  // Analítica
  getDashboard,
  getCalendario,
  getReportes,
  // Feriados
  getFeriados,
  createFeriado,
  deleteFeriado,
  // Políticas
  getPoliticas,
  updatePoliticas,
  // Dev
  seedData,
  syncFromUsers,
};
