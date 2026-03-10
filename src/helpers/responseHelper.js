// helpers/responseHelper.js

const sendSuccess = (res, data, statusCode = 200) => {
    return res.status(statusCode).json(data);
};

const sendError = (res, message = 'Error interno del servidor', statusCode = 500) => {
    return res.status(statusCode).json({ ok: false, message });
};

const sendPaginated = (res, { data, total, page, limit }) => {
    return res.status(200).json({
        data,
        total,
        page,
        pages: Math.ceil(total / limit),
    });
};

module.exports = { sendSuccess, sendError, sendPaginated };