const VacSolicitud = require('../models/VacSolicitud');
const VacPolitica = require('../models/VacPolitica');
const VacFeriado = require('../models/VacFeriado');
const Area = require('../models/Area');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../helpers/responseHelper');

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_CONFIG = {
  'vacaciones':      { descuenta: true,  gozaSueldo: true  },
  'permiso-goce':    { descuenta: false, gozaSueldo: true  },
  'permiso-singoce': { descuenta: false, gozaSueldo: false },
  'medica':          { descuenta: false, gozaSueldo: true  },
  'cumple':          { descuenta: false, gozaSueldo: true  },
};

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

const DEFAULT_AREA_COLORS = {
  td:    '#2563eb',
  ops:   '#0a9d6f',
  comer: '#ea8035',
  
  fin:   '#8a4ad1',
  rrhh:  '#d65a96',
};

// ─── Caches ───────────────────────────────────────────────────────────────────

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
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const wd = cur.getDay();
    if (wd !== 0 && wd !== 6 && !feriados.has(toIsoDate(cur))) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// mapAreaName solo se usa para elegir colores por defecto; NO determina el código de área.
function mapAreaName(name = '') {
  const n = name.toLowerCase();
  if (/digital|tecnolog|sistem|software|\bti\b|\btd\b/.test(n)) return 'td';
  if (/comer|venta|sales|marketing|negoc/.test(n))              return 'comer';
  if (/financ|contab|admin|tesor|contad/.test(n))               return 'fin';
  if (/recurso|rrhh|human|people|talent|personal/.test(n))      return 'rrhh';
  if (/oper|logist|distribuci|almac/.test(n))                   return 'ops';
  return null;
}

// El código de área es shortName (si existe) o el _id del documento — siempre único.
function areaDocToCode(areaDoc) {
  if (areaDoc.shortName) return areaDoc.shortName.toLowerCase();
  return areaDoc._id.toString();
}

function formatEmpleado(userDoc) {
  const obj = typeof userDoc.toObject === 'function' ? userDoc.toObject() : userDoc;
  const fullName = [obj.name, obj.lname].filter(Boolean).join(' ').trim();
  const areaDoc  = obj.areas?.[0];
  const areaCode = areaDoc ? areaDocToCode(areaDoc) : null;
  return {
    id:         obj._id.toString(),
    name:       fullName,
    role:       obj.position || '',
    area:       areaCode,
    lead:       obj.vacLeadId ? obj.vacLeadId.toString() : null,
    avatar:     obj.photo || 'var(--av-blue)',
    ingreso:    obj.ingreso instanceof Date ? toIsoDate(obj.ingreso) : (obj.ingreso || null),
    saldoTotal: obj.vacSaldoTotal ?? 30,
    tomados:    obj.vacTomados    ?? 0,
    pendientes: obj.vacPendientes ?? 0,
    userId:     obj._id.toString(),
  };
}

function formatSolicitud(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const result = {
    id:           obj._id.toString(),
    empId:        obj.empId        ? obj.empId.toString()        : null,
    tipo:         obj.tipo,
    desde:        obj.desde,
    hasta:        obj.hasta,
    dias:         obj.dias,
    medioDia:     obj.medioDia || false,
    estado:       obj.estado,
    motivo:       obj.motivo,
    solicitada:   obj.solicitada instanceof Date ? toIsoDate(obj.solicitada) : obj.solicitada,
    aprobador:    obj.aprobadorId   ? obj.aprobadorId.toString()   : null,
    responsableId:obj.responsableId ? obj.responsableId.toString() : null,
    nivel:        obj.nivel,
  };
  if (obj.aprobada)      result.aprobada      = obj.aprobada instanceof Date ? toIsoDate(obj.aprobada) : obj.aprobada;
  if (obj.motivoRechazo) result.motivoRechazo = obj.motivoRechazo;
  return result;
}

// ─── Áreas ────────────────────────────────────────────────────────────────────

