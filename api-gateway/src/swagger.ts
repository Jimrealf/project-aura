import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Project Aura API",
            version: "1.0.0",
            description: "Scalable E-Commerce Platform API Documentation",
        },
        servers: [
            {
                url: "http://localhost:3000",
                description: "API Gateway (Development)",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Enter the JWT token from /api/auth/login response",
                },
            },
        },
    },
    apis: [
        path.resolve(__dirname, "../../services/*/src/routes/*.ts"),
        path.resolve(__dirname, "../../services/*/src/routes/*.js"),
    ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
