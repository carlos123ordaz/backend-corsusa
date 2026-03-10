const admin = require('firebase-admin');
let firebaseApp;

const initializeFirebase = () => {
    if (!firebaseApp) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (error) {
            console.error('❌ Error al inicializar Firebase Admin:', error);
        }
    }
    return firebaseApp;
};
initializeFirebase();

const sanitizeData = (data) => {
    if (!data || typeof data !== 'object') return {};

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) {
            sanitized[key] = '';
        } else if (value instanceof Date) {
            sanitized[key] = value.toISOString();
        } else if (typeof value === 'object') {
            sanitized[key] = JSON.stringify(value);
        } else {
            sanitized[key] = String(value);
        }
    }
    return sanitized;
};

const sendPushNotification = async (fcmToken, notification) => {
    try {
        if (!fcmToken) {
            console.error('❌ No se proporcionó token FCM');
            return { success: false, error: 'No token provided' };
        }
        const sanitizedData = sanitizeData(notification.data);
        const message = {
            token: fcmToken,
            notification: {
                title: notification.title || 'Nueva notificación',
                body: notification.body || '',
            },
            data: sanitizedData,
            android: {
                priority: 'high',
                notification: {
                    channelId: 'incidencias',
                    sound: 'default',
                    priority: 'high',
                }
            },
            apns: {
                payload: {
                    aps: {
                        badge: notification.badge || 1,
                        sound: 'default',
                        alert: {
                            title: notification.title,
                            body: notification.body,
                        }
                    }
                }
            }
        };

        const response = await admin.messaging().send(message);
        return { success: true, messageId: response };
    } catch (error) {
        console.error('❌ Error al enviar notificación:', error);
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            return { success: false, error: 'invalid_token', shouldRemoveToken: true };
        }

        return { success: false, error: error.message };
    }
};

