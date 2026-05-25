'use strict';

const express = require('express');
const basicAuth = require('express-basic-auth');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error('REDIS_URL is required');
  process.exit(1);
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const QUEUE_NAMES = ['feed:poll', 'article:process', 'article:regenerate', 'digest:build'];

const queues = QUEUE_NAMES.map(
  (name) => new BullMQAdapter(new Queue(name, { connection })),
);

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

createBullBoard({ queues, serverAdapter });

const app = express();

const user = process.env.BULL_BOARD_USER;
const pass = process.env.BULL_BOARD_PASS;

if (!user || !pass) {
  console.error('BULL_BOARD_USER and BULL_BOARD_PASS are required');
  process.exit(1);
}

app.use(basicAuth({ users: { [user]: pass }, challenge: true }));
app.use('/', serverAdapter.getRouter());

const port = parseInt(process.env.PORT ?? '3002', 10);
app.listen(port, () => {
  console.log(`Bull Board running on port ${port}`);
});
