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
  //logger: true
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

import {
  index_seo,
  view_card_seo,
  submit_card_seo,
  mvp_game_seo,
  mvp_judgement_seo,
  mvp_verdict_seo
} from "./seo.js"

if (index_seo.url === "glitch-default") {
  index_seo.url = `https://committy.glitch.me`;
}

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
import httpStatus from "http-status";


//const ShortURL = require("./utils/ShortURL");

const errorMessage =
  "Whoops! Error connecting to the database–please try again!";

// OnRoute hook to list endpoints
const routes = { endpoints: [] };
fastify.addHook("onRoute", routeOptions => {
  routes.endpoints.push(routeOptions.method + " " + routeOptions.path);
});

/**
 * the actual logic for the index page.<br/>
 * If 'request.raw' is defined, will just return the SEO stuff for the site.
 * Otherwise, it'll return a formatted index.html
 * @param {import("fastify/types/request.js").FastifyRequest} req 
 * @param {import("fastify/types/reply.js").FastifyReply} reply 
 * @returns reply.view stuff.
 */
function _index(req, reply){

  if (req.query.raw){
    reply.send({seo:index_seo});
    return;
  }

  let params = {
    username: "",
    cardCount : 0,
    maxHand: 0,
    seo: index_seo
  };

  {
    const cardCountRes = db.getCardCount();
    params.cardCount = (cardCountRes.success) ? cardCountRes.cards : "database had a whoopsie";
    
    params.maxHand = (cardCountRes.success) ? (Math.floor(cardCountRes.cards / 2)) : 3;

  }

  {
    /*
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
    */
  }

  reply.header('content-type', 'text/html; charset=utf-8');

  return reply.view("/src/client/index.hbs", params);
}

fastify.get('/index', function (req, reply) {
  reply.redirect("/");
})

fastify.get('/', function (req, reply) {
  _index(req, reply)
})



// Just send some info at the home route
fastify.get("/api", (request, reply) => {
  const data = {
    title: "Committy API",
    intro: "This is a database-backed API with the following endpoints",
    routes: routes.endpoints
  };
  reply.status(httpStatus.OK).send(data);
});

fastify.get('/submit_card', async(req, reply) => {

  if (req.query.raw){
    return req.reply({seo: submit_card_seo});
  }

  let otherCards = [];

  
  let otherResult = db.getRandomCards(2);
  if (!otherResult.success){
    reply.status(httpStatus.INTERNAL_SERVER_ERROR).send(
      {
        error: `unable to build the card submission form!`
      }
    );
    return;
  }
  otherCards = otherResult.entries;

  let params = {
    seo: submit_card_seo,
    card1: otherCards[0],
    card2: otherCards[1]
  };

  params.card1.colour = card_consts.card_id_to_css_class(params.card1.id);

  params.card2.colour = card_consts.card_id_to_css_class(params.card2.id);


  reply.header('content-type', 'text/html; charset=utf-8');
  return reply.view("/src/client/submit_card.hbs", params);
})

fastify.get('/view_card', async(req, reply) => {
  if (req.query.raw){
    return req.reply({seo:view_card_seo("random")});
  }
  reply.redirect("/view_card/random");
})

