import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const port = process.env.PORT || 3001;
// Public URL of the API shown in Swagger (set it when the API is deployed)
const publicApiUrl = process.env.PUBLIC_API_URL || `http://localhost:${port}`;

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AtlasLearn API',
      version: '1.0.0',
      description: 'API documentation for AtlasLearn educational platform',
      contact: {
        name: 'Adriel Juve SALONG',
        url: 'https://github.com/JuveHeydene'
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
    servers: [{ url: publicApiUrl, description: 'AtlasLearn API' }],
    tags: [{ name: 'Files', description: 'File storage (S3-compatible: MinIO locally)' }],
  },
  apis: [
    './src/routes/*.ts',
    './dist/routes/*.js' // For production
  ],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', 
    swaggerUi.serve, 
    swaggerUi.setup(specs, {
      customSiteTitle: 'AtlasLearn API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        tryItOutEnabled: true,
      }
    })
  );
  
  // JSON endpoint for API specs
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};