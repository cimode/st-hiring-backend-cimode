import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { knex } from 'knex';
import { MongoClient } from 'mongodb';
import dbConfig from './knexfile';
import { createEventDAL } from './dal/events.dal';
import { createTicketDAL } from './dal/tickets.dal';
import { createSettingsDAL } from './dal/settings.dal';
import { createGetEventsController } from './controllers/get-events';
import { createSettingsController } from './controllers/settings';

const Knex = knex(dbConfig.development);
const mongoClient = new MongoClient(process.env.MONGO_URI ?? 'mongodb://root:example@localhost:27017');

const eventDAL = createEventDAL(Knex);
const TicketDAL = createTicketDAL(Knex);
const settingsDAL = createSettingsDAL(mongoClient.db(process.env.MONGO_DB_NAME ?? 'seetickets'));
const settingsController = createSettingsController({ settingsDAL });

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/events', createGetEventsController({ eventsDAL: eventDAL, ticketsDAL: TicketDAL }));

// Registered before the '/' handler below, which otherwise answers every path.
app.get('/settings', settingsController.getSettings);
app.post('/settings', settingsController.saveSettings);

app.use('/', (_req, res) => {
  res.json({ message: 'Hello API' });
});

// Connect to MongoDB before accepting traffic so a bad MONGO_URI fails at startup, not on the
// first /settings request.
mongoClient
  .connect()
  .then(() => {
    app.listen(3000, () => {
      console.log('Server Started');
    });
  })
  .catch((error) => {
    console.error('Could not connect to MongoDB', error);
    process.exit(1);
  });
