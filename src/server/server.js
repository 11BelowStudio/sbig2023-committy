/**
 * This is the main server script that provides the API endpoints
 *
 * Uses sqlite.js to connect to db
 */

import sample from "underscore";

/*
const {
  sample
} = require("underscore");

const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: true
});
*/

import _fastify from "fastify";

const fastify = _fastify({
  // Set this to true for detailed logging:
  logger: true
});

import path from "node:path";
//const path = require('path');

import crypto from "node:crypto";

//const crypto = require('crypto');
const randomId = () => crypto.randomBytes(8).toString("hex");

const randomSeedSource = () => crypto.randomBytes(4).readUInt32LE() + 1;


import _fs_formbody from "@fastify/formbody";
import io from "fastify-socket.io";

fastify.register(_fs_formbody);

//fastify.register(require("@fastify/formbody"));

//const io = require("fastify-socket.io");

fastify.register(io);

import { Random } from 'random';
import seedrandom from 'seedrandom';


import { InMemorySessionStore } from "./SessionStore.js";

//const { InMemorySessionStore } = require("./SessionStore");
const sessionStore = new InMemorySessionStore();

import _fs_view from "@fastify/view";
import _hdb from "handlebars";


// View is a templating manager for fastify
fastify.register(
  _fs_view, {
    engine: {
      handlebars : _hdb
    }
  }
);


/*
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});
*/

import * as db from "./db/sqlite.js";

//const db = require("./db/sqlite.js");
import { card_consts } from "./constants.js";
//const { card_consts } = require("./constants.js");

import _fs_static from "@fastify/static";

import url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Setup our static files
fastify.register(_fs_static, {
  root: path.join(__dirname,'../','public'),
  prefix: "/", // optional: default '/'
});


/*
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname,'../','public'),
  prefix: "/", // optional: default '/'
});
*/

// Helper function to authenticate the user key
const authorized = key => {
  if (
    !key ||
    key < 1 ||
    !process.env.ADMIN_KEY ||
    key !== process.env.ADMIN_KEY
  )
    return false;
  else return true;
};

export{
  fastify,
  authorized,
  db,
  sessionStore,
  randomId
}


import {ShortURL} from "./utils/ShortURL.js";


//const ShortURL = require("./utils/ShortURL");

const errorMessage =
  "Whoops! Error connecting to the database–please try again!";

// OnRoute hook to list endpoints
const routes = { endpoints: [] };
fastify.addHook("onRoute", routeOptions => {
  routes.endpoints.push(routeOptions.method + " " + routeOptions.path);
});


function _index(req, reply){

  let params = {
    username: ""
  };

  {
    const cardCountRes = db.getCardCount();
    params.cardCount = (cardCountRes.success) ? cardCountRes.cards : "database had a whoopsie";
  }

  {
    fastify.io.use((socket, next) => {
      const sessionID = socket.handshake.auth.sessionID;
      if (sessionID) {
        const session = sessionStore.findSession(sessionID);
        if (session) {
          params.username = session.username;
          return next();
        }
      }
      const username = socket.handshake.auth.username;
      if (!username) {
        params.username = ""
        return next();
      }
      params.username = username;
      next();
    })
  }

  reply.header('content-type', 'text/html; charset=utf-8');

  return reply.view("/src/client/index.hbs", params);
}

fastify.get('/', function (req, reply) {
  reply.redirect("/index");
})

fastify.get('/index', function (req, reply) {
  _index(req, reply)
})



// Just send some info at the home route
fastify.get("/api", (request, reply) => {
  const data = {
    title: "Committy API",
    intro: "This is a database-backed API with the following endpoints",
    routes: routes.endpoints
  };
  reply.status(200).send(data);
});

fastify.get('/submit_card', async(req, reply) => {

  let otherCards = [];

  
  let otherResult = db.getRandomCards(2);
  if (!otherResult.success){
    reply.status(500).send(
      {
        error: `unable to build the card submission form!`
      }
    );
    return;
  }
  otherCards = otherResult.entries;

  let params = {
    card1: otherCards[0],
    card2: otherCards[1]
  };

  params.card1.colour = card_consts.card_id_to_css_class(params.card1.id);

  params.card2.colour = card_consts.card_id_to_css_class(params.card2.id);


  reply.header('content-type', 'text/html; charset=utf-8');
  return reply.view("/src/client/submit_card.hbs", params);
})


