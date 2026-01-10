"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const express_1 = require("express");
let cachedServer = null;
async function bootstrap() {
    if (cachedServer) {
        return cachedServer;
    }
    const server = (0, express_1.default)();
    const { AppModule } = await Promise.resolve().then(() => require('../dist/src/app.module'));
    const { NestFactory } = await Promise.resolve().then(() => require('@nestjs/core'));
    const { ExpressAdapter } = await Promise.resolve().then(() => require('@nestjs/platform-express'));
    const { ValidationPipe } = await Promise.resolve().then(() => require('@nestjs/common'));
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
        logger: ['error', 'warn', 'log'],
        rawBody: true,
        bufferLogs: true,
    });
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    console.log('[INIT] Initializing NestJS app...');
    try {
        await app.init();
        console.log('[INIT] ✅ NestJS app initialized successfully');
    }
    catch (initError) {
        console.error('[INIT] ⚠️ app.init() encountered errors (continuing anyway):', {
            message: initError?.message,
            name: initError?.name,
        });
    }
    cachedServer = server;
    return server;
}
function setCorsHeaders(req, res) {
    const origin = req.headers.origin;
    const frontendUrl = process.env.FRONTEND_URL;
    let allowedOrigin = undefined;
    if (!origin) {
        allowedOrigin = '*';
    }
    else if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        allowedOrigin = origin;
    }
    else if (frontendUrl && (origin === frontendUrl || origin.startsWith(frontendUrl))) {
        allowedOrigin = origin;
    }
    else if (origin.includes('.vercel.app')) {
        allowedOrigin = origin;
    }
    else if (process.env.NODE_ENV === 'development') {
        allowedOrigin = origin;
    }
    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Shopify-Topic, X-Shopify-Shop-Domain, X-Shopify-Hmac-Sha256, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.setHeader('Vary', 'Origin');
    }
}
async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        res.status(204).end();
        return;
    }
    try {
        setCorsHeaders(req, res);
        console.log('[HANDLER] Bootstrapping app...');
        const server = await bootstrap();
        console.log('[HANDLER] App ready, forwarding request to Express');
        return new Promise((resolve, reject) => {
            server(req, res, (err) => {
                if (err) {
                    console.error('[HANDLER] Express error:', err);
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    catch (error) {
        console.error('[HANDLER] ❌ Serverless function error');
        console.error('[HANDLER] Error type:', error?.constructor?.name);
        console.error('[HANDLER] Error message:', error?.message);
        console.error('[HANDLER] Error stack:', error?.stack);
        if (!res.headersSent) {
            setCorsHeaders(req, res);
            const isProduction = process.env.NODE_ENV === 'production';
            const errorMessage = isProduction
                ? 'Internal Server Error'
                : error?.message || 'Unknown error';
            const response = {
                error: 'Internal Server Error',
                message: errorMessage,
                timestamp: new Date().toISOString(),
            };
            if (!isProduction && error?.stack) {
                response.stack = error.stack;
            }
            res.status(500).json(response);
        }
        else {
            if (!res.writableEnded) {
                res.end();
            }
        }
    }
}
//# sourceMappingURL=index.js.map