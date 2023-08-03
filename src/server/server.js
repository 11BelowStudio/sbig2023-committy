/**
 * This is the main server script that provides the API endpoints
 *
 * Uses sqlite.js to connect to db
 */

import sample, { random } from "underscore";

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

import crypto, {webcrypto} from "node:crypto";

//const crypto = require('crypto');
const randomId = () => crypto.randomBytes(8).toString("hex");
const rngSeedSource = () => webcrypto.getRandomValues(new Uint32Array(1))[0];


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

    if (cardResult.success && cardResult.card_exists){
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
  const _id = parseInt(request.params.id);
  let data = {id: _id };
  console.log(request.params);
  let status = 500;

  data.result = db.getCard(_id);
  console.log(data.result);
  if (!data.result || !data.result.success) {
    data.error = errorMessage;
    status = 500;
  }
  else if (!data.result.card_exists){
    data.error = `Card ${_id} does not exist!`
    status = 400;
  } else {
    status = 200;
  }
  
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


fastify.get("/draw_hands/:handSize", function(req, reply){


  if (!req.params || !req.params.handSize){
    reply.status(400).send(
      {
        error: "Please declare a hand size parameter!"
      }
    );
  }
  
  const handSize = parseInt(req.params.handSize);
  if (handSize === NaN){
    reply.status(400).send(
      {
        error: `given hand size ${req.params.handSize} isn't a number smh my head`
      }
    )
  }
  else if (handSize < 1){
    reply.status(400).send(
      {
        error: "Please declare a hand size of at least 1"
      }
    );
  }


  const rawSeed = rngSeedSource();

  console.log(`${rawSeed}, ${ShortURL.encode(rawSeed)}`)

  reply.redirect(
    `/game/${handSize}/${ShortURL.encode(rawSeed)}`
  );


})


function card_to_param_string(card_data){
  return `{
    id: ${card_data.id},
    title: "${card_data.name}",
    desc: "${card_data.desc}",
    img: "${card_data.img}",
    stat1: ${card_data.stat1},
    stat2: ${card_data.stat2},
    stat3: ${card_data.stat3},
    stat4: ${card_data.stat4}
  }`
}


fastify.get("/game/:handSize/:seed", function(req, reply){


  if (!req.params || !req.params.handSize){
    reply.status(400).send(
      {
        error: `Please declare a hand size and go to http://${req.hostname}/drawHands/HAND_SIZE`
      }
    );
    return;
  }

  const handSize = parseInt(req.params.handSize);

  
  if (handSize === NaN){
    reply.status(400).send(
      {
        error: `given hand size ${req.params.handSize} isn't a number smh my head`
      }
    )
  }
  else if (handSize < 1){
    reply.status(400).send(
      {
        error: "Please declare a hand size of at least 1"
      }
    );
  }
  else if (!req.params.seed){
    reply.redirect(`/draw_hands/${handSize}`)
    return;
  }

  let data = {
    handSize : handSize,
    seed: req.params.seed
  };

  let rawSeed = 0;

  const seed = req.params.seed;

  try{
    rawSeed = ShortURL.decode(seed);
  } catch (error){
    reply.status(400).send(
      {
        error: "that's not a valid seed 🗞️",
        go_to: `http://${req.hostname}/draw_hands/${handSize}`
      }
    );
    return;
  }

  console.log(rawSeed);

  data.rawSeed = rawSeed;

  const totalNeeded = Math.floor(handSize) * 2;

  const cardCountResult = db.getCardCount();

  if (cardCountResult.success == false){
    reply.status(500).send(
      {
        error: "Unable to check how many cards the database actually has!"
      }
    );
    return;
  }
  else if (cardCountResult.cards < totalNeeded){
    reply.status(400).send(
      {
        error: `Cannot support a game with a hand size of ${handSize} - ${totalNeeded} total cards required (two hands), database only has ${cardCountResult.cards}! Consider contributing some more cards yourself.`,
        go_to: `http://${req.hostname}/submit_card`
      }
    );
    return;
  }

  console.log()
  const randomCards = db.getRandomCards(totalNeeded, rawSeed);

  
  if (!randomCards.success){
    reply.status(500).send(
      {
        error: `Unable to successfully obtain ${totalNeeded} cards from database (seed ${rawSeed})!`
      }
    );
    return;
  }

  const hand1 = randomCards.entries.slice(0, handSize);
  const hand2 = randomCards.entries.slice(handSize);

  const params = {
    hand_1: [],
    hand_2: [],
    url: `http://${req.hostname}/game/${handSize}/${seed}`
  };


  for(const entry of hand1){

    params.hand_1.push(
      card_to_param_string(entry)
      /*
      `{
        id: ${entry.id},
        title: "${entry.name}",
        desc: "${entry.desc}",
        img: "${entry.img}",
        stat1: ${entry.stat1},
        stat2: ${entry.stat2},
        stat3: ${entry.stat3},
        stat4: ${entry.stat4}
      }`
      */
    )
  }

  for(const entry of hand2){

    params.hand_2.push(
      card_to_param_string(entry)
      /*
      `{
        id: ${entry.id},
        title: "${entry.name}",
        desc: "${entry.desc}",
        img: "${entry.img}",
        stat1: ${entry.stat1},
        stat2: ${entry.stat2},
        stat3: ${entry.stat3},
        stat4: ${entry.stat4}
      }`
      */
    )
  }



  // TODO: is cardCount >= (handSize * 2)
  // TODO: obtain all IDs
  // TODO: use seeded RNG to sample (handSize * 2) from them
  // TODO: and divide into two sets of handSize


  reply.header('content-type', 'text/html; charset=utf-8');
  return reply.view("/src/client/game_clientsided.hbs", params);
  //reply.status(501).send(data);
});


fastify.get("/game/chosen/:c1/:c2", (req, reply) => {

  console.log(req.params);
  const _id1 = parseInt(req.params.c1);
  const _id2 = parseInt(req.params.c2);

  
  
  if (Number.isNaN(_id1)){
    reply.status(400).send(
      {
        error: `c1 input ${req.params.c1} is not a valid card!`
      }
    )
    return;
  }
  else if (Number.isNaN(_id2)){
    reply.status(400).send(
      {
        error: `c2 input ${req.params.c2} is not a valid card!`
      }
    )
    return;
  }
  else if (_id1 == _id2){
    reply.status(400).send(
      {
        error: `how/why are you trying to put card ${req.params.c1} against itself??`
      }
    )
    return;
  }

  


  const res_c1 = db.getCard(_id1);

  const res_c2 = db.getCard(_id2);

  if (!res_c1.success){
    reply.status(500).send(
      {
        error: `Unable to retrieve card ${_id1}`
      }
    )
    return;
  }
  else if (!res_c2.success){
    reply.status(500).send(
      {
        error: `Unable to retrieve card ${_id2}`
      }
    )
    return;
  }
  else if (!res_c1.card_exists){
    reply.status(400).send(
      {
        error: `Card ${_id1} does not exist!`
      }
    )
    return;
  }
  else if (!res_c2.card_exists){
    reply.status(400).send(
      {
        error: `Card ${_id2} does not exist!`
      }
    )
    return;
  }
  const c1 = res_c1.card;
  const c2 = res_c2.card;

  let params = {
    p1_card: card_to_param_string(c1),
    p2_card: card_to_param_string(c2),
    p1_id: _id1,
    p2_id: _id2,
    url: `/game/chosen/${_id1}/${_id2}`
  };

  reply.header('content-type', 'text/html; charset=utf-8');
  return reply.view("/src/client/game_clientside_chosen.hbs", params);
  return;

  //data.c1 = c1.card;
  //data.c2 = c2.card;


  //reply.status(501).send(data);

});

/**
 * Used to actually show the outcome of the game (who won, precedent, etc)
 * @param {import("fastify/types/request.js").FastifyRequest} req 
 * @param {import("fastify/types/reply.js").FastifyReply} reply 
 * @param {int} winner_id ID of the card that won 
 * @param {int} loser_id ID of the card that lost
 * @param {bool} p1_won did P1 win
 * @param {bool} overruled was initial verdict overruled
 * @param {bool} new_outcome if true, there wasn't a precedent
 * @param {Date} when_precedent when was the verdict 
 */
function show_results(req, reply, winner_id, loser_id, p1_won, overruled, new_outcome, when_precedent){


  reply.status(501).send({
    error: "not yet implemented",
    winner_id: winner_id,
    loser_id: loser_id,
    p1_won: p1_won,
    overruled, new_outcome,
    when_precedent, when_precedent
  });
}


fastify.post("/game/verdict", (req, reply) => {

  console.log(req.body);

  const bodyData = JSON.parse(req.body.data);

  console.log(bodyData);

  const _c1 = parseInt(bodyData.c1);

  const _c2 = parseInt(bodyData.c2);

  
  const _exist_check = db.checkIfCardsExist(_c1, _c2);

  if (!(_exist_check.success && _exist_check.all_exist)){
    reply.status(400).send({
      c1: _c1,
      c2: _c2,
      whichActuallyExist: _exist_check.exists,
      error: "not all the given cards exist!"
    });
    return;
  }

  const _winner = parseInt(bodyData.verdict);

  if ((_winner != _c1) && (_winner != _c2)){
    reply.status(400).send(
      {
        c1: _c1,
        c2: _c2,
        winner: _winner,
        error: `The chosen winning card (${_winner}) wasn't one of the given cards!`
      }
    );
    return;
  } 

  const _loser = (_winner == _c1) ? _c2 : _c1;

  const precedent = db.getWinData(_winner, _loser);

  if (!precedent.success){
    reply.status(500).send({
      winner: _winner,
      loser: _loser,
      error: `unable to verify status of cards ${_winner} and ${_loser}`
    });
    return;
  }
  
  if (precedent.win_data_exists){

    const win_entry = precedent.entries[0];
    const p1_won = (_c1 == win_entry.winner_id);
    const when_precedent = new Date(win_entry.time);

    if (win_entry.winner_id == _winner){
      // TODO: precedent has been preserved, today is a good day
      show_results(req, reply, _winner, _loser, p1_won, false, false, when_precedent);
      return;
    } else {
      // TODO: inform users that they are WRONG and that precedent exists
      show_results(req, reply, win_entry.winner_id, win_entry.loser_id, p1_won, true, false, when_precedent);
    } 
    return;
  }
  else {
    const p1_won = _c1 == _winner;
    const win_added_outcome = db.setWinData(_winner, _loser);

    if (!win_added_outcome.success){
      reply.status(500).reply(
        {
          winner: _winner,
          loser: _loser,
          p1_won: p1_won,
          error: `Error adding data for ${winner} beating ${loser} to the database!`
        }
      );
      return;
    }
    else {
      show_results(req, reply, _winner, _loser, p1_won, false, true, new Date(win_added_outcome.when));
      return;
    }
  }



  reply.status(501).send(precedent);
});

// for emergency use only.
fastify.get("/api/admin/delete/:id", async(request, reply) => {
  
  reply.status(400).send({message:"no."});
  return false;
  //reply.status(200).send(db.deleteCard(request.params.id));
  
});



fastify.ready(err => {
  if (err) throw err
  
  return; 
  // ignore this, we aren't actually using sockets

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
