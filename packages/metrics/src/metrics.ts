import { Request, Response } from "express";
import client from "prom-client";
import responseTime from "response-time";

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
});

const httpRequestTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
});

function normalizeRoute(req: Request): string {
    if (req.route?.path) {
        return req.baseUrl + req.route.path;
    }
    return req.path;
}

export const metricsMiddleware = responseTime((req: Request, res: Response, time: number) => {
    if (req.path === "/metrics") return;

    const route = normalizeRoute(req);
    const labels = {
        method: req.method,
        route,
        status_code: res.statusCode.toString(),
    };

    httpRequestDuration.observe(labels, time / 1000);
    httpRequestTotal.inc(labels);
});

export async function metricsEndpoint(_req: Request, res: Response): Promise<void> {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
}
