/**
 * This is the main server script that provides the API endpoints
 *
 * Uses sqlite.js to connect to db
 */

const {
  sample,
  without
} = require("underscore");

const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: true
});
const path = require('path')


fastify.register(require("@fastify/formbody"));

fastify.register(require("fastify-socket.io"));


// View is a templating manager for fastify
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});


const db = require("./sqlite.js");
const { request } = require("express");
const { card_consts } = require("./constants.js");
const errorMessage =
  "Whoops! Error connecting to the database–please try again!";

// OnRoute hook to list endpoints
const routes = { endpoints: [] };
fastify.addHook("onRoute", routeOptions => {
  routes.endpoints.push(routeOptions.method + " " + routeOptions.path);
});


// Setup our static files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname,'public'),
  prefix: "/", // optional: default '/'
});


fastify.get('/', function (req, reply) {
  reply.header('content-type', 'text/html; charset=utf-8');
  reply.sendFile('index.html')
})

fastify.get('/index', function (req, reply) {
  reply.header('content-type', 'text/html; charset=utf-8');
  reply.sendFile('index.html')
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

  
  let otherResult = await db.getRandomCards(2);
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
  return reply.view("/public/submit_card.hbs", params);
})


fastify.get('/view_card/:id', async(req, reply) => {
  let cardID = -1;
  try{
    if (req.params.id.trim()==="random"){
      
      let randResult = await db.getRandomCardIDs(1);
      if (randResult.success){
        cardID = randResult.entries[0].id;
      }
      else {
        reply.status(500).send(
          {
            error: `unable to find a random card ID!`
          }
        );
      }
    }
    else {
      cardID = parseInt(req.params.id);
    }
    
  } catch(error){
    reply.status(400).send(
      {
        error: `${cardID} could not be processed as an integer! (and/or wasn't "random")`
      }
    );
  }

  

  let params = {};
  
  let cardResult = await db.getCard(cardID);

  if (!cardResult.success){

    reply.status(400).send(
      {
        error: `No card with ID ${cardID} could be found!`
      }
    );
  }
  

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
  reply.header('content-type', 'text/html; charset=utf-8');
  return reply.view("/public/view_card.hbs", params);

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
  data.result = await db.getAllCards();
  console.log(data.result);
  if (!data.result || !data.result.success){ data.error = errorMessage;}
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
  
});

fastify.get("/api/card/:id", async(request, reply) => {
  let data = {};
  console.log(request.params);

  data.result = await db.getCard(request.params.id);
  console.log(data.result);
  if (!data.result || !data.result.success) {
    data.error = errorMessage;
  }
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);

});

fastify.get("/api/card_ids", async(request, reply) => {
  let data = {};
  data.result = await db.getCardIDs();
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
  data.result = await db.getCardIDs();
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

  data.result = await db.getRandomCardIDs(request.params.n);

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

  data.result = await db.getRandomCards(request.params.n);
  if (!data.result || !data.result.success){
    data.error = errorMessage;
  }

  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
});

fastify.get("/api/n_cards_except/:n/:except", async(request, reply) => {
  let data = {};
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
  data.exceptCard = `http://${request.hostname}/api/card/${request.params.except}`;
  let allIDs = await db.getCardIDsExcept(request.params.except);
  if (!allIDs || !allIDs.success){
    data.error = errorMessage;
  } else {
    
    let sampledIDs = sample(allIDs.entries, request.params.n);
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
  data.result = await db.getWinData(request.params.c1, request.params.c2);
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
  
  
  data.result = await db.setWinData(body.winner, body.loser);
  data.success = data.result.success;
  if (!data.result || !data.result.success){
    data.error = (data.result.existsAlready) ? "A record for these two cards exists already!" :  errorMessage;

    reply.status(400).send(data);
    return;
  }
  reply.status(200).send(data);

});



fastify.post("/api/report", async (request, reply) => {
  let data = {};

  if(!request.body || !request.body.id){
    data.success = false;
  }
  else {
    data.success = db.reportThisCard(request.body.id);
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
  let allIDs = await db.getCardIDsExcept(request.params.newID);
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


fastify.ready(err => {
  if (err) throw err

  fastify.io.on('connect', (socket) => console.info('Socket connected!', socket.id))
})

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