fastify.get('/view_card/:id', async(req, reply) => {
  let cardID = -1;
  try{
    if (req.params.id.trim()==="random"){
      
      let randResult = db.getRandomCardIDs(1);
      if (randResult.success){
        cardID = randResult.entries[0].id;
        
      }
      else {
        reply.status(500).send(
          {
            error: `unable to find a random card ID!`
          }
        );
        return;
      }
    }
    else {
      cardID = parseInt(req.params.id);
    }
    
  } catch(error){
    reply.status(400).send(
      {
        error: `${cardID} needs to be an integer or "random"`
      }
    );
  }

  

  let params = {
    card: {
      id: `${cardID}???`,
      name : "A card that doesn't exist yet",
      colour: "card_error",
      desc: `hmm, the card with ID ${cardID} doesn't exist yet. Perhaps you can fix this problem by creating it.`,
      img: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Icon-round-Question_mark.svg",
      stat1: 0,
      stat2: 0,
      stat3: 0,
      stat4: 99
    }
  };

  try{
    let cardResult = db.getCard(cardID);

    if (cardResult.success){
      params.card = {
        id: cardID,
        colour: card_consts.card_id_to_css_class(cardID),
        name: cardResult.card.name,
        desc: cardResult.card.desc,
        img: cardResult.card.img,
        stat1: cardResult.card.stat1,
        stat2: cardResult.card.stat2,
        stat3: cardResult.card.stat3,
        stat4: cardResult.card.stat4
      };
    }
  } catch(error){
    // ignore it.
  }

  
  reply.header('content-type', 'text/html; charset=utf-8');
  return reply.view("/src/client/view_card.hbs", params);

});





/*
// Return the chat messages from the database helper script - no auth
fastify.get("/messages", async (request, reply) => {
  let data = {};
  data.chat = await db.getMessages();
  console.log(data.chat);
  if(!data.chat) data.error = errorMessage;
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
});

// Add new message (auth)
fastify.post("/message", async (request, reply) => {
  let data = {};
  const auth = authorized(request.headers.admin_key);
  if(!auth || !request.body || !request.body.message) data.success = false;
  else if(auth) data.success = await db.addMessage(request.body.message);
  const status = data.success ? 201 : auth ? 400 : 401;
  reply.status(status).send(data);
});

// Update text for an message (auth)
fastify.put("/message", async (request, reply) => { 
  let data = {};
  const auth = authorized(request.headers.admin_key);
  if(!auth || !request.body || !request.body.id || !request.body.message) data.success = false;
  else data.success = await db.updateMessage(request.body.id, request.body.message); 
  const status = data.success ? 201 : auth ? 400 : 401;
  reply.status(status).send(data);
});

// Delete a message (auth)
fastify.delete("/message", async (request, reply) => {
  let data = {};
  const auth = authorized(request.headers.admin_key);
  if(!auth || !request.query || !request.query.id) data.success = false;
  else data.success = await db.deleteMessage(request.query.id);
  const status = data.success ? 201 : auth ? 400 : 401;
  reply.status(status).send(data);
});
*/

fastify.get("/api/cards", async(request, reply) => {
  
  let data = {};
  data.result = db.getAllCards();
  console.log(data.result);
  if (!data.result || !data.result.success){ data.error = errorMessage;}
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
  
});

fastify.get("/api/card/:id", async(request, reply) => {
  let data = {};
  console.log(request.params);

  data.result = db.getCard(request.params.id);
  console.log(data.result);
  if (!data.result || !data.result.success) {
    data.error = errorMessage;
  }
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);

});

fastify.get("/api/card_ids", async(request, reply) => {
  let data = {};
  data.result = db.getCardIDs();
  console.log(data.result);
  if (!data.result || !data.result.success){
     data.error = errorMessage;
  }
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
});

/**
 * obtains the cards via HATEOAS (Hypermedia As The Engine of Application State)
 */
fastify.get("/api/card_links", async(request, reply) => {
  let data = {};
  data.result = db.getCardIDs();
  if (!data.result || !data.result.success){
    data.error = errorMessage;
  } else {
    for(const itm of data.result.entries){
      itm.url = `http://${request.hostname}/api/card/${itm.id}`;
    }
    
  }
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
});


fastify.get("/api/n_card_ids/:n", async(request, reply) => {
  let data = {};

  data.result = db.getRandomCardIDs(request.params.n);

  console.log(data.result);

  if (!data.result || !data.result.success){
    data.error = errorMessage;
  } else {

    
    for(const itm of data.result.entries){
      itm.url = `http://${request.hostname}/api/card/${itm.id}`;
    }
    
  }
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);

})

