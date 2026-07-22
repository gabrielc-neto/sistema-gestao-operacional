// Error handler global. Coloca no fim do app.
export function errorHandler(err, req, res, _next) {
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err.message);
  if (err.stack && process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }
  const status = err.status || 500;
  res.status(status).json({
    error: err.code || "internal_error",
    message: err.message || "Erro interno",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

// Wrapper pra async handlers — captura promises rejeitadas
export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
