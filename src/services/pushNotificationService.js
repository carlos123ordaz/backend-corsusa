const { Expo } = require('expo-server-sdk');
const expo = new Expo();

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

const sendPushNotification = async (pushToken, notification) => {
    try {
        if (!Expo.isExpoPushToken(pushToken)) {
            return { success: false, error: 'Token inválido' };
        }
        const message = {
            to: pushToken,
            sound: 'default',
            title: notification.title || 'Nueva notificación',
            body: notification.body || '',
            data: notification.data || {},
            badge: notification.badge || 1,
            priority: 'high',
            channelId: 'incidencias',
        };
        const chunks = expo.chunkPushNotifications([message]);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                for (const ticket of ticketChunk) {
                    if (ticket.status === 'error') {
                        console.error('❌ Error en ticket:', ticket.message);
                        console.error('Detalles:', ticket.details);
                        if (ticket.details?.error === 'InvalidCredentials') {
                            console.error('⚠️ ACCIÓN REQUERIDA: Configura el FCM Server Key en Expo');
                        }
                    }
                }

                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('❌ Error al enviar chunk de notificaciones:', error);
            }
        }
        const hasErrors = tickets.some(t => t.status === 'error');
        return {
            success: !hasErrors,
            tickets,
            error: hasErrors ? 'Algunos tickets fallaron' : null
        };
    } catch (error) {
        console.error('❌ Error al enviar notificación push:', error);
        return { success: false, error: error.message };
    }
};

const sendPushNotificationToMultiple = async (pushTokens, notification) => {
    try {
        const messages = pushTokens
            .filter(token => Expo.isExpoPushToken(token))
            .map(token => ({
                to: token,
                sound: 'default',
                title: notification.title || 'Nueva notificación',
                body: notification.body || '',
                data: notification.data || {},
                badge: notification.badge || 1,
                priority: 'high',
                channelId: 'incidencias',
            }));

        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('Error al enviar chunk de notificaciones:', error);
            }
        }

        return { success: true, tickets };
    } catch (error) {
        console.error('Error al enviar notificaciones múltiples:', error);
        return { success: false, error: error.message };
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
            deadline: incidencia.deadline,
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
            diasRestantes,
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

module.exports = {
    sendPushNotification,
    sendPushNotificationToMultiple,
    notificarIncidenciaAsignada,
    notificarIncidenciaEnRevision,
    notificarDeadlineProximo,
    notificarIncidenciaResuelta,
    getMostRecentToken
};