fastify.get("/api/n_cards/:n", async(request, reply) => {
  let data = {};

  data.result = db.getRandomCards(request.params.n);
  if (!data.result || !data.result.success){
    data.error = errorMessage;
  }

  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
});

fastify.get("/api/n_cards_except/:n/:except", async(request, reply) => {
  let data = {};
  let except = -1;
  if (!request.params || !request.params.n){
    data.error = `please define a value for n and except. ${request.hostname}/api/n_cards_except/NUMBER/ID_TO_OMIT`;
    reply.status(400).send(data);
    return;
  }
  else if (!request.params.except){
    data.error = `If you don't want to exclude a card, please use ${request.hostname}/api/n_cards/${request.params.n} instead.`;
    data.useThis = `http://${request.hostname}/api/n_cards/${request.params.n}`;
    reply.status(303).send(data);
    return;
  }
  else {
    try {
      except = parseInt(request.params.except);
      //console.log(except);
    } catch (error){
      console.log(error);
      data.error = `hey it looks like ${request.params.except} wasn't a number smh my head`;
    }
  }
  data.exceptCard = `http://${request.hostname}/api/card/${request.params.except}`;
  let allIDs = db.getCardIDsExcept(except);
  console.log(allIDs);
  if (!allIDs || !allIDs.success){
    data.error = errorMessage;
  } else {
    
    let sampledIDs = sample(allIDs.entries, request.params.n);
    console.log(sampledIDs);
    for(const itm of sampledIDs){
      itm.url = `http://${request.hostname}/api/card/${itm.id}`;
    }
    data.result = {success : allIDs.success};
    data.result.entries = sampledIDs;
  }
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
});

fastify.get("/api/wins/:c1/:c2", async(request, reply) => {
  let data = {};
  data.result = db.getWinData(request.params.c1, request.params.c2);
  if (!data.result || !data.result.success){
    data.error = errorMessage;
  }
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
});



fastify.post("/api/declare_winner", async(request, reply) => {

  let data = {};

  let body = (request.body) ? request.body : {};
  if (!body || !body.winner || !body.loser){
    if (request.query){
      if (request.query.winner){
        body.winner = request.query.winner;
      }
      if (request.query.loser){
        body.loser = request.query.loser;
      }
    }
  }

  if (!body || !body.winner || !body.loser){
    data.success = false;
    data.error = "please declare a 'winner' and a 'loser'";
    reply.status(400).send(data);
    return;
  }
  else if (body.winner == body.loser){
    data.success = false;
    data.error = "the 'winner' and the 'loser' can't be the same card!";
    reply.status(400).send(data);
    return;
  }
  
  
  data.result = db.setWinData(body.winner, body.loser);
  data.success = data.result.success;
  if (!data.result || !data.result.success){
    data.error = (data.result.existsAlready) ? "A record for these two cards exists already!" :  errorMessage;

    reply.status(400).send(data);
    return;
  }
  reply.status(200).send(data);

});



fastify.post("/api/report", async (request, reply) => {
  let data = {
    success: false,
    message: ""
  };

  if(!request.body || !request.body.id){
    data.success = false;
    data.message = "please ensure you include the ID of the card in your request body.";
  }
  else {
    data = db.reportThisCard(request.body.id);
  }
  const status = data.success ? 201 : 400;
  reply.status(status).send(data);
});


fastify.post("/api/submit_card_form", async(request, reply) => {

  let data = {success: false};
  let response = 0;
  if (!request.body){
    data.success = false;
    data.error = "you forgor to submit the form :skull:";
    response = 400;
  }
  else{

    const body = request.body;

    console.log(body);
    if (
      !request.body.name || request.body.name.trim() == false
    ){
      data.success = false;
      data.error = "please give your card a `name`.";
      response = 400;
    }
    else if (
      !request.body.beats_loses_choice || request.body.beats_loses_choice.trim() == false
    ){
      data.success = false;
      data.error = "you need to pick a card which your card beats/loses to! (`beats_loses_choice`)";
      response = 400;
    }
    else {
      try{
        let beats_loses = request.body.beats_loses_choice.split(",");
        body.beats = parseInt(beats_loses[0]);
        body.loses = parseInt(beats_loses[1]);
      } catch(error){
        data.success = false;
        data.error = "expected `beats_loses_choice` to be in the form `beats_id,loses_to_id`, and it wasn't!";
        response = 400;
      }
    }

    if (response == 0){
      let result = await db.addCardForm(
        body.name,
        (body.desc) ? body.desc : "",
        (body.img)? body.img : "",
        (body.s1) ? parseInt(body.s1) : 1,
        (body.s2) ? parseInt(body.s2) : 1,
        (body.s3) ? parseInt(body.s3) : 1,
        (body.s4) ? parseInt(body.s4) : 1,
        body.beats,
        body.loses
      );

      data.success = result.success;

      if (data.success){
        result.view_url = `http://${request.hostname}/view_card/${result.cardID}`;
        data.result = result;
        response = 201;

        reply.redirect(result.view_url);
        return;
      }
      else {
        data.error = result.message;
      }

    }

    if (response == 0){
      response = (data.success ? 201 : 400);
    }
    reply.status(response).send(data);



  }

});