fastify.get('/view_card/:id', async(req, reply) => {
  let cardID = -1;

  if (req.query.raw){
    let id = "";
    if (req.params.id !== undefined){
      id = req.params.id.trim();
    }

    return req.reply({seo:view_card_seo(id)});
  }

  try{
    if (req.params.id === undefined || req.params.id.trim() === "" || req.params.id.trim()==="random"){
      
      let randResult = db.getRandomCardIDs(1);
      if (randResult.success){
        cardID = randResult.entries[0].id;
        
      }
      else {
        reply.status(httpStatus.INTERNAL_SERVER_ERROR).send(
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
    reply.status(httpStatus.BAD_REQUEST).send(
      {
        error: `${cardID} needs to be an integer or "random"`
      }
    );
  }

  

  let params = {
    seo: view_card_seo(cardID),
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
  const status = data.error ? httpStatus.BAD_REQUEST : httpStatus.OK;
  reply.status(status).send(data);
  
});

fastify.get("/api/card/:id", async(request, reply) => {
  const _id = parseInt(request.params.id);
  let data = {id: _id };
  console.log(request.params);
  let status = httpStatus.BAD_REQUEST;

  data.result = db.getCard(_id);
  console.log(data.result);
  if (!data.result || !data.result.success) {
    data.error = errorMessage;
    status = httpStatus.INTERNAL_SERVER_ERROR;
  }
  else if (!data.result.card_exists){
    data.error = `Card ${_id} does not exist!`
    status = httpStatus.BAD_REQUEST;
  } else {
    status = httpStatus.OK;
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
  const status = data.error ? httpStatus.BAD_REQUEST : httpStatus.OK;
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
  const status = data.error ? httpStatus.BAD_REQUEST : httpStatus.OK;
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
  const status = data.error ? httpStatus.BAD_REQUEST : httpStatus.OK;
  reply.status(status).send(data);

})

fastify.get("/api/n_cards/:n", async(request, reply) => {
  let data = {};

  data.result = db.getRandomCards(request.params.n);
  if (!data.result || !data.result.success){
    data.error = errorMessage;
  }

  const status = data.error ? httpStatus.BAD_REQUEST : httpStatus.OK;
  reply.status(status).send(data);
});

fastify.get("/api/n_cards_except/:n/:except", async(request, reply) => {
  let data = {};
  let except = -1;
  if (!request.params || !request.params.n){
    data.error = `please define a value for n and except. ${request.hostname}/api/n_cards_except/NUMBER/ID_TO_OMIT`;
    reply.status(httpStatus.BAD_REQUEST).send(data);
    return;
  }
  else if (!request.params.except){
    data.error = `If you don't want to exclude a card, please use ${request.hostname}/api/n_cards/${request.params.n} instead.`;
    data.useThis = `http://${request.hostname}/api/n_cards/${request.params.n}`;
    reply.status(httpStatus.SEE_OTHER).send(data);
    return;
  }
  else {
    try {
      except = parseInt(request.params.except);
      //console.log(except);
    } catch (error){
      console.log(error);
      data.error = `hey it looks like ${request.params.except} wasn't a number smh my head`;
      reply.status(httpStatus.BAD_REQUEST).send(data);
      return;
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
  const status = data.error ? httpStatus.BAD_REQUEST : httpStatus.OK;
  reply.status(status).send(data);
});

fastify.get("/api/wins/:c1/:c2", async(request, reply) => {
  let data = {};
  data.result = db.getWinData(request.params.c1, request.params.c2);
  if (!data.result || !data.result.success){
    data.error = errorMessage;
  }
  const status = data.error ? httpStatus.BAD_REQUEST : httpStatus.OK;
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
    reply.status(httpStatus.BAD_REQUEST).send(data);
    return;
  }
  else if (body.winner == body.loser){
    data.success = false;
    data.error = "the 'winner' and the 'loser' can't be the same card!";
    reply.status(httpStatus.BAD_REQUEST).send(data);
    return;
  }
  
  
  data.result = db.setWinData(body.winner, body.loser);
  data.success = data.result.success;
  if (!data.result || !data.result.success){
    data.error = (data.result.existsAlready) ? "A record for these two cards exists already!" :  errorMessage;

    reply.status(httpStatus.CONFLICT).send(data);
    return;
  }
  reply.status(httpStatus.OK).send(data);

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
  const status = data.success ? httpStatus.CREATED : httpStatus.BAD_REQUEST;
  reply.status(status).send(data);
});


fastify.post("/api/submit_card_form", async(request, reply) => {

  let data = {success: false};
  let response = 0;
  if (!request.body){
    data.success = false;
    data.error = "you forgor to submit the form :skull:";
    response = httpStatus.BAD_REQUEST;
  }
  else{

    const body = request.body;

    console.log(body);
    if (
      !request.body.name || request.body.name.trim() == false
    ){
      data.success = false;
      data.error = "please give your card a `name`.";
      response = httpStatus.BAD_REQUEST;
    }
    else if (
      !request.body.beats_loses_choice || request.body.beats_loses_choice.trim() == false
    ){
      data.success = false;
      data.error = "you need to pick a card which your card beats/loses to! (`beats_loses_choice`)";
      response = httpStatus.BAD_REQUEST;
    }
    else {
      try{
        let beats_loses = request.body.beats_loses_choice.split(",");
        body.beats = parseInt(beats_loses[0]);
        body.loses = parseInt(beats_loses[1]);
      } catch(error){
        data.success = false;
        data.error = "expected `beats_loses_choice` to be in the form `beats_id,loses_to_id`, and it wasn't!";
        response = httpStatus.BAD_REQUEST;
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
        response = httpStatus.CREATED;

        reply.redirect(result.view_url);
        return;
      }
      else {
        data.error = result.message;
      }

    }

    if (response == 0){
      response = (data.success ? httpStatus.CREATED : httpStatus.BAD_REQUEST);
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
  const status = data.success ? httpStatus.CREATED : httpStatus.BAD_REQUEST;
  reply.status(status).send(data);
});


fastify.get("/api/two_other_cards/:newID", async(request, reply) => {

  let data = {};
  if (!request.params || !request.params.newID){
    data.error = `please define a value for newID. ${request.hostname}/api/two_other_cards/ID_OF_NEW`;
    reply.status(httpStatus.BAD_REQUEST).send(data);
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
  const status = data.error ? httpStatus.INTERNAL_SERVER_ERROR : httpStatus.OK;
  reply.status(status).send(data);

});


/*
fastify.get("/temp_game",function(req, reply) {
  reply.header('content-type', 'text/html; charset=utf-8');
  reply.sendFile("game.html");
})
*/

fastify.get("/i",function(req, reply) {
  return req.redirect("/");
})


fastify.get("/draw_hands/:handSize", function(req, reply){


  if (!req.params || !req.params.handSize){
    reply.status(httpStatus.BAD_REQUEST).send(
      {
        error: "Please declare a hand size parameter!"
      }
    );
  }
  
  const handSize = parseInt(req.params.handSize);
  if (handSize === NaN){
    reply.status(httpStatus.BAD_REQUEST).send(
      {
        error: `given hand size ${req.params.handSize} isn't a number smh my head`
      }
    )
  }
  else if (handSize < 1){
    reply.status(httpStatus.BAD_REQUEST).send(
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


fastify.get("/game", function(req, reply){
  

  reply.redirect("/draw_hands/3")
});

fastify.get("/game/:handSize", function(req, reply){
  
  reply.redirect(`/draw_hands/${(req.params.handSize) ? req.params.handSize : 3}`);
});


fastify.get("/game/:handSize/:seed", function(req, reply){

  if (req.query.raw){
    return req.reply({
      seo: mvp_game_seo(handSize, seed)
    });
  }


  if (!req.params || !req.params.handSize){
    reply.status(httpStatus.BAD_REQUEST).send(
      {
        error: `Please declare a hand size and go to http://${req.hostname}/drawHands/HAND_SIZE`
      }
    );
    return;
  }

  const handSize = parseInt(req.params.handSize);

  
  if (handSize === NaN){
    reply.status(httpStatus.BAD_REQUEST).send(
      {
        error: `given hand size ${req.params.handSize} isn't a number smh my head`
      }
    )
  }
  else if (handSize < 1){
    reply.status(httpStatus.BAD_REQUEST).send(
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
    reply.status(httpStatus.BAD_REQUEST).send(
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
    reply.status(httpStatus.INTERNAL_SERVER_ERROR).send(
      {
        error: "Unable to check how many cards the database actually has!"
      }
    );
    return;
  }
  else if (cardCountResult.cards < totalNeeded){
    reply.status(httpStatus.BAD_REQUEST).send(
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
    reply.status(httpStatus.INTERNAL_SERVER_ERROR).send(
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
    url: `http://${req.hostname}/game/${handSize}/${seed}`,
    seo: mvp_game_seo(handSize, seed)
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
    reply.status(httpStatus.BAD_REQUEST).send(
      {
        error: `c1 input ${req.params.c1} is not a valid card!`
      }
    )
    return;
  }
  else if (Number.isNaN(_id2)){
    reply.status(httpStatus.BAD_REQUEST).send(
      {
        error: `c2 input ${req.params.c2} is not a valid card!`
      }
    )
    return;
  }
  else if (_id1 == _id2){
    reply.status(httpStatus.BAD_REQUEST).send(
      {
        error: `how/why are you trying to put card ${req.params.c1} against itself??`
      }
    )
    return;
  }

  if (req.query.raw){
    return req.reply({seo: mvp_judgement_seo(_id1, _id2)});
  }


  const res_c1 = db.getCard(_id1);

  const res_c2 = db.getCard(_id2);

  if (!res_c1.success){
    reply.status(httpStatus.INTERNAL_SERVER_ERROR).send(
      {
        error: `Unable to retrieve card ${_id1}`
      }
    )
    return;
  }
  else if (!res_c2.success){
    reply.status(httpStatus.INTERNAL_SERVER_ERROR).send(
      {
        error: `Unable to retrieve card ${_id2}`
      }
    )
    return;
  }
  else if (!res_c1.card_exists){
    reply.status(httpStatus.BAD_REQUEST).send(
      {
        error: `Card ${_id1} does not exist!`
      }
    )
    return;
  }
  else if (!res_c2.card_exists){
    reply.status(httpStatus.BAD_REQUEST).send(
      {
        error: `Card ${_id2} does not exist!`
      }
    )
    return;
  }
  

  const c1 = res_c1.card;
  const c2 = res_c2.card;

  const winDataResult = db.getWinData(_id1, _id2);

  if (
    winDataResult.success &&
    winDataResult.win_data_exists
  ){
    const theWinData = winDataResult.entries[0];

    const winner_id = theWinData.winner_id;
    const loser_id = theWinData.loser_id;
    const when = theWinData.time;
    const p1_won = (winner_id == _id1);

    const win_card  = (p1_won)? c1 : c2;
    const lose_card = (p1_won)? c2 : c1;

    const winner = (p1_won)? "1" : "A";
    const loser  = (p1_won)? "A" : "1";

    const d_when = new Date(when);

    let params = {
      winner: winner,
      loser:  loser, 
      win:    win_card,
      lose:   lose_card,
      when: {
        second: d_when.getSeconds(),
        minute: d_when.getMinutes(),
        hour: d_when.getHours(),
        day: intToWeekday(d_when.getDay()),
        date: d_when.getDate(),
        month: d_when.getMonth()+1,
        year: d_when.getFullYear()
      },
      seo: mvp_judgement_seo(_id1, _id2)
    };
    reply.header('content-type', 'text/html; charset=utf-8');
    return reply.view("/src/client/standard_result.hbs", params);


  }
  else {
    let params = {
      p1_card: card_to_param_string(c1),
      p2_card: card_to_param_string(c2),
      p1_id: _id1,
      p2_id: _id2,
      url: `/game/chosen/${_id1}/${_id2}`,
      seo: mvp_judgement_seo(_id1, _id2)
    };

    reply.header('content-type', 'text/html; charset=utf-8');
    return reply.view("/src/client/game_clientside_chosen.hbs", params);
  }

  

  //data.c1 = c1.card;
  //data.c2 = c2.card;


  //reply.status(501).send(data);

});

function intToWeekday(weekdayNum){
  
  return({
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Þursday",
    5: "Friday",
    6: "Saturday",
    0: "Sunday"
  }[weekdayNum % 7]);
}

/**
 * Used to actually show the outcome of the game (who won, precedent, etc)
 * @param {import("fastify/types/request.js").FastifyRequest} req 
 * @param {import("fastify/types/reply.js").FastifyReply} reply 
 * @param {int} winner_id ID of the card that won 
 * @param {int} loser_id ID of the card that lost
 * @param {bool} p1_won did P1 win
 * @param {bool} overruled was initial verdict overruled
 * @param {bool} new_outcome if true, there wasn't a precedent
 * @param {int} when_precedent when was the verdict 
 */
function show_results(req, reply, winner_id, loser_id, p1_won, overruled, new_outcome, when_precedent){


  if (overruled){

    const c1 = (p1_won) ? winner_id : loser_id;
    const c2 = (p1_won) ? loser_id : winner_id;

    reply.redirect(`/game/chosen/${c1}/${c2}`);
    return;
  }


  const win_card = db.getCard(winner_id).card;
  const lose_card = db.getCard(loser_id).card;
  const winner = (p1_won) ? "1" : "A";
  const loser  = (p1_won) ? "A" : "1";
  const when = new Date(when_precedent);

  

  const params = {
    win : win_card,
    lose: lose_card,
    winner: winner,
    loser : loser,
    when: {
      second: when.getSeconds(),
      minute: when.getMinutes(),
      hour: when.getHours(),
      day: intToWeekday(when.getDay()),
      date: when.getDate(),
      month: when.getMonth()+1,
      year: when.getFullYear(),
    },
    seo: mvp_verdict_seo
  }

  reply.header('content-type', 'text/html; charset=utf-8');
  return reply.view("/src/client/new_precedent_established.hbs", params);


  return;
  reply.status(httpStatus.NOT_IMPLEMENTED).send({
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
    reply.status(httpStatus.BAD_REQUEST).send({
      c1: _c1,
      c2: _c2,
      whichActuallyExist: _exist_check.exists,
      error: "not all the given cards exist!"
    });
    return;
  }

  const _winner = parseInt(bodyData.verdict);

  if ((_winner != _c1) && (_winner != _c2)){
    reply.status(httpStatus.BAD_REQUEST).send(
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
    reply.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      winner: _winner,
      loser: _loser,
      error: `unable to verify status of cards ${_winner} and ${_loser}`
    });
    return;
  }
  
  if (precedent.win_data_exists){

    const win_entry = precedent.entries[0];
    const p1_won = (_c1 == win_entry.winner_id);

    if (win_entry.winner_id == _winner){
      // TODO: precedent has been preserved, today is a good day
      show_results(req, reply, _winner, _loser, p1_won, false, false, win_entry.time);
      return;
    } else {
      // TODO: inform users that they are WRONG and that precedent exists
      show_results(req, reply, win_entry.winner_id, win_entry.loser_id, p1_won, true, false, win_entry.time);
    } 
    return;
  }
  else {
    const p1_won = _c1 == _winner;
    const win_added_outcome = db.setWinData(_winner, _loser);

    if (!win_added_outcome.success){
      reply.status(httpStatus.INTERNAL_SERVER_ERROR).reply(
        {
          winner: _winner,
          loser: _loser,
          p1_won: p1_won,
          error: `Error adding data for ${_winner} beating ${_loser} to the database!`
        }
      );
      return;
    }
    else {
      show_results(req, reply, _winner, _loser, p1_won, false, true, win_added_outcome.when);
      return;
    }
  }



  //reply.status(501).send(precedent);
});

// for emergency use only.
fastify.get("/api/admin/delete/:id", async(request, reply) => {
  
  reply.status(httpStatus.UNAUTHORIZED).send({message:"no."});
  return false;
  //reply.status(httpStatus.OK).send(db.deleteCard(request.params.id));
  
});

// and now some stuff that allows the database to be obtained for archiving purposes

/**
 * generates correct filename URL for database download and redirects
 * @param {import("fastify/types/request.js").FastifyRequest} req 
 * @param {import("fastify/types/reply.js").FastifyReply} reply
 */
function _archive_redirect(req, reply){
  reply.redirect(`/api/archive/cards ${new Date(Date.now()).toISOString().replaceAll(":","-")}.db`);
}

fastify.get("/api/xcvg", (req, reply) => {
  // see https://discord.com/channels/328746547716292609/328746547716292609/1140864868518477914

  /*
  reply.header("og:site_name","Committy");
  reply.header("og:title","The Official Committy Data Hoarding URL!")
  reply.header("og:description","Oh hello there XCVG from XCVGSystems.com");
  reply.header("og:image","https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027");
  reply.header("twitter:image","https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027");
  reply.header("og:url","https://committy.glitch.me/api/xcvg");
  reply.header("twitter:site","Committy");
  reply.header("og:type","application/vnd.sqlite3");
  */
  
  _archive_redirect(req, reply)
});

fastify.get("/api/archive", (req, reply) => {
  /*
  reply.header("og:site_name","Committy");
  reply.header("og:title","The Official Committy Data Archive")
  reply.header("og:description","Here's an archive of Committy's data.");
  reply.header("og:image","https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027");
  reply.header("twitter:image","https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027");
  reply.header("og:url","https://committy.glitch.me/api/archive");
  reply.header("twitter:site","Committy");
  reply.header("og:type","application/vnd.sqlite3");
  */
  _archive_redirect(req, reply);
});

fastify.get("/api/archive/:fname", (req, reply) => {
  /*
  reply.header("og:site_name","Committy");
  reply.header("og:title","The Official Committy Data Archive")
  reply.header("og:description","Here's an archive of Committy's data.");
  reply.header("og:image","https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027");
  reply.header("twitter:image","https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027");
  reply.header("og:url","https://committy.glitch.me/api/archive/");
  reply.header("twitter:site","Committy");
  reply.header("og:type","application/vnd.sqlite3");
  */
  if (!req.params || !req.params.fname){
    _archive_redirect(req, reply);
    return;
  }
  reply.type("application/vnd.sqlite3");
  reply.sendFile("cards.db",path.join(".data"),{serveDotFiles: true, extensions:"db"});
})



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