const getAreas = async (_req, res) => {
  try {
    const docs = await Area.find({ status: 'active' }).sort({ name: 1 }).lean();
    const seen  = new Set();
    const areas = docs
      .map(a => {
        const code = areaDocToCode(a);
        const colorKey = a.shortName?.toLowerCase() || mapAreaName(a.name);
        return {
          id:    code,
          label: a.name,
          color: (a.color && a.color !== '#6b7280')
            ? a.color
            : (DEFAULT_AREA_COLORS[colorKey] || '#6b7280'),
        };
      })
      .filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
    return sendSuccess(res, areas);
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Empleados (ahora leen directo de User) ───────────────────────────────────

const getEmpleados = async (req, res) => {
  try {
    const { search, active = 'true' } = req.query;
    const filter = {};
    if (active !== 'all') filter.active = active === 'true';
    if (search) {
      filter.$or = [
        { name:     { $regex: search, $options: 'i' } },
        { lname:    { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .populate('areas', 'name shortName')
      .sort({ name: 1, lname: 1 })
      .lean();

    return sendSuccess(res, users.map(formatEmpleado));
  } catch (err) {
    return sendError(res, err.message);
  }
};

const getEmpleadoById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('areas', 'name shortName')
      .lean();
    if (!user) return sendError(res, 'Usuario no encontrado', 404);
    return sendSuccess(res, formatEmpleado(user));
  } catch (err) {
    return sendError(res, err.message);
  }
};

// Solo permite actualizar campos de vacaciones del usuario (saldo y líder).
const updateEmpleado = async (req, res) => {
  try {
    const allowed = ['vacSaldoTotal', 'vacLeadId'];
    const update  = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (Object.keys(update).length === 0) {
      return sendError(res, 'No hay campos válidos para actualizar', 400);
    }
    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true })
      .populate('areas', 'name shortName')
      .lean();
    if (!user) return sendError(res, 'Usuario no encontrado', 404);
    return sendSuccess(res, formatEmpleado(user));
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
    const { empId, tipo, desde, hasta, motivo, responsableId, medioDia } = req.body;

    if (!empId || !tipo || !desde || !hasta || !motivo) {
      return sendError(res, 'empId, tipo, desde, hasta y motivo son requeridos', 400);
    }
    if (!TIPOS_CONFIG[tipo]) {
      return sendError(res, `Tipo inválido: ${tipo}`, 400);
    }
    if (desde > hasta) {
      return sendError(res, 'La fecha de inicio no puede ser posterior a la fecha de fin', 400);
    }
    if (medioDia && desde !== hasta) {
      return sendError(res, 'Para medio día, la fecha de inicio y fin deben ser el mismo día', 400);
    }

    const emp = await User.findById(empId);
    if (!emp || !emp.active) {
      return sendError(res, 'Usuario no encontrado o inactivo', 404);
    }

    if (!emp.ingreso || isNaN(new Date(emp.ingreso).getTime())) {
      return sendError(
        res,
        'El usuario no tiene fecha de ingreso registrada. Completa su perfil antes de crear una solicitud.',
        400
      );
    }

    let dias;
    if (medioDia) {
      const workdays = await countWorkdays(desde, hasta);
      if (workdays < 1) return sendError(res, 'El día seleccionado no es un día hábil', 400);
      dias = 0.5;
    } else {
      dias = await countWorkdays(desde, hasta);
      if (dias < 1) return sendError(res, 'El rango de fechas no contiene días hábiles', 400);
    }

    if (responsableId) {
      const responsable = await User.findById(responsableId);
      if (!responsable || !responsable.active) {
        return sendError(res, 'Responsable no encontrado o inactivo', 404);
      }
    }

    if (TIPOS_CONFIG[tipo].descuenta) {
      const hoy          = new Date();
      const aniosServicio = (hoy - new Date(emp.ingreso)) / (1000 * 60 * 60 * 24 * 365.25);
      const saldoTotal    = emp.vacSaldoTotal ?? 30;
      const tomados       = emp.vacTomados    ?? 0;
      const pendientes    = emp.vacPendientes ?? 0;
      const saldoGanado   = aniosServicio >= 1 ? saldoTotal : 0;
      const disponible    = saldoGanado - tomados - pendientes;

      if (aniosServicio < 1) {
        if (tomados + pendientes + dias > saldoTotal) {
          const maxAdelanto = Math.max(0, saldoTotal - tomados - pendientes);
          return sendError(
            res,
            `Adelanto máximo alcanzado. Límite: ${saldoTotal}d — Adelanto disponible: ${maxAdelanto}d`,
            400
          );
        }
      } else if (disponible < dias) {
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
      desde:  { $lte: hasta },
      hasta:  { $gte: desde },
    });
    if (overlap) {
      return sendError(
        res,
        `Ya existe una solicitud que se superpone con el período ${overlap.desde} – ${overlap.hasta}`,
        409
      );
    }

    let aprobadorId = responsableId ? responsableId : (emp.vacLeadId || null);
    let nivel       = dias > 5 ? 'rrhh' : 'lider';

    if (!aprobadorId) {
      // Buscar el lead de RRHH entre los usuarios activos
      const rrhhAreas = await Area.find({
        $or: [
          { shortName: /^rrhh$/i },
          { name: /recurso|rrhh|human|people|talent|personal/i },
        ],
        status: 'active',
      }).lean();
      if (rrhhAreas.length > 0) {
        const rrhhLead = await User.findOne({
          areas:      { $in: rrhhAreas.map(a => a._id) },
          vacLeadId:  null,
          active:     true,
        });
        aprobadorId = rrhhLead ? rrhhLead._id : null;
      }
      nivel = 'rrhh';
    }

    if (responsableId) nivel = 'lider';

    const solicitud = await VacSolicitud.create({
      empId, tipo, desde, hasta: medioDia ? desde : hasta,
      dias, medioDia: medioDia || false, motivo,
      aprobadorId, responsableId: responsableId || null,
      nivel, estado: 'pendiente', solicitada: new Date(),
    });

    if (TIPOS_CONFIG[tipo].descuenta) {
      await User.findByIdAndUpdate(empId, { $inc: { vacPendientes: dias } });
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

    if (solicitud.responsableId) {
      const pasadoId = req.body.aprobadorId ? req.body.aprobadorId.toString() : null;
      if (pasadoId && pasadoId !== solicitud.responsableId.toString()) {
        return sendError(res, 'Solo el responsable designado puede aprobar esta solicitud', 403);
      }
      solicitud.aprobadorId = solicitud.responsableId;
    } else if (req.body.aprobadorId) {
      solicitud.aprobadorId = req.body.aprobadorId;
    }

    solicitud.estado  = 'aprobado';
    solicitud.aprobada = new Date();
    await solicitud.save();

    if (TIPOS_CONFIG[solicitud.tipo]?.descuenta) {
      await User.findByIdAndUpdate(solicitud.empId, {
        $inc: { vacTomados: solicitud.dias, vacPendientes: -solicitud.dias },
      });
    }

    return sendSuccess(res, formatSolicitud(solicitud));
  } catch (err) {
    return sendError(res, err.message);
  }
};

const deleteSolicitud = async (req, res) => {
  try {
    const solicitud = await VacSolicitud.findById(req.params.id);
    if (!solicitud) return sendError(res, 'Solicitud no encontrada', 404);

    if (TIPOS_CONFIG[solicitud.tipo]?.descuenta) {
      if (solicitud.estado === 'pendiente') {
        await User.findByIdAndUpdate(solicitud.empId, { $inc: { vacPendientes: -solicitud.dias } });
      } else if (solicitud.estado === 'aprobado') {
        await User.findByIdAndUpdate(solicitud.empId, { $inc: { vacTomados: -solicitud.dias } });
      }
    }

    await VacSolicitud.findByIdAndDelete(req.params.id);
    return sendSuccess(res, { deleted: req.params.id });
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
      await User.findByIdAndUpdate(solicitud.empId, { $inc: { vacPendientes: -solicitud.dias } });
    }

    return sendSuccess(res, formatSolicitud(solicitud));
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const getDashboard = async (req, res) => {
  try {
    const [users, solicitudes] = await Promise.all([
      User.find({ active: true }).populate('areas', 'name shortName').lean(),
      VacSolicitud.find({}).sort({ solicitada: -1 }).lean(),
    ]);

    const pendientes    = solicitudes.filter(s => s.estado === 'pendiente').length;
    const aprobados     = solicitudes.filter(s => s.estado === 'aprobado').length;
    const rechazados    = solicitudes.filter(s => s.estado === 'rechazado').length;

    const today      = toIsoDate(new Date());
    const mesActual  = today.substring(0, 7);

    const diasEsteMes = solicitudes
      .filter(s => s.estado === 'aprobado' && s.desde.startsWith(mesActual))
      .reduce((acc, s) => acc + s.dias, 0);

    const totalDisponibles = users.reduce((acc, u) => {
      const saldo = (u.vacSaldoTotal ?? 30) - (u.vacTomados ?? 0) - (u.vacPendientes ?? 0);
      return acc + Math.max(0, saldo);
    }, 0);

    const ausenciasHoy = solicitudes
      .filter(s => s.estado === 'aprobado' && s.desde <= today && s.hasta >= today)
      .map(formatSolicitud);

    const recientes = solicitudes.slice(0, 8).map(formatSolicitud);

    const bajosaldo = users
      .map(u => ({
        ...formatEmpleado(u),
        disponible: Math.max(0, (u.vacSaldoTotal ?? 30) - (u.vacTomados ?? 0) - (u.vacPendientes ?? 0)),
      }))
      .sort((a, b) => a.disponible - b.disponible)
      .slice(0, 5);

    return sendSuccess(res, {
      totalEmpleados: users.length,
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
    const [users, solicitudes] = await Promise.all([
      User.find({ active: true }).populate('areas', 'name shortName').lean(),
      VacSolicitud.find({}).lean(),
    ]);

    const porTipo = {};
    for (const s of solicitudes) {
      if (!porTipo[s.tipo]) porTipo[s.tipo] = { count: 0, dias: 0 };
      porTipo[s.tipo].count++;
      porTipo[s.tipo].dias += s.dias;
    }

    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));
    const porArea = {};
    for (const s of solicitudes) {
      const user    = userMap[s.empId?.toString()];
      const areaDoc = user?.areas?.[0];
      const area    = areaDoc ? (areaDoc.name || areaDocToCode(areaDoc)) : 'desconocido';
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

    const balanceSummary = users.map(u => ({
      ...formatEmpleado(u),
      disponible: Math.max(0, (u.vacSaldoTotal ?? 30) - (u.vacTomados ?? 0) - (u.vacPendientes ?? 0)),
    }));

    return sendSuccess(res, { porTipo, porArea, porMes, balanceSummary });
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Políticas ────────────────────────────────────────────────────────────────

const DEFAULT_POLITICA = {
  diasBase:         30,
  periodo:          'aniversario',
  anticipacion:     15,
  maxBloque:        15,
  adelantar:        true,
  doblePaso:        true,
  autoAprobar:      false,
  notifEmail:       true,
  notifSlack:       true,
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
      'diasBase', 'periodo', 'anticipacion', 'maxBloque',
      'adelantar', 'doblePaso', 'autoAprobar',
      'notifEmail', 'notifSlack', 'tiposHabilitados',
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
    const doc  = await VacFeriado.create({ iso, nombre: nombre.trim(), year });
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

// ─── Seed (solo desarrollo) ───────────────────────────────────────────────────
// Inicializa solicitudes de prueba usando usuarios reales del sistema.
// No crea empleados ficticios — los datos de empleados vienen de User.

const seedData = async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const count = await VacSolicitud.countDocuments();

    if (count > 0 && !force) {
      return sendError(
        res,
        `Ya existen ${count} solicitudes. Usa ?force=true para reinicializar.`,
        409
      );
    }

    if (force) {
      await VacSolicitud.deleteMany({});
      // Resetear contadores en todos los usuarios
      await User.updateMany({}, { $set: { vacTomados: 0, vacPendientes: 0 } });
    }

    const users = await User.find({ active: true }).limit(5).lean();
    if (users.length === 0) {
      return sendError(res, 'No hay usuarios activos en el sistema para generar datos de prueba.', 400);
    }

    // Asegurarse de que los usuarios tienen saldo inicial
    await User.updateMany({ vacSaldoTotal: { $lt: 1 } }, { $set: { vacSaldoTotal: 30 } });

    const hoy = toIsoDate(new Date());

    // Crear solicitudes de ejemplo con los primeros usuarios
    const sols = [
      { u: 0, tipo: 'vacaciones',   desde: '2026-06-02', hasta: '2026-06-06', dias: 5, estado: 'pendiente', motivo: 'Vacaciones programadas.' },
      { u: 1, tipo: 'permiso-goce', desde: hoy,          hasta: hoy,          dias: 1, estado: 'pendiente', motivo: 'Trámite personal.' },
      { u: 0, tipo: 'vacaciones',   desde: '2026-05-05', hasta: '2026-05-09', dias: 5, estado: 'aprobado',  motivo: 'Descanso anual.', aprobada: '2026-04-20' },
      { u: 2, tipo: 'medica',       desde: '2026-05-12', hasta: '2026-05-14', dias: 3, estado: 'aprobado',  motivo: 'Licencia médica.', aprobada: '2026-05-12' },
    ];

    for (const s of sols) {
      const emp       = users[s.u] || users[0];
      const aprobador = users[(s.u + 1) % users.length];
      await VacSolicitud.create({
        empId:       emp._id,
        tipo:        s.tipo,
        desde:       s.desde,
        hasta:       s.hasta,
        dias:        s.dias,
        estado:      s.estado,
        motivo:      s.motivo,
        solicitada:  new Date(),
        aprobadorId: aprobador._id,
        nivel:       'lider',
        aprobada:    s.aprobada ? new Date(s.aprobada) : null,
      });
      if (TIPOS_CONFIG[s.tipo].descuenta) {
        if (s.estado === 'pendiente') {
          await User.findByIdAndUpdate(emp._id, { $inc: { vacPendientes: s.dias } });
        } else if (s.estado === 'aprobado') {
          await User.findByIdAndUpdate(emp._id, { $inc: { vacTomados: s.dias } });
        }
      }
    }

    return sendSuccess(res, {
      message: 'Datos de prueba creados correctamente',
      solicitudes: sols.length,
      usuarios: users.length,
    }, 201);
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ─── Migración VacEmpleado → User ────────────────────────────────────────────
// Transfiere saldos y referencias de las VacSolicitudes antiguas al modelo User.
// Requiere que VacEmpleado.js siga existiendo en disco durante la migración.
// Ejecutar UNA SOLA VEZ después del despliegue. Luego puede borrarse VacEmpleado.js.

const migrateFromVacEmpleado = async (req, res) => {
  let VacEmpleado;
  try {
    VacEmpleado = require('../models/VacEmpleado');
  } catch {
    return sendError(res, 'El modelo VacEmpleado ya fue eliminado; migración no necesaria.', 404);
  }

  try {
    const empleados = await VacEmpleado.find({ userId: { $ne: null } }).lean();
    const log = { usuarios: 0, solicitudes: 0, sinUserId: 0 };

    // Mapa empId(VacEmpleado) → userId(User)
    const empToUser = {};
    for (const emp of empleados) {
      empToUser[emp._id.toString()] = emp.userId.toString();
    }

    // 1. Transferir saldos y lead a User
    for (const emp of empleados) {
      const leadUserId = emp.leadId ? empToUser[emp.leadId.toString()] : null;
      await User.findByIdAndUpdate(emp.userId, {
        $set: {
          vacSaldoTotal: emp.saldoTotal ?? 30,
          vacTomados:    emp.tomados    ?? 0,
          vacPendientes: emp.pendientes ?? 0,
          ...(leadUserId ? { vacLeadId: leadUserId } : {}),
        },
      });
      log.usuarios++;
    }

    // 2. Reasignar empId / aprobadorId / responsableId en VacSolicitudes
    const solicitudes = await VacSolicitud.find({}).lean();
    for (const s of solicitudes) {
      const update = {};
      if (s.empId        && empToUser[s.empId.toString()])        update.empId        = empToUser[s.empId.toString()];
      if (s.aprobadorId  && empToUser[s.aprobadorId.toString()])  update.aprobadorId  = empToUser[s.aprobadorId.toString()];
      if (s.responsableId && empToUser[s.responsableId.toString()]) update.responsableId = empToUser[s.responsableId.toString()];
      if (Object.keys(update).length) {
        await VacSolicitud.findByIdAndUpdate(s._id, { $set: update });
        log.solicitudes++;
      }
    }

    // 3. Reportar empleados del seed sin userId (no pueden migrarse)
    log.sinUserId = await VacEmpleado.countDocuments({ userId: null });

    return sendSuccess(res, {
      message: 'Migración completada. Puedes eliminar VacEmpleado.js y la colección vacempleados de la BD.',
      ...log,
    });
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
  updateEmpleado,
  getEmpleadoHistorial,
  // Solicitudes
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  aprobarSolicitud,
  rechazarSolicitud,
  deleteSolicitud,
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
  // Seed
  seedData,
  // Migración (ejecutar una vez tras el despliegue)
  migrateFromVacEmpleado,
};
