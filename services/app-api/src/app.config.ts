import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
  MAPBOX_TOKEN: Joi.string().required(),
  WHATSAPP_API_TOKEN: Joi.string().required(),
  APP_PORT: Joi.number().default(3001),
});
