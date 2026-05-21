import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@wedding/db';
import { loginSchema, RefreshTokenPayload } from '@wedding/shared';
import { validate } from '../middleware/validate';

interface AuthRouteOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
  jwtSecret: string;
  refreshSecret: string;
}

const ACCESS_TOKEN_EXPIRY = '15m';
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export async function authRoutes(app: FastifyInstance, opts: AuthRouteOptions) {
  const { prisma, jwtSecret, refreshSecret } = opts;

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const body = validate(request.body, loginSchema, reply);
    if (!body) return reply;

    const { email, password } = body;

    // Find user by email (across all tenants for simplicity in dev)
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_2001', message: 'Email atau password tidak valid' },
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_2001', message: 'Email atau password tidak valid' },
      });
    }

    // Generate tokens
    const payload = {
      sub: user.id,
      tenant_id: user.tenant_id,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    const access_token = jwt.sign(payload, jwtSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refresh_token = jwt.sign(
      { sub: user.id, jti: randomUUID() },
      refreshSecret,
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
    );

    return reply.send({
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      tokens: {
        access_token,
        refresh_token,
        expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      },
    });
  });

  // POST /auth/refresh
  app.post('/refresh', async (request, reply) => {
    const { refresh_token } = request.body as { refresh_token: string };

    if (!refresh_token) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_4001', message: 'Refresh token diperlukan' },
      });
    }

    try {
      const decoded = jwt.verify(refresh_token, refreshSecret) as RefreshTokenPayload;

      // Find user
      const user = await prisma.user.findFirst({
        where: { id: decoded.sub },
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'AUTH_2003', message: 'Refresh token tidak valid' },
        });
      }

      // Generate new token pair
      const payload = {
        sub: user.id,
        tenant_id: user.tenant_id,
        role: user.role,
        email: user.email,
        name: user.name,
      };

      const access_token = jwt.sign(payload, jwtSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
      const new_refresh_token = jwt.sign(
        { sub: user.id, jti: randomUUID() },
        refreshSecret,
        { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
      );

      return reply.send({
        access_token,
        refresh_token: new_refresh_token,
        expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      });
    } catch (_err) {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_2005', message: 'Sesi telah berakhir. Silakan login ulang.' },
      });
    }
  });
}