fastify.post("/api/add_card", async(request, reply) => {

  let data = {};
  if(!request.body || !request.body.name){
    data.success = false;
  }
  else {
    data.result = await db.addCard(
      request.body.name,
      request.body.desc,
      request.body.img,
      parseInt(request.body.s1),
      parseInt(request.body.s2),
      parseInt(request.body.s3),
      parseInt(request.body.s4)
    );
    data.url = `http://${request.hostname}/api/card/${data.result.cardID}`;
    data.twoOthers = `http://${request.hostname}/api/new_card_two_others/${data.result.cardID}`;
    data.success = data.result.success;
  }
  const status = data.success ? 201 : 400;
  reply.status(status).send(data);
});


fastify.get("/api/two_other_cards/:newID", async(request, reply) => {

  let data = {};
  if (!request.params || !request.params.newID){
    data.error = `please define a value for newID. ${request.hostname}/api/two_other_cards/ID_OF_NEW`;
    reply.status(400).send(data);
    return;
  }

  data.exceptCard = `http://${request.hostname}/api/card/${request.params.newID}`;
  let allIDs = db.getCardIDsExcept(request.params.newID);
  if (!allIDs || !allIDs.success){
    data.error = errorMessage;
  } else {
    
    let sampledIDs = sample(allIDs.entries, 2);
    for(const itm of sampledIDs){
      itm.url = `http://${request.hostname}/api/card/${itm.id}`;
    }
    data.result = {success : allIDs.success};
    data.result.entries = sampledIDs;
  }
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);

});


/*
fastify.get("/temp_game",function(req, reply) {
  reply.header('content-type', 'text/html; charset=utf-8');
  reply.sendFile("game.html");
})
*/

fastify.get("/i",function(req, reply) {
  reply.header('content-type', 'text/html; charset=utf-8');
  reply.sendFile("index.html");
})


fastify.get("/drawHands/:handSize", function(req, reply){


  let rawSeed = randomSeedSource();

  reply.redirect(
    `/game/${req.params.handSize}/${ShortURL.encode(rawSeed)}`
  );


})


fastify.get("/game/:handSize/:seed", function(req, reply){

  let data = {
    handSize : req.params.handSize,
    seed: req.params.seed
  };

  let rawSeed = "";

  try{
    rawSeed = ShortURL.decode(seed);
  } catch (error){
    reply.status(400).send(
      {
        error: "that's not a valid seed 🗞️",
        go_to: `http://${req.hostname}/${req.params.handSize}`
      }
    );
    return;
  }

  let seeded_rng = seedrandom(rawSeed);

  // TODO: is cardCount >= (handSize * 2)
  // TODO: obtain all IDs
  // TODO: use seeded RNG to sample (handSize * 2) from them
  // TODO: and divide into two sets of handSize


  
  reply.status(501).send(data);
});



fastify.ready(err => {
  if (err) throw err

  
  fastify.io.use((socket, next) => {
  
    const sessionID = socket.handshake.auth.sessionID;
    if (sessionID) {
      const session = sessionStore.findSession(sessionID);
      if (session) {
        socket.sessionID = sessionID;
        socket.userID = session.userID;
        socket.username = session.username;
        return next();
      }
    }
    const username = socket.handshake.auth.username;
    if (!username) {
      console.info('Socket rejected!', socket.id)
      return next(new Error("invalid username"));
    }
    socket.sessionID = randomId();
    socket.userID = randomId();
    socket.username = username;
    next();
  });

  fastify.io.on('connection', (socket) => console.info('Socket connected!', socket.id))
})


// Run the server and report out to the logs
fastify.listen({
  port:process.env.PORT,
  //host:'0.0.0.0'
  host: 'localhost'
}, function(err, address) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
});
