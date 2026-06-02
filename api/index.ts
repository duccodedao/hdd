// @ts-ignore
import app from "../dist/server.cjs";

const handler = (app as any).default || app;

// Vercel Serverless Function entrypoint
export default handler;