const sendPushNotificationToMultiple = async (fcmTokens, notification) => {
    try {
        const validTokens = fcmTokens.filter(token => token && typeof token === 'string');

        if (validTokens.length === 0) {
            console.error('❌ No hay tokens válidos');
            return { success: false, error: 'No valid tokens' };
        }
        const sanitizedData = sanitizeData(notification.data);
        const message = {
            notification: {
                title: notification.title || 'Nueva notificación',
                body: notification.body || '',
            },
            data: sanitizedData,
            android: {
                priority: 'high',
                notification: {
                    channelId: 'incidencias',
                    sound: 'default',
                }
            },
            apns: {
                payload: {
                    aps: {
                        badge: notification.badge || 1,
                        sound: 'default',
                    }
                }
            }
        };

        const response = await admin.messaging().sendEachForMulticast({
            tokens: validTokens,
            ...message
        });

        if (response.failureCount > 0) {
            console.error(`❌ Fallos: ${response.failureCount}`);
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Token ${validTokens[idx]}: ${resp.error?.message}`);
                }
            });
        }

        return {
            success: response.successCount > 0,
            successCount: response.successCount,
            failureCount: response.failureCount,
            responses: response.responses
        };
    } catch (error) {
        console.error('❌ Error al enviar notificaciones múltiples:', error);
        return { success: false, error: error.message };
    }
};

const validateToken = async (fcmToken) => {
    try {
        await admin.messaging().send({
            token: fcmToken,
            notification: { title: 'Test', body: 'Test' }
        }, true);

        return true;
    } catch (error) {
        return false;
    }
};

const notificarIncidenciaAsignada = async (usuario, incidencia) => {
    const token = getMostRecentToken(usuario);
    if (!token) {
        return { success: false, error: 'No token available' };
    }

    const notification = {
        title: '📋 Nueva Incidencia Asignada',
        body: `Se te ha asignado: ${incidencia.tipoIncidente}`,
        data: {
            type: 'incidencia_asignada',
            incidenciaId: incidencia._id.toString(),
            severidad: incidencia.gradoSeveridad,
        },
        badge: 1,
    };
    return await sendPushNotification(token, notification);
};

const notificarIncidenciaEnRevision = async (usuario, incidencia) => {
    const token = getMostRecentToken(usuario);
    if (!token) {
        return { success: false, error: 'No token available' };
    }
    const notification = {
        title: '🔍 Incidencia en Revisión',
        body: `${incidencia.tipoIncidente} requiere tu atención`,
        data: {
            type: 'incidencia_revision',
            incidenciaId: incidencia._id.toString(),
            severidad: incidencia.gradoSeveridad,
            deadline: incidencia.deadline ? incidencia.deadline.toString() : '',
        },
        badge: 1,
    };
    return await sendPushNotification(token, notification);
};

const notificarDeadlineProximo = async (usuario, incidencia, diasRestantes) => {
    const token = getMostRecentToken(usuario);

    if (!token) {
        return { success: false, error: 'No token available' };
    }

    const notification = {
        title: '⏰ Deadline Próximo',
        body: `La incidencia "${incidencia.tipoIncidente}" vence en ${diasRestantes} día(s)`,
        data: {
            type: 'deadline_proximo',
            incidenciaId: incidencia._id.toString(),
            diasRestantes: diasRestantes.toString(),
        },
        badge: 1,
    };
    return await sendPushNotification(token, notification);
};

const notificarIncidenciaResuelta = async (usuario, incidencia) => {
    const token = getMostRecentToken(usuario);

    if (!token) {
        return { success: false, error: 'No token available' };
    }

    const notification = {
        title: '✅ Incidencia Resuelta',
        body: `Tu incidencia "${incidencia.tipoIncidente}" ha sido resuelta`,
        data: {
            type: 'incidencia_resuelta',
            incidenciaId: incidencia._id.toString(),
        },
        badge: 1,
    };
    return await sendPushNotification(token, notification);
};

const getMostRecentToken = (usuario) => {
    if (usuario.pushTokens && Array.isArray(usuario.pushTokens) && usuario.pushTokens.length > 0) {
        const sorted = [...usuario.pushTokens].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        const mostRecent = sorted[0];
        return mostRecent.token;
    }
    if (usuario.pushToken && typeof usuario.pushToken === 'string') {
        return usuario.pushToken;
    }
    return null;
};

/**
 * Envía una notificación push de recordatorio de deadline.
 *
 * @param {Object} usuario   - Usuario asignado (con pushToken / pushTokens)
 * @param {Object} incidencia - Incidencia con deadline
 * @param {Object} opciones  - { vencida: boolean }
 */
const notificarRecordatorioDeadline = async (usuario, incidencia, { vencida = false } = {}) => {
    const tokens = obtenerTokensActivos(usuario);
    if (tokens.length === 0) {
        console.log(`Sin tokens push para ${usuario.name} ${usuario.lname}`);
        return;
    }

    const deadlineStr = incidencia.deadline
        ? new Date(incidencia.deadline).toLocaleDateString('es-PE')
        : 'sin fecha';

    const title = vencida
        ? `⚠️ Incidencia vencida: ${incidencia.tipoIncidente}`
        : `🔔 Recordatorio: ${incidencia.tipoIncidente}`;

    const body = vencida
        ? `El deadline (${deadlineStr}) ya pasó. Por favor actualiza el estado de esta incidencia.`
        : `El deadline es ${deadlineStr}. Revisa el avance de esta incidencia.`;

    const message = {
        notification: { title, body },
        data: {
            type: 'REMINDER_DEADLINE',
            incidenciaId: incidencia._id.toString(),
            vencida: String(vencida),
        },
    };

    for (const token of tokens) {
        try {
            await admin.messaging().send({ ...message, token });
        } catch (err) {
            console.error(`Error enviando push a token ${token.slice(0, 10)}...:`, err.message);
        }
    }
};

/**
 * Helper: extrae tokens push válidos de un usuario.
 */
const obtenerTokensActivos = (usuario) => {
    const tokens = new Set();

    if (usuario.pushToken) {
        tokens.add(usuario.pushToken);
    }

    if (usuario.pushTokens?.length) {
        for (const t of usuario.pushTokens) {
            if (t.token) tokens.add(t.token);
        }
    }

    return [...tokens];
};

module.exports = {
    sendPushNotification,
    sendPushNotificationToMultiple,
    validateToken,
    notificarIncidenciaAsignada,
    notificarIncidenciaEnRevision,
    notificarDeadlineProximo,
    notificarIncidenciaResuelta,
    getMostRecentToken,
    notificarRecordatorioDeadline
};