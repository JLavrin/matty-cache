import express from 'express';
import dotenv from 'dotenv';
import { createClient, RedisClientType } from 'redis'

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

let redisClient: RedisClientType;

(async () => {
  redisClient = createClient({
    url: 'reds//:url/here',
    socket: {
      tls: true,
      rejectUnauthorized: false
    }
  });

  redisClient.on('error', (err) => {
    if (err) {
      console.log(err)
      throw err;
    }});

  await redisClient.connect();
  app.get('/', (req, res) => {
    res.send('Application working properly');
  });

  //przyjmuje wszystkie requesty, moze tez dzialac jako proxy
  app.get('*', async (req, res, next) => {
    // pobiera url docelowy -> w tym miejscu by dobierało aplikacje zalezna np dla cashboxa by podstawialo url do cashboxa
    const url = req.originalUrl;

    // sprawdzamy czy jest w cache
    const value = await redisClient.get(url)

    if (value) {
      // jesli jest to dajemy klientowi
      res.json({cache: true, ...JSON.parse(value)});
      return;
    }

   // przykladowe proxy, wszystko przed ${url} to basPath aplikacji zaleznej, a ${url} to url z requesta z frontendu
    fetch(`https://ckan2.multimediagdansk.pl/${url}`)
      .then((response) => response.json())
      .then(async (data) => {
        // zapisujemy do cache
        await redisClient.set(url, JSON.stringify(data));
        // zwracamy klientowi
        res.json({ cache: false, ...data })
      })
      .catch((error) => next(error));
  })

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });

})();


