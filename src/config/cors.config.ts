import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const allowedOrigins = [
  'http://localhost:3000', // Example frontend URL during development
  'http://localhost:4200', // Another common development URL (e.g., Angular)
  'https://www.cypherplay.com', // Production frontend URL
  // Add other production or staging URLs as needed
];

export const corsConfig: CorsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};
